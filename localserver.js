const express = require('express');
const { constants } = require('fs/promises');
const { Server } = require("socket.io");

const app = express();
const io = new Server({
    cors: { origin: "*" } // Allow cross-origin requests
});

// Handle client connections
io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

// Start server on localhost
const PORT = 4000;
const server = app.listen(PORT, () => console.log(`Socket.io server running on port ${PORT}`));

// Attach Socket.io to Express
io.attach(server);

// Listen for data from the webhook server
io.on("webhookData", (data) => {
    console.log("Received Webhook Data:", data);

    // Broadcast to all clients
    io.emit("newData", data);
});

io.on("hello", () =>{
    console.log("hello")
})