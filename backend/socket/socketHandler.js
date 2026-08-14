const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

class SocketHandler {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: true, // Allow all origins
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['*']
      },
      transports: ['polling', 'websocket'], // Try polling first
      allowEIO3: true, // Allow Engine.IO v3 clients
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    this.connectedUsers = new Map(); // Store user connections
    this.userLocations = new Map(); // Store latest user locations
    this.emergencyAlerts = new Map(); // Store emergency alerts
    this.alertCounter = 0; // Track total alerts
    
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Authenticate user on connection
      socket.on('authenticate', (data = {}) => {
        try {
          const { token } = data;
          
          if (!token) {
            return socket.emit('auth_error', { message: 'Authentication failed - Token missing' });
          }

          // Handle admin demo token or admin client
          if (token === 'admin-demo-token' || token === 'admin' || (!token.includes('.') && data.userType === 'admin')) {
            socket.userId = 'admin-dashboard';
            socket.userType = 'admin';
            socket.digitalId = 'ADMIN001';
            socket.join('admin');
            
            this.connectedUsers.set(socket.userId, {
              socketId: socket.id,
              userType: 'admin',
              digitalId: 'ADMIN001',
              connectedAt: new Date()
            });

            socket.emit('authenticated', {
              success: true,
              userId: socket.userId,
              userType: 'admin'
            });

            console.log(`Admin dashboard authenticated: ${socket.id}`);
            return;
          }

          // Handle test token
          if (token === 'test-token') {
            socket.userId = 'test-user';
            socket.userType = data.userType || 'tourist';
            socket.digitalId = 'TEST001';
            if (socket.userType === 'admin') socket.join('admin');
            
            this.connectedUsers.set(socket.userId, {
              socketId: socket.id,
              userType: socket.userType,
              digitalId: 'TEST001',
              connectedAt: new Date()
            });

            socket.emit('authenticated', {
              success: true,
              userId: socket.userId,
              userType: socket.userType
            });
            return;
          }

          // Handle real JWT tokens
          const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

          const decoded = jwt.verify(token, secret);
          
          socket.userId = decoded.id || decoded.userId;
          socket.userType = decoded.role || 'tourist';
          socket.digitalId = decoded.digitalId;
          
          if (socket.userType === 'admin') {
            socket.join('admin');
          }
          
          this.connectedUsers.set(socket.userId, {
            socketId: socket.id,
            userType: socket.userType,
            digitalId: decoded.digitalId,
            connectedAt: new Date()
          });

          socket.emit('authenticated', {
            success: true,
            userId: socket.userId,
            userType: socket.userType
          });

          console.log(`User authenticated: ${socket.userId} (${socket.userType})`);
          
          // Send current user count to admins
          this.broadcastToAdmins('user_stats', {
            totalConnected: this.connectedUsers.size,
            onlineTourists: Array.from(this.connectedUsers.values()).filter(u => u.userType === 'tourist').length
          });

        } catch (error) {
          console.error(`Socket authentication failed for ${socket.id}:`, error.message);
          socket.emit('auth_error', { message: 'Authentication failed - Invalid token' });
        }
      });

      // Handle location updates from mobile app
      socket.on('location_update', (locationData) => {
        const userId = socket.userId || 'anonymous_user';
        const digitalId = socket.digitalId || 'TID_UNKNOWN';

        const enhancedLocationData = {
          userId: userId,
          digitalId: digitalId,
          ...locationData,
          timestamp: new Date(),
          socketId: socket.id
        };

        // Store latest location
        this.userLocations.set(userId, enhancedLocationData);

        // Broadcast location to admins in real-time
        this.broadcastToAdmins('location_update', enhancedLocationData);

        console.log(`Location update from user ${userId}:`, locationData);
      });

      // Handle emergency alerts
      socket.on('emergency_alert', (alertData = {}) => {
        const userId = socket.userId || 'tourist_alert';
        const digitalId = socket.digitalId || 'TID_EMERGENCY';

        const emergencyData = this.recordEmergencyAlert({
          userId: userId,
          digitalId: digitalId,
          type: 'EMERGENCY',
          emergencyType: this.getEmergencyType(alertData.message),
          priority: this.getEmergencyPriority(alertData.message),
          location: alertData.location,
          timestamp: new Date(),
          status: 'ACTIVE',
          message: alertData.message || 'Emergency alert triggered'
        });
        console.log(`EMERGENCY ALERT from user ${userId}:`, emergencyData);

        // Send confirmation to user
        socket.emit('emergency_sent', {
          success: true,
          alertId: emergencyData.alertId,
          message: 'Emergency alert sent to authorities'
        });
      });

      // Handle admin requests for user locations
      socket.on('get_user_locations', () => {
        const allLocations = Array.from(this.userLocations.values());
        socket.emit('user_locations', allLocations);
      });

      // Handle admin requests for online users
      socket.on('get_online_users', () => {
        const onlineUsers = Array.from(this.connectedUsers.entries()).map(([userId, userData]) => ({
          userId,
          ...userData,
          lastLocation: this.userLocations.get(userId) || null
        }));

        socket.emit('online_users', onlineUsers);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          
          // Update admin dashboards
          this.broadcastToAdmins('user_stats', {
            totalConnected: this.connectedUsers.size,
            onlineTourists: Array.from(this.connectedUsers.values()).filter(u => u.userType === 'tourist').length
          });
          
          console.log(`User disconnected: ${socket.userId}`);
        }
      });

      // Ping/Pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date() });
      });
    });
  }

  // Broadcast message to all connected admins
  broadcastToAdmins(event, data) {
    // 1. Emit to admin room
    this.io.to('admin').emit(event, data);

    // 2. Emit to all registered admin sockets
    const adminSockets = Array.from(this.connectedUsers.entries())
      .filter(([userId, userData]) => userData.userType === 'admin')
      .map(([userId, userData]) => userData.socketId);

    adminSockets.forEach(socketId => {
      this.io.to(socketId).emit(event, data);
    });

    // 3. Emit to all connected sockets on the server (like public monitoring web UI)
    this.io.emit(event, data);
  }

  // Send message to specific user
  sendToUser(userId, event, data) {
    const userData = this.connectedUsers.get(userId);
    if (userData) {
      this.io.to(userData.socketId).emit(event, data);
    }
  }

  // Store and broadcast an alert received through either Socket.IO or REST.
  recordEmergencyAlert(alertData) {
    this.alertCounter++;
    const alertId = String(alertData.alertId || `ALERT_${Date.now()}_${this.alertCounter}`);
    const emergencyData = {
      ...alertData,
      alertId,
      status: alertData.status || 'ACTIVE',
      timestamp: alertData.timestamp || new Date()
    };

    this.emergencyAlerts.set(alertId, emergencyData);
    this.broadcastToAdmins('emergency_alert', emergencyData);
    return emergencyData;
  }

  // Get current stats
  getStats() {
    return {
      totalConnected: this.connectedUsers.size,
      onlineTourists: Array.from(this.connectedUsers.values()).filter(u => u.userType === 'tourist').length,
      onlineAdmins: Array.from(this.connectedUsers.values()).filter(u => u.userType === 'admin').length,
      totalLocationsTracked: this.userLocations.size,
      totalAlerts: this.alertCounter,
      activeAlerts: Array.from(this.emergencyAlerts.values()).filter(a => a.status === 'ACTIVE').length
    };
  }

  // Get alert statistics
  getAlertStats() {
    const allAlerts = Array.from(this.emergencyAlerts.values());
    const activeAlerts = allAlerts.filter(alert => alert.status === 'ACTIVE');
    const resolvedAlerts = allAlerts.filter(alert => alert.status === 'RESOLVED');
    const lastAlert = allAlerts.length > 0 ? 
      allAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] : null;

    return {
      totalAlerts: this.alertCounter,
      activeAlerts: activeAlerts.length,
      resolvedAlerts: resolvedAlerts.length,
      lastAlert
    };
  }

  // Get all emergency alerts
  getEmergencyAlerts() {
    return Array.from(this.emergencyAlerts.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Resolve an alert (for admin actions)
  resolveAlert(alertId) {
    const alert = this.emergencyAlerts.get(alertId);
    if (alert) {
      alert.status = 'RESOLVED';
      alert.resolvedAt = new Date();
      this.emergencyAlerts.set(alertId, alert);
      
      // Broadcast resolution to all admins
      this.broadcastToAdmins('alert_resolved', {
        alertId: alertId,
        resolvedAt: alert.resolvedAt,
        alert: alert
      });
      
      // Notify the user who sent the alert that it's been resolved
      if (alert.userId) {
        this.sendToUser(alert.userId, 'alert_resolved', {
          alertId: alertId,
          message: 'Your emergency alert has been resolved by authorities',
          resolvedAt: alert.resolvedAt
        });
      }
      
      console.log(`🔒 Alert ${alertId} resolved successfully`);
      return true;
    }
    console.log(`❌ Alert ${alertId} not found for resolution`);
    return false;
  }

  // Extract emergency priority from message
  getEmergencyPriority(message) {
    const msgLower = String(message || '').toLowerCase();
    if (msgLower.includes('medical') || msgLower.includes('fire') || msgLower.includes('violence') || msgLower.includes('natural_disaster')) {
      return 'CRITICAL';
    } else if (msgLower.includes('panic') || msgLower.includes('accident') || msgLower.includes('harassment')) {
      return 'HIGH';
    } else if (msgLower.includes('theft') || msgLower.includes('lost')) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  // Get emergency type from message
  getEmergencyType(message) {
    const msgLower = String(message || '').toLowerCase();
    if (msgLower.startsWith('medical')) return 'medical';
    if (msgLower.startsWith('fire')) return 'fire';
    if (msgLower.startsWith('accident')) return 'accident';
    if (msgLower.startsWith('theft')) return 'theft';
    if (msgLower.startsWith('harassment')) return 'harassment';
    if (msgLower.startsWith('lost')) return 'lost';
    if (msgLower.startsWith('natural_disaster')) return 'natural_disaster';
    if (msgLower.startsWith('violence')) return 'violence';
    if (msgLower.startsWith('suspicious_activity')) return 'suspicious_activity';
    if (msgLower.startsWith('transport')) return 'transport';
    if (msgLower.startsWith('panic')) return 'panic';
    return 'other';
  }
}

module.exports = SocketHandler;
