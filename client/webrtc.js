var localVideo;
var remoteVideo;
var peerConnection;
var peerConnectionConfig = {'iceServers': [{'url': 'stun:stun.services.mozilla.com'}, {'url': 'stun:stun.l.google.com:19302'}]};

navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

function pageReady() {
    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');

    // serverConnection = new WebSocket('wss://videorummy.herokuapp.com');
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
}

function getUserMediaSuccess(stream) {
    localStream = stream;
    localVideo.src = window.URL.createObjectURL(stream);
}

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

function start(isCaller) {

    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onaddstream = gotRemoteStream;
    peerConnection.addStream(localStream);

    serverConnection.send(JSON.stringify({action : "findInvite"}));
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

            peerConnection.setRemoteDescription(new RTCSessionDescription(signal.invite.desc), function() {
                // async.parallel([
                //         collectCandidates,
                //         createAnswer
                //     ], function (err, results) {
                //         debugger

                //         var str = JSON.stringify({action : "createInvite", body : {ice : results[0], desc : results[1]}});
                //         // serverConnection.send(str);
                //     });
            }, errorHandler);
        }

        if(signal.invite.ice) {
            signal.invite.ice.forEach(function (ice) {
                peerConnection.addIceCandidate(new RTCIceCandidate(ice));
            });
        }
    }
}

function gotRemoteStream(event) {
    console.log('got remote stream');
    remoteVideo.src = window.URL.createObjectURL(event.stream);
}

function errorHandler(error) {
    console.log(error);
}
