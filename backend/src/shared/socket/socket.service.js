/**
 * Socket.io Service for Real-time Communication
 * Handles shipper location tracking and shipment status updates
 * 
 * Inspired by Flutter-Delivery-App reference project
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.io server
 * @param {http.Server} httpServer - HTTP server instance
 */
function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // In production, restrict to specific origins
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
      }
      
      next();
    } catch (error) {
      // Allow connection without auth for tracking (customers don't need to login)
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Shipper authenticates after login
    socket.on('shipper:auth', (data) => {
      const { shipperId, token } = data;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.shipperId = shipperId || decoded.userId;
        socket.join(`shipper:${socket.shipperId}`);
        console.log(`Shipper authenticated: ${socket.shipperId}`);
      } catch (error) {
        console.error('Shipper auth failed:', error.message);
      }
    });

    // Shipper emits location update
    socket.on('shipper:location', (data) => {
      const { shipmentId, shipperId, latitude, longitude, heading, speed, timestamp } = data;
      
      // Broadcast to all clients tracking this shipment
      io.to(`tracking:${shipmentId}`).emit(`shipper:location:${shipmentId}`, {
        shipmentId,
        shipperId: shipperId || socket.shipperId,
        latitude,
        longitude,
        heading,
        speed,
        timestamp: timestamp || new Date().toISOString(),
      });
    });

    // Customer joins tracking room for a shipment
    socket.on('tracking:join', (data) => {
      const { shipmentId } = data;
      socket.join(`tracking:${shipmentId}`);
      console.log(`Client ${socket.id} joined tracking:${shipmentId}`);
    });

    // Customer leaves tracking room
    socket.on('tracking:leave', (data) => {
      const { shipmentId } = data;
      socket.leave(`tracking:${shipmentId}`);
      console.log(`Client ${socket.id} left tracking:${shipmentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  console.log('Socket.io initialized');
  return io;
}

/**
 * Get Socket.io instance
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
}

/**
 * Emit shipment status update to all tracking clients
 * @param {string} shipmentId - Shipment ID
 * @param {string} status - New status
 * @param {string} message - Optional message
 */
function emitShipmentStatusUpdate(shipmentId, status, message = null) {
  if (!io) return;
  
  io.to(`tracking:${shipmentId}`).emit('shipment:status', {
    shipmentId,
    status,
    message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit shipper location update (called from backend when location is saved)
 * @param {string} shipmentId - Shipment ID
 * @param {object} location - Location data
 */
function emitShipperLocation(shipmentId, location) {
  if (!io) return;
  
  io.to(`tracking:${shipmentId}`).emit(`shipper:location:${shipmentId}`, {
    shipmentId,
    ...location,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  initializeSocket,
  getIO,
  emitShipmentStatusUpdate,
  emitShipperLocation,
};
