var WebSocketServer = require("ws").Server,
    http = require("http"),
    express = require("express"),
    app = express(),
    port = process.env.PORT || 5000,
    client = require('./client'),
    _ = require('lodash'),
    invitesQ = require('./q').invitesQ;

app.use(express.static(process.cwd() + "/client"))

var server = http.createServer(app)

var wss = new WebSocketServer({server: server})

function findWebSocket (inviteId) {
  var ws = _.find(wss.clients, function (client) {
    return client.inviteId === inviteId
  });
  return ws;
}

wss.on("connection", function(ws) {

  client(ws, {
    findWebSocket : findWebSocket
  });

});


if(require.main === module) {
  console.log(port);
  server.listen(port);
} else {
  module.exports.server = server;
  module.exports.invitesQ = invitesQ;
}
   