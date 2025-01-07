const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins
        methods: ["GET", "POST"], // Allowed HTTP methods
    },
});

const PORT = 5000;

// Use CORS middleware for Express
app.use(cors());

app.get("/", (req, res) => {
    res.send("Server is running!");
});

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join-room", (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
        socket.to(roomId).emit("user-joined", socket.id); // Notify other users in the room
    });

    socket.on("leave-room", (roomId) => {
        socket.leave(roomId);
        console.log(`User ${socket.id} left room ${roomId}`);
        socket.to(roomId).emit("user-left", socket.id); // Notify other users in the room
    });

    socket.on("signal", (data) => {
        const { signal, to } = data;
        console.log("Received signal data:", data); // Log full signal data for debugging

        if (!to) {
            console.error("Invalid signal data: 'to' field is missing");
            return;
        }

        socket.to(to).emit("signal", { signal, from: socket.id }); // Forward signal to the target user
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        const rooms = Array.from(socket.rooms); // Get all rooms the socket is part of
        rooms.forEach((roomId) => {
            if (roomId !== socket.id) { // Avoid removing the socket's own room
                socket.leave(roomId);
                socket.to(roomId).emit("user-left", socket.id); // Notify other users in the room
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
