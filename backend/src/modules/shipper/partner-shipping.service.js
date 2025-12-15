/**
 * Partner Shipping Service
 * Business logic for partner shipping operations
 * 
 * Requirements: 2 (Partner Shipment Management)
 */

const shipmentService = require('./shipment.service');
const shipmentRepository = require('./shipment.repository');
const assignmentService = require('./assignment.service');
const trackingService = require('./tracking.service');
const orderRepository = require('../order/order.repository');
const shopRepository = require('../shop/shop.repository');
const notificationService = require('../notification/notification.service');
const rabbitmqClient = require('../../shared/rabbitmq/rabbitmq.client');
const { AppError } = require('../../shared/utils/error.util');
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get shop ID from partner ID
 * @param {string} partnerId
 * @returns {Promise<string|null>}
 */
async function getShopIdFromPartner(partnerId) {
  const shop = await shopRepository.findShopByPartnerId(partnerId);
  return shop ? shop.id : null;
}

/**
 * Get shop details with address
 * @param {string} shopId
 * @returns {Promise<Object>}
 */
async function getShopDetails(shopId) {
  const shop = await shopRepository.findShopById(shopId);
  if (!shop) {
    throw new AppError('SHOP_NOT_FOUND', 'Shop not found', 404);
  }
  return shop;
}

/**
 * Calculate estimated pickup time
 * @param {string} pickupTimeSlot - Optional preferred time slot
 * @returns {string} ISO timestamp
 */
function calculateEstimatedPickup(pickupTimeSlot) {
  const now = new Date();
  
  if (pickupTimeSlot) {
    // Parse time slot (e.g., "09:00-12:00")
    const [startTime] = pickupTimeSlot.split('-');
    const [hours, minutes] = startTime.split(':').map(Number);
    
    const pickupDate = new Date(now);
    pickupDate.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (pickupDate <= now) {
      pickupDate.setDate(pickupDate.getDate() + 1);
    }
    
    return pickupDate.toISOString();
  }
  
  // Default: 2-4 hours from now during business hours (8:00-18:00)
  const estimatedPickup = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  
  // If outside business hours, schedule for next business day
  if (estimatedPickup.getHours() >= 18) {
    estimatedPickup.setDate(estimatedPickup.getDate() + 1);
    estimatedPickup.setHours(9, 0, 0, 0);
  } else if (estimatedPickup.getHours() < 8) {
    estimatedPickup.setHours(9, 0, 0, 0);
  }
  
  return estimatedPickup.toISOString();
}

// ============================================
// MAIN SERVICE FUNCTIONS
// ============================================

/**
 * Mark sub-order as ready to ship and create shipment
 * Requirements: 2.2
 * 
 * @param {string} subOrderId - Sub-order ID
 * @param {string} partnerId - Partner user ID
 * @param {Object} options - Options
 * @param {string} options.pickupTimeSlot - Preferred pickup time slot
 * @returns {Promise<Object>}
 */
