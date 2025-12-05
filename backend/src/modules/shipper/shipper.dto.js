/**
 * Shipper DTOs
 * Data Transfer Objects for shipper module
 * 
 * Requirements: 4 (Shipper Management), 5 (Shipment Management)
 */

// ============================================
// SHIPPER DTOs
// ============================================

/**
 * Transform shipper for public response
 * @param {Object} shipper
 * @returns {Object}
 */
function toShipperResponse(shipper) {
  if (!shipper) return null;
  
  return {
    id: shipper.id,
    userId: shipper.user_id,
    vehicleType: shipper.vehicle_type,
    vehiclePlate: shipper.vehicle_plate,
    vehicleBrand: shipper.vehicle_brand,
    vehicleModel: shipper.vehicle_model,
    status: shipper.status,
    isOnline: shipper.is_online,
    isAvailable: shipper.is_available,
    workingDistrict: shipper.working_district,
    workingCity: shipper.working_city,
    maxDistanceKm: shipper.max_distance_km,
    statistics: {
      totalDeliveries: shipper.total_deliveries || 0,
      successfulDeliveries: shipper.successful_deliveries || 0,
      failedDeliveries: shipper.failed_deliveries || 0,
      avgRating: shipper.avg_rating || 0,
      totalRatings: shipper.total_ratings || 0,
    },
    user: shipper.user ? {
      id: shipper.user.id,
      fullName: shipper.user.full_name,
      phone: shipper.user.phone,
      email: shipper.user.email,
      avatarUrl: shipper.user.avatar_url,
    } : null,
    createdAt: shipper.created_at,
    approvedAt: shipper.approved_at,
  };
}

/**
 * Transform shipper for admin response (includes sensitive data)
 * @param {Object} shipper
 * @returns {Object}
 */
function toShipperAdminResponse(shipper) {
  if (!shipper) return null;
  
  const base = toShipperResponse(shipper);
  return {
    ...base,
    idCardNumber: shipper.id_card_number,
    driverLicense: shipper.driver_license,
    currentLocation: shipper.current_lat && shipper.current_lng ? {
      lat: parseFloat(shipper.current_lat),
      lng: parseFloat(shipper.current_lng),
      updatedAt: shipper.last_location_update,
    } : null,
    approvedBy: shipper.approved_by,
  };
}

/**
 * Transform shipper for tracking (minimal info)
 * @param {Object} shipper
 * @returns {Object}
 */
function toShipperTrackingResponse(shipper) {
  if (!shipper) return null;
  
  return {
    id: shipper.id,
    vehicleType: shipper.vehicle_type,
    vehiclePlate: shipper.vehicle_plate,
    user: shipper.user ? {
      fullName: shipper.user.full_name,
      phone: shipper.user.phone,
      avatarUrl: shipper.user.avatar_url,
    } : null,
    rating: shipper.avg_rating || 0,
  };
}

/**
 * Transform shipper list response
 * @param {Object[]} shippers
 * @param {number} count
 * @param {Object} pagination
 * @returns {Object}
 */
function toShipperListResponse(shippers, count, pagination = {}) {
  return {
    data: shippers.map(toShipperResponse),
    pagination: {
      total: count,
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      totalPages: Math.ceil(count / (pagination.limit || 20)),
    },
  };
}

// ============================================
// SHIPMENT DTOs
// ============================================

/**
 * Transform shipment for response
 * @param {Object} shipment
 * @returns {Object}
 */
function toShipmentResponse(shipment) {
  if (!shipment) return null;
  
  return {
    id: shipment.id,
    trackingNumber: shipment.tracking_number,
    subOrderId: shipment.sub_order_id,
    status: shipment.status,
    
    pickup: {
      address: shipment.pickup_address,
      lat: shipment.pickup_lat ? parseFloat(shipment.pickup_lat) : null,
      lng: shipment.pickup_lng ? parseFloat(shipment.pickup_lng) : null,
      contactName: shipment.pickup_contact_name,
      contactPhone: shipment.pickup_contact_phone,
    },
    
    delivery: {
      address: shipment.delivery_address,
      lat: shipment.delivery_lat ? parseFloat(shipment.delivery_lat) : null,
      lng: shipment.delivery_lng ? parseFloat(shipment.delivery_lng) : null,
      contactName: shipment.delivery_contact_name,
      contactPhone: shipment.delivery_contact_phone,
    },
    
    distanceKm: shipment.distance_km ? parseFloat(shipment.distance_km) : null,
    estimatedDurationMinutes: shipment.estimated_duration_minutes,
    estimatedDelivery: shipment.estimated_delivery,
    
    shippingFee: parseFloat(shipment.shipping_fee || 0),
    codAmount: parseFloat(shipment.cod_amount || 0),
    
    deliveryNotes: shipment.delivery_notes,
    failureReason: shipment.failure_reason,
    
    shipper: shipment.shipper ? toShipperTrackingResponse(shipment.shipper) : null,
    
    timestamps: {
      created: shipment.created_at,
      assigned: shipment.assigned_at,
      pickedUp: shipment.picked_up_at,
      delivered: shipment.delivered_at,
    },
    
    rating: shipment.customer_rating ? {
      score: shipment.customer_rating,
      feedback: shipment.customer_feedback,
    } : null,
  };
}

