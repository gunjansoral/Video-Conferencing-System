// src/components/Controls.js

import React from 'react';
import Button from './Button';
import VolumeControl from './VolumeControl';

const Controls = ({
  isVideoOn,
  toggleVideo,
  isAudioOn,
  toggleAudio,
  volume,
  setVolume,
}) => {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 p-4 flex justify-around items-center">
      <Button
        onClick={toggleVideo}
        label={isVideoOn ? 'Video Off' : 'Video On'}
        isActive={isVideoOn}
        icon={<i className="fas fa-video"></i>}
      />
      <Button
        onClick={toggleAudio}
        label={isAudioOn ? 'Audio Off' : 'Audio On'}
        isActive={isAudioOn}
        icon={<i className="fas fa-microphone"></i>}
      />
      <VolumeControl value={volume} onChange={setVolume} />
    </div>
  );
};

export default Controls;
