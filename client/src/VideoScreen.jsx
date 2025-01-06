import React, { useEffect, useRef } from 'react';
import socket from './socket';

const VideoScreen = ({ participant, isLocalStream, localStream }) => {
  const videoRef = useRef(null);
  const peerConnection = useRef(null);
  const iceCandidateQueue = useRef([]); // Queue for ICE candidates received before connection is ready

  const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], // STUN server for NAT traversal
  };

  useEffect(() => {
    if (isLocalStream) {
      if (videoRef.current && localStream) {
        videoRef.current.srcObject = localStream;
      }
    } else {
      setupPeerConnection();
    }

    return () => {
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
        console.log(`Generated ICE Candidate for ${participant.userId}`);
        socket.emit('ice-candidate', {
          toUserId: participant.userId,
          candidate: event.candidate,
        });
      }
    };

    // Process queued ICE candidates once peer connection is ready
    iceCandidateQueue.current.forEach((candidate) => {
      console.log(`Adding queued ICE Candidate for ${participant.userId}`);
      peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    });
    iceCandidateQueue.current = []; // Clear queue

    // Handle signaling events
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

    socket.on('ice-candidate', async (data) => {

      console.log(`ice-candidate-on event received :`, data);
      const userId = data.toUserId;
      const candidate = data.candidate;

      console.log(userId, participant.userId, userId === participant.userId)
      // if (userId === participant.userId) {
      console.log(`ICE Candidate received from ${userId}`);
      if (peerConnection.current) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`peer connection:`, peerConnection.current);
        } catch (error) {
          console.error('Error adding ICE Candidate:', error);
        }
      } else {
        console.log('Peer connection not ready, queuing ICE Candidate.');
        iceCandidateQueue.current.push(candidate);
      }
      // }
    });

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
        muted={isLocalStream}
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
