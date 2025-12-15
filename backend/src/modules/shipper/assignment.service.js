/**
 * Assignment Service
 * Tự động phân công shipper cho đơn hàng
 * 
 * Logic:
 * 1. Tìm shipper gần nhất trong bán kính 10km
 * 2. Chọn shipper có ít đơn nhất (load balancing)
 * 3. Xét khu vực làm việc và loại xe
 * 4. Hỗ trợ retry và reassignment
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6
 * Cân bằng tải: Chênh lệch tối đa 5 đơn giữa các shipper
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const shipmentRepository = require('./shipment.repository');
const trackingService = require('./tracking.service');
const rabbitmqClient = require('../../shared/rabbitmq/rabbitmq.client');
const { AppError } = require('../../shared/utils/error.util');

// Cấu hình
const MAX_ORDER_DIFFERENCE = 5; // Chênh lệch tối đa giữa các shipper
const DEFAULT_SEARCH_RADIUS_KM = 10; // Bán kính tìm shipper (Requirements: 3.1)
const ASSIGNMENT_RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 phút (Requirements: 3.3)
const MAX_ASSIGNMENT_RETRIES = 12; // Tối đa 12 lần retry (1 giờ)

// Queue name for unassigned shipments
const UNASSIGNED_QUEUE = 'unassigned_shipments';

/**
 * Tìm bưu cục gần nhất theo tọa độ
 * @param {number} lat - Vĩ độ
 * @param {number} lng - Kinh độ
 * @param {string} officeType - 'local' (bưu cục) hoặc 'regional' (kho trung chuyển miền)
 * @param {number} radiusKm - Bán kính tìm kiếm (km)
 */
