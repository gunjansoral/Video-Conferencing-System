import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';
import VideoScreen from './VideoScreen';

function App() {
    const [roomId, setRoomId] = useState('');
    const [userId, setUserId] = useState('');
    const [connected, setConnected] = useState(false);
    const [participants, setParticipants] = useState([]); // List of all participants
    const localStream = useRef(null); // Local video/audio stream

    useEffect(() => {
        socket.on('connect', () => {
            setUserId(socket.id);
        });

        socket.on('update-participants', (updatedParticipants) => {
            console.log('Participants updated:', updatedParticipants);
            setParticipants(updatedParticipants.map((id) => ({ userId: id })));
        });

        return () => {
            socket.off('connect');
            socket.off('update-participants');
        };
    }, []);

    const joinRoom = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            localStream.current = stream;

            setParticipants([{ userId, isLocal: true }]);
            socket.emit('join-room', roomId, userId);
            setConnected(true);
        } catch (error) {
            console.error('Error accessing media devices:', error);
        }
    };

    const leaveRoom = () => {
        socket.emit('leave-room', { roomId, userId });
        setParticipants([]);
        setConnected(false);
        if (localStream.current) {
            localStream.current.getTracks().forEach((track) => track.stop());
            localStream.current = null;
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
                            <VideoScreen
                                key={participant.userId}
                                participant={participant}
                                isLocalStream={participant.userId === userId}
                                localStream={localStream.current}
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
