/**
 * Transit Simulation Service
 * Mô phỏng hành trình trung chuyển hàng hóa
 * 
 * Luồng thực tế:
 * Shop → Bưu cục lấy hàng → Kho trung chuyển miền (nguồn) → [Kho trung chuyển miền đích nếu khác miền] → Bưu cục giao → Khách
 * 
 * Chúng ta chỉ làm đầu và cuối (shipper lấy/giao), phần giữa mô phỏng tracking events
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const trackingService = require('./tracking.service');
const assignmentService = require('./assignment.service');
const rabbitmqClient = require('../../shared/rabbitmq/rabbitmq.client');

// Thời gian mô phỏng (milliseconds) - có thể điều chỉnh cho demo
const SIMULATION_DELAYS = {
  ARRIVE_PICKUP_OFFICE: 30 * 60 * 1000,      // 30 phút sau khi lấy hàng
  LEAVE_PICKUP_OFFICE: 60 * 60 * 1000,       // 1 giờ sau khi lấy hàng
  ARRIVE_SOURCE_HUB: 3 * 60 * 60 * 1000,     // 3 giờ sau khi lấy hàng
  LEAVE_SOURCE_HUB: 4 * 60 * 60 * 1000,      // 4 giờ sau khi lấy hàng
  ARRIVE_DEST_HUB: 12 * 60 * 60 * 1000,      // 12 giờ (nếu khác miền)
  LEAVE_DEST_HUB: 13 * 60 * 60 * 1000,       // 13 giờ (nếu khác miền)
  ARRIVE_DELIVERY_OFFICE: 6 * 60 * 60 * 1000, // 6 giờ (cùng miền) hoặc 16 giờ (khác miền)
};

// Cho demo/test: thời gian ngắn hơn (seconds)
const DEMO_DELAYS = {
  ARRIVE_PICKUP_OFFICE: 10 * 1000,      // 10 giây
  LEAVE_PICKUP_OFFICE: 20 * 1000,       // 20 giây
  ARRIVE_SOURCE_HUB: 30 * 1000,         // 30 giây
  LEAVE_SOURCE_HUB: 40 * 1000,          // 40 giây
  ARRIVE_DEST_HUB: 50 * 1000,           // 50 giây (nếu khác miền)
  LEAVE_DEST_HUB: 60 * 1000,            // 60 giây (nếu khác miền)
  ARRIVE_DELIVERY_OFFICE: 70 * 1000,    // 70 giây
};

// Sử dụng demo delays cho development
const USE_DEMO_MODE = process.env.TRANSIT_DEMO_MODE === 'true';
const DELAYS = USE_DEMO_MODE ? DEMO_DELAYS : SIMULATION_DELAYS;

// Map province code to region
const PROVINCE_REGION_MAP = {
  // Miền Bắc (north) - 25 tỉnh
  '01': 'north', '02': 'north', '04': 'north', '06': 'north', '08': 'north',
  '10': 'north', '11': 'north', '12': 'north', '14': 'north', '15': 'north',
  '17': 'north', '19': 'north', '20': 'north', '22': 'north', '24': 'north',
  '25': 'north', '26': 'north', '27': 'north', '30': 'north', '31': 'north',
  '33': 'north', '34': 'north', '35': 'north', '36': 'north', '37': 'north',
  
  // Miền Trung (central) - 14 tỉnh
  '38': 'central', '40': 'central', '42': 'central', '44': 'central', '45': 'central',
  '46': 'central', '48': 'central', '49': 'central', '51': 'central', '52': 'central',
  '54': 'central', '56': 'central', '58': 'central', '60': 'central',
  
  // Miền Nam (south) - 24 tỉnh
  '62': 'south', '64': 'south', '66': 'south', '67': 'south', '68': 'south',
  '70': 'south', '72': 'south', '74': 'south', '75': 'south', '77': 'south',
  '79': 'south', '80': 'south', '82': 'south', '83': 'south', '84': 'south',
  '86': 'south', '87': 'south', '89': 'south', '91': 'south', '92': 'south',
  '93': 'south', '94': 'south', '95': 'south', '96': 'south',
};

const REGION_NAMES = {
  north: 'miền Bắc',
  central: 'miền Trung',
  south: 'miền Nam',
};

/**
 * Xác định region từ tọa độ hoặc province code
 */
function getRegionFromProvinceCode(provinceCode) {
  return PROVINCE_REGION_MAP[provinceCode] || 'south'; // Default to south
}

