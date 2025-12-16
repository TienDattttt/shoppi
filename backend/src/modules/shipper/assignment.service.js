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
const goongClient = require('../../shared/goong/goong.client');

// Cấu hình
const MAX_ORDER_DIFFERENCE = 5; // Chênh lệch tối đa giữa các shipper cùng bưu cục
const DEFAULT_SEARCH_RADIUS_KM = 50; // Bán kính tìm bưu cục (km) - mở rộng để tìm được bưu cục
const ASSIGNMENT_RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 phút (Requirements: 3.3)
const MAX_ASSIGNMENT_RETRIES = 12; // Tối đa 12 lần retry (1 giờ)

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
 * Tìm shipper có ít đơn nhất trong bưu cục (deprecated - use findAvailableShipperInOffice)
 * @param {string} postOfficeId - ID bưu cục
 * @param {string} type - 'pickup' hoặc 'delivery'
 */
async function findAvailableShipper(postOfficeId, type = 'pickup') {
  return findAvailableShipperInOffice(postOfficeId, type, null);
}

/**
 * Tìm shipper khả dụng trong bưu cục với load balancing
 * 
 * Logic:
 * - Tìm tất cả shipper online và available trong bưu cục
 * - Sắp xếp theo số đơn hiện tại (ít nhất trước)
 * - Chọn ngẫu nhiên trong nhóm shipper có số đơn chênh lệch <= MAX_ORDER_DIFFERENCE
 * 
 * @param {string} postOfficeId - ID bưu cục
 * @param {string} type - 'pickup' hoặc 'delivery'
 * @param {string} excludeShipperId - ID shipper cần loại trừ
 * @returns {Promise<Object|null>} Shipper được chọn hoặc null
 */
async function findAvailableShipperInOffice(postOfficeId, type = 'pickup', excludeShipperId = null) {
  const countColumn = type === 'pickup' ? 'current_pickup_count' : 'current_delivery_count';
  
  console.log('[AssignmentService] findAvailableShipperInOffice:', { postOfficeId, type, excludeShipperId });

  // Use explicit FK relationship to avoid "multiple relationships" error
  // shippers has both user_id and approved_by pointing to users table
  let query = supabaseAdmin
    .from('shippers')
    .select(`
      *,
      user:users!shippers_user_id_fkey(id, full_name, phone, avatar_url)
    `)
    .eq('post_office_id', postOfficeId)
    .eq('status', 'active')
    .eq('is_online', true)
    .eq('is_available', true)
    .order(countColumn, { ascending: true });

  // Loại trừ shipper nếu cần (dùng cho reassignment)
  if (excludeShipperId) {
    query = query.neq('id', excludeShipperId);
  }

  const { data, error } = await query.limit(10);

  if (error) {
    console.error('[AssignmentService] Failed to find available shipper:', error);
    return null;
  }

  console.log(`[AssignmentService] Query result: ${data?.length || 0} shippers found in office ${postOfficeId}`);
  
  if (data && data.length > 0) {
    console.log('[AssignmentService] Available shippers:', data.map(s => ({
      id: s.id,
      name: s.user?.full_name,
      status: s.status,
      is_online: s.is_online,
      is_available: s.is_available,
      pickup_count: s.current_pickup_count,
      delivery_count: s.current_delivery_count,
    })));
  }

  if (!data || data.length === 0) {
    // Query all shippers in office to see why none are available
    const { data: allShippers } = await supabaseAdmin
      .from('shippers')
      .select('id, status, is_online, is_available, post_office_id, user_id')
      .eq('post_office_id', postOfficeId);
    
    // Get user info separately
    const shippersWithUsers = await Promise.all((allShippers || []).map(async (s) => {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', s.user_id)
        .single();
      return { ...s, user };
    }));
    
    console.log(`[AssignmentService] All shippers in office ${postOfficeId}:`, shippersWithUsers.map(s => ({
      id: s.id,
      name: s.user?.full_name,
      status: s.status,
      is_online: s.is_online,
      is_available: s.is_available,
    })));
    
    return null;
  }

  // Load balancing: Chọn trong nhóm shipper có số đơn chênh lệch <= MAX_ORDER_DIFFERENCE
  const minCount = data[0][countColumn] || 0;
  const eligibleShippers = data.filter(s => {
    const count = s[countColumn] || 0;
    return count - minCount <= MAX_ORDER_DIFFERENCE;
  });

  if (eligibleShippers.length === 0) {
    return data[0]; // Fallback: chọn shipper ít đơn nhất
  }

  // Random chọn 1 trong các shipper đủ điều kiện để phân bổ đều
  const randomIndex = Math.floor(Math.random() * eligibleShippers.length);
  return eligibleShippers[randomIndex];
}

