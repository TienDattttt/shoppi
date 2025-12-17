/**
 * Shipper Mobile Controller
 * HTTP handlers for shipper mobile app APIs
 * 
 * Requirements: 7 (Delivery Proof), 8 (Failed Delivery), 13 (Mobile App API)
 */

const shipperService = require('./shipper.service');
const shipmentService = require('./shipment.service');
const locationService = require('./location.service');
const trackingService = require('./tracking.service');
const statisticsService = require('./statistics.service');
const shipperValidator = require('./shipper.validator');
const shipperDto = require('./shipper.dto');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');

// Valid status transitions for shipper
const SHIPPER_STATUS_TRANSITIONS = {
  assigned: ['picked_up'],
  picked_up: ['delivering'],
  delivering: ['delivered', 'failed'],
};

// Predefined failure reasons (Requirements: 8.1)
const FAILURE_REASONS = [
  'customer_not_available',
  'wrong_address',
  'customer_refused',
  'customer_rescheduled',
  'damaged_package',
  'other',
];

// Helper to handle errors consistently
const errorResponse = (res, error) => {
  const statusCode = error.status || error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.message || 'An error occurred';
  return sendError(res, code, message, statusCode);
};

// ============================================
// SHIPMENT ENDPOINTS (Requirements: 13.2)
// ============================================

/**
 * Get shipments for current shipper
 * GET /api/shipper/shipments
 * 
 * Query params:
 * - status: 'pending' | 'active' | 'completed'
 * - page: number
 * - limit: number
 * 
 * Requirements: 13.2 - Fetch real shipments from backend API
 */
