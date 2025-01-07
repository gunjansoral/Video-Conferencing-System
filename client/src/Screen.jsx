import React, { useEffect, useRef, useState } from "react";

const Screen = ({ stream, isLocal = true, className = "" }) => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleFullScreen = () => {
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    } else if (videoRef.current.webkitRequestFullscreen) {
      videoRef.current.webkitRequestFullscreen();
    } else if (videoRef.current.mozRequestFullScreen) {
      videoRef.current.mozRequestFullScreen();
    } else if (videoRef.current.msRequestFullscreen) {
      videoRef.current.msRequestFullscreen();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  return (
    <div className={`screen-container ${className}`} style={{ position: "relative", textAlign: "center" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        style={{ width: "100%", height: "auto", borderRadius: "10px" }}
      ></video>

      <div className="controls" style={{ display: "flex", justifyContent: "space-around", marginTop: "10px" }}>
        <button onClick={handleFullScreen} style={buttonStyle}>
          Full Screen
        </button>
        <button onClick={toggleMute} style={buttonStyle}>
          {isMuted ? "Unmute" : "Mute"}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          style={{ width: "100px", cursor: "pointer" }}
        />
        <button onClick={toggleCamera} style={buttonStyle}>
          {isCameraOn ? "Camera Off" : "Camera On"}
        </button>
      </div>
    </div>
  );
};

const buttonStyle = {
  padding: "10px 15px",
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  fontSize: "14px",
};

export default Screen;
