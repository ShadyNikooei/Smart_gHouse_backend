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

// === Redirect non-API GET requests to the frontend origin (Scenario A) ===
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || 'http://37.152.181.124:3000';

// Whitelisted API paths exactly matching your current routers
const API_PREFIXES = [
  '/auth/',           // POST /auth/register | /auth/login | /auth/logout
  '/sensor-summary',  // GET
  '/sensor-last10',   // GET
  '/get-control',     // GET
  '/set-control',     // POST
  '/reports',         // GET ?startDate=&endDate=
  '/gps-latest'       // GET
];

// Apply only to GET navigation requests so preflight/POSTs aren’t affected
app.get('*', (req, res, next) => {
  // If the path is one of the API endpoints, let it pass through
  const isApi = API_PREFIXES.some(p =>
    req.path === p || req.path.startsWith(p)
  );
  if (isApi) return next();

  // Otherwise, redirect any non-API route to the frontend host (preserve path & query)
  return res.redirect(302, `${FRONT_ORIGIN}${req.originalUrl}`);
});


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
