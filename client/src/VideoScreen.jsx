import React, { useEffect, useRef } from 'react';
import socket from './socket';

const VideoScreen = ({ participant, isLocalStream, localStream }) => {
  const videoRef = useRef(null);
  const peerConnection = useRef(null);

  const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], // STUN server for NAT traversal
  };

  useEffect(() => {
    if (isLocalStream) {
      // Local stream: Directly attach the stream to the video element
      if (videoRef.current && localStream) {
        videoRef.current.srcObject = localStream;
      }
    } else {
      // Remote stream: Establish WebRTC connection
      setupPeerConnection();
    }

    return () => {
      // Cleanup peer connection on unmount
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
    };
  }, [participant, isLocalStream]);

  const setupPeerConnection = () => {
    peerConnection.current = new RTCPeerConnection(configuration);

    peerConnection.current.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (videoRef.current) {
        videoRef.current.srcObject = remoteStream;
      }
      console.log(`Stream received from ${participant.userId}`);
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          toUserId: participant.userId,
          candidate: event.candidate,
        });
      }
    };

    // Listen for WebRTC signaling events
    socket.on('offer', async ({ fromUserId, offer }) => {
      if (fromUserId === participant.userId) {
        console.log(`Offer received from ${fromUserId}`);
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit('answer', { toUserId: fromUserId, answer });
      }
    });

    socket.on('answer', async ({ fromUserId, answer }) => {
      if (fromUserId === participant.userId) {
        console.log(`Answer received from ${fromUserId}`);
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      }
    });

    socket.on('ice-candidate', async ({ fromUserId, candidate }) => {
      if (fromUserId === participant.userId) {
        console.log(`ICE Candidate received from ${fromUserId}`);
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding ICE Candidate:', error);
        }
      }
    });

    // Initiate connection if this is the caller
    if (!isLocalStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, localStream);
      });

      peerConnection.current
        .createOffer()
        .then((offer) => peerConnection.current.setLocalDescription(offer))
        .then(() => {
          socket.emit('offer', {
            toUserId: participant.userId,
            offer: peerConnection.current.localDescription,
          });
        })
        .catch((error) => console.error('Error creating offer:', error));
    }
  };

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocalStream} // Mute local participant video
        style={{
          width: '200px',
          height: '150px',
          border: '1px solid black',
        }}
      />
      <p style={{ textAlign: 'center', marginTop: '10px' }}>
        {isLocalStream ? 'You' : `User: ${participant.userId}`}
      </p>
    </div>
  );
};

export default VideoScreen;
