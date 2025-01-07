const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins, you can restrict it by replacing "*" with your specific domain
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
        socket.to(roomId).emit("user-joined", socket.id);
    });

    socket.on("leave-room", (roomId) => {
        socket.leave(roomId);
        console.log(`User ${socket.id} left room ${roomId}`);
        socket.to(roomId).emit("user-left", socket.id);
    });

    socket.on("signal", (data) => {
        const { signal, to } = data;
        socket.to(to).emit("signal", { signal, from: socket.id });
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
