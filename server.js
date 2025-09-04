// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser'); // <-- 1. Added to read cookies

// Import MQTT Client
const { initializeMqttClient } = require('./mqttClient'); // <-- 2. Added to connect to MQTT

// Import routes
const authRoutes = require('./routes/authRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const controlRoutes = require('./routes/controlRoutes');
const reportRoutes = require('./routes/reportRoutes'); // <-- 3. Added for the reporting feature

const app = express();
const port = process.env.PORT || 2000;

app.use(cors({
    origin: true, // or specify your frontend URL e.g., 'http://localhost:3000'
    credentials: true // Important for cookies
}));
app.use(bodyParser.json());
app.use(cookieParser()); // <-- 1. Used as middleware

// Create HTTP server and attach socket.io
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*'
    }
});

// Make io available globally
app.locals.io = io;

// Initialize MQTT Client and make it available globally
const mqttClient = initializeMqttClient(io); // <-- 2. MQTT client initialized
app.locals.mqttClient = mqttClient;          // <-- 2. Made MQTT client available to controllers

// Connect to MongoDB
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
}

mongoose.connect(uri)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/auth', authRoutes);
app.use('/', sensorRoutes);
app.use('/', controlRoutes);
app.use('/', reportRoutes); // <-- 3. Reporting route added to the server

// Socket.io connection logging
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
});

// Start server
httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});