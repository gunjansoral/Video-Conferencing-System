// src/App.js

import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';
import Screen from './Screen';

const App = () => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [roomId, setRoomId] = useState('');
    const [connected, setConnected] = useState(false);
    const peerConnection = useRef(null);
    const targetUserId = useRef(null);

    useEffect(() => {
        socket.on('user-joined', async (userId) => {
            console.log(`User joined: ${userId}`);
            targetUserId.current = userId;
            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);
            socket.emit('signal', { signal: offer, to: userId });
        });
        socket.on("signal", async ({ signal, from }) => {
            if (signal.candidate) {
                console.log("Adding received ICE candidate:", signal.candidate);
                try {
                    await peerConnection.current.addIceCandidate(
                        new RTCIceCandidate({
                            candidate: signal.candidate,
                            sdpMid: signal.sdpMid,
                            sdpMLineIndex: signal.sdpMLineIndex,
                        })
                    );
                } catch (error) {
                    console.error("Error adding ICE candidate:", error);
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

        return () => {
            socket.off('user-joined');
            socket.off('signal');
            socket.off('user-left');
        };
    }, []);

    useEffect(() => {
        const getLocalStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                setLocalStream(stream);
                initializePeerConnection(stream);
            } catch (error) {
                console.error('Error accessing media devices:', error);
            }
        };

        getLocalStream();
    }, []);

    const initializePeerConnection = (stream) => {
        peerConnection.current = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        stream.getTracks().forEach((track) => {
            console.log("Adding local track:", track);
            peerConnection.current.addTrack(track, stream);
        });


        peerConnection.current.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            }
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Generated ICE candidate:", event.candidate);
                socket.emit("signal", {
                    signal: {
                        candidate: event.candidate.candidate,
                        sdpMid: event.candidate.sdpMid,
                        sdpMLineIndex: event.candidate.sdpMLineIndex,
                    },
                    to: targetUserId.current,
                });
            } else {
                console.log("All ICE candidates sent.");
            }
        };

    };

    const joinRoom = () => {
        if (roomId && !connected) {
            socket.emit('join-room', roomId);
            setConnected(true);
        }
    };

    const leaveRoom = () => {
        if (roomId && connected) {
            socket.emit('leave-room', roomId);
            setConnected(false);
            setRemoteStream(null);
            if (peerConnection.current) {
                peerConnection.current.close();
                peerConnection.current = null;
            }
        }
    };

    return (
        <div>
            <h1>WebRTC Video Chat</h1>
            <div>
                <input
                    type="text"
                    placeholder="Enter Room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                />
                <button onClick={joinRoom} disabled={connected}>
                    Join Room
                </button>
                <button onClick={leaveRoom} disabled={!connected}>
                    Leave Room
                </button>
            </div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                {localStream && <Screen stream={localStream} isLocal={true} />}
                {remoteStream && <Screen stream={remoteStream} isLocal={false} />}
            </div>
        </div>
    );
};

export default App;
