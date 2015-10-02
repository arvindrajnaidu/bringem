var http = require("http"),
    https = require("https"),
    fs = require("fs"),
    express = require("express"),
    app = express(),
    port = process.env.PORT || 5000,
    bringem = require('./index'),
    _ = require('lodash'),
    nr = require('newrelic'),
    invitesQ = require('./q').invitesQ;

// var privateKey = fs.readFileSync( __dirname + '/certs/dev/irummy.key' );
// var certificate = fs.readFileSync( __dirname + '/certs/dev/irummy.crt' );

app.use(express.static(process.cwd() + "/client"))

var server = http.createServer(app)

// var server = https.createServer({
//                 key: privateKey,
//                 cert: certificate
//               }, app).listen(port);

var bringem = bringem(server);

if(require.main === module) {
  server.listen(port);
} else {
  module.exports.server = server;
  module.exports.invitesQ = invitesQ;
}
   