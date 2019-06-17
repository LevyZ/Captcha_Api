var express = require('express');
var pug = require('pug');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var jwt = require('jsonwebtoken'); //Token
var upload = require("express-fileupload"); //uploader les fichiers
var fs = require('fs');
var extract = require('extract-zip');
var resolve =  require('path').resolve;
var session = require('express-session');

var app = express();
app.use(bodyParser.json()); // pour supporter json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); //pour supporter  encoded url
app.set('view engine', 'pug');
app.use(upload());
app.use(session({secret: 'secret'}));
var sess;

//Route Static
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/css/'));
app.use(express.static(__dirname + '/views'));
app.use('/public/', express.static(__dirname + '/public'));
app.use('/upload', express.static(__dirname + '/upload'));


var token = null;
 

//Liste des utilisateurs
app.get('/users', function(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "LicencePro"
      }); 
    con.connect(function(err) {
        if (err) throw err;
        con.query("SELECT * FROM user", function (err, rows, fields) {
            if (err) throw err;
        res.json(rows);
        });
    });
});

//Afficher utilisateur en fonction de son ID
app.get('/users/:user_id', function(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "LicencePro"
      });
    con.connect(function(err) {
        if (err) throw err;
        var sql = mysql.format("SELECT * FROM user WHERE id=?;", req.params.user_id);
        con.query(sql, function (err, rows, fields) {
          if (err) throw err;
        res.json(rows);
        });
    });
});

//Inserer un nouvel utilsateur 
app.post('/users', function(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    obj = JSON.parse(JSON.stringify(req.body, null, "  "));
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "LicencePro"
      });
    con.connect(function(err) {
        if (err) throw err;
         var sql = mysql.format("INSERT INTO user (username, email, password) VALUES (?,?,?);", [obj.username, obj.email, obj.password]);
        con.query(sql, function (err, result) {
          if (err) throw err;
          console.log("1 record inserted");
        });
      });
    res.status(200).end('Contact créé' );
});

//Update un utilisateur 
app.put('/users/:user_id', function(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    obj = JSON.parse(JSON.stringify(req.body, null, "  "));
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "LicencePro"
      });
    con.connect(function(err) {
        if (err) throw err;
         var sql = mysql.format("UPDATE user  SET username = ?, email=?, password=? WHERE id=?;", [obj.username, obj.email, obj.password, req.params.user_id]);
        con.query(sql, function (err, result) {
          if (err) throw err;
          console.log("1 contact update");
        });
      });
    res.status(200).end('Contact mis à jour');
});

//supprimer un utilisateur 
app.delete('/users/:user_id', function(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    obj = JSON.parse(JSON.stringify(req.body, null, "  "));
    var con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "LicencePro"
      });
    con.connect(function(err) {
        if (err) throw err;
         var sql = mysql.format("DELETE FROM user WHERE id = ?;", [req.params.user_id]);
        con.query(sql, function (err, result) {
          if (err) throw err;
          console.log("1 contact supprimé");
        });
      });
    res.status(200).end('Contact Supprimé');
});


//connexion a l'interface
app.get('/connexion', function(req, res) {
  if(req.query.inscription){
    res.render('connexion', {inscription : req.query.inscription });
  }else{
    res.render('connexion');
  }
});
app.post('/connexion', function(req, res){
   obj = JSON.parse(JSON.stringify(req.body, null, "  "));
   var con = mysql.createConnection({
       host: "localhost",
       user: "root",
       password: "",
       database: "capchat"
     });

   var login = req.body.login; 
   var mdp = req.body.mdp;

   con.connect(function() {
      var sql = mysql.format("SELECT id FROM user WHERE login=? and mdp=?;", [login, mdp]);
      con.query(sql, function (err, rows, fields) {
        if(err){
          console.log(err);
          con.end();
        }

        if( rows.length > 0 ) {
          var result =  rows[0];
          var idUser = result['id'];
          var token = jwt.sign({ data: Date.now() }, 'secret', { expiresIn: '1h' });
          res.set({
            "Content-Type": "application/json; charset=utf-8",
            "token": token
          }); 
          sess = req.session;
          sess.user_id = idUser;

          sql =  mysql.format("SELECT * FROM artiste WHERE id_user=?;", idUser);
          con.query(sql, function(err, rows, fields){
            if (err) throw err;

            if(rows.length > 0){
              sess.artiste_id = rows[0].id_artiste;
              sess.artiste_nom = rows[0].nom;
            }
           res.status(200).redirect('/accueil');
          });
        }
      });
   });
   if(res.statusCode != 200){
     res.redirect('/connexion');
   }
   console.log(res.statusCode);
});
//Inscription d'un utilisateur
app.get('/inscription', function(req, res){
  res.render('inscription');
});

