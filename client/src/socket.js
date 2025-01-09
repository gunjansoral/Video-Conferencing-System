import { io } from 'socket.io-client';
// const socket = io('http://localhost:5000'); // Backend URL
const socket = io('https://video-conferencing-system.onrender.com'); // Backend URL

export default socket;