/**
 * Transform shipment for shipper app (includes order details)
 * @param {Object} shipment
 * @returns {Object}
 */
function toShipmentShipperResponse(shipment) {
  if (!shipment) return null;
  
  const base = toShipmentResponse(shipment);
  
  return {
    ...base,
    subOrder: shipment.sub_order ? {
      id: shipment.sub_order.id,
      orderId: shipment.sub_order.order_id,
      shopId: shipment.sub_order.shop_id,
      totalAmount: parseFloat(shipment.sub_order.total_amount || 0),
      customer: shipment.sub_order.order?.customer ? {
        fullName: shipment.sub_order.order.customer.full_name,
        phone: shipment.sub_order.order.customer.phone,
      } : null,
    } : null,
  };
}

/**
 * Transform shipment for customer tracking
 * @param {Object} shipment
 * @returns {Object}
 */
function toShipmentTrackingResponse(shipment) {
  if (!shipment) return null;
  
  return {
    trackingNumber: shipment.tracking_number,
    status: shipment.status,
    statusLabel: getStatusLabel(shipment.status),
    
    delivery: {
      address: shipment.delivery_address,
      estimatedDelivery: shipment.estimated_delivery,
    },
    
    shipper: shipment.shipper ? {
      name: shipment.shipper.user?.full_name,
      phone: shipment.shipper.user?.phone,
      vehicleType: shipment.shipper.vehicle_type,
      vehiclePlate: shipment.shipper.vehicle_plate,
      rating: shipment.shipper.avg_rating,
    } : null,
    
    timeline: buildTimeline(shipment),
  };
}

/**
 * Transform shipment list response
 * @param {Object[]} shipments
 * @param {number} count
 * @param {Object} pagination
 * @returns {Object}
 */
function toShipmentListResponse(shipments, count, pagination = {}) {
  return {
    data: shipments.map(toShipmentResponse),
    pagination: {
      total: count,
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      totalPages: Math.ceil(count / (pagination.limit || 20)),
    },
  };
}

// ============================================
// LOCATION DTOs
// ============================================

/**
 * Transform location for response
 * @param {Object} location
 * @returns {Object}
 */
function toLocationResponse(location) {
  if (!location) return null;
  
  return {
    lat: location.lat,
    lng: location.lng,
    accuracy: location.accuracy,
    speed: location.speed,
    heading: location.heading,
    timestamp: location.timestamp,
  };
}

/**
 * Transform location history for response
 * @param {Object[]} history
 * @returns {Object[]}
 */
function toLocationHistoryResponse(history) {
  return history.map(loc => ({
    lat: loc.lat,
    lng: loc.lng,
    timestamp: loc.timestamp,
    speed: loc.speed,
  }));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get human-readable status label
 * @param {string} status
 * @returns {string}
 */
function getStatusLabel(status) {
  const labels = {
    created: 'Đang chờ shipper',
    assigned: 'Shipper đã nhận đơn',
    picked_up: 'Đã lấy hàng',
    delivering: 'Đang giao hàng',
    delivered: 'Đã giao hàng',
    failed: 'Giao hàng thất bại',
    cancelled: 'Đã hủy',
    returned: 'Đã hoàn trả',
  };
  return labels[status] || status;
}

/**
 * Build shipment timeline
 * @param {Object} shipment
 * @returns {Object[]}
 */
function buildTimeline(shipment) {
  const timeline = [];
  
  if (shipment.created_at) {
    timeline.push({
      status: 'created',
      label: 'Đơn hàng đã tạo',
      timestamp: shipment.created_at,
    });
  }
  
  if (shipment.assigned_at) {
    timeline.push({
      status: 'assigned',
      label: 'Shipper đã nhận đơn',
      timestamp: shipment.assigned_at,
    });
  }
  
  if (shipment.picked_up_at) {
    timeline.push({
      status: 'picked_up',
      label: 'Đã lấy hàng từ shop',
      timestamp: shipment.picked_up_at,
    });
  }
  
  if (shipment.delivered_at) {
    timeline.push({
      status: 'delivered',
      label: 'Đã giao hàng thành công',
      timestamp: shipment.delivered_at,
    });
  }
  
  return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

module.exports = {
  // Shipper DTOs
  toShipperResponse,
  toShipperAdminResponse,
  toShipperTrackingResponse,
  toShipperListResponse,
  
  // Shipment DTOs
  toShipmentResponse,
  toShipmentShipperResponse,
  toShipmentTrackingResponse,
  toShipmentListResponse,
  
  // Location DTOs
  toLocationResponse,
  toLocationHistoryResponse,
  
  // Helpers
  getStatusLabel,
  buildTimeline,
};
