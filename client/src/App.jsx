import React, { useState, useRef, useEffect } from 'react';
import PeerConnection from './services/peerConnection';
import Screen from './components/Screen';

const App = () => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [connected, setConnected] = useState(false);
    const peerConnectionManager = useRef(null);
    const targetUserId = useRef(null);

    useEffect(() => {
        peerConnectionManager.current = new PeerConnection(targetUserId);

        return () => {
            peerConnectionManager.current.close(); // Cleanup on unmount
        };
    }, []);

    const handleStartCamera = async () => {
        const stream = await peerConnectionManager.current.getLocalCameraStream();
        setLocalStream(stream);
    };

    const getRemoteStream = () => peerConnectionManager?.current.getRemoteStream();

    return (
        <div>
            <h1>WebRTC Video Chat</h1>
            <div>
                <button onClick={handleStartCamera}>Start Camera</button>
            </div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                {localStream && <Screen stream={localStream} isLocal />}
                {remoteStream && <Screen stream={remoteStream} isLocal={false} />}
            </div>
        </div>
    );
};

export default App;