// NOTE: findShipperWithinRadius đã được loại bỏ
// Nghiệp vụ mới: Shipper thuộc bưu cục nào thì nhận đơn của bưu cục đó
// Sử dụng findAvailableShipperInOffice thay thế

/**
 * Tự động phân công shipper cho shipment
 * 
 * Nghiệp vụ:
 * - Mỗi bưu cục có nhiều shipper làm việc
 * - Shipper thuộc bưu cục nào thì nhận đơn của bưu cục đó
 * - Load balancing: Chênh lệch tối đa 5-7 đơn giữa các shipper cùng bưu cục
 * 
 * Luồng giao hàng:
 * Shop → Bưu cục lấy hàng → [Kho trung chuyển nếu khác miền] → Bưu cục giao → Khách
 * 
 * @param {string} shipmentId
 * @param {Object} options - Tùy chọn phân công
 * @param {string} options.excludeShipperId - ID shipper cần loại trừ (dùng cho reassignment)
 * @param {boolean} options.queueOnFailure - Có đưa vào queue retry không (mặc định true)
 * @returns {Promise<Object>} Updated shipment
 */
async function autoAssignShipment(shipmentId, options = {}) {
  const { excludeShipperId = null, queueOnFailure = true } = options;
  
  console.log('[AssignmentService] ========== AUTO ASSIGN START ==========');
  console.log('[AssignmentService] autoAssignShipment called:', { shipmentId, options });

  const shipment = await shipmentRepository.findShipmentById(shipmentId);
  if (!shipment) {
    console.log('[AssignmentService] Shipment not found:', shipmentId);
    throw new AppError('SHIPMENT_NOT_FOUND', 'Shipment not found', 404);
  }
  
  console.log('[AssignmentService] Shipment found:', {
    id: shipment.id,
    status: shipment.status,
    pickup_lat: shipment.pickup_lat,
    pickup_lng: shipment.pickup_lng,
    delivery_lat: shipment.delivery_lat,
    delivery_lng: shipment.delivery_lng,
    sub_order_id: shipment.sub_order_id,
    sub_order: shipment.sub_order,
  });

  if (shipment.status !== 'created' && shipment.status !== 'pending_assignment') {
    console.log('[AssignmentService] Invalid status:', shipment.status);
    throw new AppError('INVALID_STATUS', 'Shipment already assigned or processed', 400);
  }

  // Get pickup coordinates - fallback to shop coordinates if shipment doesn't have them
  let pickupLat = parseFloat(shipment.pickup_lat);
  let pickupLng = parseFloat(shipment.pickup_lng);
  
  if (!pickupLat || !pickupLng || isNaN(pickupLat) || isNaN(pickupLng)) {
    console.log('[AssignmentService] Shipment has no pickup coords, fetching from shop...');
    
    // Get shop_id from sub_order (either from joined data or query directly)
    let shopId = shipment.sub_order?.shop_id;
    
    if (!shopId && shipment.sub_order_id) {
      // Query sub_order directly to get shop_id
      const { data: subOrder } = await supabaseAdmin
        .from('sub_orders')
        .select('shop_id')
        .eq('id', shipment.sub_order_id)
        .single();
      shopId = subOrder?.shop_id;
      console.log('[AssignmentService] Got shop_id from sub_order:', shopId);
    }
    
    if (shopId) {
      const { data: shop } = await supabaseAdmin
        .from('shops')
        .select('id, shop_name, lat, lng, address, ward, district, city')
        .eq('id', shopId)
        .single();
      
      if (shop) {
        const fullAddress = [shop.address, shop.ward, shop.district, shop.city].filter(Boolean).join(', ');
        console.log('[AssignmentService] Shop found:', { 
          id: shop.id, 
          name: shop.shop_name, 
          lat: shop.lat, 
          lng: shop.lng,
          address: fullAddress
        });
        pickupLat = parseFloat(shop.lat);
        pickupLng = parseFloat(shop.lng);
        
        // If shop has no coordinates, try to geocode the address
        if ((!pickupLat || !pickupLng || isNaN(pickupLat) || isNaN(pickupLng)) && fullAddress) {
          console.log('[AssignmentService] Shop has no coordinates, geocoding address...');
          try {
            const geocodeResult = await goongClient.geocode(fullAddress);
            if (geocodeResult?.lat && geocodeResult?.lng) {
              pickupLat = geocodeResult.lat;
              pickupLng = geocodeResult.lng;
              console.log('[AssignmentService] Geocoded shop address:', { lat: pickupLat, lng: pickupLng });
              
              // Update shop with geocoded coordinates
              await supabaseAdmin
                .from('shops')
                .update({ lat: pickupLat, lng: pickupLng })
                .eq('id', shopId);
              console.log('[AssignmentService] Updated shop with geocoded coordinates');
            } else {
              console.log('[AssignmentService] Geocoding failed for address:', fullAddress);
            }
          } catch (geocodeError) {
            console.error('[AssignmentService] Geocode error:', geocodeError.message);
          }
        }
        
        // Update shipment with shop coordinates for future use
        if (pickupLat && pickupLng && !isNaN(pickupLat) && !isNaN(pickupLng)) {
          await supabaseAdmin
            .from('shipments')
            .update({ pickup_lat: pickupLat, pickup_lng: pickupLng })
            .eq('id', shipmentId);
          console.log('[AssignmentService] Updated shipment with shop coordinates');
        } else {
          console.log('[AssignmentService] Shop has no coordinates and geocoding failed!');
        }
      } else {
        console.log('[AssignmentService] Shop not found for id:', shopId);
      }
    } else {
      console.log('[AssignmentService] No shop_id found in shipment or sub_order');
    }
  }

  // 1. Tìm bưu cục lấy hàng (gần shop nhất)
  console.log('[AssignmentService] Finding nearest pickup office for coords:', {
    lat: pickupLat,
    lng: pickupLng,
  });
  
  const pickupOffice = await findNearestPostOffice(pickupLat, pickupLng, 'local');

  if (!pickupOffice) {
    console.warn(`[AssignmentService] No pickup office found for shipment ${shipmentId}`);
    if (queueOnFailure) {
      await queueUnassignedShipment(shipmentId);
    }
    throw new AppError('NO_OFFICE_FOUND', 'Không tìm thấy bưu cục lấy hàng trong khu vực', 400);
  }

  console.log(`[AssignmentService] Found pickup office: ${pickupOffice.name_vi} (${pickupOffice.code}), distance: ${pickupOffice.distance?.toFixed(2)}km`);

  // 2. Tìm shipper lấy hàng trong bưu cục (load balancing)
  console.log('[AssignmentService] Finding available shipper in office:', pickupOffice.id);
  const pickupShipper = await findAvailableShipperInOffice(pickupOffice.id, 'pickup', excludeShipperId);

  if (!pickupShipper) {
    console.log(`[AssignmentService] No shipper available in office ${pickupOffice.code} (${pickupOffice.id})`);
    if (queueOnFailure) {
      await queueUnassignedShipment(shipmentId);
      console.log(`[AssignmentService] Queued shipment ${shipmentId} for retry`);
    }
    throw new AppError('NO_SHIPPER_AVAILABLE', `Không có shipper khả dụng tại bưu cục ${pickupOffice.name_vi}`, 400);
  }

  console.log(`[AssignmentService] ✓ Assigned pickup shipper:`, {
    id: pickupShipper.id,
    name: pickupShipper.user?.full_name,
    phone: pickupShipper.user?.phone,
    currentPickupCount: pickupShipper.current_pickup_count || 0,
    isOnline: pickupShipper.is_online,
    isAvailable: pickupShipper.is_available,
  });

  // 3. Tìm bưu cục giao hàng (gần khách nhất)
  const deliveryOffice = await findNearestPostOffice(
    parseFloat(shipment.delivery_lat),
    parseFloat(shipment.delivery_lng),
    'local'
  );

  // 4. Xác định shipper giao hàng
  let deliveryShipper = pickupShipper; // Mặc định cùng shipper

  // Nếu bưu cục giao khác bưu cục lấy → cần shipper khác
  if (deliveryOffice && deliveryOffice.id !== pickupOffice.id) {
    const altDeliveryShipper = await findAvailableShipperInOffice(deliveryOffice.id, 'delivery', null);
    if (altDeliveryShipper) {
      deliveryShipper = altDeliveryShipper;
      console.log(`[AssignmentService] Assigned delivery shipper: ${deliveryShipper.user?.full_name} (different office)`);
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
  findAvailableShipperInOffice,
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