app.post('/inscription', function(req, res){
  var nom = req.body.nom;
  var login = req.body.login;
  var mdp = req.body.mdp;
  var userId;

  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "capchat"
  });

  con.connect(function(err) {
    if (err) throw err;
    var sql = mysql.format("INSERT INTO user (login, mdp) VALUES (?,?);",[login, mdp]);
    con.query(sql, function (err, results) {
      if (err) throw err;
      console.log("Le user a bien été ajouté");
      userId = results.insertId;

      console.log(userId);
      sql = mysql.format("INSERT INTO artiste (nom, id_user) VALUES (?,?);",[nom, userId]);
      con.query(sql, function (err, results) {
        if (err) throw err;
        console.log("L'artiste a bien été ajouté");
        res.status(200).redirect('/connexion?inscription=1')
      });
    });
    
  });
  if(res.statusCode == 200){
    res.redirect('/connexion?inscription=0');
  }
});

app.get('/accueil' , function( req, res){
  sess = req.session;
  if(sess.artiste_nom){
    console.log(sess.artiste_nom);
    res.render('accueil', {artiste : sess.artiste_nom});
  }else{
    res.render('accueil');
  }
});

app.get('/', function(req, res){
  res.redirect('/connexion');
})

app.get('/ajout-theme', function(req, res) {
  if(req.query.ajout){
    res.render('ajout_theme', {rep : req.query.ajout});
  }else{
    res.render('ajout_theme');
  }
});
app.get('/ajout-theme/:reponse', function(req, res) {
  var reponse = req.params.reponse;
  res.render('ajout_theme', {rep: reponse});
});
app.post('/ajout-theme', function(req, res){
    console.log(req.files);
    if(req.files){
      var file = req.files.fichier;
      var filename = file.name;
      var nomTheme = req.body.nom;
      
      sess = req.session;
      var idArtiste = sess.artiste_id;
      
      fs.mkdir('./upload/'+nomTheme, function(){});
      file.mv('./upload/'+nomTheme+"/"+filename, function(err){
       
        var pathFile = './upload/'+nomTheme+"/"+filename;
        var pathFolder = './upload/'+nomTheme;
        var folderName = filename.replace(".zip", "");
        console.log(pathFile);
        if(err){
          console.log(err);
        }
        else{
          var idTheme;
          var resolveFolder = resolve(pathFolder);
          var finalFolder = pathFolder + "/" + folderName;
          extract(pathFile, {dir: resolveFolder}, function(err){
              if(err){
                console.log(err.message);
              }else{
                var con = mysql.createConnection({
                  host: "localhost",
                  user: "root",
                  password: "",
                  database: "capchat"
                });
                con.connect(function(err) {
                  if (err) throw err;
                 
                  var sql = mysql.format("INSERT INTO themes (nom, chemin, id_artiste) VALUES (?,?,?);",[nomTheme, finalFolder, idArtiste]);
                  con.query(sql, function (err, results) {
                    if (err) throw err;
                    console.log("Le theme a bien été ajouté");
                    idTheme = results.insertId
                    res.status(200).redirect('/record-theme/'+idTheme);
                  });
                }); 
              } 
          });
        }
      });
    }else{
      res.send('Foye').end();
    }
});

