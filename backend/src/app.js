/**
 * Express Application Setup
 * Configures middleware and routes
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Trust proxy for correct IP detection
app.set('trust proxy', 1);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
const { authRoutes } = require('./modules/auth');
app.use('/api/auth', authRoutes);

// Product Module Routes
const { initializeModule: initProductModule } = require('./modules/product/product.module');
initProductModule(app);

// Notification Module Routes
const { initializeModule: initNotificationModule } = require('./modules/notification/notification.module');
initNotificationModule(app);

// Order Module Routes
const { initializeModule: initOrderModule } = require('./modules/order/order.module');
initOrderModule(app);

// Chat Module Routes
const chatRoutes = require('./modules/chat/chat.routes');
app.use('/api/chat', chatRoutes);

// Shop Module Routes
const { initializeModule: initShopModule } = require('./modules/shop/shop.module');
initShopModule(app);

// Shipper Module Routes
const { initializeModule: initShipperModule } = require('./modules/shipper/shipper.module');
initShipperModule(app);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle known errors
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }
  
  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
    },
  });
});

module.exports = app;
