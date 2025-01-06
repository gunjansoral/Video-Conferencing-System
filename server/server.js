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

// Room management
const rooms = {};

io.on('connection', (socket) => {
    console.log(`New user connected: ${socket.id}`);

    socket.on('join-room', (roomId, userId) => {
        console.log(`${userId} is joining room: ${roomId}`);

        // Add user to the room
        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }
        rooms[roomId].push(userId);

        socket.join(roomId);

        // Notify other participants in the room
        socket.broadcast.to(roomId).emit('user-connected', userId);

        console.log(`Users in room ${roomId}:`, rooms[roomId]);

        // Relay offer to other participants
        socket.on('offer', (data) => {
            console.log(`Offer from ${data.userId} in room ${roomId}`);
            socket.broadcast.to(roomId).emit('offer', data);
        });

        // Relay answer to other participants
        socket.on('answer', (data) => {
            console.log(`Answer from ${data.userId} in room ${roomId}`);
            socket.broadcast.to(roomId).emit('answer', data);
        });

        // Relay ICE candidates to other participants
        socket.on('ice-candidate', (data) => {
            console.log(`ICE Candidate from ${data.userId} in room ${roomId}`);
            socket.broadcast.to(roomId).emit('ice-candidate', data);
        });

        // Handle user disconnection
        socket.on('disconnect', () => {
            console.log(`${userId} disconnected from room ${roomId}`);

            // Remove user from the room
            if (rooms[roomId]) {
                rooms[roomId] = rooms[roomId].filter((id) => id !== userId);

                // If the room is empty, delete it
                if (rooms[roomId].length === 0) {
                    delete rooms[roomId];
                }
            }

            socket.broadcast.to(roomId).emit('user-disconnected', userId);
            console.log(`Users in room ${roomId} after disconnection:`, rooms[roomId]);
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
