var chai = require('chai'),
    assert = chai.assert,
    async = require('async'),
    Server = require(process.cwd() + "/server/server"),
    WebSocket = require('ws');


describe('Invites', function() {

  before(function (done) {
    Server.server.listen(5000, done);
  })

  it("should create an invite", function (done) {
    var ws = new WebSocket('ws://localhost:5000');
    ws.on('open', function open() {
      ws.send(JSON.stringify({action : "acceptInvite", body : {ice : "Vannila", desc : "Hi"}}));
      ws.on('message', function (data, flags) {
        var resp = JSON.parse(data);
        assert.ok(resp.event, "inviteCreated");
        assert.equal(Server.invitesQ.q().length, 1);
        ws.close();
        ws = null;
        done();
        // setTimeout(done, 100);
      });
    });
  });

  it("should accept the previous invite", function (done) {
    var ws1, ws2;    
    ws1 = new WebSocket('ws://localhost:5000');
    ws2 = new WebSocket('ws://localhost:5000');

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
      ],
      function (err, res) {
        // Both are open

        ws1.send(JSON.stringify({action : "acceptInvite", body : {ice : "Vannila", desc : "Hi"}}));
        ws2.send(JSON.stringify({action : "acceptInvite", body : {ice : "Chocolate", desc : "Wasup"}}));

        async.parallel([
            function (cb) {
              ws1.on('message', function (data) {
                var resp = JSON.parse(data);
                // console.log("W1 resp event" , resp.event)
                if(resp.event === "inviteAccepted") {
                  cb(null, resp.invite);
                }
              });
            },
            function (cb) {
              ws2.on('message', function (data) {
                var resp = JSON.parse(data);
                // console.log("W2 resp event" , resp.event)
                if(resp.event === "inviteAccepted") {
                  cb(null, resp.invite);  
                }
              });
            }
          ], function (err, results) {

            assert.equal(results[0].id, results[1].id);
            assert.equal(results[0].ice, 'Chocolate');
            assert.equal(results[1].ice, 'Vannila');
            assert.equal(results[0].desc, 'Wasup');
            assert.equal(results[1].desc, 'Hi');
            assert.equal(Server.invitesQ.q().length, 0);

            ws1.close();
            ws2.close();

            done();
        });        
      });
  });

});