const express = require("express");
const http = require('http')
const generator = require('./node_generator')

var app = express();
var router = express.Router();
var server = http.createServer(app);

app.use(express.urlencoded({ extended: true }))
app.use('/', router);
server.listen(8080);


router.post("/get_next", function(req, res, next) {
    console.log(req.body.code);
    var mutated_code = generator.mutate_code(req.body.code);
    console.log(mutated_code);
    res.send(mutated_code);
    return res.end();
})

router.post("/reg_new_path", function(req, res, next) {
    console.log(req.body);
    return res.end();
})
