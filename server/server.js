const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'https://video-conferencing-system-frontend.onrender.com',
        methods: ['GET', 'POST'],
    },
});

app.use(cors());

// Room management
const rooms = {};

io.on('connection', (socket) => {
    console.log(`New user connected: ${socket.id}`);

    socket.on('join-room', (roomId, userId) => {
        if (!roomId || !userId) {
            console.warn('Invalid roomId or userId. Join request ignored.');
            return;
        }

        console.log(`${userId} is joining room: ${roomId}`);

        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }
        if (!rooms[roomId].includes(userId)) {
            rooms[roomId].push(userId);
        }

        socket.join(roomId);

        io.to(roomId).emit('update-participants', rooms[roomId]);
        console.log(`Current users in room ${roomId}:`, rooms[roomId]);

        // Forward WebRTC signaling events
        socket.on('offer', (data) => {
            console.log(`Offer from ${data.userId} in room ${roomId}`);
            socket.broadcast.to(roomId).emit('offer', data);
        });

        socket.on('answer', (data) => {
            console.log(`Answer from ${data.userId} in room ${roomId}`);
            socket.broadcast.to(roomId).emit('answer', data);
        });

        socket.on('ice-candidate', (data) => {
            console.log(`ICE Candidate from ${data.userId} in room ${roomId}`);
            socket.broadcast.to(roomId).emit('ice-candidate', data);
        });

        socket.on('disconnect', () => {
            console.log(`${userId} disconnected from room ${roomId}`);
            if (rooms[roomId]) {
                rooms[roomId] = rooms[roomId].filter((id) => id !== userId);
                if (rooms[roomId].length === 0) {
                    delete rooms[roomId];
                }
            }
            io.to(roomId).emit('update-participants', rooms[roomId]);
        });
    });
});

// Health check
app.get('/', (req, res) => {
    res.send('Server is running');
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
