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

function start(isCaller) {

    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onaddstream = gotRemoteStream;
    peerConnection.addStream(localStream);
    async.parallel([
            function (cb) {
                var candidates = [];
                peerConnection.onicecandidate = function (event) {
                    console.log("Candidate", event);
                    if(event.candidate) {
                        return candidates.push(event);
                    }
                    cb(null, candidates);
                };
            },
            function (cb) {
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
        ], function (err, results) {
            var str = JSON.stringify({action : "acceptInvite", body : {ice : results[0], desc : results[1]}});

        });
}

function gotMessageFromServer(message) {
    if(!peerConnection) start(false);

    var signal = JSON.parse(message.data);
    if(signal.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), function() {
            peerConnection.createAnswer(gotDescription, errorHandler);
        }, errorHandler);
    } else if(signal.ice) {
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
    }
}

function gotRemoteStream(event) {
    console.log('got remote stream');
    remoteVideo.src = window.URL.createObjectURL(event.stream);
}

function errorHandler(error) {
    console.log(error);
}
