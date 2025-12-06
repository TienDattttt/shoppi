/**
 * External Shipment Repository
 * CRUD operations for external shipments
 * 
 * Feature: shipping-provider-integration
 * Requirements: 3.3, 4.2
 */

const { getSupabaseClient } = require('../../../../shared/supabase/supabase.client');
const { AppError } = require('../../../../shared/utils/error.util');

const TABLE_NAME = 'external_shipments';

/**
 * Create new external shipment
 */
async function create(shipmentData) {
  const supabase = getSupabaseClient();
  
  const record = {
    sub_order_id: shipmentData.subOrderId,
    provider_code: shipmentData.providerCode,
    provider_order_id: shipmentData.providerOrderId,
    tracking_number: shipmentData.trackingNumber,
    status: shipmentData.status || 'created',
    provider_status: shipmentData.providerStatus,
    status_message: shipmentData.statusMessage,
    shipping_fee: shipmentData.shippingFee || 0,
    cod_amount: shipmentData.codAmount || 0,
    insurance_fee: shipmentData.insuranceFee || 0,
    pickup_address: shipmentData.pickupAddress,
    delivery_address: shipmentData.deliveryAddress,
    package_info: shipmentData.packageInfo || {},
    status_history: [{
      status: shipmentData.status || 'created',
      timestamp: new Date().toISOString(),
      message: 'Shipment created',
    }],
    estimated_delivery_at: shipmentData.estimatedDeliveryAt,
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(record)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to create shipment: ${error.message}`, 500);
  }

  return data;
}

/**
 * Find shipment by ID
 */
async function findById(id) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new AppError(`Failed to find shipment: ${error.message}`, 500);
  }

  return data;
}

/**
 * Find shipment by tracking number
 */
async function findByTrackingNumber(trackingNumber) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('tracking_number', trackingNumber)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new AppError(`Failed to find shipment: ${error.message}`, 500);
  }

  return data;
}

/**
 * Find shipment by sub-order ID
 */
async function findBySubOrderId(subOrderId) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('sub_order_id', subOrderId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new AppError(`Failed to find shipment: ${error.message}`, 500);
  }

  return data;
}

/**
 * Find shipments by provider order ID
 */
async function findByProviderOrderId(providerCode, providerOrderId) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('provider_code', providerCode)
    .eq('provider_order_id', providerOrderId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new AppError(`Failed to find shipment: ${error.message}`, 500);
  }

  return data;
}

/**
 * Update shipment status
 */
async function updateStatus(trackingNumber, statusData) {
  const supabase = getSupabaseClient();
  
  // First get current shipment to append to history
  const current = await findByTrackingNumber(trackingNumber);
  if (!current) {
    throw new AppError('Shipment not found', 404);
  }

  const statusHistory = current.status_history || [];
  statusHistory.push({
    status: statusData.status,
    provider_status: statusData.providerStatus,
    timestamp: new Date().toISOString(),
    message: statusData.statusMessage,
  });

  const updateData = {
    status: statusData.status,
    provider_status: statusData.providerStatus,
    status_message: statusData.statusMessage,
    status_history: statusHistory,
    updated_at: new Date().toISOString(),
    last_webhook_at: statusData.webhookTimestamp || new Date().toISOString(),
  };

  // Set specific timestamps based on status
  if (statusData.status === 'picked_up' && !current.picked_up_at) {
    updateData.picked_up_at = new Date().toISOString();
  }
  if (statusData.status === 'delivered' && !current.delivered_at) {
    updateData.delivered_at = new Date().toISOString();
    updateData.actual_delivery_at = new Date().toISOString();
  }
  if (statusData.status === 'cancelled' && !current.cancelled_at) {
    updateData.cancelled_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updateData)
    .eq('tracking_number', trackingNumber)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update shipment status: ${error.message}`, 500);
  }

  return data;
}

/**
 * Update shipment with webhook data
 */
async function updateFromWebhook(trackingNumber, webhookData) {
  const supabase = getSupabaseClient();
  
  const current = await findByTrackingNumber(trackingNumber);
  if (!current) {
    throw new AppError('Shipment not found', 404);
  }

  const statusHistory = current.status_history || [];
  statusHistory.push({
    status: webhookData.status,
    provider_status: webhookData.providerStatus,
    timestamp: webhookData.timestamp?.toISOString() || new Date().toISOString(),
    message: webhookData.statusMessage,
    data: webhookData.data,
  });

  const updateData = {
    status: webhookData.status,
    provider_status: webhookData.providerStatus,
    status_message: webhookData.statusMessage,
    status_history: statusHistory,
    webhook_data: webhookData.data,
    last_webhook_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updateData)
    .eq('tracking_number', trackingNumber)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update from webhook: ${error.message}`, 500);
  }

  return data;
}

/**
 * Increment retry count
 */
async function incrementRetryCount(trackingNumber, errorMessage) {
  const supabase = getSupabaseClient();
  
  const current = await findByTrackingNumber(trackingNumber);
  if (!current) {
    throw new AppError('Shipment not found', 404);
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      retry_count: (current.retry_count || 0) + 1,
      last_error: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('tracking_number', trackingNumber)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update retry count: ${error.message}`, 500);
  }

  return data;
}

/**
 * Find shipments by status
 */
async function findByStatus(status, options = {}) {
  const supabase = getSupabaseClient();
  const { limit = 50, offset = 0, providerCode } = options;
  
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (providerCode) {
    query = query.eq('provider_code', providerCode);
  }

  const { data, error } = await query;

  if (error) {
    throw new AppError(`Failed to find shipments: ${error.message}`, 500);
  }

  return data;
}

/**
 * Find shipments needing status check (not terminal, not updated recently)
 */
async function findStaleShipments(maxAgeMinutes = 30) {
  const supabase = getSupabaseClient();
  
  const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .not('status', 'in', '("delivered","returned","cancelled")')
    .lt('updated_at', cutoffTime)
    .order('updated_at', { ascending: true })
    .limit(100);

  if (error) {
    throw new AppError(`Failed to find stale shipments: ${error.message}`, 500);
  }

  return data;
}

/**
 * Get shipment statistics
 */
async function getStatistics(options = {}) {
  const supabase = getSupabaseClient();
  const { shopId, providerCode, startDate, endDate } = options;
  
  let query = supabase
    .from(TABLE_NAME)
    .select('status, provider_code, shipping_fee, cod_amount');

  if (providerCode) {
    query = query.eq('provider_code', providerCode);
  }
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new AppError(`Failed to get statistics: ${error.message}`, 500);
  }

  // Aggregate statistics
  const stats = {
    total: data.length,
    byStatus: {},
    byProvider: {},
    totalFees: 0,
    totalCOD: 0,
  };

  data.forEach(shipment => {
    // By status
    stats.byStatus[shipment.status] = (stats.byStatus[shipment.status] || 0) + 1;
    
    // By provider
    stats.byProvider[shipment.provider_code] = (stats.byProvider[shipment.provider_code] || 0) + 1;
    
    // Totals
    stats.totalFees += parseFloat(shipment.shipping_fee) || 0;
    stats.totalCOD += parseFloat(shipment.cod_amount) || 0;
  });

  return stats;
}

module.exports = {
  create,
  findById,
  findByTrackingNumber,
  findBySubOrderId,
  findByProviderOrderId,
  updateStatus,
  updateFromWebhook,
  incrementRetryCount,
  findByStatus,
  findStaleShipments,
  getStatistics,
};
