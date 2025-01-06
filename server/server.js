const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // React app ka URL
        // origin: 'http://localhost:5173', // React app ka URL
        methods: ['GET', 'POST']
    }
});

app.use(cors());

// Socket connection
io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        console.log(`${userId} joined room: ${roomId}`);

        socket.broadcast.to(roomId).emit('user-connected', userId);

        socket.on('offer', (data) => {
            socket.broadcast.to(roomId).emit('offer', data);
        });

        socket.on('answer', (data) => {
            socket.broadcast.to(roomId).emit('answer', data);
        });

        socket.on('ice-candidate', (data) => {
            socket.broadcast.to(roomId).emit('ice-candidate', data);
        });

        socket.on('disconnect', () => {
            console.log(`${userId} disconnected`);
            socket.broadcast.to(roomId).emit('user-disconnected', userId);
        });
    });
});


const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
