

var async = require('async'),
    WebSocket = require('ws');

// params : { onLocalVideoStream: fn, onRemoteVideoStream: fn, onDataChannel: fn, onRemoteMessage : fn}
function Bringem (window, navigator, params) {

    var localStream;
    var gameChannel;
    var peerConnection;
    var serverConnection;

    var peerConnectionConfig = {
        'iceServers': [
                {'url': 'stun:stun.services.mozilla.com'}, 
                {'url': 'stun:stun.l.google.com:19302'}
            ]
        };
    var connection = { 
        'optional': [
                {'DtlsSrtpKeyAgreement': true}, 
                {'RtpDataChannels': true }
            ] 
    };

    navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
    var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

    function collectCandidates (cb) {
        var candidates = [];
        peerConnection.onicecandidate = function (event) {
            if(event.candidate) {
                return candidates.push(event.candidate);
            }
            cb(null, candidates);
        };
    }

    function createOffer (cb) {
        peerConnection.createOffer(function (description) {
            peerConnection.setLocalDescription(description, function () {                            
                cb(null, description);
            }, function() {
                console.log('set description error')
            });
        }, function (error) {
            cb(error);
        });    
    }

    function createAnswer (cb) {
        peerConnection.createAnswer(function (description) {
            peerConnection.setLocalDescription(description, function () {                            
                cb(null, description);
            }, function() {
                console.log('set description error')
            });
        }, function (error) {
            cb(error);
        });
    }

    function createDataChannel () {
        gameChannel = peerConnection.createDataChannel("game", {reliable: false});        
        gameChannel.onopen = params.onDataChannel;
        gameChannel.onmessage = params.onRemoteMessage;
    }

    function init () {

        serverConnection = new WebSocket('ws://localhost:5000');
        serverConnection.onmessage = gotMessageFromServer;

        var constraints = {
            video: true,
            audio: true,
        };

        if(navigator.getUserMedia) {
            navigator.getUserMedia(constraints, getUserMediaSuccess, errorHandler);
        } else {
            alert('Your browser does not support getUserMedia API');
        }

        function getUserMediaSuccess(stream) {
            localStream = stream;
            params.onLocalVideoStream(localStream);

            peerConnection = new RTCPeerConnection(peerConnectionConfig, connection);            

            peerConnection.onaddstream = gotRemoteStream;
            peerConnection.addStream(localStream);
            peerConnection.ondatachannel = gotDataChannel;

            gameChannel = peerConnection.createDataChannel("game", {reliable: false});            
            gameChannel.onopen = params.onDataChannel;
            gameChannel.onmessage = params.onRemoteMessage;

            serverConnection.send(JSON.stringify({action : "findInvite"}));
        }        
    }

    function gotMessageFromServer(message) {

        var signal = JSON.parse(message.data);
        if (signal.event === "inviteNotFound") {
            
            // There are no invites to accept. Lets create one
            async.parallel([
                    collectCandidates,
                    createOffer
                ], function (err, results) {
                    var str = JSON.stringify({action : "createInvite", body : {ice : results[0], desc : results[1]}});
                    serverConnection.send(str);
                });

        } else if (signal.event === "inviteFound") {

            // Invite found
            if(signal.invite.desc.sdp) {
                peerConnection.setRemoteDescription(new RTCSessionDescription(signal.invite.desc), function() {
                    // // Create a data channel before you answer
                    async.parallel([
                            collectCandidates,
                            createAnswer
                        ], function (err, results) {
                            var str = JSON.stringify({action : "acceptInvite", body : {inviteId: signal.invite.id, ice : results[0], desc : results[1]}});
                            serverConnection.send(str);
                        });
                }, errorHandler);
            }

            if(signal.invite.ice) {
                signal.invite.ice.forEach(function (ice) {
                    peerConnection.addIceCandidate(new RTCIceCandidate(ice));
                });
            }
        } else if (signal.event === "inviteAccepted") {

            // Invite Accepted
            if(signal.invite.desc.sdp) {
                peerConnection.setRemoteDescription(new RTCSessionDescription(signal.invite.desc), function() {}, errorHandler);
            }

            if(signal.invite.ice) {
                signal.invite.ice.forEach(function (ice) {
                    peerConnection.addIceCandidate(new RTCIceCandidate(ice));
                });
            }

        }
    }

    function gotRemoteStream(event) {
        params.onRemoteVideoStream(event.stream)
    }

    function gotDataChannel(event) {
        console.log("peerConnection.ondatachannel event fired")
        // params.onDataChannel(event.channel)
        // gameChannel = event.channel;
        // gameChannel.onmessage = params.onRemoteMessage;
        // params.onMessagingOpen(event);        
    }

    function errorHandler(error) {
        console.log(error);
    }

    init();
    
    return {
        send : function (message) {
            gameChannel.send(message);
        }
    }
}

module.exports = Bringem;
