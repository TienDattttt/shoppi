/**
 * Rating Service
 * Business logic for shipper rating operations
 * 
 * Requirements: 15.1, 15.2, 15.4 (Shipper Rating System)
 */

const ratingRepository = require('./rating.repository');
const shipmentRepository = require('./shipment.repository');
const shipperRepository = require('./shipper.repository');
const { AppError, ValidationError } = require('../../shared/utils/error.util');

// Low rating threshold for flagging (Requirements 15.4)
const LOW_RATING_THRESHOLD = 3.5;

/**
 * Rate a shipment delivery
 * Requirements: 15.1 - Prompt customer to rate delivery (1-5 stars)
 * Requirements: 15.2 - Update shipper's average rating
 * 
 * @param {string} shipmentId - Shipment ID
 * @param {string} customerId - Customer ID (from authenticated user)
 * @param {number} rating - Rating (1-5)
 * @param {string} [comment] - Optional feedback comment
 * @returns {Promise<Object>}
 */
async function rateDelivery(shipmentId, customerId, rating, comment = null) {
  // Validate rating value
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ValidationError('Rating must be an integer between 1 and 5');
  }

  // Get shipment with customer info
  const shipment = await shipmentRepository.findShipmentById(shipmentId);
  if (!shipment) {
    throw new AppError('SHIP_001', 'Không tìm thấy đơn vận chuyển', 404);
  }

  // Validate shipment is delivered
  if (shipment.status !== 'delivered') {
    throw new AppError('INVALID_STATUS', 'Chỉ có thể đánh giá đơn hàng đã giao', 400);
  }

  // Validate customer owns this shipment
  const orderCustomerId = shipment.sub_order?.order?.customer_id;
  if (orderCustomerId !== customerId) {
    throw new AppError('UNAUTHORIZED', 'Bạn không có quyền đánh giá đơn hàng này', 403);
  }

  // Check if already rated
  const existingRating = await ratingRepository.findByShipmentId(shipmentId);
  if (existingRating) {
    throw new AppError('RATE_001', 'Đã đánh giá đơn hàng này', 400);
  }

  // Validate shipper exists
  if (!shipment.shipper_id) {
    throw new AppError('SHIP_003', 'Đơn hàng chưa có shipper', 400);
  }

  // Create rating in shipper_ratings table
  // The database trigger will automatically update shipper's avg_rating
  try {
    const newRating = await ratingRepository.createRating({
      shipmentId,
      shipperId: shipment.shipper_id,
      customerId,
      rating,
      comment,
    });

    // Also update the shipment's customer_rating field for quick access
    await shipmentRepository.addRating(shipmentId, rating, comment);

    // Check if shipper needs to be flagged for low rating
    await checkAndFlagLowRating(shipment.shipper_id);

    return {
      rating: newRating,
      shipment: await shipmentRepository.findShipmentById(shipmentId),
    };
  } catch (error) {
    if (error.message === 'ALREADY_RATED') {
      throw new AppError('RATE_001', 'Đã đánh giá đơn hàng này', 400);
    }
    throw error;
  }
}

/**
 * Check and flag shipper for low rating
 * Requirements: 15.4 - Flag shipper when rating falls below 3.5
 * 
 * @param {string} shipperId
 * @returns {Promise<void>}
 */
async function checkAndFlagLowRating(shipperId) {
  const shipper = await shipperRepository.findShipperById(shipperId);
  if (!shipper) return;

  const avgRating = parseFloat(shipper.avg_rating || 0);
  const totalRatings = shipper.total_ratings || 0;

  // Only flag if shipper has at least 5 ratings (to avoid flagging new shippers)
  if (totalRatings >= 5 && avgRating < LOW_RATING_THRESHOLD && avgRating > 0) {
    // Flag shipper for review
    await shipperRepository.updateShipper(shipperId, {
      is_flagged: true,
      flagged_reason: `Đánh giá trung bình thấp: ${avgRating}/5`,
      flagged_at: new Date().toISOString(),
    });

    // TODO: Send notification to admin about flagged shipper
    console.log(`Shipper ${shipperId} flagged for low rating: ${avgRating}`);
  }
}

/**
 * Get shipper rating statistics
 * Requirements: 15.3 - Display average rating and total ratings count
 * 
 * @param {string} shipperId
 * @returns {Promise<Object>}
 */
async function getShipperRatingStats(shipperId) {
  return ratingRepository.getShipperRatingStats(shipperId);
}

/**
 * Get ratings for a shipper
 * @param {string} shipperId
 * @param {Object} options - Pagination options
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function getShipperRatings(shipperId, options = {}) {
  return ratingRepository.findByShipperId(shipperId, options);
}

/**
 * Get rating for a shipment
 * @param {string} shipmentId
 * @returns {Promise<Object|null>}
 */
async function getShipmentRating(shipmentId) {
  return ratingRepository.findByShipmentId(shipmentId);
}

module.exports = {
  rateDelivery,
  checkAndFlagLowRating,
  getShipperRatingStats,
  getShipperRatings,
  getShipmentRating,
  LOW_RATING_THRESHOLD,
};
