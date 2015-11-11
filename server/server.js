var http = require("http"),
    https = require("https"),
    fs = require("fs"),
    express = require("express"),
    app = express(),
    port = process.env.PORT || 80,
    securePort = process.env.SECURE_PORT || 443,
    bringem = require('./index'),
    _ = require('lodash'),
    nr = require('newrelic'),
    nconf = require('nconf'),
    invitesQ = require('./q').invitesQ;

nconf.argv()
   .env();

var privateKey, certificate;

if (nconf.get('NODE_ENV') === "production") {
  privateKey = fs.readFileSync( __dirname + '/certs/prod/private-key.key' );
  certificate = fs.readFileSync( __dirname + '/certs/dev/www_rummydaddy_com.crt' );
} else {
  privateKey = fs.readFileSync( __dirname + '/certs/dev/irummy.key' );
  certificate = fs.readFileSync( __dirname + '/certs/dev/irummy.crt' );
}

app.use(express.static(process.cwd() + "/client"));

var server = http.createServer(app);

var secureServer = https.createServer({
                            key: privateKey,
                            cert: certificate
                          }, app);

bringem(server);
bringem(secureServer);

if (require.main === module) {
  server.listen(port);
  secureServer.listen(securePort);
} else {
  module.exports.server = server;
  module.exports.invitesQ = invitesQ;
}