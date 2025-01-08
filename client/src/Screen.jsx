import React, { useEffect, useRef, useState } from "react";

const Screen = ({ stream, isLocal = true, className = "" }) => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    console.log("Stream in Screen component:", stream);
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play().catch((error) =>
          console.error("Error playing video:", error)
        );
      };
    }
    useEffect(() => {
      if (stream) {
        console.log("Video tracks in Screen component stream:", stream.getVideoTracks());
        console.log("Audio tracks in Screen component stream:", stream.getAudioTracks());
      }
    }, [stream]);

  }, [stream]);


  useEffect(() => {
    if (videoRef.current) {
      // Synchronize video volume and mute state
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const handleFullScreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.mozRequestFullScreen) {
        videoRef.current.mozRequestFullScreen();
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen();
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      } else {
        console.warn("No video track available to toggle.");
      }
    }
  };

  return (
    <div
      className={`screen-container ${className}`}
      style={{ position: "relative", textAlign: "center" }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "auto",
          borderRadius: "10px",
          backgroundColor: "black", // Add a fallback background color
        }}
      ></video>

      <div
        className="controls"
        style={{
          display: "flex",
          justifyContent: "space-around",
          marginTop: "10px",
          backgroundColor: "rgba(0, 0, 0, 0.7)", // Add some styling for better UX
          padding: "10px",
          borderRadius: "5px",
        }}
      >
        <button onClick={handleFullScreen} style={buttonStyle} title="Go Fullscreen">
          Full Screen
        </button>
        <button onClick={toggleMute} style={buttonStyle} title="Mute or Unmute">
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
          aria-label="Adjust Volume"
        />
        <button onClick={toggleCamera} style={buttonStyle} title="Toggle Camera">
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