async function markReadyToShip(subOrderId, partnerId, options = {}) {
  // 1. Verify sub-order exists and belongs to partner's shop
  const subOrder = await orderRepository.findSubOrderById(subOrderId);
  if (!subOrder) {
    throw new AppError('ORDER_NOT_FOUND', 'Đơn hàng không tồn tại', 404);
  }

  const shopId = await getShopIdFromPartner(partnerId);
  if (!shopId || subOrder.shop_id !== shopId) {
    throw new AppError('ORDER_NOT_FOUND', 'Đơn hàng không tồn tại', 404);
  }

  // 2. Check sub-order status - must be 'processing' to mark ready to ship
  if (subOrder.status !== 'processing') {
    throw new AppError(
      'INVALID_STATUS',
      `Không thể đánh dấu sẵn sàng giao. Trạng thái hiện tại: ${subOrder.status}`,
      400
    );
  }

  // 3. Check if shipment already exists
  const existingShipment = await shipmentRepository.findBySubOrderId(subOrderId);
  if (existingShipment) {
    throw new AppError('SHIPMENT_EXISTS', 'Đơn vận chuyển đã được tạo', 400);
  }

  // 4. Get shop details for pickup address
  const shop = await getShopDetails(shopId);

  // 5. Get order details for delivery address
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', subOrder.order_id)
    .single();

  if (orderError || !order) {
    throw new AppError('ORDER_NOT_FOUND', 'Không tìm thấy thông tin đơn hàng', 404);
  }

  // 6. Get delivery address coordinates (if available)
  let deliveryLat = null;
  let deliveryLng = null;
  
  if (order.shipping_address_id) {
    const { data: address } = await supabaseAdmin
      .from('user_addresses')
      .select('lat, lng')
      .eq('id', order.shipping_address_id)
      .single();
    
    if (address) {
      deliveryLat = address.lat;
      deliveryLng = address.lng;
    }
  }

  // 7. Calculate COD amount (if payment method is COD)
  const codAmount = order.payment_method === 'cod' ? parseFloat(subOrder.total) : 0;

  // 8. Create shipment
  const shipment = await shipmentService.createShipment(subOrder, {
    // Pickup (Shop)
    pickupAddress: shop.address || `${shop.ward}, ${shop.district}, ${shop.city}`,
    pickupLat: shop.lat,
    pickupLng: shop.lng,
    pickupContactName: shop.shop_name,
    pickupContactPhone: shop.phone,
    
    // Delivery (Customer)
    deliveryAddress: order.shipping_address,
    deliveryLat: deliveryLat,
    deliveryLng: deliveryLng,
    deliveryContactName: order.shipping_name,
    deliveryContactPhone: order.shipping_phone,
    
    // Fees
    shippingFee: parseFloat(subOrder.shipping_fee) || 0,
    codAmount: codAmount,
    
    // Notes
    notes: order.customer_note,
  });

  // 9. Update sub-order status to ready_to_ship
  await orderRepository.updateSubOrderStatus(subOrderId, 'ready_to_ship');

  // 10. Calculate estimated pickup time
  const estimatedPickup = calculateEstimatedPickup(options.pickupTimeSlot);

  // 11. Update shipment with estimated pickup
  await shipmentRepository.updateShipment(shipment.id, {
    estimated_pickup: estimatedPickup,
  });

  // 12. Trigger auto-assignment via RabbitMQ
  try {
    await rabbitmqClient.publishToExchange(
      rabbitmqClient.EXCHANGES.EVENTS,
      'shipment.created',
      {
        event: 'SHIPMENT_CREATED',
        shipmentId: shipment.id,
        subOrderId: subOrderId,
        orderId: subOrder.order_id,
        trackingNumber: shipment.tracking_number,
        shopId: shopId,
        timestamp: new Date().toISOString(),
      }
    );
  } catch (e) {
    console.error('[PartnerShippingService] Failed to publish shipment event:', e.message);
  }

  // 13. Try auto-assignment immediately (fallback if RabbitMQ consumer not running)
  let assignmentResult = null;
  try {
    assignmentResult = await assignmentService.autoAssignShipment(shipment.id);
  } catch (assignError) {
    console.warn('[PartnerShippingService] Auto-assignment failed:', assignError.message);
    // Don't throw - shipment is created, assignment can be retried
  }

  // 14. Add tracking event
  try {
    await trackingService.addTrackingEvent(shipment.id, 'READY_TO_SHIP', {
      actorType: 'shop',
      actorId: partnerId,
      description_vi: 'Đơn hàng đã sẵn sàng để giao',
      locationName: shop.shop_name,
      locationAddress: shop.address,
      lat: shop.lat,
      lng: shop.lng,
    });
  } catch (e) {
    console.error('[PartnerShippingService] Failed to add tracking event:', e.message);
  }

  // 15. Return result
  return {
    shipment: {
      id: shipment.id,
      trackingNumber: shipment.tracking_number,
      status: assignmentResult ? 'assigned' : 'created',
      estimatedPickup: estimatedPickup,
    },
    shipper: assignmentResult ? {
      id: assignmentResult.pickupShipper?.id,
      name: assignmentResult.pickupShipper?.user?.full_name,
      phone: maskPhoneNumber(assignmentResult.pickupShipper?.user?.phone),
      vehiclePlate: assignmentResult.pickupShipper?.vehicle_plate,
    } : null,
    message: assignmentResult 
      ? 'Đã phân công shipper thành công' 
      : 'Đang tìm shipper phù hợp',
  };
}


