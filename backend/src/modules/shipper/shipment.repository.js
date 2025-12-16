/**
 * Shipment Repository
 * Data access layer for shipment operations
 * 
 * Requirements: 5 (Shipment Management)
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

// ============================================
// SHIPMENT CRUD OPERATIONS
// ============================================

/**
 * Create a new shipment
 * @param {Object} data - Shipment data
 * @returns {Promise<Object>}
 */
async function createShipment(data) {
  const trackingNumber = generateTrackingNumber();
  
  const { data: shipment, error } = await supabaseAdmin
    .from('shipments')
    .insert({
      id: uuidv4(),
      tracking_number: trackingNumber,
      ...data,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create shipment: ${error.message}`);
  }

  return shipment;
}

/**
 * Find shipment by ID
 * @param {string} shipmentId
 * @returns {Promise<Object|null>}
 */
async function findShipmentById(shipmentId) {
  // Avoid shipper join due to multiple relationships (shipper_id, pickup_shipper_id, delivery_shipper_id)
  // Also avoid nested user join to prevent multiple relationship errors
  const { data, error } = await supabaseAdmin
    .from('shipments')
    .select(`
      *,
      sub_order:sub_orders(
        id,
        order_id,
        shop_id,
        total,
        order:orders(
          id,
          user_id
        )
      )
    `)
    .eq('id', shipmentId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find shipment: ${error.message}`);
  }

  if (!data) return null;

  // Get shipper info separately if needed
  if (data.shipper_id) {
    const { data: shipper } = await supabaseAdmin
      .from('shippers')
      .select(`
        id,
        vehicle_type,
        vehicle_plate,
        user:users(id, full_name, phone, avatar_url)
      `)
      .eq('id', data.shipper_id)
      .single();
    data.shipper = shipper;
  }

  return data;
}

/**
 * Find shipment by tracking number
 * @param {string} trackingNumber
 * @returns {Promise<Object|null>}
 */
async function findByTrackingNumber(trackingNumber) {
  const { data, error } = await supabaseAdmin
    .from('shipments')
    .select('*')
    .eq('tracking_number', trackingNumber)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find shipment: ${error.message}`);
  }

  if (!data) return null;

  // Get shipper info separately if needed
  if (data.shipper_id) {
    const { data: shipper } = await supabaseAdmin
      .from('shippers')
      .select(`
        id,
        vehicle_type,
        vehicle_plate,
        user:users(id, full_name, phone, avatar_url)
      `)
      .eq('id', data.shipper_id)
      .single();
    data.shipper = shipper;
  }

  return data;
}

/**
 * Find shipment by sub-order ID
 * @param {string} subOrderId
 * @returns {Promise<Object|null>}
 */
async function findBySubOrderId(subOrderId) {
  const { data, error } = await supabaseAdmin
    .from('shipments')
    .select('*')
    .eq('sub_order_id', subOrderId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find shipment: ${error.message}`);
  }

  return data || null;
}

/**
 * Update shipment
 * @param {string} shipmentId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateShipment(shipmentId, updates) {
  const { data, error } = await supabaseAdmin
    .from('shipments')
    .update(updates)
    .eq('id', shipmentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update shipment: ${error.message}`);
  }

  return data;
}

// ============================================
// QUERY OPERATIONS
// ============================================

/**
 * Find shipments by shipper ID
 * @param {string} shipperId
 * @param {Object} options - Filter and pagination options
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function findByShipperId(shipperId, options = {}) {
  const { page = 1, limit = 20, status } = options;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('shipments')
    .select(`
      *,
      sub_order:sub_orders(
        id,
        order_id,
        shop_id,
        total
      )
    `, { count: 'exact' })
    .eq('shipper_id', shipperId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to find shipments: ${error.message}`);
  }

  return { data: data || [], count: count || 0 };
}

/**
 * Find shipments by status
 * @param {string} status
 * @param {Object} options
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function findByStatus(status, options = {}) {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('shipments')
    .select(`
      *,
      sub_order:sub_orders(
        id,
        order_id,
        shop_id
      )
    `, { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to find shipments: ${error.message}`);
  }

  // Get shipper info separately for each shipment
  const enrichedData = await Promise.all((data || []).map(async (shipment) => {
    if (shipment.shipper_id) {
      const { data: shipper } = await supabaseAdmin
        .from('shippers')
        .select('id, user:users(id, full_name, phone)')
        .eq('id', shipment.shipper_id)
        .single();
      shipment.shipper = shipper;
    }
    return shipment;
  }));

  return { data: enrichedData, count: count || 0 };
}

/**
 * Find pending shipments (waiting for shipper assignment)
 * @param {Object} options
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function findPendingShipments(options = {}) {
  return findByStatus('created', options);
}

/**
 * Find active shipments for a shipper
 * @param {string} shipperId
 * @returns {Promise<Object[]>}
 */
