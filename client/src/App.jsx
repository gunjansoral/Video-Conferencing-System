import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';

function App() {
    const [roomId, setRoomId] = useState('');
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
        // Handle WebRTC signaling
        socket.on('offer', async (data) => {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);

            socket.emit('answer', {
                answer,
            });
        });

        socket.on('answer', async (data) => {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        });

        socket.on('ice-candidate', async (data) => {
            try {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
                console.error('Error adding received ice candidate', error);
            }
        });
    }, []);

    const joinRoom = async () => {
        try {
            // Request access to the camera and microphone
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
    
            // If the stream is available, assign it to the video element
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
    
            // Create a new RTCPeerConnection
            peerConnection.current = new RTCPeerConnection(configuration);
    
            // Add local stream tracks to the peer connection
            stream.getTracks().forEach((track) => peerConnection.current.addTrack(track, stream));
    
            // Handle ICE candidates
            peerConnection.current.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice-candidate', { candidate: event.candidate });
                }
            };
    
            setConnected(true);
            socket.emit('join-room', roomId);
    
            // Create and send an offer
            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);
    
            socket.emit('offer', { offer });
        } catch (error) {
            console.error('Error accessing media devices:', error);
    
            // Handle specific errors and display appropriate messages
            if (error.name === 'NotFoundError') {
                alert(
                    'No camera or microphone detected. Please connect a camera and microphone and try again.'
                );
            } else if (error.name === 'NotAllowedError') {
                alert(
                    'Access to camera and microphone was denied. Please allow permissions and refresh the page.'
                );
            } else if (error.name === 'NotReadableError') {
                alert(
                    'Your camera or microphone is currently in use by another application. Please close other apps and try again.'
                );
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
                    <div>
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            style={{ width: '45%', margin: '10px' }}
                        />
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            style={{ width: '45%', margin: '10px' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
