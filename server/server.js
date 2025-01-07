const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

app.use(cors());

const rooms = {};

io.on('connection', (socket) => {
    console.log(`New user connected: ${socket.id}`);

    socket.on('join-room', (roomId) => {
        if (!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push(socket.id);

        console.log(`User ${socket.id} joined room ${roomId}`);
        socket.join(roomId);
    });

    socket.on('offer', (data) => {
        socket.to(data.roomId).emit('offer', { offer: data.offer });
    });

    socket.on('answer', (data) => {
        socket.to(data.roomId).emit('answer', { answer: data.answer });
    });

    socket.on('candidate', (data) => {
        socket.to(data.roomId).emit('candidate', { candidate: data.candidate });
    });

    socket.on('leave-room', (data) => {
        socket.leave(data.roomId);
        console.log(`User ${socket.id} left room ${data.roomId}`);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
