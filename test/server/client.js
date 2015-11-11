var chai = require('chai'),
    assert = chai.assert,
    async = require('async'),
    Server = require(process.cwd() + "/server/server"),
    WebSocket = require('ws');

// var hostname = "192.168.99.100";
// var hostname = "localhost";
// var hostname = "ec2-54-153-102-105.us-west-1.compute.amazonaws.com";
var hostname = "bringem.herokuapp.com";

describe('Invites', function() {

  var ws1, ws2;

  before(function (done) {
    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    Server.server.listen(5000, done);
  })

  beforeEach(function (done) {
    ws1 = new WebSocket('wss://' + hostname);
    ws2 = new WebSocket('wss://' + hostname);
    async.parallel ([
        function (cb) {
          ws1.on('open', function () {
            cb()
          });
        },
        function (cb) {
          ws2.on('open', function () {
            cb()
          });        
        }
      ], done);
  });

  afterEach(function () {
    ws1.close();
    ws2.close();
  });

  it("should create an invite", function (done) {
    ws1.send(JSON.stringify({action : "acceptInvite", body : {ice : "Vannila", desc : "Hi"}}));
    ws1.on('message', function (data, flags) {
      var resp = JSON.parse(data);
      assert.ok(resp.event, "inviteCreated");
      done();
    });
  });

  it("should accept invites", function (done) {

    ws1.send(JSON.stringify({action : "acceptInvite", body : {ice : "Vannila", desc : "Hi"}}));
    ws2.send(JSON.stringify({action : "acceptInvite", body : {ice : "Chocolate", desc : "Wasup"}}));

    async.parallel([
        function (cb) {
          ws1.on('message', function (data) {
            var resp = JSON.parse(data);
            if(resp.event === "inviteCreated") {
              cb(null, resp.body);
            }
          });
        },
        function (cb) {
          ws2.on('message', function (data) {
            var resp = JSON.parse(data);
            if(resp.event === "inviteFound") {
              cb(null, resp.body);  
            }
          });
        }
      ], function (err, results) {

        assert.equal(results[0].id, results[1].id);
        assert.equal(results[0].ice, 'Vannila');
        assert.equal(results[1].ice, 'Vannila');
        assert.equal(results[0].desc, 'Hi');
        assert.equal(results[1].desc, 'Hi');
        assert.equal(Server.invitesQ.q().length, 0);


        done();
    });        
  });

  it.skip("should rsvp", function (done) {

    ws1.send(JSON.stringify({action : "acceptInvite", body : {ice : "Vannila", desc : "Hi"}}));
    ws2.send(JSON.stringify({action : "acceptInvite", body : {ice : "Chocolate", desc : "Wasup"}}));

    ws1.on('message', function (data) {
        var resp = JSON.parse(data);
        if(resp.event === "rsvp") {          
          // Assert data
          assert(resp.invite.ice, "Vannila-Resp");
          done()
        }
      });

    ws2.on('message', function (data) {
        var resp = JSON.parse(data);
        if(resp.event === "inviteFound") {   
          var str = JSON.stringify({
            action : "rsvp", 
            body : {
              id: resp.invite.id, 
              ice : resp.invite.ice + "-Resp", 
              desc : resp.invite.desc + "-Resp"
            }
          });
          ws2.send(str);
        }
      });

  });


});