/**
 * Shop Routes
 * API endpoint definitions for shop management
 * 
 * Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 4.1, 5.1, 5.2, 5.3, 6.3
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});
const userFollowRouter = express.Router();

const shopController = require('./shop.controller');
const authMiddleware = require('../auth/auth.middleware');
const { validate, validateQuery, createShopSchema, updateShopSchema, searchShopsSchema } = require('./shop.validator');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * GET /shops
 * List active shops with filters
 * 
 * Query params: q, city, district, category_id, sortBy, sortOrder, page, pageSize
 * Requirement 4.1: Customer can view shop listings
 */
router.get(
  '/',
  validateQuery(searchShopsSchema),
  shopController.listShops
);

/**
 * GET /shops/slug/:slug
 * Get shop by URL slug (public)
 */
router.get(
  '/slug/:slug',
  authMiddleware.optionalAuth,
  shopController.getShopBySlug
);

/**
 * GET /shops/me
 * Get current partner's shop
 * NOTE: Must be before /:id to avoid route conflict
 */
router.get(
  '/me',
  authMiddleware.authenticate,
  authMiddleware.requirePartner,
  shopController.getMyShop
);

/**
 * GET /shops/admin/pending
 * Get pending shops for admin review
 * NOTE: Must be before /:id to avoid route conflict
 * 
 * Requirement 2.1: WHEN Admin views pending shops THEN the Shop_System SHALL
 * display list of shops with status 'pending' sorted by created_at
 */
router.get(
  '/admin/pending',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  shopController.getPendingShops
);

/**
 * GET /shops/:id
 * Get shop details by ID
 * 
 * Requirement 4.1: WHEN a Customer views shop profile THEN the Shop_System SHALL
 * return shop information including name, description, rating, follower count, and product count
 */
router.get(
  '/:id',
  authMiddleware.optionalAuth,
  shopController.getShop
);

/**
 * GET /shops/:id/followers/count
 * Get follower count for a shop (public)
 * 
 * Requirement 6.3: WHEN follower count is requested THEN the Shop_System SHALL
 * return accurate count from database
 */
router.get(
  '/:id/followers/count',
  shopController.getFollowerCount
);


// ============================================
// PARTNER ROUTES (Partner authentication required)
// ============================================

/**
 * POST /shops
 * Register a new shop (Partner only)
 * 
 * Requirement 1.1: WHEN a Partner submits shop registration with required fields
 * THEN the Shop_System SHALL create a new Shop with status 'pending'
 */
router.post(
  '/',
  authMiddleware.authenticate,
  authMiddleware.requirePartner,
  validate(createShopSchema),
  shopController.createShop
);

/**
 * PATCH /shops/:id
 * Update shop information (Partner only - must own the shop)
 * 
 * Requirement 3.1: WHEN a Partner updates shop profile THEN the Shop_System SHALL
 * validate and save changes
 */
router.patch(
  '/:id',
  authMiddleware.authenticate,
  authMiddleware.requirePartner,
  validate(updateShopSchema),
  shopController.updateShop
);

/**
 * POST /shops/:id/logo
 * Upload shop logo (Partner only)
 */
router.post(
  '/:id/logo',
  authMiddleware.authenticate,
  authMiddleware.requirePartner,
  upload.single('logo'),
  shopController.uploadLogo
);

/**
 * POST /shops/:id/banner
 * Upload shop banner (Partner only)
 */
router.post(
  '/:id/banner',
  authMiddleware.authenticate,
  authMiddleware.requirePartner,
  upload.single('banner'),
  shopController.uploadBanner
);

/**
 * GET /shops/:id/followers
 * Get shop followers list (Partner dashboard)
 */
router.get(
  '/:id/followers',
  authMiddleware.authenticate,
  authMiddleware.requireAdminOrPartner,
  shopController.getShopFollowers
);


// ============================================
// CUSTOMER ROUTES (Customer authentication required)
// ============================================

/**
 * POST /shops/:id/follow
 * Follow a shop (Customer only)
 * 
 * Requirement 5.1: WHEN a Customer follows a Shop THEN the Shop_System SHALL
 * create follow relationship and increment shop follower_count
 */
router.post(
  '/:id/follow',
  authMiddleware.authenticate,
  authMiddleware.requireCustomer,
  shopController.followShop
);

/**
 * DELETE /shops/:id/follow
 * Unfollow a shop (Customer only)
 * 
 * Requirement 5.2: WHEN a Customer unfollows a Shop THEN the Shop_System SHALL
 * remove follow relationship and decrement shop follower_count
 */
router.delete(
  '/:id/follow',
  authMiddleware.authenticate,
  authMiddleware.requireCustomer,
  shopController.unfollowShop
);

// ============================================
// ADMIN ROUTES (Admin authentication required)
// ============================================

/**
 * POST /shops/:id/approve
 * Approve a shop (Admin only)
 * 
 * Requirement 2.2: WHEN Admin approves a Shop THEN the Shop_System SHALL
 * change status to 'active' and notify Partner via email and SMS
 */
router.post(
  '/:id/approve',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  shopController.approveShop
);

/**
 * POST /shops/:id/reject
 * Reject a shop (Admin only)
 * 
 * Requirement 2.3: WHEN Admin rejects a Shop THEN the Shop_System SHALL
 * change status to 'rejected' and notify Partner with rejection reason
 */
router.post(
  '/:id/reject',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  shopController.rejectShop
);

/**
 * POST /shops/:id/revision
 * Request revision for a shop (Admin only)
 * 
 * Requirement 2.4: WHEN Admin requests revision THEN the Shop_System SHALL
 * change status to 'revision_required' and notify Partner with required changes
 */
router.post(
  '/:id/revision',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  shopController.requestRevision
);

// ============================================
// USER FOLLOW ROUTES (mounted at /api/users)
// ============================================

/**
 * GET /users/me/following
 * Get shops followed by current user (Customer only)
 * 
 * Requirement 5.3: WHEN a Customer views followed shops THEN the Shop_System SHALL
 * return list of followed shops with latest activity
 */
userFollowRouter.get(
  '/me/following',
  authMiddleware.authenticate,
  authMiddleware.requireCustomer,
  shopController.getFollowedShops
);

module.exports = router;
module.exports.shopRoutes = router;
module.exports.userFollowRoutes = userFollowRouter;
