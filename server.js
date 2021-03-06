#!/usr/bin/env node

/*
  Metweb user API
  Table of contents:
  1. Config middleware
  2. Endpoints
  3. Logic middleware
*/

// NOTE: Refactoring the API is a bit unsafe at the time of writing due to WEBT-146. Hence listing some ideas here.
// IDEA: Moving Postgres logic to a helper function. Also, does DB connection need to be initialized for each request? (Crowd connection has to be)
// IDEA: Using Express Router for simpler chained middleware syntax and whatnot

const express = require('express'),
      app = express(),
      bodyParser = require('body-parser'),
      cors = require('cors'),
      helmet = require('helmet')
const pg = require('pg');
const crowdClient = require('atlassian-crowd-client');

const CONFIG = require(__dirname+'/config');


/* 1. Config middleware */

app.use(helmet({
  hsts : false
})); // Security
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

// General error handler
app.use(function(err, req, res, next) {
  if(err){
    console.log(err);
    res.status(err.status || 500).send(res.__("Tapahtui virhe."));
  }else{
    next();
  }
});


/* 2. Endpoints */

app.get('/', (req, res, next) => {
  res.send("Metweb user API v0");
})

app.post('/authorize', function(req, res, next){

  try {
    if(!req.body.params.user.crowdToken){
      res.status(403).send("No token.")
    }else{
      fetchUserInformation(req, res, function(user){
        res.status(200).send(user);
      })
    }
  }
  catch (err) {
    next(err);
  }

})

app.get('/session', (req, res, next) => {

  try {
    fetchUserConfiguration(req, res, function(result){
      res.send(result.rows[0].data)
    });
  }
  catch (err) {
    next(err);
  }

})

app.post('/session', (req, res, next) => {

  try {
    // First insert user. If it doesn't exist, no error is thrown due to ON CONFLICT DO NOTHING
    insertUserIfNotExists(req, res, function(result){
      // Then insert config
      insertUserConfiguration(req, res, function(result){
        res.send(result.rows[0].data)
      })
    })
  }
  catch (err) {
    next(err);
  }

})

app.listen(CONFIG.servicePort, () => console.log('Metweb API listening on port '+CONFIG.servicePort+'!'))


/* 3. Logic middleware */

function insertUserIfNotExists(req, res, next) {
  const client = new pg.Client(dbConnectionSettings);
  client.connect((err) => {
    if (err) {
      console.error('connection error', err.stack)
    } else {
      console.log('connected')
    }
  })
  client.query("INSERT INTO webt.kayttaja (crowd) VALUES ($1) ON CONFLICT DO NOTHING", [req.body.params.user.crowdUser])
    .then(result => { next(result) })
    .catch(next)
    .then(() => client.end())
}

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
    "(SELECT id FROM webt.kayttaja WHERE crowd = $1) ORDER BY timestamp DESC LIMIT 1", [JSON.parse(req.query[0]).user.crowdUser])
    .then(result => { next(result) })
    .catch(next)
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
  client.query("INSERT INTO webt.redux_json (kayttaja_id, data) VALUES ((SELECT id FROM webt.kayttaja WHERE crowd = $1), $2)", [req.body.params.user.crowdUser, req.body.params.sessions])
    .then(result => { next(result) })
    .catch(next)
    .then(() => client.end())
}

// Fetch user info from Crowd
function fetchUserInformation(req, res, next) {
    var token = req.body.params.user.crowdToken;
    //next({user:{name: "foo"}});
    crowd.session.getUser(token)
        .then(user => {next(user)})
        .catch(next);
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
        }).catch(next);
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
        }).catch(next);
    }).catch(next);
}
