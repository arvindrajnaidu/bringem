var invitesQ = require('./q').invitesQ,
    _ = require('lodash'),
    bunyan = require('bunyan'),
    log = bunyan.createLogger({name: 'bringem'});
    WebSocketServer = require("ws").Server;

function monitor (invite) {
  log.info("Starting monitor for ", invite.id);
  if (invite.ws && invite.ws.readyState === 1) {
      // Clear the invite
      log.info("Invite Expired")
      invitesQ.remove(invite.id, function (err, id) {
        invite.ws.inviteExpired();
        log.info("Sent Expired");
        invite.ws = null;
      });
  } 
}

function getInviteToSend (invite) {
  return {
    id : invite.id,
    ice : invite.ice,
    desc : invite.desc
  }
}

function Client (ws, options) {

  ws.others = [];

  // Server side events

  ws.inviteExpired = function () {
    ws.send(JSON.stringify({event : 'inviteExpired', invite: ws.invite}));
  }

  // Client actions

  ws.cancelInvite = function (invite) {
    invitesQ.remove(ws.inviteId, function (err, id) {
      ws.send(JSON.stringify({event : 'inviteCancelled', id: id}));
    })
  };

  // Tries to accept an invite if any exist, else creates an invite
  ws.acceptInvite = function (invite) {
    
    invitesQ.pop(function (err, pendingInvite) {
      if(pendingInvite) {        
        log.info("Pending invite found");        

        // Pair them
        ws.send(JSON.stringify({event : 'inviteFound', body: getInviteToSend(pendingInvite)}));
        pendingInvite.ws.send(JSON.stringify({event : 'inviteAccepted', invite: getInviteToSend(invite)}));

        // Remember the ids - May not need this
        ws.inviteId = invite.id;
        //pendingInvite.ws.invitId = invite.id;

        // Remember others in this group
        ws.others.push(pendingInvite.ws);
        pendingInvite.ws.others.push(ws);

        // Remove reference to ws from pending invite
        pendingInvite.ws = null;
      } else {
        invite.ws = ws;
        log.info("No pending invites. Creating one");
        invitesQ.push(invite, function (err, invite) {             
          ws.inviteId = invite.id;
          ws.send(JSON.stringify({event : 'inviteCreated', body: getInviteToSend(invite)}));
          setTimeout(monitor.bind(null, invite), 20 * 1000);
        });        
      }
    });
  };

  ws.sync = function (game) {
    log.info("Sync request occured");
    ws.others.forEach(function (ws) {
      ws.send(JSON.stringify({event: "sync", body : game}));
    });
  };

  ws.on("message", function incoming (message) {    
    try {
      log.info(message);
      var message = JSON.parse(message);
      ws[message.action].apply(this, [message.body]);
    } catch(e) {
      console.log (e);
    }
  });

  ws.on("close", function () {    
    if (ws.inviteId) {
      invitesQ.remove(ws.inviteId, function (err) {

      });      
    }
    log.info("We have to let the others know you have disconnected", ws.others.length);
    ws.others.forEach(function (ws) {      
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({event: "leftGroup", body : {id : ws.id || null}}));
        ws.others = [];        
      }
    });
  });

}


module.exports = function (serverOrPort) {

  function findWebSocket (inviteId) {
    var ws = _.find(wss.clients, function (client) {
      return client.inviteId === inviteId
    });
    return ws;
  }  

  var wss;
  if (typeof serverOrPort === "number") {
    wss = new WebSocketServer({port: serverOrPort})
  } else {
    wss = new WebSocketServer({server: serverOrPort})
  }

  wss.on("connection", function(ws) {
    console.log("Connection");
    Client(ws, {
      findWebSocket : findWebSocket
    });

  });
}