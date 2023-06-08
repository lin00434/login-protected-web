// YOU CAN USE THIS FILE AS REFERENCE FOR SERVER DEVELOPMENT
const createError = require('http-errors');

// Include the express module
const express = require('express');

// helps in extracting the body portion of an incoming request stream
var bodyparser = require('body-parser');

// Path module - provides utilities for working with file and directory paths.
const path = require('path');

// Helps in managing user sessions
const session = require('express-session');

// include the mysql module
var mysql = require('mysql');

// Bcrypt library for comparing password hashes
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Include the express router. 
const utilities = require('./api/utilities');

const port = 8837;

// create an express application
const app = express();

var urlencodedParser = bodyparser.urlencoded({ extended: false });

var fs = require("fs");
var xml2js = require('xml2js');
var parser = new xml2js.Parser();

// Use express-session
// In-memory session is sufficient for this assignment
app.use(session({
        secret: "csci4131secretkey",
        saveUninitialized: true,
        resave: false
    }
));

var dbCon;
fs.readFile(__dirname + '/dbconfig.xml', function(err, data) {
	if (err) throw err;
	console.log("data: \n" + data);    
	parser.parseString(data, function (err, result) {
		if (err) throw err;
		dbCon = mysql.createConnection({  
  			host: result.dbconfig.host[0],
  			user: result.dbconfig.user[0],
			password: result.dbconfig.password[0],
			database: result.dbconfig.database[0],
			port: result.dbconfig.port[0]
		});
		dbCon.connect(function(err) {
		    if (err) {
		      throw err;
		    };
		    console.log("Connected to MYSQL database!");
		});

	});
});
  

// middle ware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// server listens on port 9002 for incoming connections
app.listen(process.env.PORT || port,
() => console.log('Listening...'));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'public/welcome.html'));
});

// GET method route for the contacts page.
// It serves contact.html present in public folder
app.get('/contacts', function(req, res) {
    if(req.session.user){
    	res.sendFile(__dirname + '/public/contacts.html');
    }else{
    	console.log("Please to log in(contacts)");
    	res.redirect(302, '/login');
    }
});

app.get('/addContact', function(req, res) {
    if(req.session.user){
    	res.sendFile(__dirname + '/public/addContact.html');
    }else{
    	console.log("Please to log in(addContact)");
    	res.redirect(302, '/login');
    }
});

app.get('/stock', function(req, res) {
    if(req.session.user){
    	res.sendFile(__dirname + '/public/stock.html');
    }else{
    	console.log("Please to log in(stock)");
    	res.redirect(302, '/login');
    }
});

app.get('/login', function(req, res) {
    if(req.session.user){
    	res.redirect(302,'/contacts');
    	//res.sendFile(__dirname + '/public/contacts.html');
    }else{
    	console.log("Please to log in(login)");
    	res.sendFile(__dirname +'/public/login.html');
    }
    
});

app.get('/getcontacts', function(req, res) {
    if(req.session.user){
        console.log('getcontacts');
    	dbCon.query('SELECT * FROM tbl_contacts',function (err,rows) {
	    if(err){
		throw err;
	    }
	    rows = JSON.parse(JSON.stringify(rows));
	    console.log(rows);
	    const data = [];
	    for(const i in rows){
	    	data.push({
	    		contact_id: rows[i].contact_id,
	    		name: rows[i].name,
	    		category: rows[i].category,
        		location: rows[i].location,
        		contact_info: rows[i].contact_info,
       		email: rows[i].email,
       		//website: rows[i].website,
        		website_url: rows[i].website_url
	    	});
	    }
	    res.json(data);
      }); 
   }else{
   	res.redirect(302,'/login');
   }
});

app.post('/postLoginEntry', urlencodedParser,function(req, res) {
    var loginInfo = req.body;
    var name = loginInfo.login;
    var pwd = loginInfo.password;

    console.log(loginInfo);
	   
    dbCon.query('SELECT * FROM tbl_accounts WHERE acc_login = ?',[name], function (err,rows) {
	if(err){
		throw err;
	} 
	console.log(rows);
	rows = JSON.parse(JSON.stringify(rows));
	console.log(rows.length);
		
	if (rows.length === 1 && bcrypt.compareSync(pwd,rows[0].acc_password)){ 
		//success, set the session, return success
		console.log('rows');
		req.session.user = name;
		res.json({status: 'success'});
	}else{
		res.json({status: 'fail'});
	}
    });
});

app.post('/postContact', urlencodedParser,function(req, res) {
    console.log(req.body);
    if(!req.session.user){
        res.redirect('/login');
    }else{
        console.log("postContact");  
        console.log(req.body);
	var rowToBeInserted = {    
		name         : req.body.name, 
		category     : req.body.cat, 
		location     : req.body.loc,
		contact_info : req.body.info,
		email        : req.body.email,
		//website      : req.body.website_name,
		website_url  : req.body.web
	};
	dbCon.query('INSERT tbl_contacts SET ?', rowToBeInserted, function(err, result) {  
	   if(err) throw err;    
	   res.redirect(302, '/contacts');
	});
    }
});

app.get('/logout', function(req, res){
	if(!req.session.user) {
		
	} else {
		req.session.destroy( function(err) {
		   if(err) throw err;   
		   res.redirect(302, '/login');
		 });
	}
});

app.post('/updateContact', urlencodedParser, function(req, res){
    console.log('/updateContact');
    console.log(req.body);

    var category = req.body.cat;
    var location = req.body.loc;
    var contact_info = req.body.info;
    var email = req.body.email;
    var website = req.body.web;
    
    /*dbCon.query('SELECT * FROM tbl_accounts where name = ?', [req.body.name], function (err,rows) {
    	if(err) throw err; 
    	console.log(rows);
    	if(rows.length > 0) { //other user exists with the name entered by user
    		var response = {flag : false};
		res.send(response);
	} else { */	
	    dbCon.query('UPDATE tbl_contacts set category = ?, location = ?, contact_info = ?, email = ?, website = ? where name = ?',[category, location, contact_info, email, website, req.body.name], function(err, result) {  
		   if(err) throw err;    
		      
		   console.log('update done');
		   var response = {flag : true};
		   res.send(response);
	    });
	//}
    //});
    
});

app.post('/addContact', urlencodedParser,function(req, res) {
    console.log(req.body);
    if(!req.session.user){
        res.redirect('/login');
    }else{
        console.log("addContact");  
        console.log(req.body);
	var rowToBeInserted = {    
		name         : req.body.name, 
		category     : req.body.cat, 
		location     : req.body.loc,
		contact_info : req.body.info,
		email        : req.body.email,
		//website      : req.body.website_name,
		website_url  : req.body.web
	};
	dbCon.query('INSERT tbl_contacts SET ?', rowToBeInserted, function(err, result) {  
	   if(err) throw err;    
	 
	   var response = {flag : true};
	   res.send(response);
	});
    }
});

app.post('/deleteContacts', urlencodedParser, function(req, res){
    console.log('deleteContacts');
    console.log(req.body);
    dbCon.query('DELETE FROM tbl_contacts WHERE name = ?',[req.body.name], function(err, rows) {  
	   if(err) throw err;    
	   
	   console.log('delete done');
	   var response = {flag : true};
	   res.send(response);
    });
});


app.get('/curLogin', function(req, res){
	console.log(req.session);
	res.send(req.session.user);
});

// Makes Express use a router called utilities
app.use('/api', utilities);

// function to return the 404 message and error to client
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    // res.render('error');
    res.send();
});
