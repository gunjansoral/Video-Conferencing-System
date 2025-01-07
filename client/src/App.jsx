import React, { useState, useEffect, useRef } from "react";
import socket from "./socket";
import Screen from "./Screen";

const App = () => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [roomId, setRoomId] = useState("");
    const [connected, setConnected] = useState(false);

    const peerConnection = useRef(null);

    useEffect(() => {
        socket.on("user-joined", async (userId) => {
            console.log(`User joined: ${userId}`);
            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);
            socket.emit("signal", { signal: offer, to: userId });
        });

        peerConnection.current.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                console.log("Remote stream received:", event.streams[0]);
                setRemoteStream(event.streams[0]);
            } else {
                console.error("No streams found in ontrack event");
            }
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("ICE Candidate generated:", event.candidate);
                socket.emit("signal", { signal: event.candidate, to: roomId });
            }
        };

        socket.on("signal", async ({ signal, from }) => {
            console.log("Signal received:", signal);
            if (signal.type === "offer") {
                console.log("Processing offer from", from);
                await peerConnection.current.setRemoteDescription(signal);
                const answer = await peerConnection.current.createAnswer();
                await peerConnection.current.setLocalDescription(answer);
                socket.emit("signal", { signal: answer, to: from });
            } else if (signal.type === "answer") {
                console.log("Processing answer from", from);
                await peerConnection.current.setRemoteDescription(signal);
            } else if (signal.candidate) {
                console.log("Adding ICE candidate from", from);
                await peerConnection.current.addIceCandidate(signal);
            }
        });


        socket.on("user-left", (userId) => {
            console.log(`User left: ${userId}`);
            setRemoteStream(null);
        });

        return () => {
            socket.off("user-joined");
            socket.off("signal");
            socket.off("user-left");
        };
    }, []);

    useEffect(() => {
        async function getLocalStream() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                setLocalStream(stream);
                initPeerConnection(stream);
            } catch (error) {
                console.error("Error accessing media devices:", error);
            }
        }

        getLocalStream();
    }, []);

    const initPeerConnection = (stream) => {
        peerConnection.current = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        stream.getTracks().forEach((track) => {
            peerConnection.current.addTrack(track, stream);
        });

        peerConnection.current.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("signal", { signal: event.candidate, to: roomId });
            }
        };
    };

    const joinRoom = () => {
        if (roomId && !connected) {
            socket.emit("join-room", roomId);
            setConnected(true);
        }
    };

    const leaveRoom = () => {
        if (roomId && connected) {
            socket.emit("leave-room", roomId);
            setConnected(false);
            setRemoteStream(null);
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
            <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
                {localStream && <Screen stream={localStream} isLocal={true} />}
                {remoteStream && <Screen stream={remoteStream} isLocal={false} />}
            </div>
        </div>
    );
};

export default App;
