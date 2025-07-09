const express = require('express');
const bodyParser = require('body-parser');
const { io } = require("socket.io-client"); // Import socket.io client
const { buyToken } = require('.');

const app = express();
app.use(bodyParser.json()); // Parse JSON body

// Connect to the local Socket.io server
const socket = io("http://localhost:4000"); 

app.post('/webhook', (req, res) => {
    console.log('Webhook Data Received:', req.body);

    // Send webhook data to local Socket.io server
    buyToken(0.001).catch(console.error);
    socket.emit("webhookData", req.body);

    res.status(200).send('Webhook received');
    socket.emit("hello", "hdbcdhfdhfv");
});

// Expose this server via ngrok so external services can reach it
app.listen(3000, () => console.log('Webhook server running on port 3000'));
