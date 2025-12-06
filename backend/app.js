/**
 * Express Application Entry Point
 * E-commerce Platform Backend - Modular Monolith Architecture
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import shared utilities
const { errorHandler, notFoundHandler } = require('./src/shared/utils/error.util');
const { initializeServices } = require('./src/shared/init');

// Import module routes
const authRoutes = require('./src/modules/auth/auth.routes');
const productRoutes = require('./src/modules/product/product.routes');
const orderRoutes = require('./src/modules/order/order.routes');
const paymentRoutes = require('./src/modules/order/payment.routes');
const shippingWebhookRoutes = require('./src/modules/order/shipping-webhook.routes');
const shopRoutes = require('./src/modules/shop/shop.routes');
const chatRoutes = require('./src/modules/chat/chat.routes');
const notificationRoutes = require('./src/modules/notification/notification.routes');
const shipperRoutes = require('./src/modules/shipper/shipper.routes');
const shipmentRoutes = require('./src/modules/shipper/shipment.routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});


// API Routes - v1
const API_PREFIX = '/api/v1';

// Auth & User Module
app.use(`${API_PREFIX}/auth`, authRoutes);

// Shop & Social Module
app.use(`${API_PREFIX}/shops`, shopRoutes);

// Catalog & Search Module
app.use(`${API_PREFIX}/products`, productRoutes);

// Order Module
app.use(`${API_PREFIX}/orders`, orderRoutes);

// Payment Module
app.use(`${API_PREFIX}/payments`, paymentRoutes);

// Shipping Webhooks (external providers)
app.use(`${API_PREFIX}/webhooks/shipping`, shippingWebhookRoutes);

// Communication Module
app.use(`${API_PREFIX}/chat`, chatRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);

// Shipper Module
app.use(`${API_PREFIX}/shippers`, shipperRoutes);
app.use(`${API_PREFIX}/shipments`, shipmentRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize services on startup
const startServer = async () => {
    try {
        await initializeServices();
        console.log('✅ All services initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize services:', error);
        process.exit(1);
    }
};

// Only initialize if not in test mode
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

module.exports = app;
