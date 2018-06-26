#!/usr/bin/env node

const express = require('express'),
      app = express(),
      bodyParser = require('body-parser'),
      cors = require('cors'),
      methodOverride = require('method-override')
const pg = require('pg');
const crowdClient = require('atlassian-crowd-client');

const CONFIG = require('./config');


/* Settings */

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());
app.options("*", cors())

let dbConnectionSettings = {
    user: CONFIG.dbUser,
    password: CONFIG.dbPassword,
    host: CONFIG.dbHost,
    port: CONFIG.dbPort,
    database: CONFIG.dbName,
    _enableStats: true   // debugging
};

let crowdSettings = {
    baseUrl: CONFIG.crowdBaseUrl,
    application: {
        name: CONFIG.crowdApplication_name,
        password: CONFIG.crowdApplication_pwd
    }
};

let crowd = new crowdClient(crowdSettings);


/* Endpoints */

app.post('/authorize', function(req, res){
  if(!req.body.params.user.crowdToken){
    res.status(403).send("No token.")
  }else{
    fetchUserInformation(req, res, function(user){
      res.status(200).send(user);
    })
  }
})

app.get('/session', (req, res) => {
  fetchUserConfiguration(req, res, function(result){
    res.send(result.rows[0].data)
  });
})

app.post('/session', (req, res) => {
  insertUserConfiguration(req, res, function(result){
    res.send(result.rows[0].data)
  })
})

app.listen(CONFIG.servicePort, () => console.log('Metweb API listening on port '+CONFIG.servicePort+'!'))


/* Middleware */

function fetchUserConfiguration(req, res, next) {
  const client = new pg.Client(dbConnectionSettings);
  client.connect((err) => {
    if (err) {
      console.error('connection error', err.stack)
    } else {
      console.log('connected')
    }
  })
  client.query("SELECT * FROM webt.redux_json WHERE kayttaja_id = " +
    "(SELECT id FROM webt.kayttaja WHERE crowd = $1) ORDER BY timestamp DESC LIMIT 1", [JSON.parse(req.query[0]).user.crowdToken])
    .then(result => { next(result) })
    .catch(e => console.error(e.stack))
    .then(() => client.end())
}

// Insert a configuration row to DB
function insertUserConfiguration(req, res, next) {
  const client = new pg.Client(dbConnectionSettings);
  client.connect((err) => {
    if (err) {
      console.error('connection error', err.stack)
    } else {
      console.log('connected')
    }
  })
  client.query("INSERT INTO webt.redux_json (kayttaja_id, data) VALUES ((SELECT id FROM webt.kayttaja WHERE crowd = $1), $2)", [req.body.params.user.crowdToken, req.body.params.sessions])
    .then(result => { next(result) })
    .catch(e => console.error(e.stack))
    .then(() => client.end())
}

// Fetch user info from Crowd
function fetchUserInformation(req, res, next) {
    var token = req.body.params.user.crowdToken;
    //next({user:{name: "foo"}});
    crowd.session.getUser(token)
        .then(user => {next(user)})
}

// Fetch admin status from Crowd
function fetchIsAdminUser(req, res, next) {
    if (rw_allowed) {
        var token = req.body.params.user.userToken;
        crowd.session.getUser(token).then(function (user) {
            /* TODO: Metweb group here. What's the name? */
            crowd.group.users.get("ilmanlaatu_meta_admin", user.username).then(function () {
                res.send(true);
            }).catch(function () {
                res.send(false);
            });
        }).catch(function () {
            res.send(false);
        });
    } else {
        res.send(false);
    }
}

// Terminate crowd session
function logOffUser(req, res, next) {
    var token = req.body.params.user.crowdToken;
    crowd.session.getUser(token).then(function (user) {
        crowd.session.removeAll(user.username).then(function () {
            crowd.session.destroy();
            res.send(true);
        }).catch(function () {
            res.send(false);
        });
    }).catch(function () {
        res.send(false);
    });
}
