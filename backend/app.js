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
const { productRouter, categoryRouter, adminRouter: productAdminRouter, wishlistRouter } = require('./src/modules/product/product.routes');
const { cartRouter, orderRouter, partnerOrderRouter, shipperOrderRouter, voucherRouter } = require('./src/modules/order/order.routes');
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


// API Routes - support both /api and /api/v1 prefixes
const API_PREFIXES = ['/api', '/api/v1'];

API_PREFIXES.forEach(prefix => {
    // Auth & User Module
    app.use(`${prefix}/auth`, authRoutes);

    // Shop & Social Module
    app.use(`${prefix}/shops`, shopRoutes);

    // Catalog & Search Module
    app.use(`${prefix}/products`, productRouter);
    app.use(`${prefix}/categories`, categoryRouter);
    app.use(`${prefix}/admin/products`, productAdminRouter);
    app.use(`${prefix}/wishlist`, wishlistRouter);

    // Cart Module
    app.use(`${prefix}/cart`, cartRouter);

    // Order Module
    app.use(`${prefix}/orders`, orderRouter);
    app.use(`${prefix}/partner/orders`, partnerOrderRouter);
    app.use(`${prefix}/shipper/orders`, shipperOrderRouter);
    app.use(`${prefix}/vouchers`, voucherRouter);

    // Payment Module
    app.use(`${prefix}/payments`, paymentRoutes);

    // Shipping Webhooks (external providers)
    app.use(`${prefix}/webhooks/shipping`, shippingWebhookRoutes);

    // Communication Module
    app.use(`${prefix}/chat`, chatRoutes);
    app.use(`${prefix}/notifications`, notificationRoutes);

    // Shipper Module
    app.use(`${prefix}/shippers`, shipperRoutes);
    app.use(`${prefix}/shipments`, shipmentRoutes);
});

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
