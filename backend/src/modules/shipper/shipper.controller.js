/**
 * Shipper Controller
 * HTTP handlers for shipper module
 * 
 * Requirements: 4 (Shipper Management), 5 (Shipment Management)
 */

const shipperService = require('./shipper.service');
const shipmentService = require('./shipment.service');
const locationService = require('./location.service');
const shipperValidator = require('./shipper.validator');
const shipperDto = require('./shipper.dto');
const { sendSuccess: successResponse, sendError } = require('../../shared/utils/response.util');

// Helper to handle errors consistently
const errorResponse = (res, error) => {
  const statusCode = error.status || error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.message || 'An error occurred';
  return sendError(res, code, message, statusCode);
};

// ============================================
// SHIPPER ENDPOINTS
// ============================================

/**
 * Create shipper profile
 * POST /shippers
 */
async function createShipper(req, res) {
  try {
    const userId = req.user.id;
    shipperValidator.validateCreateShipper(req.body);
    
    const shipper = await shipperService.createShipper(userId, req.body);
    
    return successResponse(res, {
      message: 'Shipper profile created successfully. Pending admin approval.',
      data: shipperDto.toShipperResponse(shipper),
    }, 201);
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get shipper by ID
 * GET /shippers/:id
 */
async function getShipperById(req, res) {
  try {
    const { id } = req.params;
    const shipper = await shipperService.getShipperById(id);
    
    // Admin gets full details, others get public info
    const isAdmin = req.user.role === 'admin';
    const response = isAdmin 
      ? shipperDto.toShipperAdminResponse(shipper)
      : shipperDto.toShipperResponse(shipper);
    
    return successResponse(res, { data: response });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get current user's shipper profile
 * GET /shippers/me
 */
async function getMyShipperProfile(req, res) {
  try {
    const userId = req.user.id;
    const shipper = await shipperService.getShipperByUserId(userId);
    
    return successResponse(res, {
      data: shipperDto.toShipperAdminResponse(shipper),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Update shipper profile
 * PATCH /shippers/:id
 */
async function updateShipper(req, res) {
  try {
    const { id } = req.params;
    shipperValidator.validateUpdateShipper(req.body);
    
    // Verify ownership or admin
    const shipper = await shipperService.getShipperById(id);
    if (shipper.user_id !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, { code: 'UNAUTHORIZED', message: 'Not authorized', status: 403 });
    }
    
    const updated = await shipperService.updateShipper(id, req.body);
    
    return successResponse(res, {
      message: 'Shipper updated successfully',
      data: shipperDto.toShipperResponse(updated),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get pending shippers (Admin)
 * GET /shippers/pending
 */
async function getPendingShippers(req, res) {
  try {
    const pagination = shipperValidator.validatePagination(req.query);
    const result = await shipperService.getPendingShippers(pagination);
    
    return successResponse(res, shipperDto.toShipperListResponse(
      result.data,
      result.count,
      pagination
    ));
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Approve shipper (Admin)
 * POST /shippers/:id/approve
 */
async function approveShipper(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    
    const shipper = await shipperService.approveShipper(id, adminId);
    
    return successResponse(res, {
      message: 'Shipper approved successfully',
      data: shipperDto.toShipperResponse(shipper),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Suspend shipper (Admin)
 * POST /shippers/:id/suspend
 */
async function suspendShipper(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const shipper = await shipperService.suspendShipper(id, reason);
    
    return successResponse(res, {
      message: 'Shipper suspended successfully',
      data: shipperDto.toShipperResponse(shipper),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Reactivate shipper (Admin)
 * POST /shippers/:id/reactivate
 */
async function reactivateShipper(req, res) {
  try {
    const { id } = req.params;
    
    const shipper = await shipperService.reactivateShipper(id);
    
    return successResponse(res, {
      message: 'Shipper reactivated successfully',
      data: shipperDto.toShipperResponse(shipper),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ============================================
// ONLINE STATUS ENDPOINTS
// ============================================

/**
 * Go online
 * POST /shippers/:id/online
 */
async function goOnline(req, res) {
  try {
    const { id } = req.params;
    shipperValidator.validateLocation(req.body);
    
    // Verify ownership
    const shipper = await shipperService.getShipperById(id);
    if (shipper.user_id !== req.user.id) {
      return errorResponse(res, { code: 'UNAUTHORIZED', message: 'Not authorized', status: 403 });
    }
    
    const updated = await shipperService.goOnline(id, {
      lat: parseFloat(req.body.lat),
      lng: parseFloat(req.body.lng),
    });
    
    return successResponse(res, {
      message: 'You are now online',
      data: shipperDto.toShipperResponse(updated),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Go offline
 * POST /shippers/:id/offline
 */
async function goOffline(req, res) {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const shipper = await shipperService.getShipperById(id);
    if (shipper.user_id !== req.user.id) {
      return errorResponse(res, { code: 'UNAUTHORIZED', message: 'Not authorized', status: 403 });
    }
    
    const updated = await shipperService.goOffline(id);
    
    return successResponse(res, {
      message: 'You are now offline',
      data: shipperDto.toShipperResponse(updated),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ============================================
// LOCATION ENDPOINTS
// ============================================

/**
 * Update location
 * POST /shippers/:id/location
 */
async function updateLocation(req, res) {
  try {
    const { id } = req.params;
    shipperValidator.validateLocation(req.body);
    
    // Verify ownership
    const shipper = await shipperService.getShipperById(id);
    if (shipper.user_id !== req.user.id) {
      return errorResponse(res, { code: 'UNAUTHORIZED', message: 'Not authorized', status: 403 });
    }
    
    const location = await locationService.updateLocation(
      id,
      parseFloat(req.body.lat),
      parseFloat(req.body.lng),
      {
        accuracy: req.body.accuracy,
        speed: req.body.speed,
        heading: req.body.heading,
        shipmentId: req.body.shipmentId,
      }
    );
    
    return successResponse(res, {
      data: shipperDto.toLocationResponse(location),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get shipper location
 * GET /shippers/:id/location
 */
async function getShipperLocation(req, res) {
  try {
    const { id } = req.params;
    const location = await locationService.getCurrentLocation(id);
    
    if (!location) {
      return errorResponse(res, { code: 'NOT_FOUND', message: 'Location not available', status: 404 });
    }
    
    return successResponse(res, {
      data: shipperDto.toLocationResponse(location),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Find nearby shippers
 * GET /shippers/nearby
 */
async function findNearbyShippers(req, res) {
  try {
    const params = shipperValidator.validateNearbySearch(req.query);
    
    const shippers = await locationService.findNearbyShippersGeo(
      params.lat,
      params.lng,
      params.radiusKm,
      params.limit
    );
    
    return successResponse(res, {
      data: shippers,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ============================================
// SHIPMENT ENDPOINTS
// ============================================

/**
 * Get shipments for shipper
 * GET /shipments
 */
async function getShipments(req, res) {
  try {
    const shipperId = req.query.shipperId;
    const pagination = shipperValidator.validatePagination(req.query);
    const status = req.query.status;
    
    // If shipper role, only get own shipments
    if (req.user.role === 'shipper') {
      const shipper = await shipperService.getShipperByUserId(req.user.id);
      const result = await shipmentService.getShipmentsByShipper(shipper.id, {
        ...pagination,
        status,
      });
      
      return successResponse(res, shipperDto.toShipmentListResponse(
        result.data,
        result.count,
        pagination
      ));
    }
    
    // Admin can query by shipperId
    if (shipperId) {
      const result = await shipmentService.getShipmentsByShipper(shipperId, {
        ...pagination,
        status,
      });
      
      return successResponse(res, shipperDto.toShipmentListResponse(
        result.data,
        result.count,
        pagination
      ));
    }
    
    // Get pending shipments for assignment
    const result = await shipmentService.getPendingShipments(pagination);
    
    return successResponse(res, shipperDto.toShipmentListResponse(
      result.data,
      result.count,
      pagination
    ));
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get active shipments for current shipper
 * GET /shipments/active
 */
async function getActiveShipments(req, res) {
  try {
    const shipper = await shipperService.getShipperByUserId(req.user.id);
    const shipments = await shipmentService.getActiveShipments(shipper.id);
    
    return successResponse(res, {
      data: shipments.map(s => shipperDto.toShipmentShipperResponse(s)),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get shipment by ID
 * GET /shipments/:id
 */
async function getShipmentById(req, res) {
  try {
    const { id } = req.params;
    const shipment = await shipmentService.getShipmentById(id);
    
    return successResponse(res, {
      data: shipperDto.toShipmentShipperResponse(shipment),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Track shipment by tracking number
 * GET /shipments/track/:trackingNumber
 */
async function trackShipment(req, res) {
  try {
    const { trackingNumber } = req.params;
    const shipment = await shipmentService.getByTrackingNumber(trackingNumber);
    
    return successResponse(res, {
      data: shipperDto.toShipmentTrackingResponse(shipment),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Update shipment status
 * PATCH /shipments/:id/status
 */
async function updateShipmentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, failureReason, photoUrl, signatureUrl } = req.body;
    
    shipperValidator.validateStatusUpdate(req.body);
    
    // Get shipper ID for verification
    const shipper = await shipperService.getShipperByUserId(req.user.id);
    
    let updatedShipment;
    
    switch (status) {
      case 'picked_up':
        updatedShipment = await shipmentService.markPickedUp(id, shipper.id);
        break;
      case 'delivering':
        updatedShipment = await shipmentService.markDelivering(id, shipper.id);
        break;
      case 'delivered':
        updatedShipment = await shipmentService.markDelivered(id, shipper.id, {
          photoUrl,
          signatureUrl,
        });
        break;
      case 'failed':
        updatedShipment = await shipmentService.markFailed(id, shipper.id, failureReason);
        break;
      default:
        return errorResponse(res, { code: 'INVALID_STATUS', message: 'Invalid status update', status: 400 });
    }
    
    return successResponse(res, {
      message: `Shipment marked as ${status}`,
      data: shipperDto.toShipmentResponse(updatedShipment),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Assign shipper to shipment (Admin)
 * POST /shipments/:id/assign
 */
async function assignShipper(req, res) {
  try {
    const { id } = req.params;
    const { shipperId } = req.body;
    
    if (!shipperId) {
      return errorResponse(res, { code: 'VALIDATION_ERROR', message: 'Shipper ID is required', status: 400 });
    }
    
    const shipment = await shipmentService.assignShipper(id, shipperId);
    
    return successResponse(res, {
      message: 'Shipper assigned successfully',
      data: shipperDto.toShipmentResponse(shipment),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Auto-assign nearest shipper (Admin)
 * POST /shipments/:id/auto-assign
 */
async function autoAssignShipper(req, res) {
  try {
    const { id } = req.params;
    
    const shipment = await shipmentService.autoAssignShipper(id);
    
    return successResponse(res, {
      message: 'Shipper auto-assigned successfully',
      data: shipperDto.toShipmentResponse(shipment),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Rate shipment delivery
 * POST /shipments/:id/rate
 */
async function rateShipment(req, res) {
  try {
    const { id } = req.params;
    shipperValidator.validateRating(req.body);
    
    const shipment = await shipmentService.rateDelivery(
      id,
      parseInt(req.body.rating),
      req.body.feedback
    );
    
    return successResponse(res, {
      message: 'Rating submitted successfully',
      data: shipperDto.toShipmentResponse(shipment),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get shipment location (real-time shipper location)
 * GET /shipments/:id/location
 */
async function getShipmentLocation(req, res) {
  try {
    const { id } = req.params;
    const shipment = await shipmentService.getShipmentById(id);
    
    if (!shipment.shipper_id) {
      return errorResponse(res, { code: 'NOT_FOUND', message: 'No shipper assigned', status: 404 });
    }
    
    const location = await locationService.getCurrentLocation(shipment.shipper_id);
    
    if (!location) {
      return errorResponse(res, { code: 'NOT_FOUND', message: 'Location not available', status: 404 });
    }
    
    return successResponse(res, {
      data: {
        shipmentId: id,
        trackingNumber: shipment.tracking_number,
        status: shipment.status,
        shipperLocation: shipperDto.toLocationResponse(location),
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

module.exports = {
  // Shipper
  createShipper,
  getShipperById,
  getMyShipperProfile,
  updateShipper,
  getPendingShippers,
  approveShipper,
  suspendShipper,
  reactivateShipper,
  
  // Online status
  goOnline,
  goOffline,
  
  // Location
  updateLocation,
  getShipperLocation,
  findNearbyShippers,
  
  // Shipment
  getShipments,
  getActiveShipments,
  getShipmentById,
  trackShipment,
  updateShipmentStatus,
  assignShipper,
  autoAssignShipper,
  rateShipment,
  getShipmentLocation,
};
