/**
 * Supabase Realtime Client
 * Real-time subscriptions for live updates
 */

const { supabaseClient } = require('./supabase.client');

// Active subscriptions
const subscriptions = new Map();

/**
 * Subscribe to table changes
 * @param {string} table - Table name
 * @param {Function} callback - Callback function for changes
 * @param {object} options - Subscription options
 * @returns {string} Subscription ID
 */
function subscribeToTable(table, callback, options = {}) {
  const subscriptionId = `${table}_${Date.now()}`;
  
  let channel = supabaseClient
    .channel(subscriptionId)
    .on(
      'postgres_changes',
      {
        event: options.event || '*', // INSERT, UPDATE, DELETE, or *
        schema: options.schema || 'public',
        table,
        filter: options.filter,
      },
      (payload) => {
        callback({
          event: payload.eventType,
          table: payload.table,
          old: payload.old,
          new: payload.new,
          timestamp: new Date().toISOString(),
        });
      }
    )
    .subscribe();

  subscriptions.set(subscriptionId, channel);
  return subscriptionId;
}

/**
 * Subscribe to order updates for a user
 * @param {string} userId - User ID
 * @param {Function} callback - Callback for order changes
 * @returns {string} Subscription ID
 */
function subscribeToUserOrders(userId, callback) {
  return subscribeToTable('orders', callback, {
    event: '*',
    filter: `customer_id=eq.${userId}`,
  });
}

/**
 * Subscribe to order updates for a partner
 * @param {string} partnerId - Partner ID
 * @param {Function} callback - Callback for order changes
 * @returns {string} Subscription ID
 */
function subscribeToPartnerOrders(partnerId, callback) {
  return subscribeToTable('sub_orders', callback, {
    event: '*',
    filter: `shop_id=eq.${partnerId}`,
  });
}

/**
 * Subscribe to shipper delivery updates
 * @param {string} shipperId - Shipper ID
 * @param {Function} callback - Callback for delivery changes
 * @returns {string} Subscription ID
 */
function subscribeToShipperDeliveries(shipperId, callback) {
  return subscribeToTable('sub_orders', callback, {
    event: 'UPDATE',
    filter: `shipper_id=eq.${shipperId}`,
  });
}

/**
 * Subscribe to notifications for a user
 * @param {string} userId - User ID
 * @param {Function} callback - Callback for new notifications
 * @returns {string} Subscription ID
 */
function subscribeToNotifications(userId, callback) {
  return subscribeToTable('notifications', callback, {
    event: 'INSERT',
    filter: `user_id=eq.${userId}`,
  });
}

/**
 * Subscribe to product inventory changes
 * @param {string} productId - Product ID
 * @param {Function} callback - Callback for inventory changes
 * @returns {string} Subscription ID
 */
function subscribeToInventory(productId, callback) {
  return subscribeToTable('product_variants', callback, {
    event: 'UPDATE',
    filter: `product_id=eq.${productId}`,
  });
}

/**
 * Subscribe to cart changes
 * @param {string} userId - User ID
 * @param {Function} callback - Callback for cart changes
 * @returns {string} Subscription ID
 */
function subscribeToCart(userId, callback) {
  return subscribeToTable('cart_items', callback, {
    event: '*',
    filter: `user_id=eq.${userId}`,
  });
}

/**
 * Subscribe to new reviews for a product
 * @param {string} productId - Product ID
 * @param {Function} callback - Callback for new reviews
 * @returns {string} Subscription ID
 */
function subscribeToProductReviews(productId, callback) {
  return subscribeToTable('reviews', callback, {
    event: 'INSERT',
    filter: `product_id=eq.${productId}`,
  });
}


/**
 * Create a broadcast channel for custom events
 * @param {string} channelName - Channel name
 * @param {Function} callback - Callback for broadcast messages
 * @returns {string} Subscription ID (same as channelName for broadcast channels)
 */
function createBroadcastChannel(channelName, callback) {
  // Use channelName directly so frontend and backend use the same channel
  const subscriptionId = channelName;
  
  // Check if already subscribed
  if (subscriptions.has(subscriptionId)) {
    return subscriptionId;
  }
  
  const channel = supabaseClient
    .channel(channelName)
    .on('broadcast', { event: '*' }, (payload) => {
      callback({
        event: payload.event,
        payload: payload.payload,
        timestamp: new Date().toISOString(),
      });
    })
    .subscribe();

  subscriptions.set(subscriptionId, channel);
  return subscriptionId;
}

/**
 * Send broadcast message
 * @param {string} subscriptionId - Subscription ID
 * @param {string} event - Event name
 * @param {object} payload - Message payload
 */
async function broadcast(subscriptionId, event, payload) {
  const channel = subscriptions.get(subscriptionId);
  if (!channel) {
    throw new Error('Channel not found');
  }

  await channel.send({
    type: 'broadcast',
    event,
    payload,
  });
}

/**
 * Create presence channel for tracking online users
 * @param {string} channelName - Channel name
 * @param {object} userInfo - User information to share
 * @param {Function} onSync - Callback when presence syncs
 * @param {Function} onJoin - Callback when user joins
 * @param {Function} onLeave - Callback when user leaves
 * @returns {string} Subscription ID
 */
function createPresenceChannel(channelName, userInfo, { onSync, onJoin, onLeave }) {
  const subscriptionId = `presence_${channelName}_${Date.now()}`;
  
  const channel = supabaseClient
    .channel(subscriptionId)
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      if (onSync) onSync(state);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (onJoin) onJoin(key, newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      if (onLeave) onLeave(key, leftPresences);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(userInfo);
      }
    });

  subscriptions.set(subscriptionId, channel);
  return subscriptionId;
}

/**
 * Track user presence in a channel
 * @param {string} subscriptionId - Subscription ID
 * @param {object} userInfo - User information to track
 */
async function trackPresence(subscriptionId, userInfo) {
  const channel = subscriptions.get(subscriptionId);
  if (!channel) {
    throw new Error('Channel not found');
  }

  await channel.track(userInfo);
}

/**
 * Unsubscribe from a channel
 * @param {string} subscriptionId - Subscription ID
 */
async function unsubscribe(subscriptionId) {
  const channel = subscriptions.get(subscriptionId);
  if (channel) {
    await supabaseClient.removeChannel(channel);
    subscriptions.delete(subscriptionId);
  }
}

/**
 * Unsubscribe from all channels
 */
async function unsubscribeAll() {
  for (const [id, channel] of subscriptions) {
    await supabaseClient.removeChannel(channel);
  }
  subscriptions.clear();
}

/**
 * Get active subscription count
 * @returns {number}
 */
function getActiveSubscriptionCount() {
  return subscriptions.size;
}

/**
 * Get all active subscription IDs
 * @returns {string[]}
 */
function getActiveSubscriptions() {
  return Array.from(subscriptions.keys());
}

module.exports = {
  // Table subscriptions
  subscribeToTable,
  subscribeToUserOrders,
  subscribeToPartnerOrders,
  subscribeToShipperDeliveries,
  subscribeToNotifications,
  subscribeToInventory,
  subscribeToCart,
  subscribeToProductReviews,
  
  // Broadcast
  createBroadcastChannel,
  broadcast,
  
  // Presence
  createPresenceChannel,
  trackPresence,
  
  // Management
  unsubscribe,
  unsubscribeAll,
  getActiveSubscriptionCount,
  getActiveSubscriptions,
};
