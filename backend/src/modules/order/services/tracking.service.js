/**
 * Tracking Service
 * Business logic for order tracking events
 */

const { supabaseAdmin: supabase } = require('../../../shared/supabase/supabase.client');
const orderDTO = require('../order.dto');

/**
 * Add tracking event for a sub-order
 */
async function addTrackingEvent(subOrderId, eventData) {
  const { data, error } = await supabase
    .from('tracking_events')
    .insert({
      sub_order_id: subOrderId,
      event_type: eventData.eventType,
      description: eventData.description,
      location: eventData.location || null,
      created_by: eventData.createdBy,
    })
    .select()
    .single();
  
  if (error) throw error;
  return orderDTO.serializeTrackingEvent(data);
}

/**
 * Get tracking history for a sub-order
 */
async function getTrackingHistory(subOrderId) {
  const { data, error } = await supabase
    .from('tracking_events')
    .select('*')
    .eq('sub_order_id', subOrderId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return (data || []).map(orderDTO.serializeTrackingEvent);
}

/**
 * Get tracking history for an order (all sub-orders)
 */
async function getOrderTrackingHistory(orderId) {
  const { data, error } = await supabase
    .from('tracking_events')
    .select(`
      *,
      sub_orders!inner (
        order_id
      )
    `)
    .eq('sub_orders.order_id', orderId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return (data || []).map(orderDTO.serializeTrackingEvent);
}

module.exports = {
  addTrackingEvent,
  getTrackingHistory,
  getOrderTrackingHistory,
};
