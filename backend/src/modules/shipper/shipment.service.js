/**
 * Shipment Service
 * Business logic for shipment operations
 * 
 * Requirements: 5 (Shipment Management)
 */

const shipmentRepository = require('./shipment.repository');
const shipperRepository = require('./shipper.repository');
const shipperService = require('./shipper.service');
const trackingService = require('./tracking.service');
const transitSimulationService = require('./transit-simulation.service');
const { AppError, ValidationError } = require('../../shared/utils/error.util');
const rabbitmqClient = require('../../shared/rabbitmq/rabbitmq.client');

// Valid status transitions
const STATUS_TRANSITIONS = {
  created: ['assigned', 'pending_assignment', 'cancelled'],
  pending_assignment: ['assigned', 'cancelled'],
  assigned: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'delivering', 'failed'],
  in_transit: ['ready_for_delivery', 'delivering', 'failed'],
  ready_for_delivery: ['delivering', 'failed'],
  delivering: ['delivered', 'failed'],
  delivered: [],
  failed: ['returned', 'pending_redelivery'],
  pending_redelivery: ['delivering', 'failed', 'returned'],
  cancelled: [],
  returned: [],
};

// ============================================
// SHIPMENT CREATION
// ============================================

/**
 * Create shipment for a sub-order
 * @param {Object} subOrder - Sub-order data
 * @param {Object} deliveryInfo - Delivery information
 * @returns {Promise<Object>}
 */
async function createShipment(subOrder, deliveryInfo) {
  // Check if shipment already exists for this sub-order
  const existing = await shipmentRepository.findBySubOrderId(subOrder.id);
  if (existing) {
    throw new AppError('SHIPMENT_EXISTS', 'Shipment already exists for this order', 400);
  }

  const shipmentData = {
    sub_order_id: subOrder.id,
    
    // Pickup (Shop)
    pickup_address: deliveryInfo.pickupAddress,
    pickup_lat: deliveryInfo.pickupLat,
    pickup_lng: deliveryInfo.pickupLng,
    pickup_contact_name: deliveryInfo.pickupContactName,
    pickup_contact_phone: deliveryInfo.pickupContactPhone,
    
    // Delivery (Customer)
    delivery_address: deliveryInfo.deliveryAddress,
    delivery_lat: deliveryInfo.deliveryLat,
    delivery_lng: deliveryInfo.deliveryLng,
    delivery_contact_name: deliveryInfo.deliveryContactName,
    delivery_contact_phone: deliveryInfo.deliveryContactPhone,
    
    // Fees
    shipping_fee: deliveryInfo.shippingFee || 0,
    cod_amount: deliveryInfo.codAmount || 0,
    
    // Notes
    delivery_notes: deliveryInfo.notes,
    
    // Distance and time (if calculated)
    distance_km: deliveryInfo.distanceKm,
    estimated_duration_minutes: deliveryInfo.estimatedDuration,
  };

  const shipment = await shipmentRepository.createShipment(shipmentData);

  // Initialize tracking events
  try {
    await trackingService.initializeTracking(shipment.id, shipment);
  } catch (e) {
    console.error('Failed to initialize tracking:', e.message);
  }

  // Publish event
  await publishShipmentEvent('SHIPMENT_CREATED', shipment);

  return shipment;
}

// ============================================
// SHIPMENT RETRIEVAL
// ============================================

/**
 * Get shipment by ID
 * @param {string} shipmentId
 * @returns {Promise<Object>}
 */
async function getShipmentById(shipmentId) {
  const shipment = await shipmentRepository.findShipmentById(shipmentId);
  if (!shipment) {
    throw new AppError('SHIPMENT_NOT_FOUND', 'Shipment not found', 404);
  }
  return shipment;
}

/**
 * Get shipment by tracking number
 * @param {string} trackingNumber
 * @returns {Promise<Object>}
 */
async function getByTrackingNumber(trackingNumber) {
  const shipment = await shipmentRepository.findByTrackingNumber(trackingNumber);
  if (!shipment) {
    throw new AppError('SHIPMENT_NOT_FOUND', 'Shipment not found', 404);
  }
  return shipment;
}

