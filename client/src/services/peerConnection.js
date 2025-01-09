import socket from "../socket";

export default class PeerConnection {
  constructor(targetUserId) {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    }); // Initialize immediately

    this.socket = socket; // Socket instance for signaling
    this.targetUserId = targetUserId; // Target user ID for signaling
    this.localStream = null; // Local media stream
    this.remoteStream = null; // Remote media stream

    // Set up event listeners during initialization
    this.setupEventListeners();
  }

  // Set up event listeners for the PeerConnection
  setupEventListeners() {
    socket.on('user-joined', async (userId) => {
      console.log(`User joined: ${userId}`);
      targetUserId.current = userId;
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit('signal', { signal: offer, to: userId });
    });
    socket.on('signal', async ({ signal, from }) => {
      console.log('Signal received:', signal, 'from:', from);

      if (signal.type === 'offer') {
        console.log('Processing offer...');
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit('signal', { signal: answer, to: from });
      } else if (signal.type === 'answer') {
        console.log('Processing answer...');
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.candidate) {
        console.log('Adding ICE candidate:', signal.candidate);
        try {
          // Ensure the candidate object is correctly structured
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate({
              candidate: signal.candidate,
              sdpMid: signal.sdpMid,
              sdpMLineIndex: signal.sdpMLineIndex,
            })
          );
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });


    socket.on('user-left', (userId) => {
      console.log(`User left: ${userId}`);
      setRemoteStream(null);
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
    });
    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        console.log('Remote stream received:', event.streams[0]);
        this.remoteStream = event.streams[0]; // Store remote stream
      } else {
        console.warn('No remote stream found in ontrack event.');
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Generated ICE candidate:', event.candidate);
        this.socket.emit('signal', {
          signal: {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          },
          to: this.targetUserId.current,
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state changed to: ${this.peerConnection.connectionState}`);
    };

    // Handle signaling state changes
    this.peerConnection.onsignalingstatechange = () => {
      console.log(`Signaling state changed to: ${this.peerConnection.signalingState}`);
    };
  }

  closeSocket() {
    socket.off('user-joined');
    socket.off('signal');
    socket.off('user-left');
  }

  // Get local camera stream
  async getLocalCameraStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      this.localStream = stream;

      // Add local tracks to PeerConnection
      stream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, stream);
      });

      return stream;
    } catch (error) {
      console.error('Error accessing local camera stream:', error);
      throw error;
    }
  }

  // Get local screen stream
  async getLocalScreenStream() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      this.localStream = stream;

      // Add local screen tracks to PeerConnection
      stream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, stream);
      });

      return stream;
    } catch (error) {
      console.error('Error accessing screen stream:', error);
      throw error;
    }
  }

  // Get remote stream
  getRemoteStream() {
    return this.remoteStream;
  }

  // Close PeerConnection
  close() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
      console.log('Peer connection closed.');
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.remoteStream = null;
    socket.off('user-joined');
    socket.off('signal');
    socket.off('user-left');
  }
}