/**
 * Xác định region từ tọa độ (rough estimate)
 */
function getRegionFromCoordinates(lat) {
  if (!lat) return 'south';
  if (lat >= 19.5) return 'north';      // Bắc Nghệ An trở lên
  if (lat >= 13.5) return 'central';    // Từ Bình Định đến Nghệ An
  return 'south';                        // Từ Phú Yên trở xuống
}

/**
 * Lấy regional hub theo region
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
    console.error('[TransitSimulation] Failed to get regional hub:', error);
    return null;
  }

  return data;
}

/**
 * Bắt đầu mô phỏng transit sau khi shipper lấy hàng
 * 
 * @param {string} shipmentId - ID shipment
 * @param {Object} shipment - Shipment data
 */
async function startTransitSimulation(shipmentId, shipment) {
  console.log(`[TransitSimulation] Starting transit simulation for shipment ${shipmentId}`);
  
  try {
    // Lấy thông tin bưu cục và region
    const pickupOffice = shipment.pickup_office_id 
      ? await getPostOffice(shipment.pickup_office_id)
      : null;
    
    const deliveryOffice = shipment.delivery_office_id
      ? await getPostOffice(shipment.delivery_office_id)
      : null;

    // Xác định region nguồn và đích
    const sourceRegion = pickupOffice?.region 
      || getRegionFromCoordinates(parseFloat(shipment.pickup_lat));
    const destRegion = deliveryOffice?.region 
      || getRegionFromCoordinates(parseFloat(shipment.delivery_lat));

    const isCrossRegion = sourceRegion !== destRegion;
    
    console.log(`[TransitSimulation] Route: ${sourceRegion} -> ${destRegion}, cross-region: ${isCrossRegion}`);

    // Lấy regional hubs
    const sourceHub = await getRegionalHub(sourceRegion);
    const destHub = isCrossRegion ? await getRegionalHub(destRegion) : null;

    // Schedule các tracking events
    const baseTime = Date.now();
    
    // 1. Đến bưu cục lấy hàng
    scheduleTrackingEvent(shipmentId, 'ARRIVED_PICKUP_OFFICE', baseTime + DELAYS.ARRIVE_PICKUP_OFFICE, {
      locationName: pickupOffice?.name_vi || 'Bưu cục lấy hàng',
      locationAddress: pickupOffice?.address,
      lat: pickupOffice?.lat,
      lng: pickupOffice?.lng,
      description_vi: `Hàng đã đến ${pickupOffice?.name_vi || 'bưu cục khu vực shop'}`,
    });

    // 2. Rời bưu cục lấy hàng
    scheduleTrackingEvent(shipmentId, 'LEFT_PICKUP_OFFICE', baseTime + DELAYS.LEAVE_PICKUP_OFFICE, {
      locationName: pickupOffice?.name_vi || 'Bưu cục lấy hàng',
      description_vi: `Hàng đã rời ${pickupOffice?.name_vi || 'bưu cục'}, đang vận chuyển đến kho trung chuyển ${REGION_NAMES[sourceRegion]}`,
    });

    // 3. Đến kho trung chuyển nguồn
    scheduleTrackingEvent(shipmentId, 'ARRIVED_SORTING_HUB', baseTime + DELAYS.ARRIVE_SOURCE_HUB, {
      locationName: sourceHub?.name_vi || `Kho trung chuyển ${REGION_NAMES[sourceRegion]}`,
      locationAddress: sourceHub?.address,
      lat: sourceHub?.lat,
      lng: sourceHub?.lng,
      description_vi: `Hàng đã đến ${sourceHub?.name_vi || 'kho trung chuyển'}, đang phân loại`,
    });

    // 4. Rời kho trung chuyển nguồn
    const leaveSourceHubDesc = isCrossRegion
      ? `Hàng đã rời kho, đang vận chuyển đến kho trung chuyển ${REGION_NAMES[destRegion]}`
      : `Hàng đã rời kho, đang vận chuyển đến bưu cục giao hàng`;
    
    scheduleTrackingEvent(shipmentId, 'LEFT_SORTING_HUB', baseTime + DELAYS.LEAVE_SOURCE_HUB, {
      locationName: sourceHub?.name_vi || `Kho trung chuyển ${REGION_NAMES[sourceRegion]}`,
      description_vi: leaveSourceHubDesc,
    });

    let arriveDeliveryOfficeDelay = DELAYS.ARRIVE_DELIVERY_OFFICE;

    // 5 & 6. Nếu khác miền: đến và rời kho trung chuyển đích
    if (isCrossRegion && destHub) {
      scheduleTrackingEvent(shipmentId, 'ARRIVED_SORTING_HUB', baseTime + DELAYS.ARRIVE_DEST_HUB, {
        locationName: destHub.name_vi,
        locationAddress: destHub.address,
        lat: destHub.lat,
        lng: destHub.lng,
        description_vi: `Hàng đã đến ${destHub.name_vi}, đang phân loại theo khu vực`,
      });

      scheduleTrackingEvent(shipmentId, 'LEFT_SORTING_HUB', baseTime + DELAYS.LEAVE_DEST_HUB, {
        locationName: destHub.name_vi,
        description_vi: `Hàng đã rời kho, đang vận chuyển đến bưu cục giao hàng`,
      });

      // Điều chỉnh thời gian đến bưu cục giao cho cross-region
      arriveDeliveryOfficeDelay = DELAYS.LEAVE_DEST_HUB + (DELAYS.ARRIVE_DELIVERY_OFFICE - DELAYS.LEAVE_SOURCE_HUB);
    }

    // 7. Đến bưu cục giao hàng - trigger auto-assign delivery shipper
    scheduleDeliveryOfficeArrival(shipmentId, baseTime + arriveDeliveryOfficeDelay, {
      deliveryOffice,
      destRegion,
    });

    console.log(`[TransitSimulation] Scheduled ${isCrossRegion ? 7 : 5} tracking events for shipment ${shipmentId}`);
    
    // Lưu transit info vào shipment
    await supabaseAdmin
      .from('shipments')
      .update({
        transit_started_at: new Date().toISOString(),
        source_region: sourceRegion,
        dest_region: destRegion,
        is_cross_region: isCrossRegion,
      })
      .eq('id', shipmentId);

  } catch (error) {
    console.error(`[TransitSimulation] Error starting simulation for ${shipmentId}:`, error);
  }
}

