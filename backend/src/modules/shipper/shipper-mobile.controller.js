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
      data: result.data.map(toShipperMobileShipmentResponse),
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
 * - photoUrl: string (required for 'delivered' status)
 * - codCollected: boolean (required for 'delivered' status on COD orders)
 * - location: { lat, lng } (optional, updates shipper location)
 * 
 * Requirements:
 * - 6.2: Require COD collection confirmation for COD orders
 * - 6.3: Record COD collection and update shipper's daily COD balance
 * - 7.1: Require photo for delivered status
 * - 8.1: Require reason for failed status (from predefined list)
 * - 13.3: Send update to backend and receive confirmation
 */
async function updateShipmentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, reason, photoUrl, signatureUrl, codCollected, location } = req.body;
    
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
    // Requirements 7.1: Photo required for delivered status
    if (status === 'delivered' && !photoUrl) {
      return errorResponse(res, {
        code: 'SHIP_005',
        message: 'Photo proof is required for delivery confirmation',
        status: 400,
      });
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
        updatedShipment = await shipmentService.markDelivered(id, shipper.id, {
          photoUrl,
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
 * @param {string} shipperId
 * @param {string[]} statusFilter
 * @param {Object} pagination
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function getShipperShipmentsWithDetails(shipperId, statusFilter, pagination) {
  const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;
  
  const { data, error, count } = await supabaseAdmin
    .from('shipments')
    .select(`
      *,
      shipper:shippers(
        id,
        vehicle_type,
        vehicle_plate,
        user:users(id, full_name, phone, avatar_url)
      ),
      sub_order:sub_orders(
        id,
        order_id,
        shop_id,
        total_amount,
        status,
        shops:shops(id, shop_name, logo_url, address),
        order:orders(
          id,
          customer_id,
          customer:users(id, full_name, phone)
        )
      )
    `, { count: 'exact' })
    .eq('shipper_id', shipperId)
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
 * Includes pickup/delivery addresses and COD info
 * 
 * @param {Object} shipment
 * @returns {Object}
 */
function toShipperMobileShipmentResponse(shipment) {
  if (!shipment) return null;
  
  // Get shop info from sub_order
  const shop = shipment.sub_order?.shops;
  const customer = shipment.sub_order?.order?.customer;
  
  return {
    id: shipment.id,
    trackingNumber: shipment.tracking_number,
    status: shipment.status,
    statusLabel: shipperDto.getStatusLabel(shipment.status),
    
    // Pickup info (from shop)
    pickup: {
      address: shipment.pickup_address,
      lat: shipment.pickup_lat ? parseFloat(shipment.pickup_lat) : null,
      lng: shipment.pickup_lng ? parseFloat(shipment.pickup_lng) : null,
      contactName: shipment.pickup_contact_name,
      contactPhone: shipment.pickup_contact_phone,
      shopName: shop?.shop_name,
      shopLogo: shop?.logo_url,
    },
    
    // Delivery info (to customer)
    delivery: {
      address: shipment.delivery_address,
      lat: shipment.delivery_lat ? parseFloat(shipment.delivery_lat) : null,
      lng: shipment.delivery_lng ? parseFloat(shipment.delivery_lng) : null,
      contactName: shipment.delivery_contact_name || customer?.full_name,
      contactPhone: shipment.delivery_contact_phone || customer?.phone,
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
    
    // Upload to Supabase Storage
    const storageClient = require('../../shared/supabase/storage.client');
    const filename = `${type}_${Date.now()}.jpg`;
    const path = `shipments/${shipmentId}/${filename}`;
    
    const { url } = await storageClient.uploadFile(
      'documents', // Using documents bucket for shipment photos
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
  getEarnings,
  getCodBalance,
  rejectShipment,
  uploadPhoto,
  getDashboard,
  getStatistics,
  
  // Export for testing
  FAILURE_REASONS,
  SHIPPER_STATUS_TRANSITIONS,
};
