import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';

function App() {
    const [roomId, setRoomId] = useState('');
    const [userId, setUserId] = useState('');
    const [connected, setConnected] = useState(false);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);

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
            setUserId(socket.id); // Set the unique socket ID as userId
        });

        // Handle incoming WebRTC signaling messages
        socket.on('offer', async (data) => {
            try {
                if (!peerConnection.current) {
                    createPeerConnection(); // Ensure peer connection is initialized
                }

                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);

                socket.emit('answer', { answer });
            } catch (error) {
                console.error('Error handling offer:', error);
            }
        });

        socket.on('answer', async (data) => {
            try {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            } catch (error) {
                console.error('Error handling answer:', error);
            }
        });

        socket.on('ice-candidate', async (data) => {
            try {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
                console.error('Error adding received ice candidate:', error);
            }
        });

        return () => {
            // Cleanup event listeners when component unmounts
            socket.off('connect');
            socket.off('offer');
            socket.off('answer');
            socket.off('ice-candidate');
        };
    }, []);

    const createPeerConnection = () => {
        peerConnection.current = new RTCPeerConnection(configuration);

        // Handle remote stream
        peerConnection.current.ontrack = (event) => {
            const [remoteStream] = event.streams;
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
        };

        // Handle ICE candidates
        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { candidate: event.candidate });
            }
        };
    };

    const joinRoom = async () => {
        try {
            // Request access to the camera and microphone
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Initialize peer connection
            createPeerConnection();

            // Add local tracks to peer connection
            stream.getTracks().forEach((track) => peerConnection.current.addTrack(track, stream));

            setConnected(true);

            // Emit join-room event with roomId and userId
            socket.emit('join-room', roomId, userId);

            // Create and send an offer
            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);

            socket.emit('offer', { offer });
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
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            style={{ width: '45%', border: '1px solid black' }}
                        />
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            style={{ width: '45%', border: '1px solid black' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