/**
 * Schedule một tracking event
 */
function scheduleTrackingEvent(shipmentId, statusKey, executeAt, options = {}) {
  const delay = executeAt - Date.now();
  if (delay <= 0) {
    // Execute immediately
    addTrackingEventSafe(shipmentId, statusKey, options);
    return;
  }

  setTimeout(async () => {
    await addTrackingEventSafe(shipmentId, statusKey, options);
  }, delay);
}

/**
 * Safe wrapper for adding tracking event
 */
async function addTrackingEventSafe(shipmentId, statusKey, options) {
  try {
    // Check if shipment still exists and not cancelled
    const { data: shipment } = await supabaseAdmin
      .from('shipments')
      .select('status')
      .eq('id', shipmentId)
      .single();

    if (!shipment || shipment.status === 'cancelled' || shipment.status === 'returned') {
      console.log(`[TransitSimulation] Skipping event for ${shipmentId} - status: ${shipment?.status}`);
      return;
    }

    await trackingService.addTrackingEvent(shipmentId, statusKey, options);
    console.log(`[TransitSimulation] Added ${statusKey} event for shipment ${shipmentId}`);
  } catch (error) {
    console.error(`[TransitSimulation] Failed to add ${statusKey} event:`, error.message);
  }
}

/**
 * Schedule arrival at delivery office and auto-assign delivery shipper
 */
function scheduleDeliveryOfficeArrival(shipmentId, executeAt, context) {
  const delay = executeAt - Date.now();
  
  const execute = async () => {
    try {
      const { deliveryOffice, destRegion } = context;

      // Check shipment status
      const { data: shipment } = await supabaseAdmin
        .from('shipments')
        .select('*')
        .eq('id', shipmentId)
        .single();

      if (!shipment || shipment.status === 'cancelled' || shipment.status === 'returned') {
        console.log(`[TransitSimulation] Skipping delivery office arrival for ${shipmentId}`);
        return;
      }

      // Add tracking event
      await trackingService.addTrackingEvent(shipmentId, 'ARRIVED_DELIVERY_OFFICE', {
        locationName: deliveryOffice?.name_vi || `Bưu cục giao hàng khu vực ${REGION_NAMES[destRegion]}`,
        locationAddress: deliveryOffice?.address,
        lat: deliveryOffice?.lat,
        lng: deliveryOffice?.lng,
        description_vi: `Hàng đã đến ${deliveryOffice?.name_vi || 'bưu cục giao hàng'}, chờ shipper nhận giao`,
      });

      console.log(`[TransitSimulation] Shipment ${shipmentId} arrived at delivery office`);

      // Auto-assign delivery shipper
      await autoAssignDeliveryShipper(shipmentId, shipment);

    } catch (error) {
      console.error(`[TransitSimulation] Error at delivery office arrival:`, error.message);
    }
  };

  if (delay <= 0) {
    execute();
  } else {
    setTimeout(execute, delay);
  }
}