/**
 * Get shipments by shipper
 * @param {string} shipperId
 * @param {Object} options
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function getShipmentsByShipper(shipperId, options = {}) {
  return shipmentRepository.findByShipperId(shipperId, options);
}

/**
 * Get active shipments for shipper
 * @param {string} shipperId
 * @returns {Promise<Object[]>}
 */
async function getActiveShipments(shipperId) {
  return shipmentRepository.findActiveByShipper(shipperId);
}

/**
 * Get pending shipments (for assignment)
 * @param {Object} options
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function getPendingShipments(options = {}) {
  return shipmentRepository.findPendingShipments(options);
}

// ============================================
// SHIPPER ASSIGNMENT
// ============================================

/**
 * Assign shipper to shipment
 * @param {string} shipmentId
 * @param {string} shipperId
 * @returns {Promise<Object>}
 */
async function assignShipper(shipmentId, shipperId) {
  const shipment = await getShipmentById(shipmentId);
  
  if (shipment.status !== 'created') {
    throw new AppError('INVALID_STATUS', 'Shipment is not available for assignment', 400);
  }

  // Verify shipper is active and available
  const shipper = await shipperService.getShipperById(shipperId);
  if (shipper.status !== 'active') {
    throw new AppError('SHIPPER_NOT_ACTIVE', 'Shipper is not active', 400);
  }
  if (!shipper.is_online) {
    throw new AppError('SHIPPER_OFFLINE', 'Shipper is offline', 400);
  }

  // Mark shipper as unavailable
  await shipperRepository.updateShipper(shipperId, { is_available: false });

  // Assign shipper to shipment
  const updatedShipment = await shipmentRepository.assignShipper(shipmentId, shipperId);

  // Publish event
  await publishShipmentEvent('SHIPMENT_ASSIGNED', updatedShipment);

  return updatedShipment;
}

/**
 * Auto-assign nearest available shipper
 * @param {string} shipmentId
 * @returns {Promise<Object>}
 */
async function autoAssignShipper(shipmentId) {
  const shipment = await getShipmentById(shipmentId);
  
  if (shipment.status !== 'created') {
    throw new AppError('INVALID_STATUS', 'Shipment is not available for assignment', 400);
  }

  // Find nearby shippers
  const nearbyShippers = await shipperRepository.findNearbyShippers(
    shipment.pickup_lat,
    shipment.pickup_lng,
    10, // 10km radius
    5   // Get top 5
  );

  if (nearbyShippers.length === 0) {
    throw new AppError('NO_SHIPPER_AVAILABLE', 'No available shipper nearby', 400);
  }

  // Assign to nearest shipper
  const nearestShipper = nearbyShippers[0];
  return assignShipper(shipmentId, nearestShipper.id);
}

// ============================================
// STATUS UPDATES
// ============================================

/**
 * Update shipment status
 * @param {string} shipmentId
 * @param {string} newStatus
 * @param {Object} additionalData
 * @returns {Promise<Object>}
 */
async function updateStatus(shipmentId, newStatus, additionalData = {}) {
  const shipment = await getShipmentById(shipmentId);
  
  // Validate status transition
  const allowedTransitions = STATUS_TRANSITIONS[shipment.status];
  if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      `Cannot transition from ${shipment.status} to ${newStatus}`,
      400
    );
  }

  const updatedShipment = await shipmentRepository.updateStatus(
    shipmentId,
    newStatus,
    additionalData
  );

  // Handle side effects based on status
  await handleStatusChange(updatedShipment, shipment.status);

  // Add tracking event
  try {
    const shipper = updatedShipment.shipper_id 
      ? await shipperService.getShipperById(updatedShipment.shipper_id)
      : null;
    await trackingService.simulateTrackingEvents(shipmentId, newStatus, {
      shipment: updatedShipment,
      shipper,
      ...additionalData,
    });
  } catch (e) {
    console.error('Failed to add tracking event:', e.message);
  }

  // Publish event
  await publishShipmentEvent('SHIPMENT_STATUS_CHANGED', {
    ...updatedShipment,
    previousStatus: shipment.status,
  });

  return updatedShipment;
}

/**
 * Mark shipment as picked up
 * @param {string} shipmentId
 * @param {string} shipperId - Verify shipper owns this shipment
 * @returns {Promise<Object>}
 */
