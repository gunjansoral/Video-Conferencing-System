import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';

function App() {
    const [roomId, setRoomId] = useState('');
    const [connected, setConnected] = useState(false);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStream = useRef(null);
    const peerConnection = useRef(null);

    const configuration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };

    useEffect(() => {
        socket.on('offer', async (data) => {
            if (!peerConnection.current) setupPeerConnection();
            await peerConnection.current.setRemoteDescription(data.offer);
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            socket.emit('answer', { roomId, answer });
        });

        socket.on('answer', async (data) => {
            if (peerConnection.current) {
                await peerConnection.current.setRemoteDescription(data.answer);
            }
        });

        socket.on('candidate', async (data) => {
            if (peerConnection.current) {
                try {
                    await peerConnection.current.addIceCandidate(data.candidate);
                } catch (error) {
                    console.error('Error adding received ICE candidate', error);
                }
            }
        });

        return () => {
            socket.off('offer');
            socket.off('answer');
            socket.off('candidate');
        };
    }, [roomId]);

    const setupPeerConnection = () => {
        peerConnection.current = new RTCPeerConnection(configuration);

        peerConnection.current.ontrack = (event) => {
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('candidate', { roomId, candidate: event.candidate });
            }
        };

        if (localStream.current) {
            localStream.current.getTracks().forEach((track) => {
                peerConnection.current.addTrack(track, localStream.current);
            });
        }
    };

    const joinRoom = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStream.current = stream;
            localVideoRef.current.srcObject = stream;

            socket.emit('join-room', roomId);

            setConnected(true);
        } catch (error) {
            console.error('Error accessing media devices:', error);
        }
    };

    const callUser = async () => {
        if (!peerConnection.current) setupPeerConnection();
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        socket.emit('offer', { roomId, offer });
    };

    const leaveRoom = () => {
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        socket.emit('leave-room', { roomId });
        setConnected(false);
        localStream.current.getTracks().forEach((track) => track.stop());
    };

    return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <h1>Simple Video Call</h1>
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
                    <div>
                        <video ref={localVideoRef} autoPlay muted style={{ width: '200px', border: '1px solid black' }} />
                        <video ref={remoteVideoRef} autoPlay style={{ width: '200px', border: '1px solid black' }} />
                    </div>
                    <button
                        onClick={callUser}
                        style={{
                            padding: '10px 20px',
                            fontSize: '16px',
                            margin: '10px',
                            backgroundColor: 'green',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                        }}
                    >
                        Call
                    </button>
                    <button
                        onClick={leaveRoom}
                        style={{
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
