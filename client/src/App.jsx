import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';

function App() {
    const [roomId, setRoomId] = useState('');
    const [userId, setUserId] = useState('');
    const [connected, setConnected] = useState(false);
    const [participants, setParticipants] = useState([]); // Store all participants and their streams
    const peerConnections = useRef({}); // Store peer connections for each user
    const localStream = useRef(null); // Store the local stream

    const configuration = {
        iceServers: [
            {
                urls: 'stun:stun.l.google.com:19302', // Google's free STUN server
            },
        ],
    };

    useEffect(() => {
        // Set userId on initial connection
        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            setUserId(socket.id); // Set the unique socket ID as userId
        });

        // Handle user joining the room
        socket.on('user-connected', (newUserId) => {
            console.log(`${newUserId} joined the room.`);
            createPeerConnection(newUserId, true);
        });

        // Handle user leaving the room
        socket.on('user-disconnected', (disconnectedUserId) => {
            console.log(`${disconnectedUserId} left the room.`);
            if (peerConnections.current[disconnectedUserId]) {
                peerConnections.current[disconnectedUserId].close();
                delete peerConnections.current[disconnectedUserId];
            }
            setParticipants((prev) =>
                prev.filter((participant) => participant.userId !== disconnectedUserId)
            );
        });

        // Handle incoming WebRTC signaling messages
        socket.on('offer', async ({ fromUserId, offer }) => {
            console.log(`Offer received from ${fromUserId}`);
            createPeerConnection(fromUserId, false);

            await peerConnections.current[fromUserId].setRemoteDescription(
                new RTCSessionDescription(offer)
            );
            const answer = await peerConnections.current[fromUserId].createAnswer();
            await peerConnections.current[fromUserId].setLocalDescription(answer);

            socket.emit('answer', { toUserId: fromUserId, answer });
            console.log('Answer sent');
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
            // Cleanup event listeners when component unmounts
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

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            console.log('Remote track received:', event.streams[0]);
            const [remoteStream] = event.streams;

            setParticipants((prev) => {
                const existingUser = prev.find((p) => p.userId === newUserId);
                if (!existingUser) {
                    return [...prev, { userId: newUserId, stream: remoteStream }];
                }
                return prev;
            });
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`Sending ICE Candidate to ${newUserId}`);
                socket.emit('ice-candidate', { toUserId: newUserId, candidate: event.candidate });
            }
        };

        // If the local stream exists, add tracks to the peer connection
        if (localStream.current) {
            localStream.current.getTracks().forEach((track) => peerConnection.addTrack(track, localStream.current));
        }

        // If initiating the connection, create and send an offer
        if (isInitiator) {
            peerConnection
                .createOffer()
                .then((offer) => peerConnection.setLocalDescription(offer))
                .then(() => {
                    socket.emit('offer', { toUserId: newUserId, offer: peerConnection.localDescription });
                    console.log(`Offer sent to ${newUserId}`);
                })
                .catch((error) => console.error('Error creating offer:', error));
        }
    };

    const joinRoom = async () => {
        try {
            // Request access to the camera and microphone
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            console.log('Local stream acquired:', stream);

            // Store local stream
            localStream.current = stream;

            setParticipants((prev) => [...prev, { userId, stream }]); // Add self to participants

            // Emit join-room event with roomId and userId
            console.log(`Joining room: ${roomId} with userId: ${userId}`);
            socket.emit('join-room', roomId, userId);

            setConnected(true);
        } catch (error) {
            console.error('Error accessing media devices:', error);

            if (error.name === 'NotFoundError') {
                alert('No camera or microphone detected. Please connect and try again.');
            } else if (error.name === 'NotAllowedError') {
                alert('Access to camera/microphone denied. Please allow permissions and try again.');
            } else {
                alert('An unexpected error occurred. Please try again.');
            }
        }
    };

    const leaveRoom = () => {
        // Close all peer connections
        Object.values(peerConnections.current).forEach((peerConnection) => peerConnection.close());
        peerConnections.current = {};

        // Stop local stream tracks
        if (localStream.current) {
            localStream.current.getTracks().forEach((track) => track.stop());
            localStream.current = null;
        }

        // Notify the server
        socket.emit('leave-room', { roomId, userId });

        setParticipants([]);
        setConnected(false);
        console.log('Left the room');
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
                            <video
                                key={participant.userId}
                                ref={(video) => {
                                    if (video && participant.stream) {
                                        video.srcObject = participant.stream;
                                    }
                                }}
                                autoPlay
                                muted={participant.userId === userId} // Mute your own video
                                playsInline
                                style={{
                                    width: '200px',
                                    height: '150px',
                                    border: '1px solid black',
                                }}
                            />
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