async function findActiveByShipper(shipperId) {
  const { data, error } = await supabaseAdmin
    .from('shipments')
    .select(`
      *,
      sub_order:sub_orders(
        id,
        order_id,
        shop_id,
        total,
        order:orders(id, user_id, customer:users(id, full_name, phone))
      )
    `)
    .eq('shipper_id', shipperId)
    .in('status', ['assigned', 'picked_up', 'delivering'])
    .order('assigned_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to find active shipments: ${error.message}`);
  }

  return data || [];
}

// ============================================
// STATUS OPERATIONS
// ============================================

/**
 * Assign shipper to shipment
 * @param {string} shipmentId
 * @param {string} shipperId
 * @returns {Promise<Object>}
 */
async function assignShipper(shipmentId, shipperId) {
  return updateShipment(shipmentId, {
    shipper_id: shipperId,
    status: 'assigned',
    assigned_at: new Date().toISOString(),
  });
}

/**
 * Update shipment status
 * @param {string} shipmentId
 * @param {string} status
 * @param {Object} additionalData - Additional data based on status
 * @returns {Promise<Object>}
 */
async function updateStatus(shipmentId, status, additionalData = {}) {
  const updates = {
    status,
    ...additionalData,
  };

  // Add timestamp based on status
  switch (status) {
    case 'picked_up':
      updates.picked_up_at = new Date().toISOString();
      break;
    case 'delivered':
      updates.delivered_at = new Date().toISOString();
      break;
  }

  return updateShipment(shipmentId, updates);
}

// ============================================
// RATING OPERATIONS
// ============================================

/**
 * Add customer rating to shipment
 * @param {string} shipmentId
 * @param {number} rating
 * @param {string} feedback
 * @returns {Promise<Object>}
 */
async function addRating(shipmentId, rating, feedback = null) {
  return updateShipment(shipmentId, {
    customer_rating: rating,
    customer_feedback: feedback,
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate unique tracking number
 * @returns {string}
 */
function generateTrackingNumber() {
  const prefix = 'SHP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Find shipments by order ID (for multi-shop orders)
 * @param {string} orderId
 * @returns {Promise<Object[]>}
 */
async function findByOrderId(orderId) {
  // First get all sub-orders for this order
  const { data: subOrders, error: subOrderError } = await supabaseAdmin
    .from('sub_orders')
    .select('id')
    .eq('order_id', orderId);

  if (subOrderError) {
    throw new Error(`Failed to find sub-orders: ${subOrderError.message}`);
  }

  if (!subOrders || subOrders.length === 0) {
    return [];
  }

  const subOrderIds = subOrders.map(so => so.id);

  // Get all shipments for these sub-orders (query separately to avoid multiple relationship error)
  const { data, error } = await supabaseAdmin
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
    `)
    .in('sub_order_id', subOrderIds)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to find shipments: ${error.message}`);
  }

  // Enrich with shop and shipper info separately to avoid multiple relationship errors
  const enrichedData = await Promise.all((data || []).map(async (shipment) => {
    // Get shop info separately
    if (shipment.sub_order?.shop_id) {
      const { data: shop } = await supabaseAdmin
        .from('shops')
        .select('id, shop_name, logo_url')
        .eq('id', shipment.sub_order.shop_id)
        .single();
      if (shop) {
        shipment.sub_order.shops = shop;
      }
    }
    
    // Get shipper info separately
    if (shipment.shipper_id) {
      const { data: shipper } = await supabaseAdmin
        .from('shippers')
        .select('id, user_id, vehicle_type, vehicle_plate, avg_rating, total_deliveries')
        .eq('id', shipment.shipper_id)
        .single();
      
      if (shipper) {
        // Get user info for shipper separately (user_id is FK to users table)
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id, full_name, phone, avatar_url')
          .eq('id', shipper.user_id)
          .single();
        shipper.user = user;
        shipment.shipper = shipper;
      }
    }
    return shipment;
  }));

  return enrichedData;
}

module.exports = {
  // CRUD
  createShipment,
  findShipmentById,
  findByTrackingNumber,
  findBySubOrderId,
  updateShipment,
  
  // Query
  findByShipperId,
  findByStatus,
  findPendingShipments,
  findActiveByShipper,
  findByOrderId,
  
  // Status
  assignShipper,
  updateStatus,
  
  // Rating
  addRating,
  
  // Helpers
  generateTrackingNumber,
};
