const express = require('express'),
      app = express(),
      bodyparser = require('body-parser')
const pg = require('pg');
const crowdClient = require('atlassian-crowd-client');
let CONFIG = require('./config');

app.use(bodyparser.urlencoded());
app.use(bodyparser.json());

// settings
let dbConnectionSettings = {
    user: CONFIG.user,
    password: CONFIG.password,
    host: CONFIG.host,
    port: CONFIG.port,
    database: CONFIG.db,
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

app.get('/test', (req, res) => {
  const client = new pg.Client(dbConnectionSettings);
  client.connect((err) => {
    if (err) {
      console.error('connection error', err.stack)
    } else {
      console.log('connected')
    }
  })
  client.query('SELECT * FROM webt.redux_json')
    .then(result => {
      // DO STUFF
      console.log('result:' + result)
      res.send(result.rows)
    })
    .catch(e => console.error(e.stack))
    .then(() => client.end())
})

app.post('/authorize', function(req, res){
  console.log(req.body)
})

app.post('/requestuserinfo', requestUserInformation);

app.get('/session', (req, res) => res.send('foobar'))

app.listen(3000, () => console.log('Example app listening on port 3000!'))

function requestUserInformation(req, res, next) {
    console.log(req.body)
    var token = req.body.user.userToken;
    console.log(token)
    crowd.session.getUser(token).then(function (user) {
        res.send(user); // AJAX POST callback -response (must send or otherwise POST request will timeout).
    });
}

function requestIsAdminUser(req, res, next) {
    if (rw_allowed) {
        var token = req.body.user.userToken;
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
    var token = req.body.TOKEN;
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
