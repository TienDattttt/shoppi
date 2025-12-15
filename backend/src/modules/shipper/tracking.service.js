/**
 * Tracking Service
 * Quản lý tracking events và giả lập luồng giao vận
 * 
 * Luồng giao vận đơn giản hóa:
 * 1. Shop đóng hàng -> Chờ lấy hàng
 * 2. Shipper lấy hàng từ shop -> Đã lấy hàng
 * 3. Hàng về bưu cục gần shop -> Đang xử lý tại bưu cục
 * 4. Hàng rời bưu cục -> Đang vận chuyển đến kho trung chuyển
 * 5. Hàng đến kho trung chuyển -> Đang phân loại
 * 6. Hàng rời kho trung chuyển -> Đang vận chuyển đến bưu cục giao
 * 7. Hàng đến bưu cục giao -> Đang chờ giao hàng
 * 8. Shipper nhận hàng giao -> Đang giao hàng
 * 9. Giao thành công -> Đã giao hàng
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

// Tracking status definitions với mô tả tiếng Việt
const TRACKING_STATUSES = {
  // Giai đoạn 1: Tạo đơn
  ORDER_PLACED: {
    status: 'order_placed',
    status_vi: 'Đơn hàng đã đặt',
    description: 'Order has been placed successfully',
    description_vi: 'Đơn hàng đã được đặt thành công, chờ shop xác nhận',
  },
  SHOP_CONFIRMED: {
    status: 'shop_confirmed',
    status_vi: 'Shop đã xác nhận',
    description: 'Shop has confirmed the order',
    description_vi: 'Shop đã xác nhận đơn hàng và đang chuẩn bị hàng',
  },
  SHOP_PACKED: {
    status: 'shop_packed',
    status_vi: 'Đã đóng gói',
    description: 'Package has been packed by shop',
    description_vi: 'Hàng đã được đóng gói, chờ shipper đến lấy',
  },
  READY_TO_SHIP: {
    status: 'ready_to_ship',
    status_vi: 'Sẵn sàng giao',
    description: 'Package is ready for pickup',
    description_vi: 'Đơn hàng đã sẵn sàng để giao',
  },
  PICKUP_REQUESTED: {
    status: 'pickup_requested',
    status_vi: 'Yêu cầu lấy hàng',
    description: 'Pickup has been requested',
    description_vi: 'Shop đã yêu cầu lấy hàng',
  },

  // Giai đoạn 2: Lấy hàng
  SHIPPER_ASSIGNED: {
    status: 'shipper_assigned',
    status_vi: 'Đã phân công shipper',
    description: 'Shipper has been assigned for pickup',
    description_vi: 'Shipper đã được phân công đến lấy hàng',
  },
  PICKED_UP: {
    status: 'picked_up',
    status_vi: 'Đã lấy hàng',
    description: 'Package picked up from shop',
    description_vi: 'Shipper đã lấy hàng từ shop',
  },

  // Giai đoạn 3: Vận chuyển (giả lập)
  ARRIVED_PICKUP_OFFICE: {
    status: 'arrived_pickup_office',
    status_vi: 'Đã đến bưu cục lấy hàng',
    description: 'Package arrived at pickup post office',
    description_vi: 'Hàng đã đến bưu cục khu vực shop',
  },
  LEFT_PICKUP_OFFICE: {
    status: 'left_pickup_office',
    status_vi: 'Rời bưu cục lấy hàng',
    description: 'Package left pickup post office',
    description_vi: 'Hàng đã rời bưu cục, đang vận chuyển đến kho trung chuyển',
  },
  ARRIVED_SORTING_HUB: {
    status: 'arrived_sorting_hub',
    status_vi: 'Đến kho trung chuyển',
    description: 'Package arrived at sorting hub',
    description_vi: 'Hàng đã đến kho trung chuyển, đang phân loại',
  },
  LEFT_SORTING_HUB: {
    status: 'left_sorting_hub',
    status_vi: 'Rời kho trung chuyển',
    description: 'Package left sorting hub',
    description_vi: 'Hàng đã rời kho trung chuyển, đang vận chuyển đến bưu cục giao',
  },
  ARRIVED_DELIVERY_OFFICE: {
    status: 'arrived_delivery_office',
    status_vi: 'Đến bưu cục giao hàng',
    description: 'Package arrived at delivery post office',
    description_vi: 'Hàng đã đến bưu cục khu vực khách hàng',
  },

  // Giai đoạn 4: Giao hàng
  OUT_FOR_DELIVERY: {
    status: 'out_for_delivery',
    status_vi: 'Đang giao hàng',
    description: 'Package is out for delivery',
    description_vi: 'Shipper đang trên đường giao hàng đến bạn',
  },
  DELIVERED: {
    status: 'delivered',
    status_vi: 'Đã giao hàng',
    description: 'Package delivered successfully',
    description_vi: 'Giao hàng thành công',
  },

  // Trạng thái đặc biệt
  DELIVERY_FAILED: {
    status: 'delivery_failed',
    status_vi: 'Giao hàng thất bại',
    description: 'Delivery attempt failed',
    description_vi: 'Giao hàng không thành công',
  },
  RETURNING: {
    status: 'returning',
    status_vi: 'Đang hoàn hàng',
    description: 'Package is being returned',
    description_vi: 'Hàng đang được hoàn trả về shop',
  },
  RETURNED: {
    status: 'returned',
    status_vi: 'Đã hoàn hàng',
    description: 'Package returned to shop',
    description_vi: 'Hàng đã được hoàn trả về shop',
  },
};

/**
 * Thêm tracking event mới
 */