async function markPickedUp(shipmentId, shipperId) {
  const shipment = await getShipmentById(shipmentId);
  
  if (shipment.shipper_id !== shipperId) {
    throw new AppError('UNAUTHORIZED', 'You are not assigned to this shipment', 403);
  }

  const updatedShipment = await updateStatus(shipmentId, 'picked_up');

  // Start transit simulation - mô phỏng hành trình trung chuyển
  try {
    await transitSimulationService.startTransitSimulation(shipmentId, updatedShipment);
  } catch (e) {
    console.error('[ShipmentService] Failed to start transit simulation:', e.message);
    // Don't throw - transit simulation is non-blocking
  }

  return updatedShipment;
}

/**
 * Mark shipment as delivering
 * @param {string} shipmentId
 * @param {string} shipperId
 * @returns {Promise<Object>}
 */
async function markDelivering(shipmentId, shipperId) {
  const shipment = await getShipmentById(shipmentId);
  
  if (shipment.shipper_id !== shipperId) {
    throw new AppError('UNAUTHORIZED', 'You are not assigned to this shipment', 403);
  }

  return updateStatus(shipmentId, 'delivering');
}

/**
 * Mark shipment as delivered
 * Requirements: 6.2 - Require COD collection confirmation for COD orders
 * Requirements: 6.3 - Record COD collection and update shipper's daily COD balance
 * 
 * @param {string} shipmentId
 * @param {string} shipperId
 * @param {Object} proofData - Delivery proof
 * @param {string} proofData.photoUrl - Photo proof URL
 * @param {string} proofData.signatureUrl - Signature URL (optional)
 * @param {boolean} proofData.codCollected - COD collection confirmation (required for COD orders)
 * @returns {Promise<Object>}
 */
async function markDelivered(shipmentId, shipperId, proofData = {}) {
  const shipment = await getShipmentById(shipmentId);
  
  if (shipment.shipper_id !== shipperId) {
    throw new AppError('UNAUTHORIZED', 'You are not assigned to this shipment', 403);
  }

  // Requirements 6.2: Require COD collection confirmation for COD orders
  const codAmount = parseFloat(shipment.cod_amount || 0);
  if (codAmount > 0) {
    if (proofData.codCollected !== true) {
      throw new AppError('SHIP_006', 'COD collection confirmation is required for COD orders', 400);
    }
  }

  const updateData = {
    delivery_photo_url: proofData.photoUrl,
    recipient_signature_url: proofData.signatureUrl,
  };

  // Requirements 6.3: Record COD collection
  if (codAmount > 0 && proofData.codCollected) {
    updateData.cod_collected = true;
    updateData.cod_collected_at = new Date().toISOString();
    
    // Update shipper's daily COD balance
    await shipperRepository.updateDailyCodBalance(shipperId, codAmount);
  }

  return updateStatus(shipmentId, 'delivered', updateData);
}

/**
 * Mark shipment as failed
 * @param {string} shipmentId
 * @param {string} shipperId
 * @param {string} reason
 * @returns {Promise<Object>}
 */
async function markFailed(shipmentId, shipperId, reason) {
  const shipment = await getShipmentById(shipmentId);
  
  if (shipment.shipper_id !== shipperId) {
    throw new AppError('UNAUTHORIZED', 'You are not assigned to this shipment', 403);
  }

  if (!reason) {
    throw new ValidationError('Failure reason is required');
  }

  return updateStatus(shipmentId, 'failed', {
    failure_reason: reason,
  });
}

/**
 * Cancel shipment
 * @param {string} shipmentId
 * @param {string} reason
 * @returns {Promise<Object>}
 */
async function cancelShipment(shipmentId, reason) {
  return updateStatus(shipmentId, 'cancelled', {
    failure_reason: reason,
  });
}

// ============================================
// RATING
// ============================================

/**
 * Rate shipment delivery
 * @param {string} shipmentId
 * @param {number} rating
 * @param {string} feedback
 * @returns {Promise<Object>}
 */
