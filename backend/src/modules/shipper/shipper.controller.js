/**
 * Shipper Controller
 * HTTP handlers for shipper module
 * 
 * Requirements: 4 (Shipper Management), 5 (Shipment Management)
 */

const shipperService = require('./shipper.service');
const shipmentService = require('./shipment.service');
const locationService = require('./location.service');
const trackingService = require('./tracking.service');
const ratingService = require('./rating.service');
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
    const userId = req.user.userId;
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
    const userId = req.user.userId;
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
    if (shipper.user_id !== req.user.userId && req.user.role !== 'admin') {
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
    const adminId = req.user.userId;

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
    if (shipper.user_id !== req.user.userId) {
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
    if (shipper.user_id !== req.user.userId) {
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
    if (shipper.user_id !== req.user.userId) {
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
      const shipper = await shipperService.getShipperByUserId(req.user.userId);
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
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
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
    const shipper = await shipperService.getShipperByUserId(req.user.userId);

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
 * 
 * Requirements: 15.1 - Prompt customer to rate delivery (1-5 stars)
 * Requirements: 15.2 - Update shipper's average rating
 */
async function rateShipment(req, res) {
  try {
    const { id } = req.params;
    const customerId = req.user.userId;

    shipperValidator.validateRating(req.body);

    const result = await ratingService.rateDelivery(
      id,
      customerId,
      parseInt(req.body.rating),
      req.body.comment || req.body.feedback
    );

    return successResponse(res, {
      message: 'Đánh giá đã được gửi thành công',
      data: {
        rating: {
          id: result.rating.id,
          rating: result.rating.rating,
          comment: result.rating.comment,
          createdAt: result.rating.created_at,
        },
        shipment: shipperDto.toShipmentResponse(result.shipment),
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get shipment location (real-time shipper location)
 * GET /shipments/:id/location
 * 
 * Requirements: 1.3, 4.2 - Return shipper's current location from Redis
 * Calculate and return ETA
 */
async function getShipmentLocation(req, res) {
  try {
    const { id } = req.params;
    const shipment = await shipmentService.getShipmentById(id);

    if (!shipment.shipper_id) {
      return errorResponse(res, { code: 'SHIP_003', message: 'Chưa có shipper được phân công', statusCode: 404 });
    }

    let location = null;
    try {
      location = await locationService.getCurrentLocation(shipment.shipper_id);
    } catch (locError) {
      console.error('[getShipmentLocation] Error getting location from Redis:', locError.message);
      // Continue without location - will return null
    }

    if (!location) {
      return errorResponse(res, { code: 'LOC_001', message: 'Shipper chưa cập nhật vị trí', statusCode: 404 });
    }

    // Calculate ETA based on shipper's current location and delivery address
    let eta = null;
    let etaRange = null;
    let distanceKm = null;

    if (shipment.delivery_lat && shipment.delivery_lng) {
      distanceKm = locationService.calculateDistance(
        location.lat,
        location.lng,
        parseFloat(shipment.delivery_lat),
        parseFloat(shipment.delivery_lng)
      );

      // Get shipper's vehicle type for more accurate ETA
      const shipper = shipment.shipper;
      const vehicleType = shipper?.vehicle_type || 'motorbike';
      const estimatedMinutes = locationService.estimateTravelTime(distanceKm, vehicleType);

      // Calculate ETA as a time range (e.g., "14:00 - 15:00")
      const now = new Date();
      const etaStart = new Date(now.getTime() + estimatedMinutes * 60 * 1000);
      const etaEnd = new Date(etaStart.getTime() + 30 * 60 * 1000); // +30 min buffer

      eta = etaStart.toISOString();
      etaRange = {
        start: formatTime(etaStart),
        end: formatTime(etaEnd),
        display: `${formatTime(etaStart)} - ${formatTime(etaEnd)}`,
      };
    }

    return successResponse(res, {
      data: {
        shipmentId: id,
        trackingNumber: shipment.tracking_number,
        status: shipment.status,
        shipperLocation: {
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          speed: location.speed,
          updatedAt: location.timestamp,
        },
        deliveryLocation: {
          lat: shipment.delivery_lat ? parseFloat(shipment.delivery_lat) : null,
          lng: shipment.delivery_lng ? parseFloat(shipment.delivery_lng) : null,
          address: shipment.delivery_address,
        },
        pickupLocation: {
          lat: shipment.pickup_lat ? parseFloat(shipment.pickup_lat) : null,
          lng: shipment.pickup_lng ? parseFloat(shipment.pickup_lng) : null,
          address: shipment.pickup_address,
        },
        distanceKm: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
        eta,
        etaRange,
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Format time as HH:MM
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ============================================
// TRACKING ENDPOINTS
// ============================================

/**
 * Get shipment tracking history
 * GET /shipments/:id/tracking
 * 
 * Requirements: 1.1, 1.4 - Return tracking events sorted by event_time DESC
 * Include current status and shipper info
 */
async function getTrackingHistory(req, res) {
  try {
    const { id } = req.params;

    // Get shipment info with shipper details
    const shipment = await shipmentService.getShipmentById(id);

    // Get tracking events (already sorted by event_time DESC in trackingService)
    const events = await trackingService.getTrackingHistory(id);

    // Build shipper info if assigned
    let shipperInfo = null;
    if (shipment.shipper) {
      const shipper = shipment.shipper;
      shipperInfo = {
        id: shipper.id,
        name: shipper.user?.full_name || 'Shipper',
        maskedPhone: maskPhoneNumber(shipper.user?.phone),
        avatarUrl: shipper.user?.avatar_url,
        vehicleType: shipper.vehicle_type,
        vehiclePlate: shipper.vehicle_plate,
        rating: shipper.avg_rating || 0,
        totalDeliveries: shipper.total_deliveries || 0,
      };
    }

    return successResponse(res, {
      data: {
        shipment: {
          id: shipment.id,
          trackingNumber: shipment.tracking_number,
          status: shipment.status,
          statusLabel: shipperDto.getStatusLabel(shipment.status),
          currentLocation: shipment.current_location_name,
          estimatedDelivery: shipment.estimated_delivery,
          deliveryAddress: shipment.delivery_address,
          deliveryAttempts: shipment.delivery_attempts || 0,
          nextDeliveryAttempt: shipment.next_delivery_attempt,
          failureReason: shipment.failure_reason,
          // Coordinates for map display
          pickupLat: shipment.pickup_lat ? parseFloat(shipment.pickup_lat) : null,
          pickupLng: shipment.pickup_lng ? parseFloat(shipment.pickup_lng) : null,
          deliveryLat: shipment.delivery_lat ? parseFloat(shipment.delivery_lat) : null,
          deliveryLng: shipment.delivery_lng ? parseFloat(shipment.delivery_lng) : null,
        },
        shipper: shipperInfo,
        events: events.map(e => {
          const event = {
            id: e.id,
            status: e.status,
            statusVi: e.status_vi,
            description: e.description,
            descriptionVi: e.description_vi,
            locationName: e.location_name,
            locationAddress: e.location_address,
            lat: e.location_lat ? parseFloat(e.location_lat) : null,
            lng: e.location_lng ? parseFloat(e.location_lng) : null,
            actorType: e.actor_type,
            actorName: e.actor_name,
            eventTime: e.event_time,
          };
          
          // Add delivery proof photos for delivered status
          if (e.status === 'delivered' && shipment.delivery_photo_urls) {
            try {
              const photoUrls = typeof shipment.delivery_photo_urls === 'string' 
                ? JSON.parse(shipment.delivery_photo_urls) 
                : shipment.delivery_photo_urls;
              if (Array.isArray(photoUrls) && photoUrls.length > 0) {
                event.deliveryPhotoUrls = photoUrls;
              }
            } catch (err) {
              // If parsing fails, try single photo URL
              if (shipment.delivery_photo_url) {
                event.deliveryPhotoUrls = [shipment.delivery_photo_url];
              }
            }
          }
          
          return event;
        }),
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Mask phone number for privacy
 * @param {string} phone - Phone number to mask
 * @returns {string} - Masked phone number (e.g., 090****123)
 */
function maskPhoneNumber(phone) {
  if (!phone || phone.length < 7) return phone;
  const start = phone.slice(0, 3);
  const end = phone.slice(-3);
  return `${start}****${end}`;
}

// ============================================
// EARNINGS ENDPOINTS
// ============================================

/**
 * Get shipper earnings
 * GET /shippers/earnings
 */
async function getEarnings(req, res) {
  try {
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    const { period = 'today' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate, endDate = now;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Get completed shipments in date range
    const earnings = await shipmentService.getShipperEarnings(shipper.id, startDate, endDate);

    return successResponse(res, {
      data: {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalEarnings: earnings.totalEarnings,
        totalDeliveries: earnings.totalDeliveries,
        totalShippingFee: earnings.totalShippingFee,
        totalCodCollected: earnings.totalCodCollected,
        deliveries: earnings.deliveries,
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get all shipments for an order (multi-shop orders)
 * GET /orders/:id/shipments
 * 
 * Requirements: 12.1, 12.2 - Return all shipments for multi-shop order
 * Include tracking status for each
 */
async function getOrderShipments(req, res) {
  try {
    const { id } = req.params;

    // Get all shipments for this order
    const shipments = await shipmentService.getShipmentsByOrderId(id);

    // Transform shipments with tracking info
    const shipmentsWithTracking = await Promise.all(
      shipments.map(async (shipment) => {
        // Get latest tracking event for each shipment
        let latestEvent = null;
        try {
          latestEvent = await trackingService.getLatestTrackingEvent(shipment.id);
        } catch (e) {
          // Ignore tracking errors
        }

        // Build shipper info if assigned
        let shipperInfo = null;
        if (shipment.shipper) {
          const shipper = shipment.shipper;
          shipperInfo = {
            id: shipper.id,
            name: shipper.user?.full_name || 'Shipper',
            maskedPhone: maskPhoneNumber(shipper.user?.phone),
            avatarUrl: shipper.user?.avatar_url,
            vehicleType: shipper.vehicle_type,
            vehiclePlate: shipper.vehicle_plate,
            rating: shipper.avg_rating || 0,
          };
        }

        // Build shop info
        let shopInfo = null;
        if (shipment.sub_order?.shops) {
          shopInfo = {
            id: shipment.sub_order.shops.id,
            name: shipment.sub_order.shops.shop_name,
            logoUrl: shipment.sub_order.shops.logo_url,
          };
        }

        return {
          id: shipment.id,
          trackingNumber: shipment.tracking_number,
          status: shipment.status,
          statusLabel: shipperDto.getStatusLabel(shipment.status),
          subOrderId: shipment.sub_order_id,
          shop: shopInfo,
          shipper: shipperInfo,

          pickup: {
            address: shipment.pickup_address,
            contactName: shipment.pickup_contact_name,
            contactPhone: maskPhoneNumber(shipment.pickup_contact_phone),
          },

          delivery: {
            address: shipment.delivery_address,
            contactName: shipment.delivery_contact_name,
            contactPhone: maskPhoneNumber(shipment.delivery_contact_phone),
          },

          shippingFee: parseFloat(shipment.shipping_fee || 0),
          codAmount: parseFloat(shipment.cod_amount || 0),

          currentLocation: shipment.current_location_name,
          estimatedDelivery: shipment.estimated_delivery,

          latestEvent: latestEvent ? {
            status: latestEvent.status,
            statusVi: latestEvent.status_vi,
            description: latestEvent.description_vi || latestEvent.description,
            eventTime: latestEvent.event_time,
          } : null,

          timestamps: {
            created: shipment.created_at,
            assigned: shipment.assigned_at,
            pickedUp: shipment.picked_up_at,
            delivered: shipment.delivered_at,
          },
        };
      })
    );

    return successResponse(res, {
      data: {
        orderId: id,
        totalShipments: shipmentsWithTracking.length,
        shipments: shipmentsWithTracking,
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get flagged shippers (Admin)
 * GET /shippers/flagged
 * 
 * Requirements: 15.4 - Flag shipper when rating falls below 3.5
 */
async function getFlaggedShippers(req, res) {
  try {
    const pagination = shipperValidator.validatePagination(req.query);
    const result = await shipperService.getFlaggedShippers(pagination);

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
 * Clear shipper flag (Admin)
 * POST /shippers/:id/clear-flag
 * 
 * Requirements: 15.4 - Admin can clear flag after review
 */
async function clearShipperFlag(req, res) {
  try {
    const { id } = req.params;

    const shipper = await shipperService.clearShipperFlag(id);

    return successResponse(res, {
      message: 'Đã xóa cờ cảnh báo cho shipper',
      data: shipperDto.toShipperResponse(shipper),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get shipper ratings
 * GET /shippers/:id/ratings
 * 
 * Requirements: 15.3 - Display average rating and total ratings count
 */
async function getShipperRatings(req, res) {
  try {
    const { id } = req.params;
    const pagination = shipperValidator.validatePagination(req.query);

    // Get shipper info
    const shipper = await shipperService.getShipperById(id);

    // Get rating statistics
    const stats = await ratingService.getShipperRatingStats(id);

    // Get individual ratings
    const ratings = await ratingService.getShipperRatings(id, pagination);

    return successResponse(res, {
      data: {
        shipper: {
          id: shipper.id,
          name: shipper.user?.full_name || 'Shipper',
          avatarUrl: shipper.user?.avatar_url,
        },
        statistics: {
          avgRating: stats.avgRating,
          totalRatings: stats.totalRatings,
          distribution: stats.distribution,
        },
        ratings: ratings.data.map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          customer: r.customer ? {
            id: r.customer.id,
            name: r.customer.full_name,
            avatarUrl: r.customer.avatar_url,
          } : null,
          createdAt: r.created_at,
        })),
        pagination: {
          total: ratings.count,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: Math.ceil(ratings.count / pagination.limit),
        },
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ============================================
// DOCUMENT UPLOAD ENDPOINTS
// ============================================

const storageClient = require('../../shared/supabase/storage.client');

/**
 * Upload shipper registration documents
 * POST /shippers/upload-documents
 * 
 * Uploads ID card (front/back) and driver license to Supabase Storage
 * Returns URLs for use in registration
 */
async function uploadDocuments(req, res) {
  try {
    const files = req.files;

    if (!files || Object.keys(files).length === 0) {
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: 'At least one document is required',
        status: 400
      });
    }

    // Generate a temporary ID for unregistered users
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const uploadResults = {
      idCardFrontUrl: null,
      idCardBackUrl: null,
      driverLicenseUrl: null,
    };

    // Upload each document
    if (files.idCardFront && files.idCardFront[0]) {
      const file = files.idCardFront[0];
      const result = await storageClient.uploadDocument(
        tempId,
        'id_card_front',
        file.buffer,
        file.mimetype
      );
      uploadResults.idCardFrontUrl = result.url;
    }

    if (files.idCardBack && files.idCardBack[0]) {
      const file = files.idCardBack[0];
      const result = await storageClient.uploadDocument(
        tempId,
        'id_card_back',
        file.buffer,
        file.mimetype
      );
      uploadResults.idCardBackUrl = result.url;
    }

    if (files.driverLicense && files.driverLicense[0]) {
      const file = files.driverLicense[0];
      const result = await storageClient.uploadDocument(
        tempId,
        'driver_license',
        file.buffer,
        file.mimetype
      );
      uploadResults.driverLicenseUrl = result.url;
    }

    return successResponse(res, {
      message: 'Documents uploaded successfully',
      data: uploadResults,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Reject shipper (Admin)
 * POST /shippers/:id/reject
 */
async function rejectShipper(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const shipper = await shipperService.rejectShipper(id, reason);

    return successResponse(res, {
      message: 'Shipper rejected',
      data: shipperDto.toShipperResponse(shipper),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ============================================
// ROUTING ENDPOINTS
// ============================================

const goongClient = require('../../shared/goong/goong.client');

/**
 * Get route/directions between two points
 * GET /shipments/:id/route
 * 
 * Returns polyline and turn-by-turn directions for map display
 * Used by customer tracking UI to show shipper's route
 */
async function getShipmentRoute(req, res) {
  try {
    const { id } = req.params;
    const { fromShipper } = req.query; // If true, get route from shipper's current location
    
    const shipment = await shipmentService.getShipmentById(id);
    
    let originLat, originLng;
    
    if (fromShipper === 'true' && shipment.shipper_id) {
      // Get shipper's current location from Redis
      const location = await locationService.getCurrentLocation(shipment.shipper_id);
      if (location) {
        originLat = location.lat;
        originLng = location.lng;
      }
    }
    
    // Fallback to pickup location if no shipper location
    if (!originLat || !originLng) {
      originLat = parseFloat(shipment.pickup_lat);
      originLng = parseFloat(shipment.pickup_lng);
    }
    
    const destLat = parseFloat(shipment.delivery_lat);
    const destLng = parseFloat(shipment.delivery_lng);
    
    if (!originLat || !originLng || !destLat || !destLng) {
      return errorResponse(res, { 
        code: 'ROUTE_001', 
        message: 'Không đủ tọa độ để tính đường đi', 
        statusCode: 400 
      });
    }
    
    // Get route from Goong Directions API
    const route = await goongClient.getDirections(originLat, originLng, destLat, destLng, 'bike');
    
    if (!route) {
      return errorResponse(res, { 
        code: 'ROUTE_002', 
        message: 'Không thể lấy đường đi', 
        statusCode: 500 
      });
    }
    
    return successResponse(res, {
      data: {
        shipmentId: id,
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng },
        route: {
          overviewPolyline: route.overviewPolyline,
          polylinePoints: route.polylinePoints,
          distance: route.distance,
          duration: route.duration,
          bounds: route.bounds,
          steps: route.steps,
        },
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get route between any two points (generic)
 * POST /route
 * 
 * Body: { originLat, originLng, destLat, destLng, vehicle }
 */
async function getRoute(req, res) {
  try {
    const { originLat, originLng, destLat, destLng, vehicle = 'bike' } = req.body;
    
    if (!originLat || !originLng || !destLat || !destLng) {
      return errorResponse(res, { 
        code: 'ROUTE_001', 
        message: 'Missing coordinates', 
        statusCode: 400 
      });
    }
    
    const route = await goongClient.getDirections(
      parseFloat(originLat), 
      parseFloat(originLng), 
      parseFloat(destLat), 
      parseFloat(destLng), 
      vehicle
    );
    
    if (!route) {
      return errorResponse(res, { 
        code: 'ROUTE_002', 
        message: 'Could not get route', 
        statusCode: 500 
      });
    }
    
    return successResponse(res, {
      data: {
        origin: { lat: parseFloat(originLat), lng: parseFloat(originLng) },
        destination: { lat: parseFloat(destLat), lng: parseFloat(destLng) },
        route,
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
  rejectShipper,
  suspendShipper,
  reactivateShipper,

  // Documents
  uploadDocuments,

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
  getOrderShipments,

  // Earnings
  getEarnings,

  // Tracking
  getTrackingHistory,

  // Ratings
  getShipperRatings,

  // Flagging (Admin)
  getFlaggedShippers,
  clearShipperFlag,

  // Routing
  getShipmentRoute,
  getRoute,
};

