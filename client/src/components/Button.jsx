// src/components/Button.js

import React from 'react';

const Button = ({ onClick, label, isActive, icon }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center px-4 py-2 rounded-md text-white ${isActive ? 'bg-green-500' : 'bg-red-500'
        } hover:bg-opacity-80 transition`}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </button>
  );
};

export default Button;
