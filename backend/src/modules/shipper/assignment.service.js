/**
 * Assignment Service
 * Tự động phân công shipper cho đơn hàng
 * 
 * Logic:
 * 1. Tìm bưu cục gần shop (pickup) và gần khách (delivery)
 * 2. Tìm shipper thuộc bưu cục đó có ít đơn nhất
 * 3. Phân công shipper, cập nhật số đơn
 * 
 * Cân bằng tải: Chênh lệch tối đa 4-6 đơn giữa các shipper
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const shipmentRepository = require('./shipment.repository');
const trackingService = require('./tracking.service');
const { AppError } = require('../../shared/utils/error.util');

// Cấu hình
const MAX_ORDER_DIFFERENCE = 5; // Chênh lệch tối đa giữa các shipper
const DEFAULT_SEARCH_RADIUS_KM = 10; // Bán kính tìm bưu cục

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
 * Tự động phân công shipper cho shipment
 * @param {string} shipmentId
 * @returns {Promise<Object>} Updated shipment
 */
async function autoAssignShipment(shipmentId) {
  const shipment = await shipmentRepository.findShipmentById(shipmentId);
  if (!shipment) {
    throw new AppError('SHIPMENT_NOT_FOUND', 'Shipment not found', 404);
  }

  if (shipment.status !== 'created') {
    throw new AppError('INVALID_STATUS', 'Shipment already assigned or processed', 400);
  }

  // 1. Tìm bưu cục lấy hàng (gần shop)
  const pickupOffice = await findNearestPostOffice(
    parseFloat(shipment.pickup_lat),
    parseFloat(shipment.pickup_lng),
    'local'
  );

  if (!pickupOffice) {
    throw new AppError('NO_PICKUP_OFFICE', 'Không tìm thấy bưu cục lấy hàng trong khu vực', 400);
  }

  // 2. Tìm bưu cục giao hàng (gần khách)
  const deliveryOffice = await findNearestPostOffice(
    parseFloat(shipment.delivery_lat),
    parseFloat(shipment.delivery_lng),
    'local'
  );

  if (!deliveryOffice) {
    throw new AppError('NO_DELIVERY_OFFICE', 'Không tìm thấy bưu cục giao hàng trong khu vực', 400);
  }

  // 3. Tìm shipper lấy hàng
  const pickupShipper = await findAvailableShipper(pickupOffice.id, 'pickup');
  if (!pickupShipper) {
    throw new AppError('NO_PICKUP_SHIPPER', 'Không có shipper khả dụng tại bưu cục lấy hàng', 400);
  }

  // 4. Tìm shipper giao hàng (có thể cùng hoặc khác bưu cục)
  let deliveryShipper = null;
  if (pickupOffice.id === deliveryOffice.id) {
    // Cùng bưu cục -> cùng shipper lấy và giao
    deliveryShipper = pickupShipper;
  } else {
    // Khác bưu cục -> tìm shipper khác
    deliveryShipper = await findAvailableShipper(deliveryOffice.id, 'delivery');
    if (!deliveryShipper) {
      throw new AppError('NO_DELIVERY_SHIPPER', 'Không có shipper khả dụng tại bưu cục giao hàng', 400);
    }
  }

  // 5. Cập nhật shipment
  const { data: updatedShipment, error } = await supabaseAdmin
    .from('shipments')
    .update({
      pickup_office_id: pickupOffice.id,
      delivery_office_id: deliveryOffice.id,
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

  // 6. Cập nhật số đơn của shipper
  await incrementShipperOrderCount(pickupShipper.id, 'pickup');
  if (deliveryShipper.id !== pickupShipper.id) {
    await incrementShipperOrderCount(deliveryShipper.id, 'delivery');
  }

  // 7. Thêm tracking event
  try {
    await trackingService.addTrackingEvent(shipmentId, 'SHIPPER_ASSIGNED', {
      actorType: 'system',
      description_vi: `Đã phân công shipper ${pickupShipper.user?.full_name || ''} (${pickupOffice.name_vi}) lấy hàng`,
      locationName: pickupOffice.name_vi,
      locationAddress: pickupOffice.address,
      lat: pickupOffice.lat,
      lng: pickupOffice.lng,
    });
  } catch (e) {
    console.error('Failed to add tracking event:', e.message);
  }

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

module.exports = {
  findNearestPostOffice,
  findAvailableShipper,
  autoAssignShipment,
  incrementShipperOrderCount,
  decrementShipperOrderCount,
  resetDailyOrderCounts,
  getPostOfficeStats,
};
