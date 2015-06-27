var http = require("http"),
    express = require("express"),
    app = express(),
    port = process.env.PORT || 5000,
    bringem = require('./index'),
    _ = require('lodash'),
    invitesQ = require('./q').invitesQ;

app.use(express.static(process.cwd() + "/client"))

var server = http.createServer(app)

var bringem = bringem(server);

if(require.main === module) {
  console.log(port);
  server.listen(port);
} else {
  module.exports.server = server;
  module.exports.invitesQ = invitesQ;
}
   