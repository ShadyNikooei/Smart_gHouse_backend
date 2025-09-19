// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');

const { initializeMqttClient } = require('./mqttClient');

// Routes
const authRoutes = require('./routes/authRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const controlRoutes = require('./routes/controlRoutes');
const reportRoutes = require('./routes/reportRoutes');
const gpsRoutes = require('./routes/gpsRoutes'); // NEW

const app = express();
const port = process.env.PORT || 2000;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
});

app.locals.io = io;

const mqttClient = initializeMqttClient(io);
app.locals.mqttClient = mqttClient;

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set in environment');
  process.exit(1);
}

mongoose.connect(uri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/auth', authRoutes);
app.use('/', sensorRoutes);
app.use('/', controlRoutes);
app.use('/', reportRoutes);
app.use('/', gpsRoutes); // NEW

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