app.get('/record-theme/:id_theme', function(req, res) {
  var path;
  var idTheme = req.params.id_theme;
  
  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "capchat"
  });
  con.connect(function(err) {
    if (err) throw err;
    var sql = mysql.format("SELECT chemin FROM themes WHERE id=?;", idTheme);
    con.query(sql, function (err, rows, fields) {
      if (err) throw err;
      path = rows[0].chemin;
      fs.readdir(path, function (err, items) {
        path = path.replace(".", "");
        console.log(idTheme);
        res.render('record_theme', {id_theme: idTheme , chemin: path, listFile: items});
      });
    });
  });
});
app.post('/record_theme/:id_theme', function(req, res){
  var idTheme = req.params.id_theme;

  var indices = req.body.indice;
  var nomFichiers = req.body.nomFichier;
  var indices = req.body.indice;
  var choix = req.body.choix;

  console.log(indices);


  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "capchat"
  });

  con.connect(function(err) {
    if (err) throw err;

    for(var i = 0; i<indices.length; i++){
      var sql = mysql.format("INSERT INTO images (id_theme,indice,nom_fichier,type) VALUES (?,?,?,?);", [idTheme, indices[i], nomFichiers[i], choix[i]]);
      con.query(sql, function (err, result) {
        if (err) throw err;
      });
    }
    res.status(200).redirect('/ajout-theme?ajout=1');
  });
  if(res.statusCode != 200){
    res.redirect('/ajout-theme?ajout=0');
  }
});

app.get('/captcha/:id_theme', function(req, res){

  var idTheme = req.params.id_theme;
  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "capchat"
  });


  con.connect(function(err){
    // var cheminResolve = resolve('./public/index.html');
    var chemin;
    var listImage;
    var listTemp = [];
    var imgWin
    var listFinal = [];
    if (err) throw err;
    var sql = mysql.format("SELECT chemin FROM themes WHERE id=?;", idTheme);
    con.query(sql, function (err, rows, fields){
      if(err) throw err;
      chemin = rows[0].chemin.replace("./", "/");;
      
      sql = mysql.format("SELECT * FROM images WHERE id_theme=? and type=?;", [idTheme, 'neutre']);
      con.query(sql, function (err, rows, fields){
          if(err) throw err;
          listImage = rows;

          var cheminF;
          var index;
         
          for(var i = 0; i < 8 ; i++){
            index = getRandomInt(listImage.length);
            cheminF = chemin + "/" + listImage[index].nom_fichier;
            listTemp.push(new Image(listImage[index].id_image, cheminF));
            listImage.splice(index, 1);
          }

          sql = mysql.format("SELECT * FROM images WHERE id_theme=? and type=?;", [idTheme, 'singulier']);
          con.query(sql, function(err, rows, fields){
            if (err) throw err;

            index = getRandomInt(rows.length);
            cheminF = chemin + "/" + rows[index].nom_fichier;
            listTemp.push(new Image(rows[index].id_image, cheminF));

            var indice = rows[index].indice;
            var imgWin = "image"+rows[index].id_image;

            boucle = listTemp.length;
            for(var i = 0; i < boucle; i++){
              index = getRandomInt(listTemp.length);
              listFinal.push(listTemp[index]);
              listTemp.splice(index, 1);
            }

            res.status(200).render('captcha', {lesImages : listFinal, lindice : indice, winner : imgWin, idTheme : idTheme});
          });
          
        }); 
    });
  
  });
  if(res.statusCode != 200 ){
    res.end('wsh'); 
  }
});

