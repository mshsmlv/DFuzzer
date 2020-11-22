const express = require('express');
const http = require('http');
const generator = require('./node_generator');

const app = express();
const router = express.Router();
const server = http.createServer(app);

app.use(express.urlencoded({extended: true}));
app.use('/', router);
server.listen(8080);


router.post('/get_next', function(req, res, next) {
  console.log("AFL sent:", req.body.code);
  const mutatedCode = generator.mutateCode(req.body.code);
  console.log("Mutated code:", mutatedCode);
  res.send(mutatedCode);
  return res.end();
});

router.post('/reg_new_path', function(req, res, next) {
  console.log(req.body);
  return res.end();
});
