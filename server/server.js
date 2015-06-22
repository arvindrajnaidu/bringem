var WebSocketServer = require("ws").Server,
    http = require("http"),
    express = require("express"),
    app = express(),
    port = process.env.PORT || 5000,
    client = require('./client'),
    invitesQ = require('./q').invitesQ;

app.use(express.static(process.cwd() + "/client"))

var server = http.createServer(app)

var wss = new WebSocketServer({server: server})

wss.on("connection", function(ws) {
  client(ws);
});

if(require.main === module) {
  console.log(port);
  server.listen(port);
} else {
  module.exports.server = server;
  module.exports.invitesQ = invitesQ;
}
   