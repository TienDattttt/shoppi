/**
 * Partner Shipping Controller
 * Handles partner shipping API requests
 * 
 * Requirements: 2 (Partner Shipment Management)
 */

const partnerShippingService = require('./partner-shipping.service');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');

/**
 * POST /api/partner/shipping/orders/:subOrderId/ready-to-ship
 * Mark sub-order as ready to ship and create shipment
 * Requirements: 2.2
 */
async function markReadyToShip(req, res) {
  try {
    const { subOrderId } = req.params;
    const partnerId = req.user.userId; // Fix: use userId instead of id
    const { pickupTimeSlot } = req.body;

    const result = await partnerShippingService.markReadyToShip(
      subOrderId,
      partnerId,
      { pickupTimeSlot }
    );

    return sendSuccess(res, { ...result, message: 'Đơn hàng đã sẵn sàng giao, đang phân công shipper' });
  } catch (error) {
    console.error('[PartnerShippingController] markReadyToShip error:', error);
    return sendError(res, error.code || 'INTERNAL_ERROR', error.message, error.statusCode || error.status || 500);
  }
}

/**
 * GET /api/partner/shipping/shipments
 * Get partner's shipments with filters
 * Requirements: 2.1, 2.4
 */
async function getPartnerShipments(req, res) {
  try {
    const partnerId = req.user.userId;
    const { status, page = 1, limit = 20 } = req.query;

    const result = await partnerShippingService.getPartnerShipments(partnerId, {
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return sendSuccess(res, result);
  } catch (error) {
    console.error('[PartnerShippingController] getPartnerShipments error:', error);
    return sendError(res, error.code || 'INTERNAL_ERROR', error.message, error.statusCode || error.status || 500);
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
    const partnerId = req.user.userId;

    const shipment = await partnerShippingService.getShipmentById(id, partnerId);

    return sendSuccess(res, { shipment });
  } catch (error) {
    console.error('[PartnerShippingController] getShipmentById error:', error);
    return sendError(res, error.code || 'INTERNAL_ERROR', error.message, error.statusCode || error.status || 500);
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
    const partnerId = req.user.userId;
    const { preferredTime, notes } = req.body;

    const result = await partnerShippingService.requestPickup(id, partnerId, {
      preferredTime,
      notes,
    });

    return sendSuccess(res, { ...result, message: 'Đã yêu cầu lấy hàng thành công' });
  } catch (error) {
    console.error('[PartnerShippingController] requestPickup error:', error);
    return sendError(res, error.code || 'INTERNAL_ERROR', error.message, error.statusCode || error.status || 500);
  }
}

/**
 * GET /api/partner/shipping/shipments/:id/label
 * Get shipping label data for printing
 * Returns tracking number, barcode data, addresses for label printing
 */
async function getShippingLabel(req, res) {
  try {
    const { id } = req.params;
    const partnerId = req.user.userId;

    // Get shipment with full details
    const shipment = await partnerShippingService.getShipmentById(id, partnerId);

    if (!shipment) {
      return sendError(res, 'SHIPMENT_NOT_FOUND', 'Không tìm thấy đơn vận chuyển', 404);
    }

    // Generate barcode data (Code128 format - tracking number)
    const barcodeData = shipment.trackingNumber;
    
    // Get items from sub-order
    const items = shipment.subOrder?.items || [];
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    // Format label data for printing
    const labelData = {
      // Tracking & Barcode
      trackingNumber: shipment.trackingNumber,
      barcodeData: barcodeData,
      barcodeFormat: 'CODE128', // Standard barcode format
      orderNumber: shipment.subOrder?.orderId?.slice(0, 16).toUpperCase(),
      
      // Sender (Shop) info
      sender: {
        name: shipment.pickupContactName || 'Shop',
        phone: shipment.pickupContactPhone,
        address: shipment.pickupAddress,
      },
      
      // Receiver (Customer) info
      receiver: {
        name: shipment.deliveryContactName,
        phone: shipment.deliveryContactPhone,
        address: shipment.deliveryAddress,
      },
      
      // Package info
      package: {
        weight: shipment.weight || 500, // Default 500g
        dimensions: shipment.dimensions || null,
        itemCount: totalItems || 1,
      },
      
      // Payment info
      payment: {
        codAmount: parseFloat(shipment.codAmount || 0),
        shippingFee: parseFloat(shipment.shippingFee || 0),
        isCod: parseFloat(shipment.codAmount || 0) > 0,
      },
      
      // Delivery info
      delivery: {
        estimatedDelivery: shipment.estimatedDelivery,
        notes: shipment.deliveryNotes,
      },
      
      // Items list for label
      items: items.map(item => ({
        name: item.productName,
        variant: item.variantName,
        quantity: item.quantity,
      })),
      
      // Metadata
      createdAt: shipment.createdAt,
      orderId: shipment.subOrder?.orderId,
      subOrderId: shipment.subOrder?.id,
    };

    return sendSuccess(res, {
      label: labelData,
      printUrl: `/api/partner/shipping/shipments/${id}/label/print`,
    });
  } catch (error) {
    console.error('[PartnerShippingController] getShippingLabel error:', error);
    return sendError(res, error.code || 'INTERNAL_ERROR', error.message, error.statusCode || error.status || 500);
  }
}

module.exports = {
  markReadyToShip,
  getPartnerShipments,
  getShipmentById,
  requestPickup,
  getShippingLabel,
};
