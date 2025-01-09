// src/components/VolumeControl.js

import React from 'react';

const VolumeControl = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white">Volume:</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
};

export default VolumeControl;
