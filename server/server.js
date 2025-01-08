// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins; adjust as needed for production
        methods: ['GET', 'POST'],
    },
});

const PORT = 5000;

app.use(cors());

app.get('/', (req, res) => {
    res.send('WebRTC Signaling Server is running!');
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
        socket.to(roomId).emit('user-joined', socket.id);
    });

    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        console.log(`User ${socket.id} left room ${roomId}`);
        socket.to(roomId).emit('user-left', socket.id);
    });

    socket.on('signal', ({ signal, to }) => {
        console.log(`Signal from ${socket.id} to ${to}:`, signal);
        socket.to(to).emit('signal', { signal, from: socket.id });
    });

    socket.on('disconnecting', () => {
        const rooms = Array.from(socket.rooms);
        rooms.forEach((roomId) => {
            if (roomId !== socket.id) {
                socket.to(roomId).emit('user-left', socket.id);
            }
        });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
