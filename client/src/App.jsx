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
            console.log('Socket connected:', socket.id);
            setUserId(socket.id);
        });

        // Handle when a new user connects to the room
        socket.on('user-connected', (newUserId) => {
            console.log(`New user connected: ${newUserId}`);
            createPeerConnection(newUserId, true); // Create a new peer connection
        });

        // Handle when a user disconnects
        socket.on('user-disconnected', (disconnectedUserId) => {
            console.log(`User disconnected: ${disconnectedUserId}`);
            if (peerConnections.current[disconnectedUserId]) {
                peerConnections.current[disconnectedUserId].close();
                delete peerConnections.current[disconnectedUserId];
            }
            setParticipants((prev) => {
                const updatedParticipants = prev.filter((p) => p.userId !== disconnectedUserId);
                console.log('Updated participants after disconnect:', updatedParticipants);
                return updatedParticipants;
            });
        });

        // Handle WebRTC signaling
        socket.on('offer', async ({ fromUserId, offer }) => {
            console.log(`Offer received from ${fromUserId}`);
            createPeerConnection(fromUserId, false);

            await peerConnections.current[fromUserId].setRemoteDescription(
                new RTCSessionDescription(offer)
            );
            const answer = await peerConnections.current[fromUserId].createAnswer();
            await peerConnections.current[fromUserId].setLocalDescription(answer);

            socket.emit('answer', { toUserId: fromUserId, answer });
        });

        socket.on('answer', async ({ fromUserId, answer }) => {
            console.log(`Answer received from ${fromUserId}`);
            await peerConnections.current[fromUserId].setRemoteDescription(
                new RTCSessionDescription(answer)
            );
        });

        socket.on('ice-candidate', async ({ fromUserId, candidate }) => {
            console.log(`ICE Candidate received from ${fromUserId}`);
            try {
                await peerConnections.current[fromUserId].addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            } catch (error) {
                console.error('Error adding ICE Candidate:', error);
            }
        });

        return () => {
            socket.off('connect');
            socket.off('user-connected');
            socket.off('user-disconnected');
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
            console.log(`Remote track received from ${newUserId}:`, event.streams[0]);
            const [remoteStream] = event.streams;

            setParticipants((prev) => {
                const updatedParticipants = [
                    ...prev.filter((p) => p.userId !== newUserId),
                    { userId: newUserId, stream: remoteStream },
                ];
                console.log('Updated participants after track event:', updatedParticipants);
                return updatedParticipants;
            });
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
                })
                .catch((error) => console.error('Error creating offer:', error));
        }
    };

    const joinRoom = async () => {
        try {
            // Get camera and microphone
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            localStream.current = stream;

            // Add yourself to participants
            setParticipants((prev) => {
                const updatedParticipants = [
                    ...prev,
                    { userId, stream: localStream.current, isLocal: true },
                ];
                console.log('Updated participants after joinRoom:', updatedParticipants);
                return updatedParticipants;
            });

            // Notify server
            socket.emit('join-room', roomId, userId);

            setConnected(true);
        } catch (error) {
            console.error('Error accessing media devices:', error);
        }
    };

    const leaveRoom = () => {
        // Close peer connections
        Object.values(peerConnections.current).forEach((peerConnection) => {
            peerConnection.close();
        });
        peerConnections.current = {};

        // Stop local stream
        if (localStream.current) {
            localStream.current.getTracks().forEach((track) => track.stop());
            localStream.current = null;
        }

        // Notify server
        socket.emit('leave-room', { roomId, userId });

        // Reset state
        setParticipants([]);
        setConnected(false);
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
                    <button
                        onClick={leaveRoom}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            fontSize: '16px',
                            backgroundColor: 'red',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                        }}
                    >
                        Leave Room
                    </button>
                </div>
            )}
        </div>
    );
}

export default App;
