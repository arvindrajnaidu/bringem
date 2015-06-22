var invitesQ = require('./q').invitesQ;


module.exports = function Client (ws) {

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

  function createInvite (params) {
    params.ws = ws;
    invitesQ.push(params, function (err, invite) {
      ws.inviteId = invite.id;
      ws.send(JSON.stringify({event : 'inviteCreated', invite: {id : invite.id}}));
    });
  }

  // We expect client to load and try to accept and invite.
  ws.acceptInvite = function (params) {
    invitesQ.pop(params, function (err, invite) {
      if(invite) {
        ws.inviteId = invite.id;
        ws.invitor = true;

        // Notify the invitor
        invite.ws.send(JSON.stringify({event : 'inviteAccepted', invite: {id : invite.id, ice : params.ice, desc : params.desc}}));

        // Notify the guest
        ws.send(JSON.stringify({event : 'inviteAccepted', invite: {id : invite.id, ice: invite.ice, desc: invite.desc}}));  

        return;
      }
      createInvite(params);
    })
  }

  // WebRTC
  ws.shareIce = function () {
    // for(var i in this.clients) {
    //     this.clients[i].send(data);
    // }
    // ws.inviteId
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