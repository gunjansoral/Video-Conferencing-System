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
        if (!userId || !roomId) return;

        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }
        if (!rooms[roomId].includes(userId)) {
            rooms[roomId].push(userId);
        }

        socket.join(roomId);

        io.to(roomId).emit('update-participants', rooms[roomId]);

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

app.get('/', (req, res) => {
    res.send('Server is running');
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
