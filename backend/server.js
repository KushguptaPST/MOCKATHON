const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { createServer } = require('http');
require('dotenv').config();

// Import database connection and routes
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const verificationRoutes = require('./routes/verification');
const geofenceRoutes = require('./routes/geofences');
const SocketHandler = require('./socket/socketHandler');
const smsService = require('./services/smsService');

// --- ADDED FIXES ---
// 1. Import the auth middleware
const { auth } = require('./middleware/auth');

// 2. Import the missing database models
const User = require('./models/User');
const Alert = require('./models/Alert');
// -------------------

const app = express();
const PORT = Number(process.env.PORT) || 5002;

// Create HTTP server for Socket.IO
const server = createServer(app);

// Initialize Socket.IO
const socketHandler = new SocketHandler(server);

// Connect to database
connectDB();

// Middleware - Configure helmet to allow Socket.IO CDN
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        process.env.WS_URL || "ws://localhost:5002",
        process.env.WSS_URL || "wss://localhost:5002",
        process.env.API_BASE_URL || "http://localhost:5002"
      ]
    }
  }
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for monitoring dashboard)
app.use(express.static(require('path').join(__dirname, 'public')));

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Smart Tourist Safety System API',
    version: '1.0.0',
    status: 'running'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', verificationRoutes);
app.use(['/api/geofences', '/geofences', '/api/api/geofences'], geofenceRoutes);

// Socket.IO stats endpoint
app.get('/api/socket/stats', (req, res) => {
  res.json(socketHandler.getStats());
});

// Alert statistics endpoint
app.get('/api/alerts/stats', (req, res) => {
  const stats = socketHandler.getAlertStats();
  res.json({
    success: true,
    stats: {
      totalAlerts: stats.totalAlerts || 0,
      activeAlerts: stats.activeAlerts || 0,
      resolvedAlerts: stats.resolvedAlerts || 0,
      lastAlert: stats.lastAlert || null
    }
  });
});

// Get all emergency alerts (for admin)
app.get('/api/alerts/emergency', (req, res) => {
  const alerts = socketHandler.getEmergencyAlerts();
  res.json({
    success: true,
    alerts: alerts || []
  });
});

// Resolve an alert (for admin)
app.post('/api/alerts/:alertId/resolve', async (req, res) => {
  const { alertId } = req.params;
  try {
    const resolvedInMemory = socketHandler.resolveAlert(alertId);
    const resolvedInDatabase = await Alert.findByIdAndUpdate(
      alertId,
      { status: 'resolved', resolvedAt: new Date() },
      { new: true }
    );
    const resolved = resolvedInMemory || Boolean(resolvedInDatabase);
  
    if (resolved) {
      return res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Alert not found'
    });
  } catch (err) {
    console.error('Error resolving alert:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve alert'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    socketStats: socketHandler.getStats()
  });
});

// Safe API Routes
app.post('/api/location/update', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      lastLocation: {
        type: 'Point',
        coordinates: [longitude, latitude],
        timestamp: new Date()
      }
    });
    res.json({ success: true, message: 'Location updated' });
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ success: false, message: 'Failed to update location' });
  }
});

app.get('/api/location/history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const history = user && user.lastLocation ? [user.lastLocation] : [];
    res.json({ success: true, history });
  } catch (err) {
    console.error('Error fetching location history:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch location history' });
  }
});

app.post('/api/emergency/alert', auth, async (req, res) => {
  try {
    const { type, location, message } = req.body;
    const lng = location?.longitude ?? location?.lng ?? 0;
    const lat = location?.latitude ?? location?.lat ?? 0;

    const alert = await Alert.create({
      tourist: req.user._id,
      type: type || 'panic',
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      message
    });
    
    // Store and broadcast the REST alert so admin polling and real-time views agree.
    socketHandler.recordEmergencyAlert({
      alertId: String(alert._id),
      userId: String(req.user._id),
      digitalId: req.user.digitalId,
      type: 'EMERGENCY',
      emergencyType: type || 'panic',
      location: location || { latitude: lat, longitude: lng },
      timestamp: alert.createdAt,
      status: 'ACTIVE',
      message: message || 'Emergency alert triggered'
    });

    // Dispatch Twilio SMS to Emergency Contact
    if (req.user.emergencyContact) {
      smsService.sendEmergencySMS({
        toPhone: req.user.emergencyContact,
        touristName: req.user.name,
        digitalId: req.user.digitalId,
        latitude: lat,
        longitude: lng,
        emergencyType: type || 'PANIC SOS'
      });
    }

    res.status(201).json({ success: true, alertId: alert._id });
  } catch (err) {
    console.error('Error triggering alert:', err);
    res.status(500).json({ success: false, message: 'Failed to trigger alert' });
  }
});

app.get('/api/emergency/history', auth, async (req, res) => {
  try {
    const alerts = await Alert.find({ tourist: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, alerts });
  } catch (err) {
    console.error('Error fetching emergency history:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch emergency history' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

const HOST = process.env.HOST || '0.0.0.0';

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set PORT to an available port and restart the server.`);
  } else {
    console.error('Server error:', err);
  }
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server with Socket.IO running on port ${PORT}`);
  console.log(`📱 Smart Tourist Safety System API`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready for real-time connections`);
});

module.exports = app;
