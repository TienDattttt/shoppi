/**
 * Express Application Setup
 * Configures middleware and routes
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

// CORS configuration - allow dashboard origins with credentials
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
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

// Shop Voucher Routes (Partner)
const shopVoucherRoutes = require('./modules/shop/shop.voucher.routes');
app.use('/api/shop/vouchers', shopVoucherRoutes);

// Shop Review Routes (Partner)
const shopReviewRoutes = require('./modules/shop/shop.review.routes');
app.use('/api/shop/reviews', shopReviewRoutes);

// Shipper Module Routes
const { initializeModule: initShipperModule } = require('./modules/shipper/shipper.module');
initShipperModule(app);

// User Address Routes
const addressRoutes = require('./modules/user/address.routes');
app.use('/api/addresses', addressRoutes);

// Public Location Routes (for shipper registration - no auth required)
const locationRoutes = require('./modules/location/location.routes');
app.use('/api/public', locationRoutes);
app.use('/api/auth/locations', locationRoutes); // Alias for backward compatibility

// Address API Routes (Goong.io autocomplete)
const addressApiRoutes = require('./modules/address/address.routes');
app.use('/api/address', addressApiRoutes);

// Admin Routes
const adminSettingsRoutes = require('./modules/admin/settings.routes');
const adminUsersRoutes = require('./modules/admin/users.routes');
const adminShopsRoutes = require('./modules/admin/shops.routes');
const adminCategoriesRoutes = require('./modules/admin/categories.routes');
const adminOrdersRoutes = require('./modules/admin/orders.routes');
const adminVouchersRoutes = require('./modules/admin/vouchers.routes');
const adminShippersRoutes = require('./modules/admin/shippers.routes');
const adminPostOfficesRoutes = require('./modules/admin/post-offices.routes');
const adminAnalyticsRoutes = require('./modules/shipper/analytics.routes');
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/shops', adminShopsRoutes);
app.use('/api/admin/categories', adminCategoriesRoutes);
app.use('/api/admin/orders', adminOrdersRoutes);
app.use('/api/admin/vouchers', adminVouchersRoutes);
app.use('/api/admin/post-offices', adminPostOfficesRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/shippers', adminShippersRoutes); // Mounted at /api/shippers as frontend expects
// Note: /api/admin/products is handled by product.module.js

// Flash Sale Routes
const { adminRouter: flashSaleAdminRouter, publicRouter: flashSalePublicRouter } = require('./modules/admin/flash-sale.routes');
app.use('/api/admin/flash-sales', flashSaleAdminRouter);
app.use('/api/flash-sales', flashSalePublicRouter);

// Banner Routes
const bannerRoutes = require('./modules/admin/banner.routes');
app.use('/api/banners', bannerRoutes);

// Return Request Routes
const { customerRouter: returnCustomerRouter, partnerRouter: returnPartnerRouter, adminRouter: returnAdminRouter } = require('./modules/order/return.routes');
app.use('/api/returns', returnCustomerRouter);
app.use('/api/partner/returns', returnPartnerRouter);
app.use('/api/admin/returns', returnAdminRouter);

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
