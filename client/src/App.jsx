import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';
import VideoScreen from './VideoScreen';

function App() {
    const [roomId, setRoomId] = useState('');
    const [userId, setUserId] = useState('');
    const [connected, setConnected] = useState(false);
    const [participants, setParticipants] = useState([]); // List of all participants
    const peerConnections = useRef({}); // Store peer connections for each user
    const localStream = useRef(null); // Local video/audio stream

    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }, // Google's free STUN server
        ],
    };

    useEffect(() => {
        // Handle socket connection
        socket.on('connect', () => {
            setUserId(socket.id);
        });

        // Listen for updated participants
        socket.on('update-participants', (updatedParticipants) => {
            setParticipants((prev) => {
                const newParticipants = updatedParticipants.map((id) => {
                    const existing = prev.find((p) => p.userId === id);
                    return existing || { userId: id, stream: null };
                });
                return newParticipants;
            });
        });

        // Handle WebRTC signaling
        socket.on('offer', async ({ fromUserId, offer }) => {
            createPeerConnection(fromUserId, false);
            await peerConnections.current[fromUserId].setRemoteDescription(
                new RTCSessionDescription(offer)
            );
            const answer = await peerConnections.current[fromUserId].createAnswer();
            await peerConnections.current[fromUserId].setLocalDescription(answer);

            socket.emit('answer', { toUserId: fromUserId, answer });
        });

        socket.on('answer', async ({ fromUserId, answer }) => {
            await peerConnections.current[fromUserId].setRemoteDescription(
                new RTCSessionDescription(answer)
            );
        });

        socket.on('ice-candidate', async ({ fromUserId, candidate }) => {
            await peerConnections.current[fromUserId].addIceCandidate(
                new RTCIceCandidate(candidate)
            );
        });

        return () => {
            socket.off('connect');
            socket.off('update-participants');
            socket.off('offer');
            socket.off('answer');
            socket.off('ice-candidate');
        };
    }, []);

    const createPeerConnection = (newUserId, isInitiator) => {
        const peerConnection = new RTCPeerConnection(configuration);

        peerConnections.current[newUserId] = peerConnection;

        // Handle remote streams
        peerConnection.ontrack = (event) => {
            const [remoteStream] = event.streams;
            setParticipants((prev) =>
                prev.map((p) => (p.userId === newUserId ? { ...p, stream: remoteStream } : p))
            );
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    toUserId: newUserId,
                    candidate: event.candidate,
                });
            }
        };

        // Add local stream tracks to the peer connection
        if (localStream.current) {
            localStream.current.getTracks().forEach((track) =>
                peerConnection.addTrack(track, localStream.current)
            );
        }

        // If initiating the connection, send an offer
        if (isInitiator) {
            peerConnection
                .createOffer()
                .then((offer) => peerConnection.setLocalDescription(offer))
                .then(() => {
                    socket.emit('offer', {
                        toUserId: newUserId,
                        offer: peerConnection.localDescription,
                    });
                });
        }
    };

    const joinRoom = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStream.current = stream;

            setParticipants([{ userId, stream, isLocal: true }]);

            socket.emit('join-room', roomId, userId);

            setConnected(true);
        } catch (error) {
            console.error('Error accessing media devices:', error);
        }
    };

    return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <h1>Video Call App</h1>
            {!connected ? (
                <div>
                    <input
                        type="text"
                        placeholder="Enter Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        style={{ padding: '10px', fontSize: '16px' }}
                    />
                    <button
                        onClick={joinRoom}
                        style={{ padding: '10px 20px', marginLeft: '10px', fontSize: '16px' }}
                    >
                        Join Room
                    </button>
                </div>
            ) : (
                <div>
                    <h2>Room: {roomId}</h2>
                    <h3>Your ID: {userId}</h3>
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '20px',
                            justifyContent: 'center',
                        }}
                    >
                        {participants.map((participant) => (
                            <VideoScreen key={participant.userId} participant={participant} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