async function getShipments(req, res) {
  try {
    // Get shipper profile for current user
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    
    const { status = 'active' } = req.query;
    const pagination = shipperValidator.validatePagination(req.query);
    
    // Map status filter to database statuses
    let statusFilter;
    switch (status) {
      case 'pending':
        // Shipments assigned but not yet picked up
        statusFilter = ['assigned'];
        break;
      case 'active':
        // Shipments in progress
        statusFilter = ['assigned', 'picked_up', 'delivering'];
        break;
      case 'completed':
        // Delivered or failed shipments
        statusFilter = ['delivered', 'failed', 'returned'];
        break;
      default:
        statusFilter = ['assigned', 'picked_up', 'delivering'];
    }
    
    // Get shipments with full details
    const result = await getShipperShipmentsWithDetails(shipper.id, statusFilter, pagination);
    
    return sendSuccess(res, {
      data: result.data.map(s => toShipperMobileShipmentResponse(s, shipper.id)),
      pagination: {
        total: result.count,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(result.count / pagination.limit),
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get shipment by ID
 * GET /api/shipper/shipments/:id
 */
async function getShipmentById(req, res) {
  try {
    const { id } = req.params;
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    
    const shipment = await shipmentService.getShipmentById(id);
    
    // Verify shipper owns this shipment
    if (shipment.shipper_id !== shipper.id) {
      return errorResponse(res, { 
        code: 'UNAUTHORIZED', 
        message: 'You are not assigned to this shipment', 
        status: 403 
      });
    }
    
    return sendSuccess(res, {
      data: toShipperMobileShipmentResponse(shipment),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}


// ============================================
// STATUS UPDATE ENDPOINT (Requirements: 7.1, 8.1, 13.3)
// ============================================

/**
 * Update shipment status
 * POST /api/shipper/shipments/:id/status
 * 
 * Body:
 * - status: string (required)
 * - reason: string (required for 'failed' status)
 * - photoUrl: string (single photo - legacy support)
 * - photoUrls: string[] (array of 1-3 photo URLs for delivered status)
 * - codCollected: boolean (required for 'delivered' status on COD orders)
 * - location: { lat, lng } (optional, updates shipper location)
 * 
 * Requirements:
 * - 6.2: Require COD collection confirmation for COD orders
 * - 6.3: Record COD collection and update shipper's daily COD balance
 * - 7.1: Require at least 1 photo for delivered status (max 3)
 * - 8.1: Require reason for failed status (from predefined list)
 * - 13.3: Send update to backend and receive confirmation
 */
async function updateShipmentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, reason, photoUrl, photoUrls, signatureUrl, codCollected, location } = req.body;
    
    // Get shipper profile
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    
    // Get current shipment
    const shipment = await shipmentService.getShipmentById(id);
    
    // Verify shipper owns this shipment
    if (shipment.shipper_id !== shipper.id) {
      return errorResponse(res, { 
        code: 'UNAUTHORIZED', 
        message: 'You are not assigned to this shipment', 
        status: 403 
      });
    }
    
    // Validate status transition
    const allowedTransitions = SHIPPER_STATUS_TRANSITIONS[shipment.status];
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return errorResponse(res, {
        code: 'SHIP_002',
        message: `Cannot transition from ${shipment.status} to ${status}`,
        status: 400,
      });
    }
    
    // Validate requirements based on status
    // Requirements 7.1: At least 1 photo required for delivered status (max 3)
    if (status === 'delivered') {
      const photos = photoUrls || (photoUrl ? [photoUrl] : []);
      if (photos.length === 0) {
        return errorResponse(res, {
          code: 'SHIP_005',
          message: 'At least 1 delivery proof photo is required',
          status: 400,
        });
      }
      if (photos.length > 3) {
        return errorResponse(res, {
          code: 'SHIP_007',
          message: 'Maximum 3 delivery proof photos allowed',
          status: 400,
        });
      }
    }
    
    // Requirements 6.2: COD collection confirmation required for COD orders
    if (status === 'delivered') {
      const codAmount = parseFloat(shipment.cod_amount || 0);
      if (codAmount > 0 && codCollected !== true) {
        return errorResponse(res, {
          code: 'SHIP_006',
          message: 'COD collection confirmation is required for COD orders',
          status: 400,
        });
      }
    }
    
    // Requirements 8.1: Reason required for failed status (from predefined list)
    if (status === 'failed') {
      if (!reason) {
        return errorResponse(res, {
          code: 'VALIDATION_ERROR',
          message: 'Failure reason is required',
          status: 400,
        });
      }
      if (!FAILURE_REASONS.includes(reason)) {
        return errorResponse(res, {
          code: 'VALIDATION_ERROR',
          message: `Failure reason must be one of: ${FAILURE_REASONS.join(', ')}`,
          status: 400,
        });
      }
    }

    
    // Update location if provided
    if (location && location.lat && location.lng) {
      try {
        await locationService.updateLocation(
          shipper.id,
          parseFloat(location.lat),
          parseFloat(location.lng),
          { shipmentId: id }
        );
      } catch (locError) {
        console.error('Failed to update location:', locError.message);
        // Don't fail the status update if location update fails
      }
    }
    
    // Update shipment status
    let updatedShipment;
    switch (status) {
      case 'picked_up':
        updatedShipment = await shipmentService.markPickedUp(id, shipper.id);
        break;
      case 'delivering':
        updatedShipment = await shipmentService.markDelivering(id, shipper.id);
        break;
      case 'delivered':
        // Requirements 6.2, 6.3: Pass COD collection confirmation
        // Support both single photoUrl (legacy) and photoUrls array (new)
        updatedShipment = await shipmentService.markDelivered(id, shipper.id, {
          photoUrl,
          photoUrls: photoUrls || (photoUrl ? [photoUrl] : []),
          signatureUrl,
          codCollected,
        });
        break;
      case 'failed':
        updatedShipment = await shipmentService.markFailed(id, shipper.id, reason);
        break;
      default:
        return errorResponse(res, {
          code: 'INVALID_STATUS',
          message: 'Invalid status',
          status: 400,
        });
    }
    
    // Get updated shipment with full details
    const fullShipment = await shipmentService.getShipmentById(id);
    
    return sendSuccess(res, {
      message: `Shipment marked as ${status}`,
      data: toShipperMobileShipmentResponse(fullShipment),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ============================================
// LOCATION ENDPOINT (Requirements: 4.1, 13.4)
// ============================================

/**
 * Update shipper location
 * POST /api/shipper/location
 * 
 * Body:
 * - lat: number (required)
 * - lng: number (required)
 * - heading: number (optional)
 * - speed: number (optional)
 * - accuracy: number (optional)
 * 
 * Requirements:
 * - 4.1: Update shipper location every 5 seconds
 * - 13.4: Send GPS location to backend every 30 seconds
 */
async function updateLocation(req, res) {
  try {
    // Validate location input
    shipperValidator.validateLocation(req.body);
    
    // Get shipper profile
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    
    // Update location in Redis + Cassandra + broadcast
    const location = await locationService.updateLocation(
      shipper.id,
      parseFloat(req.body.lat),
      parseFloat(req.body.lng),
      {
        accuracy: req.body.accuracy,
        speed: req.body.speed,
        heading: req.body.heading,
        shipmentId: req.body.shipmentId,
      }
    );
    
    return sendSuccess(res, {
      data: shipperDto.toLocationResponse(location),
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get shipper location history from Cassandra
 * GET /api/shipper/location/history
 * 
 * Query params:
 * - date: YYYY-MM-DD (defaults to today)
 * - startTime: ISO timestamp (optional)
 * - endTime: ISO timestamp (optional)
 * - limit: number (default 100)
 */
async function getLocationHistory(req, res) {
  try {
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    const { date, startTime, endTime, limit = 100 } = req.query;
    
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const history = await locationService.getLocationHistory(
      shipper.id,
      startTime ? new Date(startTime) : null,
      endTime ? new Date(endTime) : null,
      parseInt(limit)
    );
    
    return sendSuccess(res, {
      data: {
        date: targetDate,
        locations: history,
        count: history.length,
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get shipper route for a specific shipment
 * GET /api/shipper/shipments/:id/route
 */
async function getShipmentRoute(req, res) {
  try {
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    const { id: shipmentId } = req.params;
    
    // Verify shipper owns this shipment
    const shipment = await shipmentService.getShipmentById(shipmentId);
    if (!shipment || shipment.shipper_id !== shipper.id) {
      return errorResponse(res, {
        code: 'NOT_FOUND',
        message: 'Shipment not found',
        status: 404,
      });
    }
    
    const route = await locationService.getShipmentLocationHistory(shipmentId, shipper.id);
    
    return sendSuccess(res, {
      data: {
        shipmentId,
        trackingNumber: shipment.tracking_number,
        route,
        pointCount: route.length,
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ============================================
// EARNINGS ENDPOINT (Requirements: 10.1, 10.3)
// ============================================

/**
 * Get shipper earnings
 * GET /api/shipper/earnings
 * 
 * Query params:
 * - startDate: ISO date string (optional, defaults to start of current month)
 * - endDate: ISO date string (optional, defaults to now)
 * - period: 'today' | 'week' | 'month' (optional, alternative to date range)
 * 
 * Requirements:
 * - 10.1: Calculate earnings for date range
 * - 10.3: Include breakdown by shipping fee and COD
 */
async function getEarnings(req, res) {
  try {
    // Get shipper profile
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    
    const { startDate, endDate, period = 'month' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let start, end;
    
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Use period-based calculation
      end = now;
      switch (period) {
        case 'today':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
        default:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }
    }
    
    // Get earnings data
    const earnings = await shipmentService.getShipperEarnings(shipper.id, start, end);
    
    return sendSuccess(res, {
      data: {
        period: startDate && endDate ? 'custom' : period,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        summary: {
          totalEarnings: earnings.totalEarnings,
          totalDeliveries: earnings.totalDeliveries,
          totalShippingFee: earnings.totalShippingFee,
          totalCodCollected: earnings.totalCodCollected,
        },
        breakdown: {
          shippingFeeEarnings: earnings.totalShippingFee,
          codCollected: earnings.totalCodCollected,
        },
        deliveries: earnings.deliveries.map(d => ({
          id: d.id,
          shippingFee: d.shippingFee,
          codAmount: d.codAmount,
          deliveredAt: d.deliveredAt,
        })),
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}


// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get shipper shipments with full details
 * Shipper có thể là pickup_shipper_id hoặc delivery_shipper_id
 * 
 * @param {string} shipperId
 * @param {string[]} statusFilter
 * @param {Object} pagination
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function getShipperShipmentsWithDetails(shipperId, statusFilter, pagination) {
  const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;
  
  // Note: 
  // - shipments table has multiple FKs to shippers - don't join shippers
  // - sub_orders.shop_id has no FK constraint to shops - can't join shops directly
  // - Shop info is already in shipment (pickup_contact_name = shop name)
  // - Shipper có thể là pickup_shipper_id (lấy hàng) hoặc delivery_shipper_id (giao hàng)
  //   hoặc shipper_id (shipper chính hiện tại)
  const { data, error, count } = await supabaseAdmin
    .from('shipments')
    .select(`
      *,
      sub_order:sub_orders(
        id,
        order_id,
        shop_id,
        total,
        status
      )
    `, { count: 'exact' })
    .or(`shipper_id.eq.${shipperId},pickup_shipper_id.eq.${shipperId},delivery_shipper_id.eq.${shipperId}`)
    .in('status', statusFilter)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    throw new Error(`Failed to get shipments: ${error.message}`);
  }
  
  return { data: data || [], count: count || 0 };
}

/**
 * Transform shipment for shipper mobile app response
 * Includes pickup/delivery addresses, COD info, and shipment type
 * 
 * @param {Object} shipment
 * @param {string} currentShipperId - ID của shipper hiện tại để xác định loại đơn
 * @returns {Object}
 */
function toShipperMobileShipmentResponse(shipment, currentShipperId = null) {
  if (!shipment) return null;
  
  // Note: Shop info is stored directly in shipment (pickup_contact_name = shop name)
  // We don't join shops table because sub_orders.shop_id has no FK constraint
  
  // Xác định loại đơn cho shipper này
  // - 'pickup': Shipper là pickup_shipper_id, cần lấy hàng từ shop
  // - 'delivery': Shipper là delivery_shipper_id (khác pickup), cần giao hàng cho khách
  // - 'both': Shipper vừa lấy vừa giao (cùng bưu cục)
  let shipmentType = 'both';
  if (currentShipperId) {
    const isPickupShipper = shipment.pickup_shipper_id === currentShipperId;
    const isDeliveryShipper = shipment.delivery_shipper_id === currentShipperId;
    
    if (isPickupShipper && !isDeliveryShipper) {
      shipmentType = 'pickup';
    } else if (isDeliveryShipper && !isPickupShipper) {
      shipmentType = 'delivery';
    }
  }
  
  return {
    id: shipment.id,
    trackingNumber: shipment.tracking_number,
    status: shipment.status,
    statusLabel: shipperDto.getStatusLabel(shipment.status),
    
    // Loại đơn cho shipper này
    shipmentType, // 'pickup' | 'delivery' | 'both'
    
    // Pickup info (from shop - stored in shipment)
    pickup: {
      address: shipment.pickup_address,
      lat: shipment.pickup_lat ? parseFloat(shipment.pickup_lat) : null,
      lng: shipment.pickup_lng ? parseFloat(shipment.pickup_lng) : null,
      contactName: shipment.pickup_contact_name,
      contactPhone: shipment.pickup_contact_phone,
      shopName: shipment.pickup_contact_name, // Shop name is stored as pickup_contact_name
      shopLogo: null, // Not available without joining shops
    },
    
    // Delivery info (to customer)
    delivery: {
      address: shipment.delivery_address,
      lat: shipment.delivery_lat ? parseFloat(shipment.delivery_lat) : null,
      lng: shipment.delivery_lng ? parseFloat(shipment.delivery_lng) : null,
      contactName: shipment.delivery_contact_name,
      contactPhone: shipment.delivery_contact_phone,
      notes: shipment.delivery_notes,
    },
    
    // COD info (Requirements: 6.1)
    cod: {
      amount: parseFloat(shipment.cod_amount || 0),
      collected: shipment.cod_collected || false,
      collectedAt: shipment.cod_collected_at,
    },
    
    // Fees
    shippingFee: parseFloat(shipment.shipping_fee || 0),
    
    // Distance and time
    distanceKm: shipment.distance_km ? parseFloat(shipment.distance_km) : null,
    estimatedDurationMinutes: shipment.estimated_duration_minutes,
    estimatedDelivery: shipment.estimated_delivery,
    
    // Delivery info
    deliveryAttempts: shipment.delivery_attempts || 0,
    failureReason: shipment.failure_reason,
    deliveryPhotoUrl: shipment.delivery_photo_url,
    
    // Transit info (mô phỏng trung chuyển)
    transit: {
      sourceRegion: shipment.source_region,
      destRegion: shipment.dest_region,
      isCrossRegion: shipment.is_cross_region || false,
      transitStartedAt: shipment.transit_started_at,
      readyForDeliveryAt: shipment.ready_for_delivery_at,
    },
    
    // Timestamps
    timestamps: {
      created: shipment.created_at,
      assigned: shipment.assigned_at,
      pickedUp: shipment.picked_up_at,
      delivered: shipment.delivered_at,
    },
    
    // Order info
    subOrderId: shipment.sub_order_id,
    orderId: shipment.sub_order?.order_id,
  };
}

// ============================================
// COD BALANCE ENDPOINT (Requirements: 6.4)
// ============================================

/**
 * Get shipper's daily COD balance
 * GET /api/shipper/cod-balance
 * 
 * Requirements:
 * - 6.4: Display total COD collected for reconciliation
 */
async function getCodBalance(req, res) {
  try {
    // Get shipper profile
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    
    // Get daily COD balance from shipper repository
    const shipperRepository = require('./shipper.repository');
    const codBalance = await shipperRepository.getDailyCodBalance(shipper.id);
    
    return sendSuccess(res, {
      data: {
        dailyCodCollected: codBalance.dailyCodCollected,
        date: codBalance.date,
        shipperId: shipper.id,
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ============================================
// REJECTION ENDPOINT (Requirements: 3.4)
// ============================================

/**
 * Reject assigned shipment
 * POST /api/shipper/shipments/:id/reject
 * 
 * Body:
 * - reason: string (required)
 * 
 * Requirements:
 * - 3.4: Handle shipper rejection and reassign to next available shipper
 */
async function rejectShipment(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: 'Rejection reason is required',
        status: 400,
      });
    }
    
    // Get shipper profile
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    
    // Get current shipment
    const shipment = await shipmentService.getShipmentById(id);
    
    // Verify shipper owns this shipment
    if (shipment.shipper_id !== shipper.id) {
      return errorResponse(res, { 
        code: 'UNAUTHORIZED', 
        message: 'You are not assigned to this shipment', 
        status: 403 
      });
    }
    
    // Can only reject if status is 'assigned' (not yet picked up)
    if (shipment.status !== 'assigned') {
      return errorResponse(res, {
        code: 'INVALID_STATUS',
        message: 'Can only reject shipments that have not been picked up yet',
        status: 400,
      });
    }
    
    // Publish rejection event for async processing
    const rabbitmqClient = require('../../shared/rabbitmq/rabbitmq.client');
    await rabbitmqClient.publishToExchange(
      rabbitmqClient.EXCHANGES.EVENTS,
      'SHIPPER_REJECTION',
      {
        event: 'SHIPPER_REJECTION',
        data: {
          shipmentId: id,
          shipperId: shipper.id,
          rejectionReason: reason,
          orderId: shipment.sub_order?.order_id,
          customerId: shipment.sub_order?.order?.customer_id,
          partnerId: shipment.sub_order?.shop?.partner_id,
        },
        timestamp: new Date().toISOString(),
      }
    );
    
    return sendSuccess(res, {
      message: 'Shipment rejection submitted. It will be reassigned to another shipper.',
      data: {
        shipmentId: id,
        status: 'rejection_pending',
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ============================================
// PHOTO UPLOAD ENDPOINT (Requirements: 13.6)
// ============================================

/**
 * Upload delivery/pickup photo
 * POST /api/shipper/upload/photo
 * 
 * Body (multipart/form-data):
 * - photo: file (required)
 * - shipmentId: string (required)
 * - type: string (optional, default 'delivery') - 'delivery', 'signature', 'pickup'
 * 
 * Requirements:
 * - 13.6: Capture photo, upload to Supabase Storage, attach URL to status update
 */
async function uploadPhoto(req, res) {
  try {
    if (!req.file) {
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: 'Photo file is required',
        status: 400,
      });
    }
    
    const { shipmentId, type = 'delivery' } = req.body;
    
    if (!shipmentId) {
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: 'Shipment ID is required',
        status: 400,
      });
    }
    
    // Validate type
    const validTypes = ['delivery', 'signature', 'pickup'];
    if (!validTypes.includes(type)) {
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: `Type must be one of: ${validTypes.join(', ')}`,
        status: 400,
      });
    }
    
    // Get shipper profile
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    
    // Verify shipper owns this shipment
    const shipment = await shipmentService.getShipmentById(shipmentId);
    if (shipment.shipper_id !== shipper.id) {
      return errorResponse(res, { 
        code: 'UNAUTHORIZED', 
        message: 'You are not assigned to this shipment', 
        status: 403 
      });
    }
    
    // Upload to Supabase Storage - using 'shipments' bucket for delivery proof photos
    const storageClient = require('../../shared/supabase/storage.client');
    const filename = `${type}_${Date.now()}.jpg`;
    const path = `${shipmentId}/${filename}`;
    
    const { url } = await storageClient.uploadFile(
      'shipments', // Using shipments bucket for delivery proof photos
      path,
      req.file.buffer,
      {
        contentType: req.file.mimetype,
        upsert: false,
      }
    );
    
    return sendSuccess(res, {
      message: 'Photo uploaded successfully',
      data: {
        url,
        path,
        type,
        shipmentId,
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ============================================
// DASHBOARD/STATISTICS ENDPOINT (Requirements: 9.4)
// ============================================

/**
 * Get shipper dashboard with statistics
 * GET /api/shipper/dashboard
 * 
 * Query params:
 * - period: 'today' | 'week' | 'month' | 'all' (default: 'all')
 * 
 * Requirements:
 * - 9.4: Display success rate, average rating, and daily statistics
 */
async function getDashboard(req, res) {
  try {
    // Get shipper profile
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    
    const { period = 'all' } = req.query;
    
    // Get comprehensive statistics
    const statistics = await statisticsService.getShipperStatistics(shipper.id, period);
    
    // Get daily statistics for the last 7 days
    const dailyStats = await statisticsService.getDailyStatistics(shipper.id, 7);
    
    // Get shipper profile info
    const shipperInfo = {
      id: shipper.id,
      name: shipper.user?.full_name || 'Unknown',
      phone: shipper.user?.phone,
      avatarUrl: shipper.user?.avatar_url,
      vehicleType: shipper.vehicle_type,
      vehiclePlate: shipper.vehicle_plate,
      status: shipper.status,
      isOnline: shipper.is_online || false,
      isAvailable: shipper.is_available || false,
    };
    
    return sendSuccess(res, {
      data: {
        shipper: shipperInfo,
        statistics: {
          period: statistics.period,
          startDate: statistics.startDate,
          endDate: statistics.endDate,
          overall: statistics.overall,
          periodStats: statistics.periodStats,
          ratings: statistics.ratings,
          status: statistics.status,
        },
        dailyStats,
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get detailed statistics for shipper
 * GET /api/shipper/statistics
 * 
 * Query params:
 * - period: 'today' | 'week' | 'month' | 'all' (default: 'month')
 * - breakdown: 'daily' | 'weekly' | 'monthly' (default: 'daily')
 * - days: number (for daily breakdown, default 7)
 * - weeks: number (for weekly breakdown, default 4)
 * - months: number (for monthly breakdown, default 6)
 * 
 * Requirements:
 * - 9.1: Record delivery time and calculate on-time rate
 * - 9.4: Display success rate, average rating, and daily statistics
 */
async function getStatistics(req, res) {
  try {
    // Get shipper profile
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    
    const { 
      period = 'month', 
      breakdown = 'daily',
      days = 7,
      weeks = 4,
      months = 6,
    } = req.query;
    
    // Get main statistics
    const statistics = await statisticsService.getShipperStatistics(shipper.id, period);
    
    // Get breakdown based on type
    let breakdownData;
    switch (breakdown) {
      case 'weekly':
        breakdownData = await statisticsService.getWeeklyStatistics(shipper.id, parseInt(weeks));
        break;
      case 'monthly':
        breakdownData = await statisticsService.getMonthlyStatistics(shipper.id, parseInt(months));
        break;
      case 'daily':
      default:
        breakdownData = await statisticsService.getDailyStatistics(shipper.id, parseInt(days));
        break;
    }
    
    return sendSuccess(res, {
      data: {
        summary: {
          period: statistics.period,
          startDate: statistics.startDate,
          endDate: statistics.endDate,
          overall: statistics.overall,
          periodStats: statistics.periodStats,
          ratings: statistics.ratings,
        },
        breakdown: {
          type: breakdown,
          data: breakdownData,
        },
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

module.exports = {
  getShipments,
  getShipmentById,
  updateShipmentStatus,
  updateLocation,
  getLocationHistory,
  getShipmentRoute,
  getEarnings,
  getCodBalance,
  rejectShipment,
  uploadPhoto,
  getDashboard,
  getStatistics,
  
  // Barcode scan endpoints
  scanPickup,
  scanDelivery,
  validateBarcode,
  batchScanPickup,
  
  // Export for testing
  FAILURE_REASONS,
  SHIPPER_STATUS_TRANSITIONS,
};


// ============================================
// BARCODE SCAN ENDPOINTS (Pickup & Delivery)
// ============================================

/**
 * Scan barcode to pickup shipment
 * POST /api/shipper/shipments/scan/pickup
 * 
 * Body:
 * - trackingNumber: string (required) - Scanned barcode/tracking number
 * - location: { lat, lng } (optional)
 * 
 * Flow:
 * 1. Shipper scans barcode on package at shop
 * 2. System validates: Is tracking number valid? Is it assigned to this shipper?
 * 3. System updates status: assigned -> picked_up
 * 4. Returns shipment details for confirmation
 */
async function scanPickup(req, res) {
  try {
    const { trackingNumber, location } = req.body;
    
    if (!trackingNumber) {
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: 'Tracking number is required',
        status: 400,
      });
    }
    
    // Get shipper profile
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    
    // Find shipment by tracking number
    const shipment = await shipmentService.getByTrackingNumber(trackingNumber);
    
    if (!shipment) {
      return errorResponse(res, {
        code: 'SHIPMENT_NOT_FOUND',
        message: 'Mã vận đơn không tồn tại trong hệ thống',
        status: 404,
      });
    }
    
    // Verify shipper is assigned to this shipment
    if (shipment.shipper_id !== shipper.id) {
      return errorResponse(res, {
        code: 'NOT_ASSIGNED',
        message: 'Đơn hàng này không được phân công cho bạn',
        status: 403,
      });
    }
    
    // Verify shipment status is 'assigned' (ready for pickup)
    if (shipment.status !== 'assigned') {
      const statusMessages = {
        'picked_up': 'Đơn hàng này đã được lấy rồi',
        'delivering': 'Đơn hàng này đang được giao',
        'delivered': 'Đơn hàng này đã giao thành công',
        'failed': 'Đơn hàng này đã giao thất bại',
        'cancelled': 'Đơn hàng này đã bị hủy',
      };
      return errorResponse(res, {
        code: 'INVALID_STATUS',
        message: statusMessages[shipment.status] || `Không thể lấy hàng với trạng thái: ${shipment.status}`,
        status: 400,
      });
    }
    
    // Update location if provided
    if (location && location.lat && location.lng) {
      try {
        await locationService.updateLocation(
          shipper.id,
          parseFloat(location.lat),
          parseFloat(location.lng),
          { shipmentId: shipment.id }
        );
      } catch (locError) {
        console.error('Failed to update location:', locError.message);
      }
    }
    
    // Mark as picked up
    const updatedShipment = await shipmentService.markPickedUp(shipment.id, shipper.id);
    
    // Get full shipment details
    const fullShipment = await shipmentService.getShipmentById(shipment.id);
    
    return sendSuccess(res, {
      message: 'Đã xác nhận lấy hàng thành công',
      shipment: toShipperMobileShipmentResponse(fullShipment),
      scannedAt: new Date().toISOString(),
      action: 'pickup',
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Scan barcode to deliver shipment
 * POST /api/shipper/shipments/scan/delivery
 * 
 * Body:
 * - trackingNumber: string (required) - Scanned barcode/tracking number
 * - photoUrl: string (required) - Proof of delivery photo
 * - signatureUrl: string (optional) - Customer signature
 * - codCollected: boolean (required for COD orders)
 * - location: { lat, lng } (optional)
 * 
 * Flow:
 * 1. Shipper scans barcode at customer's address
 * 2. System validates: Is tracking number valid? Is it assigned to this shipper? Is status correct?
 * 3. Shipper uploads photo proof + confirms COD collection (if applicable)
 * 4. System updates status: delivering -> delivered
 */
async function scanDelivery(req, res) {
  try {
    const { trackingNumber, photoUrl, signatureUrl, codCollected, location } = req.body;
    
    if (!trackingNumber) {
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: 'Tracking number is required',
        status: 400,
      });
    }
    
    if (!photoUrl) {
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: 'Ảnh xác nhận giao hàng là bắt buộc',
        status: 400,
      });
    }
    
    // Get shipper profile
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    
    // Find shipment by tracking number
    const shipment = await shipmentService.getByTrackingNumber(trackingNumber);
    
    if (!shipment) {
      return errorResponse(res, {
        code: 'SHIPMENT_NOT_FOUND',
        message: 'Mã vận đơn không tồn tại trong hệ thống',
        status: 404,
      });
    }
    
    // Verify shipper is assigned to this shipment
    if (shipment.shipper_id !== shipper.id) {
      return errorResponse(res, {
        code: 'NOT_ASSIGNED',
        message: 'Đơn hàng này không được phân công cho bạn',
        status: 403,
      });
    }
    
    // Verify shipment status is 'delivering' (ready for delivery confirmation)
    if (shipment.status !== 'delivering') {
      const statusMessages = {
        'assigned': 'Bạn cần lấy hàng trước khi giao',
        'picked_up': 'Bạn cần bắt đầu giao hàng trước',
        'delivered': 'Đơn hàng này đã giao thành công rồi',
        'failed': 'Đơn hàng này đã giao thất bại',
        'cancelled': 'Đơn hàng này đã bị hủy',
      };
      return errorResponse(res, {
        code: 'INVALID_STATUS',
        message: statusMessages[shipment.status] || `Không thể xác nhận giao với trạng thái: ${shipment.status}`,
        status: 400,
      });
    }
    
    // Check COD collection for COD orders
    const codAmount = parseFloat(shipment.cod_amount || 0);
    if (codAmount > 0 && codCollected !== true) {
      return errorResponse(res, {
        code: 'COD_NOT_CONFIRMED',
        message: `Vui lòng xác nhận đã thu tiền COD: ${codAmount.toLocaleString('vi-VN')}đ`,
        status: 400,
      });
    }
    
    // Update location if provided
    if (location && location.lat && location.lng) {
      try {
        await locationService.updateLocation(
          shipper.id,
          parseFloat(location.lat),
          parseFloat(location.lng),
          { shipmentId: shipment.id }
        );
      } catch (locError) {
        console.error('Failed to update location:', locError.message);
      }
    }
    
    // Mark as delivered
    const updatedShipment = await shipmentService.markDelivered(shipment.id, shipper.id, {
      photoUrl,
      signatureUrl,
      codCollected,
    });
    
    // Get full shipment details
    const fullShipment = await shipmentService.getShipmentById(shipment.id);
    
    return sendSuccess(res, {
      message: 'Đã xác nhận giao hàng thành công',
      shipment: toShipperMobileShipmentResponse(fullShipment),
      scannedAt: new Date().toISOString(),
      action: 'delivery',
      codCollected: codAmount > 0 ? codAmount : null,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Validate barcode/tracking number without updating status
 * POST /api/shipper/shipments/scan/validate
 * 
 * Body:
 * - trackingNumber: string (required)
 * 
 * Returns shipment info if valid and assigned to shipper
 * Useful for preview before confirming pickup/delivery
 */
async function validateBarcode(req, res) {
  try {
    const { trackingNumber } = req.body;
    
    if (!trackingNumber) {
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: 'Tracking number is required',
        status: 400,
      });
    }
    
    // Get shipper profile
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    
    // Find shipment by tracking number
    const shipment = await shipmentService.getByTrackingNumber(trackingNumber);
    
    if (!shipment) {
      return sendSuccess(res, {
        valid: false,
        message: 'Mã vận đơn không tồn tại trong hệ thống',
        data: null,
      });
    }
    
    // Check if assigned to this shipper
    const isAssignedToMe = shipment.shipper_id === shipper.id;
    
    // Determine available actions based on status
    let availableActions = [];
    if (isAssignedToMe) {
      if (shipment.status === 'assigned') {
        availableActions = ['pickup'];
      } else if (shipment.status === 'picked_up') {
        availableActions = ['start_delivery'];
      } else if (shipment.status === 'delivering') {
        availableActions = ['delivery', 'fail'];
      }
    }
    
    return sendSuccess(res, {
      valid: true,
      isAssignedToMe,
      message: isAssignedToMe 
        ? 'Mã vận đơn hợp lệ' 
        : 'Đơn hàng này không được phân công cho bạn',
      shipment: isAssignedToMe ? toShipperMobileShipmentResponse(shipment) : null,
      availableActions: isAssignedToMe ? availableActions : null,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Batch scan multiple packages for pickup
 * POST /api/shipper/shipments/scan/batch-pickup
 * 
 * Body:
 * - trackingNumbers: string[] (required) - Array of scanned barcodes
 * - location: { lat, lng } (optional)
 * 
 * Returns results for each tracking number
 */
async function batchScanPickup(req, res) {
  try {
    const { trackingNumbers, location } = req.body;
    
    if (!trackingNumbers || !Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: 'At least one tracking number is required',
        status: 400,
      });
    }
    
    if (trackingNumbers.length > 50) {
      return errorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: 'Maximum 50 packages per batch',
        status: 400,
      });
    }
    
    // Get shipper profile
    const shipper = await shipperService.getShipperByUserId(req.user.userId);
    
    // Update location once if provided
    if (location && location.lat && location.lng) {
      try {
        await locationService.updateLocation(
          shipper.id,
          parseFloat(location.lat),
          parseFloat(location.lng)
        );
      } catch (locError) {
        console.error('Failed to update location:', locError.message);
      }
    }
    
    // Process each tracking number
    const results = {
      success: [],
      failed: [],
    };
    
    for (const trackingNumber of trackingNumbers) {
      try {
        const shipment = await shipmentService.getByTrackingNumber(trackingNumber);
        
        if (!shipment) {
          results.failed.push({
            trackingNumber,
            error: 'Mã vận đơn không tồn tại',
          });
          continue;
        }
        
        if (shipment.shipper_id !== shipper.id) {
          results.failed.push({
            trackingNumber,
            error: 'Không được phân công cho bạn',
          });
          continue;
        }
        
        if (shipment.status !== 'assigned') {
          results.failed.push({
            trackingNumber,
            error: `Trạng thái không hợp lệ: ${shipment.status}`,
          });
          continue;
        }
        
        // Mark as picked up
        await shipmentService.markPickedUp(shipment.id, shipper.id);
        
        results.success.push({
          trackingNumber,
          shipmentId: shipment.id,
        });
      } catch (err) {
        results.failed.push({
          trackingNumber,
          error: err.message,
        });
      }
    }
    
    return sendSuccess(res, {
      message: `Đã lấy ${results.success.length}/${trackingNumbers.length} đơn hàng`,
      data: {
        totalScanned: trackingNumbers.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
        success: results.success,
        failed: results.failed,
        scannedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}
