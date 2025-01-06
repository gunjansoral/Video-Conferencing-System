const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'https://video-conferencing-system-frontend.onrender.com', // React app URL
        methods: ['GET', 'POST'],
    },
});

app.use(cors());

io.on('connection', (socket) => {
    console.log(`New user connected: ${socket.id}`);

    socket.on('join-room', (roomId, userId) => {
        console.log(`${userId} is joining room: ${roomId}`);
        socket.join(roomId);

        socket.broadcast.to(roomId).emit('user-connected', userId);

        // Log when an offer is received
        socket.on('offer', (data) => {
            console.log(`Offer received from ${data.userId} in room: ${roomId}`);
            socket.broadcast.to(roomId).emit('offer', data);
        });

        // Log when an answer is received
        socket.on('answer', (data) => {
            console.log(`Answer received from ${data.userId} in room: ${roomId}`);
            socket.broadcast.to(roomId).emit('answer', data);
        });

        // Log when an ICE candidate is received
        socket.on('ice-candidate', (data) => {
            console.log(
                `ICE Candidate received from ${data.userId} in room: ${roomId}:`,
                data.candidate
            );
            socket.broadcast.to(roomId).emit('ice-candidate', data);
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`${userId} disconnected from room: ${roomId}`);
            socket.broadcast.to(roomId).emit('user-disconnected', userId);
        });
    });
});

// Health check route
app.get('/', (req, res) => {
    res.send('Server is running');
});

// Start the server
const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