async function findNearestPostOffice(lat, lng, officeType = 'local', radiusKm = DEFAULT_SEARCH_RADIUS_KM) {
  if (!lat || !lng) return null;

  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

  let query = supabaseAdmin
    .from('post_offices')
    .select('*')
    .eq('is_active', true);

  // Chỉ filter theo office_type nếu là 'local'
  // Với 'regional', tìm theo region thay vì vị trí
  if (officeType === 'local') {
    query = query
      .eq('office_type', 'local')
      .gte('lat', lat - latDelta)
      .lte('lat', lat + latDelta)
      .gte('lng', lng - lngDelta)
      .lte('lng', lng + lngDelta);
  } else {
    query = query.eq('office_type', officeType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to find nearest post office:', error);
    return null;
  }

  if (!data || data.length === 0) {
    // Nếu không tìm thấy trong bán kính, mở rộng tìm kiếm
    if (officeType === 'local' && radiusKm < 50) {
      return findNearestPostOffice(lat, lng, officeType, radiusKm * 2);
    }
    return null;
  }

  // Tính khoảng cách và sắp xếp
  const withDistance = data.map(office => ({
    ...office,
    distance: calculateDistance(lat, lng, parseFloat(office.lat), parseFloat(office.lng)),
  }));

  withDistance.sort((a, b) => a.distance - b.distance);
  return withDistance[0];
}

/**
 * Tìm shipper có ít đơn nhất trong bưu cục
 * @param {string} postOfficeId - ID bưu cục
 * @param {string} type - 'pickup' hoặc 'delivery'
 */
async function findAvailableShipper(postOfficeId, type = 'pickup') {
  const countColumn = type === 'pickup' ? 'current_pickup_count' : 'current_delivery_count';

  const { data, error } = await supabaseAdmin
    .from('shippers')
    .select('*')
    .eq('post_office_id', postOfficeId)
    .eq('status', 'active')
    .eq('is_online', true)
    .eq('is_available', true)
    .order(countColumn, { ascending: true })
    .limit(5); // Lấy 5 shipper ít đơn nhất

  if (error) {
    console.error('Failed to find available shipper:', error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // Kiểm tra cân bằng tải
  const minCount = data[0][countColumn] || 0;
  const eligibleShippers = data.filter(s => {
    const count = s[countColumn] || 0;
    return count - minCount <= MAX_ORDER_DIFFERENCE;
  });

  // Random chọn 1 trong các shipper đủ điều kiện để tránh luôn chọn cùng 1 người
  const randomIndex = Math.floor(Math.random() * eligibleShippers.length);
  return eligibleShippers[randomIndex];
}

/**
 * Tìm shipper trong bán kính 10km với load balancing
 * Requirements: 3.1, 3.2, 3.6
 * 
 * @param {number} lat - Vĩ độ điểm cần tìm
 * @param {number} lng - Kinh độ điểm cần tìm
 * @param {Object} options - Tùy chọn tìm kiếm
 * @param {number} options.radiusKm - Bán kính tìm kiếm (mặc định 10km)
 * @param {string} options.vehicleType - Loại xe yêu cầu (motorcycle, car, truck)
 * @param {string} options.workingArea - Khu vực làm việc (district code)
 * @param {string} options.excludeShipperId - ID shipper cần loại trừ (dùng cho reassignment)
 * @returns {Promise<Object|null>} Shipper được chọn hoặc null
 */
async function findShipperWithinRadius(lat, lng, options = {}) {
  const {
    radiusKm = DEFAULT_SEARCH_RADIUS_KM,
    vehicleType = null,
    workingArea = null,
    excludeShipperId = null,
  } = options;

  if (!lat || !lng) {
    console.warn('[AssignmentService] Invalid coordinates for shipper search');
    return null;
  }

  // Tính bounding box cho tìm kiếm
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

  // Build query
  let query = supabaseAdmin
    .from('shippers')
    .select(`
      *,
      user:users(id, full_name, phone, avatar_url)
    `)
    .eq('status', 'active')
    .eq('is_online', true)
    .eq('is_available', true)
    .gte('current_lat', lat - latDelta)
    .lte('current_lat', lat + latDelta)
    .gte('current_lng', lng - lngDelta)
    .lte('current_lng', lng + lngDelta);

  // Filter by vehicle type if specified (Requirements: 3.6)
  if (vehicleType) {
    query = query.eq('vehicle_type', vehicleType);
  }

  // Filter by working area if specified (Requirements: 3.6)
  if (workingArea) {
    query = query.eq('working_area', workingArea);
  }

  // Exclude specific shipper (for reassignment)
  if (excludeShipperId) {
    query = query.neq('id', excludeShipperId);
  }

  // Order by current order count for load balancing (Requirements: 3.2)
  query = query.order('current_pickup_count', { ascending: true });

  const { data, error } = await query.limit(10);

  if (error) {
    console.error('[AssignmentService] Failed to find shippers within radius:', error);
    return null;
  }

  if (!data || data.length === 0) {
    console.log(`[AssignmentService] No shippers found within ${radiusKm}km radius`);
    return null;
  }

  // Calculate actual distance and filter by radius
  const shippersWithDistance = data.map(shipper => ({
    ...shipper,
    distance: calculateDistance(lat, lng, parseFloat(shipper.current_lat), parseFloat(shipper.current_lng)),
  })).filter(s => s.distance <= radiusKm);

  if (shippersWithDistance.length === 0) {
    console.log(`[AssignmentService] No shippers within exact ${radiusKm}km radius`);
    return null;
  }

  // Sort by order count first, then by distance
  shippersWithDistance.sort((a, b) => {
    const countDiff = (a.current_pickup_count || 0) - (b.current_pickup_count || 0);
    if (countDiff !== 0) return countDiff;
    return a.distance - b.distance;
  });

  // Apply load balancing: select from shippers with order count within MAX_ORDER_DIFFERENCE
  const minCount = shippersWithDistance[0].current_pickup_count || 0;
  const eligibleShippers = shippersWithDistance.filter(s => {
    const count = s.current_pickup_count || 0;
    return count - minCount <= MAX_ORDER_DIFFERENCE;
  });

  // Random selection among eligible shippers to avoid always picking the same one
  const randomIndex = Math.floor(Math.random() * eligibleShippers.length);
  const selectedShipper = eligibleShippers[randomIndex];

  console.log(`[AssignmentService] Selected shipper ${selectedShipper.id} (${selectedShipper.user?.full_name}) - distance: ${selectedShipper.distance.toFixed(2)}km, orders: ${selectedShipper.current_pickup_count || 0}`);

  return selectedShipper;
}

/**
 * Tự động phân công shipper cho shipment
 * Requirements: 3.1, 3.2, 3.6
 * 
 * @param {string} shipmentId
 * @param {Object} options - Tùy chọn phân công
 * @param {string} options.excludeShipperId - ID shipper cần loại trừ (dùng cho reassignment)
 * @param {boolean} options.queueOnFailure - Có đưa vào queue retry không (mặc định true)
 * @returns {Promise<Object>} Updated shipment
 */
async function autoAssignShipment(shipmentId, options = {}) {
  const { excludeShipperId = null, queueOnFailure = true } = options;

  const shipment = await shipmentRepository.findShipmentById(shipmentId);
  if (!shipment) {
    throw new AppError('SHIPMENT_NOT_FOUND', 'Shipment not found', 404);
  }

  if (shipment.status !== 'created' && shipment.status !== 'pending_assignment') {
    throw new AppError('INVALID_STATUS', 'Shipment already assigned or processed', 400);
  }

  // Strategy 1: Tìm shipper trực tiếp trong bán kính 10km từ điểm lấy hàng
  let pickupShipper = await findShipperWithinRadius(
    parseFloat(shipment.pickup_lat),
    parseFloat(shipment.pickup_lng),
    {
      radiusKm: DEFAULT_SEARCH_RADIUS_KM,
      excludeShipperId,
    }
  );

  // Strategy 2: Nếu không tìm thấy, thử tìm qua bưu cục
  let pickupOffice = null;
  let deliveryOffice = null;

  if (!pickupShipper) {
    // Fallback: Tìm qua bưu cục
    pickupOffice = await findNearestPostOffice(
      parseFloat(shipment.pickup_lat),
      parseFloat(shipment.pickup_lng),
      'local'
    );

    if (pickupOffice) {
      pickupShipper = await findAvailableShipper(pickupOffice.id, 'pickup');
    }
  }

  // Nếu vẫn không tìm thấy shipper
  if (!pickupShipper) {
    if (queueOnFailure) {
      // Queue shipment for retry (Requirements: 3.3)
      await queueUnassignedShipment(shipmentId);
      console.log(`[AssignmentService] No shipper available, queued shipment ${shipmentId} for retry`);
    }
    throw new AppError('NO_SHIPPER_AVAILABLE', 'Không có shipper khả dụng trong khu vực', 400);
  }

  // Tìm bưu cục nếu chưa có (để lưu thông tin)
  if (!pickupOffice) {
    pickupOffice = await findNearestPostOffice(
      parseFloat(shipment.pickup_lat),
      parseFloat(shipment.pickup_lng),
      'local'
    );
  }

  deliveryOffice = await findNearestPostOffice(
    parseFloat(shipment.delivery_lat),
    parseFloat(shipment.delivery_lng),
    'local'
  );

  // Tìm shipper giao hàng (có thể cùng hoặc khác shipper lấy hàng)
  let deliveryShipper = pickupShipper; // Mặc định cùng shipper

  // Nếu khoảng cách giao hàng xa (khác khu vực), có thể cần shipper khác
  if (deliveryOffice && pickupOffice && deliveryOffice.id !== pickupOffice.id) {
    const altDeliveryShipper = await findAvailableShipper(deliveryOffice.id, 'delivery');
    if (altDeliveryShipper) {
      deliveryShipper = altDeliveryShipper;
    }
  }

  // Cập nhật shipment
  const { data: updatedShipment, error } = await supabaseAdmin
    .from('shipments')
    .update({
      pickup_office_id: pickupOffice?.id || null,
      delivery_office_id: deliveryOffice?.id || null,
      pickup_shipper_id: pickupShipper.id,
      delivery_shipper_id: deliveryShipper.id,
      shipper_id: pickupShipper.id, // Shipper chính (lấy hàng)
      status: 'assigned',
      assigned_at: new Date().toISOString(),
    })
    .eq('id', shipmentId)
    .select()
    .single();

  if (error) {
    throw new AppError('UPDATE_FAILED', `Failed to assign shipment: ${error.message}`, 500);
  }

  // Cập nhật số đơn của shipper
  await incrementShipperOrderCount(pickupShipper.id, 'pickup');
  if (deliveryShipper.id !== pickupShipper.id) {
    await incrementShipperOrderCount(deliveryShipper.id, 'delivery');
  }

  // Thêm tracking event
  try {
    await trackingService.addTrackingEvent(shipmentId, 'SHIPPER_ASSIGNED', {
      actorType: 'system',
      description_vi: `Đã phân công shipper ${pickupShipper.user?.full_name || ''} lấy hàng`,
      locationName: pickupOffice?.name_vi || 'Khu vực lấy hàng',
      locationAddress: pickupOffice?.address || shipment.pickup_address,
      lat: pickupOffice?.lat || shipment.pickup_lat,
      lng: pickupOffice?.lng || shipment.pickup_lng,
    });
  } catch (e) {
    console.error('Failed to add tracking event:', e.message);
  }

  // Publish assignment event
  try {
    await rabbitmqClient.publishToExchange(
      rabbitmqClient.EXCHANGES.EVENTS,
      'SHIPMENT_ASSIGNED',
      {
        event: 'SHIPMENT_ASSIGNED',
        data: {
          shipmentId,
          trackingNumber: updatedShipment.tracking_number,
          shipperId: pickupShipper.id,
          shipperName: pickupShipper.user?.full_name,
          shipperPhone: pickupShipper.user?.phone,
          orderId: shipment.sub_order?.order_id,
          customerId: shipment.sub_order?.order?.customer_id,
        },
        timestamp: new Date().toISOString(),
      }
    );
  } catch (e) {
    console.warn('[AssignmentService] Failed to publish assignment event:', e.message);
  }

  // Remove from unassigned queue if it was there
  await removeFromUnassignedQueue(shipmentId);

  return {
    ...updatedShipment,
    pickupOffice,
    deliveryOffice,
    pickupShipper,
    deliveryShipper,
  };
}

/**
 * Tăng số đơn của shipper
 */
async function incrementShipperOrderCount(shipperId, type) {
  const column = type === 'pickup' ? 'current_pickup_count' : 'current_delivery_count';
  
  const { error } = await supabaseAdmin.rpc('increment_shipper_count', {
    shipper_id: shipperId,
    count_column: column,
  });

  if (error) {
    // Fallback: manual increment
    const { data: shipper } = await supabaseAdmin
      .from('shippers')
      .select(column)
      .eq('id', shipperId)
      .single();

    if (shipper) {
      await supabaseAdmin
        .from('shippers')
        .update({ [column]: (shipper[column] || 0) + 1 })
        .eq('id', shipperId);
    }
  }
}

/**
 * Giảm số đơn của shipper (khi hoàn thành hoặc hủy)
 */
async function decrementShipperOrderCount(shipperId, type) {
  const column = type === 'pickup' ? 'current_pickup_count' : 'current_delivery_count';
  
  const { data: shipper } = await supabaseAdmin
    .from('shippers')
    .select(column)
    .eq('id', shipperId)
    .single();

  if (shipper && shipper[column] > 0) {
    await supabaseAdmin
      .from('shippers')
      .update({ [column]: shipper[column] - 1 })
      .eq('id', shipperId);
  }
}

/**
 * Reset số đơn hàng ngày của tất cả shipper (chạy lúc 0h)
 */
async function resetDailyOrderCounts() {
  const { error } = await supabaseAdmin
    .from('shippers')
    .update({
      current_pickup_count: 0,
      current_delivery_count: 0,
    })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

  if (error) {
    console.error('Failed to reset daily order counts:', error);
  } else {
    console.log('[AssignmentService] Reset daily order counts for all shippers');
  }
}

/**
 * Lấy thống kê phân công của bưu cục
 */
async function getPostOfficeStats(postOfficeId) {
  // Lấy danh sách shipper của bưu cục
  const { data: shippers, error } = await supabaseAdmin
    .from('shippers')
    .select(`
      id,
      current_pickup_count,
      current_delivery_count,
      is_online,
      is_available,
      user:users(id, full_name, phone)
    `)
    .eq('post_office_id', postOfficeId)
    .eq('status', 'active');

  if (error) {
    throw new AppError('QUERY_ERROR', error.message, 500);
  }

  const totalPickups = shippers.reduce((sum, s) => sum + (s.current_pickup_count || 0), 0);
  const totalDeliveries = shippers.reduce((sum, s) => sum + (s.current_delivery_count || 0), 0);
  const onlineCount = shippers.filter(s => s.is_online).length;
  const availableCount = shippers.filter(s => s.is_online && s.is_available).length;

  return {
    totalShippers: shippers.length,
    onlineShippers: onlineCount,
    availableShippers: availableCount,
    totalPickups,
    totalDeliveries,
    shippers: shippers.map(s => ({
      id: s.id,
      name: s.user?.full_name,
      phone: s.user?.phone,
      pickupCount: s.current_pickup_count || 0,
      deliveryCount: s.current_delivery_count || 0,
      isOnline: s.is_online,
      isAvailable: s.is_available,
    })),
  };
}

/**
 * Tính khoảng cách giữa 2 điểm (Haversine)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================
// ASSIGNMENT RETRY MECHANISM (Requirements: 3.3)
// ============================================

// In-memory store for unassigned shipments (can be replaced with Redis for production)
const unassignedShipments = new Map();
let retryIntervalId = null;

/**
 * Queue shipment for retry assignment
 * Requirements: 3.3 - Queue shipment and retry assignment every 5 minutes
 * 
 * @param {string} shipmentId
 * @param {number} retryCount - Current retry count
 */
async function queueUnassignedShipment(shipmentId, retryCount = 0) {
  unassignedShipments.set(shipmentId, {
    shipmentId,
    retryCount,
    queuedAt: new Date().toISOString(),
    nextRetryAt: new Date(Date.now() + ASSIGNMENT_RETRY_INTERVAL_MS).toISOString(),
  });

  // Update shipment status to pending_assignment
  try {
    await supabaseAdmin
      .from('shipments')
      .update({ status: 'pending_assignment' })
      .eq('id', shipmentId);
  } catch (e) {
    console.error('[AssignmentService] Failed to update shipment status:', e.message);
  }

  console.log(`[AssignmentService] Queued shipment ${shipmentId} for retry (attempt ${retryCount + 1})`);
}

/**
 * Remove shipment from unassigned queue
 * @param {string} shipmentId
 */
async function removeFromUnassignedQueue(shipmentId) {
  unassignedShipments.delete(shipmentId);
}

/**
 * Process unassigned shipments queue
 * Requirements: 3.3 - Retry every 5 minutes
 */
async function processUnassignedQueue() {
  if (unassignedShipments.size === 0) return;

  console.log(`[AssignmentService] Processing ${unassignedShipments.size} unassigned shipments`);

  const now = new Date();
  const shipmentsToProcess = [];

  for (const [shipmentId, data] of unassignedShipments.entries()) {
    if (new Date(data.nextRetryAt) <= now) {
      shipmentsToProcess.push({ shipmentId, ...data });
    }
  }

  for (const item of shipmentsToProcess) {
    const { shipmentId, retryCount } = item;

    if (retryCount >= MAX_ASSIGNMENT_RETRIES) {
      // Max retries reached, notify admin
      console.warn(`[AssignmentService] Max retries reached for shipment ${shipmentId}`);
      unassignedShipments.delete(shipmentId);
      await notifyAdminUnassignedShipment(shipmentId);
      continue;
    }

    try {
      await autoAssignShipment(shipmentId, { queueOnFailure: false });
      console.log(`[AssignmentService] Successfully assigned shipment ${shipmentId} on retry ${retryCount + 1}`);
      unassignedShipments.delete(shipmentId);
    } catch (error) {
      console.log(`[AssignmentService] Retry ${retryCount + 1} failed for shipment ${shipmentId}: ${error.message}`);
      // Update retry count and next retry time
      unassignedShipments.set(shipmentId, {
        ...item,
        retryCount: retryCount + 1,
        nextRetryAt: new Date(Date.now() + ASSIGNMENT_RETRY_INTERVAL_MS).toISOString(),
      });
    }
  }
}

/**
 * Start the assignment retry processor
 * Requirements: 3.3 - Retry every 5 minutes
 */
function startRetryProcessor() {
  if (retryIntervalId) {
    console.log('[AssignmentService] Retry processor already running');
    return;
  }

  retryIntervalId = setInterval(processUnassignedQueue, ASSIGNMENT_RETRY_INTERVAL_MS);
  console.log(`[AssignmentService] Started retry processor (interval: ${ASSIGNMENT_RETRY_INTERVAL_MS / 1000}s)`);
}

/**
 * Stop the assignment retry processor
 */
function stopRetryProcessor() {
  if (retryIntervalId) {
    clearInterval(retryIntervalId);
    retryIntervalId = null;
    console.log('[AssignmentService] Stopped retry processor');
  }
}

/**
 * Get unassigned shipments queue status
 * @returns {Object[]}
 */
function getUnassignedQueueStatus() {
  return Array.from(unassignedShipments.values());
}

/**
 * Notify admin about unassigned shipment
 * @param {string} shipmentId
 */
async function notifyAdminUnassignedShipment(shipmentId) {
  try {
    await rabbitmqClient.publishNotification('push', {
      userRole: 'admin',
      type: 'SHIPMENT_UNASSIGNED_ALERT',
      shipmentId,
      title: 'Đơn hàng chưa được phân công',
      message: `Đơn hàng ${shipmentId} không thể tự động phân công shipper sau nhiều lần thử`,
      priority: 'high',
    });
  } catch (e) {
    console.error('[AssignmentService] Failed to notify admin:', e.message);
  }
}

// ============================================
// REASSIGNMENT ON REJECTION (Requirements: 3.4)
// ============================================

/**
 * Handle shipper rejection and reassign to next available shipper
 * Requirements: 3.4 - Reassign to next available shipper when shipper rejects
 * 
 * @param {string} shipmentId
 * @param {string} rejectedShipperId - ID of shipper who rejected
 * @param {string} rejectionReason - Reason for rejection
 * @returns {Promise<Object>} Updated shipment with new shipper
 */
async function handleShipperRejection(shipmentId, rejectedShipperId, rejectionReason = '') {
  const shipment = await shipmentRepository.findShipmentById(shipmentId);
  if (!shipment) {
    throw new AppError('SHIPMENT_NOT_FOUND', 'Shipment not found', 404);
  }

  if (shipment.shipper_id !== rejectedShipperId) {
    throw new AppError('INVALID_SHIPPER', 'Shipper is not assigned to this shipment', 400);
  }

  console.log(`[AssignmentService] Shipper ${rejectedShipperId} rejected shipment ${shipmentId}: ${rejectionReason}`);

  // Decrement order count for rejected shipper
  await decrementShipperOrderCount(rejectedShipperId, 'pickup');

  // Add tracking event for rejection
  try {
    await trackingService.addTrackingEvent(shipmentId, 'SHIPPER_REJECTED', {
      actorType: 'shipper',
      actorId: rejectedShipperId,
      description_vi: `Shipper từ chối đơn hàng: ${rejectionReason || 'Không có lý do'}`,
    });
  } catch (e) {
    console.error('Failed to add rejection tracking event:', e.message);
  }

  // Reset shipment status for reassignment
  await supabaseAdmin
    .from('shipments')
    .update({
      status: 'created',
      shipper_id: null,
      pickup_shipper_id: null,
      assigned_at: null,
    })
    .eq('id', shipmentId);

  // Try to reassign to another shipper (excluding the one who rejected)
  try {
    const result = await autoAssignShipment(shipmentId, {
      excludeShipperId: rejectedShipperId,
      queueOnFailure: true,
    });
    
    console.log(`[AssignmentService] Reassigned shipment ${shipmentId} to shipper ${result.pickupShipper.id}`);
    return result;
  } catch (error) {
    console.log(`[AssignmentService] Reassignment failed for shipment ${shipmentId}: ${error.message}`);
    // Shipment will be queued for retry
    throw error;
  }
}

/**
 * Handle shipper going offline during delivery
 * Requirements: 3.5 - Alert admin and attempt reassignment
 * 
 * @param {string} shipperId - ID of shipper who went offline
 */
async function handleShipperOffline(shipperId) {
  console.log(`[AssignmentService] Shipper ${shipperId} went offline`);

  // Find active shipments for this shipper
  const { data: activeShipments, error } = await supabaseAdmin
    .from('shipments')
    .select('*')
    .eq('shipper_id', shipperId)
    .in('status', ['assigned', 'picked_up', 'delivering']);

  if (error) {
    console.error('[AssignmentService] Failed to find active shipments:', error.message);
    return;
  }

  if (!activeShipments || activeShipments.length === 0) {
    console.log(`[AssignmentService] No active shipments for offline shipper ${shipperId}`);
    return;
  }

  console.log(`[AssignmentService] Found ${activeShipments.length} active shipments for offline shipper`);

  // Notify admin about offline shipper with active deliveries
  try {
    await rabbitmqClient.publishNotification('push', {
      userRole: 'admin',
      type: 'SHIPPER_OFFLINE_ALERT',
      shipperId,
      title: 'Shipper offline với đơn hàng đang giao',
      message: `Shipper ${shipperId} đã offline với ${activeShipments.length} đơn hàng đang xử lý`,
      priority: 'high',
      data: {
        shipmentIds: activeShipments.map(s => s.id),
      },
    });
  } catch (e) {
    console.error('[AssignmentService] Failed to notify admin about offline shipper:', e.message);
  }

  // For shipments that are only 'assigned' (not yet picked up), try reassignment
  for (const shipment of activeShipments) {
    if (shipment.status === 'assigned') {
      try {
        await handleShipperRejection(shipment.id, shipperId, 'Shipper offline');
      } catch (e) {
        console.error(`[AssignmentService] Failed to reassign shipment ${shipment.id}:`, e.message);
      }
    }
  }
}

module.exports = {
  // Core assignment
  findNearestPostOffice,
  findAvailableShipper,
  findShipperWithinRadius,
  autoAssignShipment,
  
  // Order count management
  incrementShipperOrderCount,
  decrementShipperOrderCount,
  resetDailyOrderCounts,
  
  // Statistics
  getPostOfficeStats,
  
  // Retry mechanism (Requirements: 3.3)
  queueUnassignedShipment,
  removeFromUnassignedQueue,
  processUnassignedQueue,
  startRetryProcessor,
  stopRetryProcessor,
  getUnassignedQueueStatus,
  
  // Reassignment (Requirements: 3.4)
  handleShipperRejection,
  handleShipperOffline,
  
  // Constants
  MAX_ORDER_DIFFERENCE,
  DEFAULT_SEARCH_RADIUS_KM,
  ASSIGNMENT_RETRY_INTERVAL_MS,
};
