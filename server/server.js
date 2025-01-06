const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'https://video-conferencing-system-frontend.onrender.com', // Replace with your frontend URL
        methods: ['GET', 'POST'],
    },
});

app.use(cors());

// Room management
const rooms = {};

io.on('connection', (socket) => {
    console.log(`New user connected: ${socket.id}`);

    // Join Room
    socket.on('join-room', (roomId, userId) => {
        if (!roomId || !userId) {
            console.warn('Invalid roomId or userId. Join request ignored.');
            return;
        }

        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }
        if (!rooms[roomId].includes(userId)) {
            rooms[roomId].push(userId);
        }

        socket.join(roomId);

        io.to(roomId).emit('update-participants', rooms[roomId]);
        console.log(`Users in room ${roomId}:`, rooms[roomId]);

        // Handle WebRTC signaling
        socket.on('offer', (data) => socket.broadcast.to(roomId).emit('offer', data));
        socket.on('answer', (data) => socket.broadcast.to(roomId).emit('answer', data));
        socket.on('ice-candidate', (data) => {
            if (data && data.candidate) {
                console.log(`Relaying ICE Candidate from ${data.toUserId} in room ${roomId}`);
                socket.broadcast.to(roomId).emit('ice-candidate', data);
            } else {
                console.warn('Invalid ICE candidate received:', data);
            }
        });

        // Leave Room
        socket.on('leave-room', () => {
            console.log(`${userId} left the room ${roomId}`);
            if (rooms[roomId]) {
                rooms[roomId] = rooms[roomId].filter((id) => id !== userId);

                // Notify other participants
                io.to(roomId).emit('update-participants', rooms[roomId]);

                // If the room is empty, delete it
                if (rooms[roomId].length === 0) {
                    delete rooms[roomId];
                }
            }

            socket.leave(roomId); // Remove user from the socket.io room
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log(`${userId} disconnected from room ${roomId}`);
            if (rooms[roomId]) {
                rooms[roomId] = rooms[roomId].filter((id) => id !== userId);

                // Notify other participants
                io.to(roomId).emit('update-participants', rooms[roomId]);

                // If the room is empty, delete it
                if (rooms[roomId].length === 0) {
                    delete rooms[roomId];
                }
            }
        });
    });
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
