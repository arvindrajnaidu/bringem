var invitesQ = require('./q').invitesQ;


module.exports = function Client (ws, options) {

  // Server side events

  ws.inviteAccepted = function (invite) {
    ws.send({event : 'inviteAccepted', invite: invite});
  }

  ws.inviteExpired = function (invite) {
    ws.send({event : 'inviteExpired', invite: invite});
  }

  // Client actions

  ws.cancelInvite = function (invite) {
    invitesQ.remove(invite.id, function (err, inviteId) {
      ws.send({event : 'inviteCancelled', id: inviteId});
    })
  }

  ws.createInvite =  function (params) {
    params.ws = ws;
    invitesQ.push(params, function (err, invite) {
      ws.inviteId = invite.id;
      ws.send(JSON.stringify({event : 'inviteCreated', invite: {id : invite.id}}));
    });
  }

  // We expect client to load and try to accept and invite.
  ws.findInvite = function () {
    invitesQ.pop(function (err, invite) {
      if(invite) {
        ws.send(JSON.stringify({event : 'inviteFound', invite: {id : invite.id, ice: invite.ice, desc: invite.desc}}));
      } else {
        ws.send(JSON.stringify({event : 'inviteNotFound', message: "No invites"}));          
      }
    });
  }

  ws.acceptInvite = function (params) {
    var invitor = options.findWebSocket(params.inviteId);
    invitor.send(JSON.stringify({event : 'inviteAccepted', invite: {id : params.inviteId, ice : params.ice, desc : params.desc}}));    
  }

  ws.on("message", function incoming (message) {
    try {
      var message = JSON.parse(message);
      ws[message.action].apply(this, [message.body]);
    } catch(e) {
      console.log (e);
    }
  });

  ws.on("close", function () {    
    invitesQ.remove(ws.inviteId, function (err) {
    });
  });

}