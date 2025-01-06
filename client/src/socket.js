import { io } from 'socket.io-client';
const socket = io('https://video-conferencing-system.onrender.com'); // Backend URL
export default socket;
