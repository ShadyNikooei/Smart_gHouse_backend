require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const { globalAuthGuard } = require('./middleware/auth'); // import global guard

const { initializeMqttClient } = require('./mqttClient');

// Routes
const authRoutes   = require('./routes/authRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const controlRoutes= require('./routes/controlRoutes');
const reportRoutes = require('./routes/reportRoutes');
const gpsRoutes    = require('./routes/gpsRoutes');

// --- create app FIRST ---
const app = express();
const port = process.env.PORT || 2000;

// NOTE: If you rely on cookies + cross-site frontend, configure CORS to whitelist origins explicitly.
// Current setting keeps your previous behavior.
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// socket.io / mqtt / db
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
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

// --- mount routes ---

// 1) Public auth endpoints (NO auth here)
//    Anything under /auth must remain public (login/register/refresh/logout).
app.use('/auth', authRoutes);

// 2) Global Auth Guard: everything AFTER this line requires a valid access token.
//    Requests will pass through globalAuthGuard BEFORE reaching any protected route.
//    - Allows OPTIONS (CORS preflight)
//    - Bypasses public patterns like /auth/* (configured in middleware/auth.js)
//    - Enforces authenticateToken on all others
app.use(globalAuthGuard);

// 3) Protected routers (explicitly protected by the global guard above)
app.use('/', sensorRoutes);
app.use('/', controlRoutes);
app.use('/', reportRoutes);
app.use('/', gpsRoutes);

// --- Redirect non-API GETs to frontend (AFTER routes) ---
// Keep your original block commented; enable when you serve a separate SPA.
// Make sure public paths are consistent with your API_PREFIXES.
// const FRONT_ORIGIN = process.env.FRONT_ORIGIN || 'http://37.152.181.124:3000';
// const API_PREFIXES = [
//   '/auth/', '/sensor-summary', '/sensor-last10',
//   '/get-control', '/set-control', '/reports', '/gps-latest'
// ];

// app.get('*', (req, res, next) => {
//   const isApi = API_PREFIXES.some(p => req.path === p || req.path.startsWith(p));
//   if (isApi) return next();
//   return res.redirect(302, `${FRONT_ORIGIN}${req.originalUrl}`);
// });

// --- start ---
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
