var uuid = require('uuid'),
    _ = require('lodash');

function oneToOneMatch (q) {
  return {
    push : function (payload, cb) {      
      payload.id = uuid.v4();
      q.push(payload);
      cb(null, payload);
    },
    remove : function (inviteId, cb) {
      q = q.filter(function (invite) {
              return invite.id != inviteId
            });
      cb(null, inviteId);
    },
    pop : function (payload, cb) {
      var popped = q.shift()
      cb(null, popped);
    },
    q : function () {
      return q;
    }   
  }
}

function getQ() {
  var q = [];
  return oneToOneMatch(q);
}

module.exports.invitesQ = getQ();