/**
 * Get partner's shipments with filters
 * Requirements: 2.1, 2.4
 * 
 * @param {string} partnerId - Partner user ID
 * @param {Object} options - Filter options
 * @param {string} options.status - Filter by status
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @returns {Promise<Object>}
 */
async function getPartnerShipments(partnerId, options = {}) {
  const { status, page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  // Get shop ID
  const shopId = await getShopIdFromPartner(partnerId);
  if (!shopId) {
    return {
      shipments: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  // Build query
  let query = supabaseAdmin
    .from('shipments')
    .select(`
      *,
      shipper:shippers(
        id,
        vehicle_type,
        vehicle_plate,
        avg_rating,
        user:users(id, full_name, phone, avatar_url)
      ),
      sub_order:sub_orders!inner(
        id,
        order_id,
        shop_id,
        total,
        status,
        order_items(*)
      )
    `, { count: 'exact' })
    .eq('sub_order.shop_id', shopId);

  // Filter by status
  if (status) {
    query = query.eq('status', status);
  }

  // Pagination
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new AppError('QUERY_ERROR', `Failed to get shipments: ${error.message}`, 500);
  }

  // Get tracking events for each shipment
  const shipments = await Promise.all((data || []).map(async (shipment) => {
    // Get latest tracking events
    const { data: trackingEvents } = await supabaseAdmin
      .from('shipment_tracking_events')
      .select('*')
      .eq('shipment_id', shipment.id)
      .order('event_time', { ascending: false })
      .limit(5);

    return {
      id: shipment.id,
      trackingNumber: shipment.tracking_number,
      status: shipment.status,
      statusVi: getStatusVietnamese(shipment.status),
      
      // Addresses
      pickupAddress: shipment.pickup_address,
      deliveryAddress: shipment.delivery_address,
      deliveryContactName: shipment.delivery_contact_name,
      deliveryContactPhone: maskPhoneNumber(shipment.delivery_contact_phone),
      
      // Fees
      shippingFee: parseFloat(shipment.shipping_fee) || 0,
      codAmount: parseFloat(shipment.cod_amount) || 0,
      codCollected: shipment.cod_collected,
      
      // Shipper info
      shipper: shipment.shipper ? {
        id: shipment.shipper.id,
        name: shipment.shipper.user?.full_name,
        phone: maskPhoneNumber(shipment.shipper.user?.phone),
        avatarUrl: shipment.shipper.user?.avatar_url,
        vehicleType: shipment.shipper.vehicle_type,
        vehiclePlate: shipment.shipper.vehicle_plate,
        rating: shipment.shipper.avg_rating,
      } : null,
      
      // Sub-order info
      subOrder: {
        id: shipment.sub_order?.id,
        orderId: shipment.sub_order?.order_id,
        total: parseFloat(shipment.sub_order?.total) || 0,
        status: shipment.sub_order?.status,
        itemCount: shipment.sub_order?.order_items?.length || 0,
      },
      
      // Tracking
      trackingEvents: (trackingEvents || []).map(event => ({
        id: event.id,
        status: event.status,
        statusVi: event.status_vi,
        description: event.description,
        descriptionVi: event.description_vi,
        locationName: event.location_name,
        eventTime: event.event_time,
      })),
      
      // Timestamps
      estimatedPickup: shipment.estimated_pickup,
      estimatedDelivery: shipment.estimated_delivery,
      assignedAt: shipment.assigned_at,
      pickedUpAt: shipment.picked_up_at,
      deliveredAt: shipment.delivered_at,
      createdAt: shipment.created_at,
    };
  }));

  return {
    shipments,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

/**
 * Get shipment by ID for partner
 * Requirements: 2.4
 * 
 * @param {string} shipmentId - Shipment ID
 * @param {string} partnerId - Partner user ID
 * @returns {Promise<Object>}
 */
async function getShipmentById(shipmentId, partnerId) {
  // Get shop ID
  const shopId = await getShopIdFromPartner(partnerId);
  if (!shopId) {
    throw new AppError('SHIPMENT_NOT_FOUND', 'Không tìm thấy đơn vận chuyển', 404);
  }

  // Get shipment with related data
  const { data: shipment, error } = await supabaseAdmin
    .from('shipments')
    .select(`
      *,
      shipper:shippers(
        id,
        vehicle_type,
        vehicle_plate,
        avg_rating,
        total_deliveries,
        user:users(id, full_name, phone, avatar_url)
      ),
      sub_order:sub_orders(
        id,
        order_id,
        shop_id,
        total,
        status,
        order_items(*)
      )
    `)
    .eq('id', shipmentId)
    .single();

  if (error || !shipment) {
    throw new AppError('SHIPMENT_NOT_FOUND', 'Không tìm thấy đơn vận chuyển', 404);
  }

  // Verify ownership
  if (shipment.sub_order?.shop_id !== shopId) {
    throw new AppError('SHIPMENT_NOT_FOUND', 'Không tìm thấy đơn vận chuyển', 404);
  }

  // Get all tracking events
  const { data: trackingEvents } = await supabaseAdmin
    .from('shipment_tracking_events')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('event_time', { ascending: false });

  return {
    id: shipment.id,
    trackingNumber: shipment.tracking_number,
    status: shipment.status,
    statusVi: getStatusVietnamese(shipment.status),
    
    // Addresses
    pickupAddress: shipment.pickup_address,
    pickupContactName: shipment.pickup_contact_name,
    pickupContactPhone: shipment.pickup_contact_phone,
    deliveryAddress: shipment.delivery_address,
    deliveryContactName: shipment.delivery_contact_name,
    deliveryContactPhone: maskPhoneNumber(shipment.delivery_contact_phone),
    
    // Location
    currentLocationName: shipment.current_location_name,
    currentLocationLat: shipment.current_location_lat,
    currentLocationLng: shipment.current_location_lng,
    
    // Fees
    shippingFee: parseFloat(shipment.shipping_fee) || 0,
    codAmount: parseFloat(shipment.cod_amount) || 0,
    codCollected: shipment.cod_collected,
    codCollectedAt: shipment.cod_collected_at,
    
    // Delivery info
    deliveryAttempts: shipment.delivery_attempts || 0,
    deliveryPhotoUrl: shipment.delivery_photo_url,
    failureReason: shipment.failure_reason,
    
    // Shipper info
    shipper: shipment.shipper ? {
      id: shipment.shipper.id,
      name: shipment.shipper.user?.full_name,
      phone: maskPhoneNumber(shipment.shipper.user?.phone),
      avatarUrl: shipment.shipper.user?.avatar_url,
      vehicleType: shipment.shipper.vehicle_type,
      vehiclePlate: shipment.shipper.vehicle_plate,
      rating: shipment.shipper.avg_rating,
      totalDeliveries: shipment.shipper.total_deliveries,
    } : null,
    
    // Sub-order info
    subOrder: {
      id: shipment.sub_order?.id,
      orderId: shipment.sub_order?.order_id,
      total: parseFloat(shipment.sub_order?.total) || 0,
      status: shipment.sub_order?.status,
      items: (shipment.sub_order?.order_items || []).map(item => ({
        id: item.id,
        productName: item.product_name,
        variantName: item.variant_name,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price) || 0,
        imageUrl: item.image_url,
      })),
    },
    
    // Tracking timeline
    trackingEvents: (trackingEvents || []).map(event => ({
      id: event.id,
      status: event.status,
      statusVi: event.status_vi,
      description: event.description,
      descriptionVi: event.description_vi,
      locationName: event.location_name,
      locationAddress: event.location_address,
      lat: event.location_lat,
      lng: event.location_lng,
      actorType: event.actor_type,
      actorName: event.actor_name,
      eventTime: event.event_time,
    })),
    
    // Timestamps
    estimatedPickup: shipment.estimated_pickup,
    estimatedDelivery: shipment.estimated_delivery,
    assignedAt: shipment.assigned_at,
    pickedUpAt: shipment.picked_up_at,
    deliveredAt: shipment.delivered_at,
    createdAt: shipment.created_at,
  };
}


/**
 * Request pickup for a shipment
 * Requirements: 2.6
 * 
 * @param {string} shipmentId - Shipment ID
 * @param {string} partnerId - Partner user ID
 * @param {Object} options - Options
 * @param {string} options.preferredTime - Preferred pickup time
 * @param {string} options.notes - Additional notes
 * @returns {Promise<Object>}
 */
async function requestPickup(shipmentId, partnerId, options = {}) {
  const { preferredTime, notes } = options;

  // Get shop ID
  const shopId = await getShopIdFromPartner(partnerId);
  if (!shopId) {
    throw new AppError('SHIPMENT_NOT_FOUND', 'Không tìm thấy đơn vận chuyển', 404);
  }

  // Get shipment
  const { data: shipment, error } = await supabaseAdmin
    .from('shipments')
    .select(`
      *,
      shipper:shippers(
        id,
        user_id,
        user:users(id, full_name, phone)
      ),
      sub_order:sub_orders(id, shop_id)
    `)
    .eq('id', shipmentId)
    .single();

  if (error || !shipment) {
    throw new AppError('SHIPMENT_NOT_FOUND', 'Không tìm thấy đơn vận chuyển', 404);
  }

  // Verify ownership
  if (shipment.sub_order?.shop_id !== shopId) {
    throw new AppError('SHIPMENT_NOT_FOUND', 'Không tìm thấy đơn vận chuyển', 404);
  }

  // Check status - can only request pickup for created or assigned shipments
  if (!['created', 'assigned'].includes(shipment.status)) {
    throw new AppError(
      'INVALID_STATUS',
      'Chỉ có thể yêu cầu lấy hàng cho đơn chưa được lấy',
      400
    );
  }

  // Calculate pickup time
  const pickupScheduled = calculateEstimatedPickup(preferredTime);

  // Update shipment
  await shipmentRepository.updateShipment(shipmentId, {
    estimated_pickup: pickupScheduled,
    delivery_notes: notes ? `${shipment.delivery_notes || ''}\nPickup notes: ${notes}`.trim() : shipment.delivery_notes,
  });

  // Add tracking event
  try {
    await trackingService.addTrackingEvent(shipmentId, 'PICKUP_REQUESTED', {
      actorType: 'shop',
      actorId: partnerId,
      description_vi: `Shop yêu cầu lấy hàng lúc ${new Date(pickupScheduled).toLocaleString('vi-VN')}`,
    });
  } catch (e) {
    console.error('[PartnerShippingService] Failed to add tracking event:', e.message);
  }

  // Notify shipper if assigned
  if (shipment.shipper?.user_id) {
    try {
      await notificationService.send(shipment.shipper.user_id, 'pickup_request', {
        title: 'Yêu cầu lấy hàng',
        body: `Shop yêu cầu lấy hàng lúc ${new Date(pickupScheduled).toLocaleString('vi-VN')}`,
        payload: {
          shipmentId: shipmentId,
          trackingNumber: shipment.tracking_number,
          pickupScheduled: pickupScheduled,
        },
      });
    } catch (e) {
      console.error('[PartnerShippingService] Failed to send notification:', e.message);
    }
  }

  return {
    pickupScheduled,
    shipper: shipment.shipper ? {
      id: shipment.shipper.id,
      name: shipment.shipper.user?.full_name,
      phone: maskPhoneNumber(shipment.shipper.user?.phone),
    } : null,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Mask phone number for privacy
 * @param {string} phone
 * @returns {string}
 */
function maskPhoneNumber(phone) {
  if (!phone) return null;
  if (phone.length < 7) return phone;
  
  // Format: 090****123
  const prefix = phone.slice(0, 3);
  const suffix = phone.slice(-3);
  return `${prefix}****${suffix}`;
}

/**
 * Get Vietnamese status text
 * @param {string} status
 * @returns {string}
 */
function getStatusVietnamese(status) {
  const statusMap = {
    created: 'Đã tạo',
    assigned: 'Đã phân công',
    picked_up: 'Đã lấy hàng',
    in_transit: 'Đang vận chuyển',
    out_for_delivery: 'Đang giao hàng',
    delivering: 'Đang giao hàng',
    delivered: 'Đã giao hàng',
    failed: 'Giao hàng thất bại',
    returning: 'Đang hoàn trả',
    returned: 'Đã hoàn trả',
    cancelled: 'Đã hủy',
  };
  return statusMap[status] || status;
}

module.exports = {
  markReadyToShip,
  getPartnerShipments,
  getShipmentById,
  requestPickup,
};
