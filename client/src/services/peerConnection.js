export const initializePeerConnection = (stream, peerConnection) => {
  peerConnection.current = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  stream.getTracks().forEach((track) => {
    console.log("Adding local track:", track);
    peerConnection.current.addTrack(track, stream);
  });


  peerConnection.current.ontrack = (event) => {
    try {
      if (event.streams && event.streams[0]) {
        console.log("Remote stream received:", event.streams[0]);
        setRemoteStream(event.streams[0]);
      } else {
        console.warn("No remote stream found in ontrack event.");
      }
    } catch (error) {
      console.log("ontrack error: ", error)
    }
  };

  peerConnection.current.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("Generated ICE candidate:", event.candidate);
      socket.emit("signal", {
        signal: {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        },
        to: targetUserId.current
      });
    } else {
      console.log("All ICE candidates sent.");
    }
  };
};