/**
 * Shop Middleware
 * Middleware for shop-related operations
 */

const shopRepository = require('./shop.repository');

/**
 * Attach shop to request for partner routes
 * Requires authenticated user with partner role
 */
async function attachShop(req, res, next) {
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
            });
        }

        // Get shop by owner ID
        const shop = await shopRepository.findShopByOwnerId(userId);
        
        if (!shop) {
            return res.status(404).json({
                success: false,
                error: { code: 'SHOP_NOT_FOUND', message: 'Shop not found for this user' },
            });
        }

        // Attach shop to request
        req.shop = shop;
        next();
    } catch (error) {
        console.error('[ShopMiddleware] Error attaching shop:', error.message);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to load shop' },
        });
    }
}

module.exports = {
    attachShop,
};
