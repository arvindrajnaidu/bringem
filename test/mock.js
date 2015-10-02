var WebSocket = require('ws');

var ws = new WebSocket('ws://localhost:5000');


ws.on('open', function () {
  ws.send(JSON.stringify({action : "acceptInvite", body : {ice : "Vannila", desc : "Hi"}}));
});

ws.on('message', function (data, flags) {
  var resp = JSON.parse(data);
  console.dir(resp);
});
