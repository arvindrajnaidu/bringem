var uuid = require('uuid'),
    bunyan = require('bunyan'),
    log = bunyan.createLogger({name: 'q'}),
    _ = require('lodash');

function oneToOneMatch (q) {
  return {
    push : function (payload, cb) {      
      payload.id = uuid.v4();
      payload.createdAt = Date.now();
      q.push(payload);
      cb(null, payload);
    },
    remove : function (id, cb) {
      log.info("Removing", id);
      q = q.filter(function (invite) {
              return invite.id != id
            });
      log.info(q.length);
      cb(null, id);
    },
    pop : function (cb) {
      var popped = q.shift()
      cb(null, popped);
    },
    q : function () {
      return q;
    },
    hasInvites : function () {
      return q.length > 0;
    }  
  }
}

function getQ() {
  var q = [];
  return oneToOneMatch(q);
}

module.exports.invitesQ = getQ();