/**
 * Auto-assign shipper giao hàng khi hàng đến bưu cục giao
 */
async function autoAssignDeliveryShipper(shipmentId, shipment) {
  console.log(`[TransitSimulation] Auto-assigning delivery shipper for ${shipmentId}`);

  try {
    // Nếu pickup và delivery shipper giống nhau (cùng bưu cục), không cần assign lại
    if (shipment.pickup_shipper_id === shipment.delivery_shipper_id && shipment.delivery_shipper_id) {
      console.log(`[TransitSimulation] Same shipper for pickup and delivery, no reassignment needed`);
      
      // Notify shipper về đơn giao
      await notifyDeliveryShipper(shipment.delivery_shipper_id, shipmentId, shipment);
      return;
    }

    // Tìm shipper trong bưu cục giao
    const deliveryOfficeId = shipment.delivery_office_id;
    if (!deliveryOfficeId) {
      console.warn(`[TransitSimulation] No delivery office for shipment ${shipmentId}`);
      return;
    }

    const deliveryShipper = await assignmentService.findAvailableShipperInOffice(
      deliveryOfficeId, 
      'delivery', 
      null
    );

    if (!deliveryShipper) {
      console.warn(`[TransitSimulation] No delivery shipper available for shipment ${shipmentId}`);
      // Queue for retry
      await assignmentService.queueUnassignedShipment(shipmentId, 0);
      return;
    }

    // Update shipment với delivery shipper
    const { error } = await supabaseAdmin
      .from('shipments')
      .update({
        delivery_shipper_id: deliveryShipper.id,
        shipper_id: deliveryShipper.id, // Shipper chính giờ là delivery shipper
        status: 'ready_for_delivery',
        ready_for_delivery_at: new Date().toISOString(),
      })
      .eq('id', shipmentId);

    if (error) {
      console.error(`[TransitSimulation] Failed to update delivery shipper:`, error);
      return;
    }

    // Increment delivery count
    await assignmentService.incrementShipperOrderCount(deliveryShipper.id, 'delivery');

    // Add tracking event
    await trackingService.addTrackingEvent(shipmentId, 'SHIPPER_ASSIGNED', {
      actorType: 'system',
      description_vi: `Shipper ${deliveryShipper.user?.full_name || ''} đã được phân công giao hàng`,
    });

    // Notify delivery shipper
    await notifyDeliveryShipper(deliveryShipper.user?.id, shipmentId, shipment);

    console.log(`[TransitSimulation] Assigned delivery shipper ${deliveryShipper.id} for shipment ${shipmentId}`);

  } catch (error) {
    console.error(`[TransitSimulation] Error assigning delivery shipper:`, error);
  }
}

/**
 * Notify shipper về đơn giao mới
 */
async function notifyDeliveryShipper(shipperUserId, shipmentId, shipment) {
  if (!shipperUserId) return;

  try {
    await rabbitmqClient.publishNotification('push', {
      userId: shipperUserId,
      type: 'NEW_DELIVERY',
      title: 'Đơn giao hàng mới',
      message: `Bạn có đơn giao hàng mới đến ${shipment.delivery_address}`,
      data: {
        shipmentId,
        trackingNumber: shipment.tracking_number,
        deliveryAddress: shipment.delivery_address,
      },
    });
  } catch (error) {
    console.error(`[TransitSimulation] Failed to notify delivery shipper:`, error.message);
  }
}

/**
 * Get post office by ID
 */
async function getPostOffice(officeId) {
  const { data, error } = await supabaseAdmin
    .from('post_offices')
    .select('*')
    .eq('id', officeId)
    .single();

  if (error) return null;
  return data;
}

module.exports = {
  startTransitSimulation,
  autoAssignDeliveryShipper,
  getRegionFromProvinceCode,
  getRegionFromCoordinates,
  getRegionalHub,
  REGION_NAMES,
  PROVINCE_REGION_MAP,
};
