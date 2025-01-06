import React, { useEffect, useRef } from 'react';

const VideoScreen = ({ participant }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    // Assign the participant's stream to the video element
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.isLocal} // Mute local participant video
        style={{
          width: '200px',
          height: '150px',
          border: '1px solid black',
        }}
      />
      <p style={{ textAlign: 'center', marginTop: '10px' }}>
        {participant.isLocal ? 'You' : `User: ${participant.userId}`}
      </p>
    </div>
  );
};

export default VideoScreen;
