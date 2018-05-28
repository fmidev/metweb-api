const express = require('express'),
      app = express(),
      bodyparser = require('body-parser')

app.get('/', (req, res) => res.send('Hello World!'))

app.post('/authorize', function(req, res){
  console.log(req.body)
})

app.get('/session', (req, res) => res.send('foobar'))

app.listen(3000, () => console.log('Example app listening on port 3000!'))