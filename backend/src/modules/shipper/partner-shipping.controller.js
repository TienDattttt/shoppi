/**
 * Partner Shipping Controller
 * Handles partner shipping API requests
 * 
 * Requirements: 2 (Partner Shipment Management)
 */

const partnerShippingService = require('./partner-shipping.service');
const { successResponse, errorResponse } = require('../../shared/utils/response.util');

/**
 * POST /api/partner/shipping/orders/:subOrderId/ready-to-ship
 * Mark sub-order as ready to ship and create shipment
 * Requirements: 2.2
 */
async function markReadyToShip(req, res) {
  try {
    const { subOrderId } = req.params;
    const partnerId = req.user.id;
    const { pickupTimeSlot } = req.body;

    const result = await partnerShippingService.markReadyToShip(
      subOrderId,
      partnerId,
      { pickupTimeSlot }
    );

    return successResponse(res, result, 'Đơn hàng đã sẵn sàng giao, đang phân công shipper');
  } catch (error) {
    console.error('[PartnerShippingController] markReadyToShip error:', error);
    return errorResponse(res, error);
  }
}

/**
 * GET /api/partner/shipping/shipments
 * Get partner's shipments with filters
 * Requirements: 2.1, 2.4
 */
async function getPartnerShipments(req, res) {
  try {
    const partnerId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const result = await partnerShippingService.getPartnerShipments(partnerId, {
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return successResponse(res, result);
  } catch (error) {
    console.error('[PartnerShippingController] getPartnerShipments error:', error);
    return errorResponse(res, error);
  }
}

/**
 * GET /api/partner/shipping/shipments/:id
 * Get shipment details
 * Requirements: 2.4
 */
async function getShipmentById(req, res) {
  try {
    const { id } = req.params;
    const partnerId = req.user.id;

    const shipment = await partnerShippingService.getShipmentById(id, partnerId);

    return successResponse(res, { shipment });
  } catch (error) {
    console.error('[PartnerShippingController] getShipmentById error:', error);
    return errorResponse(res, error);
  }
}

/**
 * POST /api/partner/shipping/shipments/:id/request-pickup
 * Request pickup for a shipment
 * Requirements: 2.6
 */
async function requestPickup(req, res) {
  try {
    const { id } = req.params;
    const partnerId = req.user.id;
    const { preferredTime, notes } = req.body;

    const result = await partnerShippingService.requestPickup(id, partnerId, {
      preferredTime,
      notes,
    });

    return successResponse(res, result, 'Đã yêu cầu lấy hàng thành công');
  } catch (error) {
    console.error('[PartnerShippingController] requestPickup error:', error);
    return errorResponse(res, error);
  }
}

module.exports = {
  markReadyToShip,
  getPartnerShipments,
  getShipmentById,
  requestPickup,
};