app.get('/captcha_public/:id_theme', function(req, res){

  var idTheme = req.params.id_theme;
  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "capchat"
  });


  con.connect(function(err){
    // var cheminResolve = resolve('./public/index.html');
    var chemin;
    var listImage;
    var listTemp = [];
    var imgWin
    var listFinal = [];
    if (err) throw err;
    var sql = mysql.format("SELECT chemin FROM themes WHERE id=?;", idTheme);
    con.query(sql, function (err, rows, fields){
      if(err) throw err;
      chemin = rows[0].chemin.replace("./", "/");;
      
      sql = mysql.format("SELECT * FROM images WHERE id_theme=? and type=?;", [idTheme, 'neutre']);
      con.query(sql, function (err, rows, fields){
          if(err) throw err;
          listImage = rows;

          var cheminF;
          var index;
         
          for(var i = 0; i < 8 ; i++){
            index = getRandomInt(listImage.length);
            cheminF = chemin + "/" + listImage[index].nom_fichier;
            listTemp.push(new Image(listImage[index].id_image, cheminF));
            listImage.splice(index, 1);
          }

          sql = mysql.format("SELECT * FROM images WHERE id_theme=? and type=?;", [idTheme, 'singulier']);
          con.query(sql, function(err, rows, fields){
            if (err) throw err;

            index = getRandomInt(rows.length);
            cheminF = chemin + "/" + rows[index].nom_fichier;
            listTemp.push(new Image(rows[index].id_image, cheminF));

            var indice = rows[index].indice;
            var imgWin = "image"+rows[index].id_image;

            boucle = listTemp.length;
            for(var i = 0; i < boucle; i++){
              index = getRandomInt(listTemp.length);
              listFinal.push(listTemp[index]);
              listTemp.splice(index, 1);
            }

            res.status(200).render('captcha_public', {lesImages : listFinal, lindice : indice, winner : imgWin, idTheme : idTheme});
          });
          
        }); 
    });
  
  });
  if(res.statusCode != 200 ){
    res.end('wsh'); 
  }
});
app.get('/delete/:id_theme', function(req, res) {
  var idTheme = req.params.id_theme;

  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "capchat"
  });

  con.connect(function(err){
    if(err) throw err;

    var sql = mysql.format("DELETE FROM themes WHERE id=?", idTheme);
    con.query(sql, function(err, result){
      if(err) throw err;

      sql = mysql.format("DELETE FROM images WHERE id_theme=?", idTheme);
      con.query(sql, function(err, resut){
        if(err) throw err;

        res.status(200).redirect('/themes?delete=1');
      });
    });
  });
  if(res.statusCode != 200){
    res.redirect("/themes?delete=0");
  }
});

app.get('/themes', function(req, res) {
  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "capchat"
  });

  con.connect(function(err){
    if (err) throw err;

    var sql = mysql.format("SELECT * FROM themes;");
    con.query(sql, function(err, rows, fields){
      if (err) throw err;
      var listTheme = rows;

      res.render("themes", {list : listTheme})
    });
  });
  // res.render('themes');
});

app.get('/artistes', function(req, res){
  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "capchat"
  });

  con.connect(function(err){
    if (err) throw err;

    var sql = mysql.format("SELECT * FROM artiste;");
    con.query(sql, function(err, rows, fields){
      if (err) throw err;
      var listArtistes = rows;

      res.render("artistes", {list : listArtistes})
    });
  });
});

app.get('/generer', function (req, res){
  var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "capchat"
  });

  con.connect(function(err){
    if (err) throw err;

    var sql = mysql.format("SELECT * FROM themes;");
    con.query(sql, function(err, rows, fields){
      if (err) throw err;
      var listTheme = rows;

      res.render("generer", {list : listTheme})
    });
  });

  // res.render('generer');
});

app.post('/generer', function (req, res){
  var idTheme = req.body.theme;
  var redirection = "/captcha/"+idTheme;

  res.redirect(redirection);
});

app.get('/victoire/:idTheme', function(req, res){
    var lienPublic = "http://localhost:8080/captcha_public/"+req.params.idTheme;
    res.render('victoire', {lien: lienPublic});
});

app.get('/victoire', function(req, res){
    res.render('victoire_public');
});

app.use(function(req, res, next){
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(404).send('Lieu inconnu :'+req.originalUrl);
});

app.listen(8080);


function Image(unId, unChemin){
  var id;
  var cheminF;

  this.id = unId;
  this.cheminF = unChemin;

  function id(){return this.id}
  function cheminF(){return this.cheminF}
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