async function addTrackingEvent(shipmentId, statusKey, options = {}) {
  const statusInfo = TRACKING_STATUSES[statusKey];
  if (!statusInfo) {
    throw new Error(`Invalid tracking status: ${statusKey}`);
  }

  const eventData = {
    id: uuidv4(),
    shipment_id: shipmentId,
    status: statusInfo.status,
    status_vi: statusInfo.status_vi,
    description: options.description || statusInfo.description,
    description_vi: options.description_vi || statusInfo.description_vi,
    location_name: options.locationName,
    location_address: options.locationAddress,
    location_lat: options.lat,
    location_lng: options.lng,
    actor_type: options.actorType || 'system',
    actor_id: options.actorId,
    actor_name: options.actorName,
    event_time: options.eventTime || new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('shipment_tracking_events')
    .insert(eventData)
    .select()
    .single();

  if (error) {
    console.error('Failed to add tracking event:', error);
    throw error;
  }

  // Update shipment's last tracking info
  await supabaseAdmin
    .from('shipments')
    .update({
      current_location_name: options.locationName,
      current_location_lat: options.lat,
      current_location_lng: options.lng,
      last_tracking_update: eventData.event_time,
    })
    .eq('id', shipmentId);

  return data;
}

/**
 * Lấy lịch sử tracking của shipment
 */
async function getTrackingHistory(shipmentId) {
  const { data, error } = await supabaseAdmin
    .from('shipment_tracking_events')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('event_time', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Lấy tracking event mới nhất
 */
async function getLatestTrackingEvent(shipmentId) {
  const { data, error } = await supabaseAdmin
    .from('shipment_tracking_events')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('event_time', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
}

/**
 * Tìm bưu cục gần nhất theo tọa độ
 */
async function findNearestPostOffice(lat, lng, officeType = 'local') {
  // Tìm trong bán kính 20km
  const radiusKm = 20;
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

  const { data, error } = await supabaseAdmin
    .from('post_offices')
    .select('*')
    .eq('office_type', officeType)
    .eq('is_active', true)
    .gte('lat', lat - latDelta)
    .lte('lat', lat + latDelta)
    .gte('lng', lng - lngDelta)
    .lte('lng', lng + lngDelta)
    .limit(1);

  if (error) {
    console.error('Failed to find nearest post office:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Lấy kho trung chuyển theo region
 */
async function getRegionalHub(region) {
  const { data, error } = await supabaseAdmin
    .from('post_offices')
    .select('*')
    .eq('office_type', 'regional')
    .eq('region', region)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to get regional hub:', error);
    return null;
  }

  return data;
}

/**
 * Giả lập các tracking events tự động
 * Được gọi khi shipment status thay đổi
 */
async function simulateTrackingEvents(shipmentId, newStatus, options = {}) {
  const { shipment, shipper, postOffice } = options;

  switch (newStatus) {
    case 'assigned':
      await addTrackingEvent(shipmentId, 'SHIPPER_ASSIGNED', {
        actorType: 'system',
        description_vi: `Shipper ${shipper?.user?.full_name || 'đã được phân công'} sẽ đến lấy hàng`,
      });
      break;

    case 'picked_up':
      await addTrackingEvent(shipmentId, 'PICKED_UP', {
        actorType: 'shipper',
        actorId: shipper?.id,
        actorName: shipper?.user?.full_name,
        locationName: shipment?.pickup_address,
        lat: shipment?.pickup_lat,
        lng: shipment?.pickup_lng,
      });

      // Giả lập: Sau 30 phút, hàng đến bưu cục
      setTimeout(async () => {
        try {
          const pickupOffice = await findNearestPostOffice(
            shipment?.pickup_lat,
            shipment?.pickup_lng,
            'local'
          );
          if (pickupOffice) {
            await addTrackingEvent(shipmentId, 'ARRIVED_PICKUP_OFFICE', {
              locationName: pickupOffice.name_vi,
              locationAddress: pickupOffice.address,
              lat: pickupOffice.lat,
              lng: pickupOffice.lng,
            });
          }
        } catch (e) {
          console.error('Failed to simulate arrived_pickup_office:', e);
        }
      }, 30 * 60 * 1000); // 30 minutes
      break;

    case 'delivering':
      await addTrackingEvent(shipmentId, 'OUT_FOR_DELIVERY', {
        actorType: 'shipper',
        actorId: shipper?.id,
        actorName: shipper?.user?.full_name,
        description_vi: `Shipper ${shipper?.user?.full_name || ''} đang trên đường giao hàng`,
      });
      break;

    case 'delivered':
      await addTrackingEvent(shipmentId, 'DELIVERED', {
        actorType: 'shipper',
        actorId: shipper?.id,
        actorName: shipper?.user?.full_name,
        locationName: shipment?.delivery_address,
        lat: shipment?.delivery_lat,
        lng: shipment?.delivery_lng,
        description_vi: options.photoUrl 
          ? 'Giao hàng thành công - Đã chụp ảnh xác nhận'
          : 'Giao hàng thành công',
      });
      break;

    case 'failed':
      await addTrackingEvent(shipmentId, 'DELIVERY_FAILED', {
        actorType: 'shipper',
        actorId: shipper?.id,
        actorName: shipper?.user?.full_name,
        description_vi: options.failureReason || 'Giao hàng không thành công',
      });
      break;
  }
}

/**
 * Tạo tracking events ban đầu khi tạo shipment
 */
async function initializeTracking(shipmentId, shipment) {
  // Event 1: Đơn hàng đã đặt
  await addTrackingEvent(shipmentId, 'ORDER_PLACED', {
    locationName: shipment.pickup_address,
    lat: shipment.pickup_lat,
    lng: shipment.pickup_lng,
  });
}

module.exports = {
  TRACKING_STATUSES,
  addTrackingEvent,
  getTrackingHistory,
  getLatestTrackingEvent,
  findNearestPostOffice,
  getRegionalHub,
  simulateTrackingEvents,
  initializeTracking,
};