async function rateDelivery(shipmentId, rating, feedback = null) {
  const shipment = await getShipmentById(shipmentId);
  
  if (shipment.status !== 'delivered') {
    throw new AppError('INVALID_STATUS', 'Can only rate delivered shipments', 400);
  }

  if (shipment.customer_rating) {
    throw new AppError('ALREADY_RATED', 'Shipment has already been rated', 400);
  }

  if (rating < 1 || rating > 5) {
    throw new ValidationError('Rating must be between 1 and 5');
  }

  // Update shipment rating
  const updatedShipment = await shipmentRepository.addRating(shipmentId, rating, feedback);

  // Update shipper's average rating
  if (shipment.shipper_id) {
    await shipperService.updateRating(shipment.shipper_id, rating);
  }

  return updatedShipment;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Handle side effects of status changes
 * @param {Object} shipment
 * @param {string} previousStatus
 */
async function handleStatusChange(shipment, previousStatus) {
  const { status, shipper_id } = shipment;

  // When delivered or failed, make shipper available again
  if ((status === 'delivered' || status === 'failed') && shipper_id) {
    await shipperRepository.updateShipper(shipper_id, { is_available: true });
    
    // Record delivery for shipper statistics
    await shipperService.recordDelivery(shipper_id, status === 'delivered');
  }

  // When cancelled before assignment, no action needed
  // When cancelled after assignment, make shipper available
  if (status === 'cancelled' && shipper_id) {
    await shipperRepository.updateShipper(shipper_id, { is_available: true });
  }
}

/**
 * Publish shipment event to RabbitMQ
 * @param {string} eventType
 * @param {Object} data
 */
async function publishShipmentEvent(eventType, data) {
  try {
    await rabbitmqClient.publishToExchange(
      rabbitmqClient.EXCHANGES.EVENTS,
      `shipment.${eventType.toLowerCase()}`,
      {
        event: eventType,
        shipmentId: data.id,
        trackingNumber: data.tracking_number,
        subOrderId: data.sub_order_id,
        shipperId: data.shipper_id,
        status: data.status,
        previousStatus: data.previousStatus,
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error(`Failed to publish ${eventType} event:`, error.message);
    // Don't throw - event publishing should not block main flow
  }
}

// ============================================
// EARNINGS
// ============================================

/**
 * Get shipper earnings for a date range
 * @param {string} shipperId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Object>}
 */
async function getShipperEarnings(shipperId, startDate, endDate) {
  const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
  
  const { data: shipments, error } = await supabaseAdmin
    .from('shipments')
    .select('id, shipping_fee, cod_amount, delivered_at, status')
    .eq('shipper_id', shipperId)
    .eq('status', 'delivered')
    .gte('delivered_at', startDate.toISOString())
    .lte('delivered_at', endDate.toISOString())
    .order('delivered_at', { ascending: false });

  if (error) {
    throw new AppError('QUERY_ERROR', `Failed to get earnings: ${error.message}`, 500);
  }

  const deliveries = shipments || [];
  const totalShippingFee = deliveries.reduce((sum, s) => sum + (parseFloat(s.shipping_fee) || 0), 0);
  const totalCodCollected = deliveries.reduce((sum, s) => sum + (parseFloat(s.cod_amount) || 0), 0);
  
  // Shipper earnings = shipping fee (COD is collected but returned to shop)
  const totalEarnings = totalShippingFee;

  return {
    totalEarnings,
    totalDeliveries: deliveries.length,
    totalShippingFee,
    totalCodCollected,
    deliveries: deliveries.map(d => ({
      id: d.id,
      shippingFee: parseFloat(d.shipping_fee) || 0,
      codAmount: parseFloat(d.cod_amount) || 0,
      deliveredAt: d.delivered_at,
    })),
  };
}

/**
 * Get all shipments for an order (multi-shop orders)
 * @param {string} orderId
 * @returns {Promise<Object[]>}
 */
async function getShipmentsByOrderId(orderId) {
  return shipmentRepository.findByOrderId(orderId);
}

module.exports = {
  // Creation
  createShipment,
  
  // Retrieval
  getShipmentById,
  getByTrackingNumber,
  getShipmentsByShipper,
  getActiveShipments,
  getPendingShipments,
  getShipmentsByOrderId,
  
  // Assignment
  assignShipper,
  autoAssignShipper,
  
  // Status updates
  updateStatus,
  markPickedUp,
  markDelivering,
  markDelivered,
  markFailed,
  cancelShipment,
  
  // Rating
  rateDelivery,
  
  // Earnings
  getShipperEarnings,
};
