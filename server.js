// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

// Import routes
const authRoutes = require('./routes/authRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const controlRoutes = require('./routes/controlRoutes');

const app = express();
const port = process.env.PORT || 2000;

app.use(cors());
app.use(bodyParser.json());

// Create HTTP server and attach socket.io
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
});

// Make io available in req.app.locals
app.locals.io = io;

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
app.use('/', sensorRoutes);      // includes /sensor-data, /sensor-summary, /sensor-last10
app.use('/', controlRoutes);     // includes /get-control, /set-control (protected)

// Socket.io connection logging (optional)
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Start server (httpServer because of socket.io)
httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
