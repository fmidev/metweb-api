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

app.post('/authorize', function(req, res){
  console.log(req);
  if(!req.body.params.user.crowdToken){
    res.status(403).send("No token.")
  }else{
    requestUserInformation(req, res, next)
  }
})

app.get('/session', (req, res) => {
  requestUserConfiguration(req, res);
})

app.post('/session', (req, res) => {
  insertUserConfiguration(req, res)
})

app.listen(CONFIG.servicePort, () => console.log('Metweb API listening on port '+CONFIG.servicePort+'!'))

/* Middleware */

function requestUserConfiguration(req, res, next) {
  const client = new pg.Client(dbConnectionSettings);
  client.connect((err) => {
    if (err) {
      console.error('connection error', err.stack)
    } else {
      console.log('connected')
    }
  })
  client.query("SELECT * FROM webt.redux_json WHERE kayttaja_id = " +
    "(SELECT id FROM webt.kayttaja WHERE crowd = $1) LIMIT BY 1", [req.body.params.user.crowdToken])
    .then(result => {
      res.send(result.rows[0].data)
    })
    .catch(e => console.error(e.stack))
    .then(() => client.end())
}

function insertUserConfiguration(req, res, next) {
  const client = new pg.Client(dbConnectionSettings);
  client.connect((err) => {
    if (err) {
      console.error('connection error', err.stack)
    } else {
      console.log('connected')
    }
  })
  client.query("INSERT INTO webt.redux_json (id, data) VALUES ((SELECT kayttaja_id FROM webt.kayttaja WHERE crowd = $1), $2)", [req.body.params.user.crowdToken, req.body.params.sessions])
    .then(result => {
      res.send(result.rows[0].data)
    })
    .catch(e => console.error(e.stack))
    .then(() => client.end())
}

function requestUserInformation(req, res, next) {
    console.log(req.body.params)
    var token = req.body.params.user.userToken;
    console.log(token)
    crowd.session.getUser(token
    ).then(function (user) {
        res.status(200).send(user); // AJAX POST callback -response (must send or otherwise POST request will timeout).
    });
}

function requestIsAdminUser(req, res, next) {
    if (rw_allowed) {
        var token = req.body.params.user.userToken;
        crowd.session.getUser(token).then(function (user) {
            crowd.group.users.get("ilmanlaatu_meta_admin", user.username).then(function () {
                res.send(true); // AJAX POST callback -response (must send or otherwise POST request will timeout).
            }).catch(function () {
                res.send(false); // AJAX POST callback -response (must send or otherwise POST request will timeout).
            });
        }).catch(function () {
            res.send(false); // AJAX POST callback -response (must send or otherwise POST request will timeout).
        });
    } else {
        res.send(false); // AJAX POST callback -response (must send or otherwise POST request will timeout).
    }
}

function logOffUser(req, res, next) {
    var token = req.body.params.user.crowdToken;
    crowd.session.getUser(token).then(function (user) {
        crowd.session.removeAll(user.username).then(function () {
            crowd.session.destroy();
            res.send(true);  // AJAX POST callback -response (must send or otherwise POST request will timeout).
        }).catch(function () {
            res.send(false); // AJAX POST callback -response (must send or otherwise POST request will timeout).
        });
    }).catch(function () {
        res.send(false); // AJAX POST callback -response (must send or otherwise POST request will timeout).
    });
}
