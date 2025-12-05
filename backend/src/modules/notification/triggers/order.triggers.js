/**
 * Order Notification Triggers
 * Handles notifications for order-related events
 */

const notificationService = require('../notification.service');

// Notification types for orders
const ORDER_NOTIFICATION_TYPES = {
  ORDER_CREATED: 'order_created',
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  NEW_ORDER_PARTNER: 'new_order_partner',
};

/**
 * Trigger notification when order is created
 * @param {object} order - Order data
 * @param {string} order.id - Order ID
 * @param {string} order.customer_id - Customer user ID
 * @param {number} order.total - Order total
 * @returns {Promise<object>} Created notification
 */
async function onOrderCreated(order) {
  const { id, customer_id, total } = order;

  return notificationService.send(customer_id, ORDER_NOTIFICATION_TYPES.ORDER_CREATED, {
    title: 'Đặt hàng thành công',
    body: `Đơn hàng #${id.substring(0, 8)} đã được tạo. Tổng: ${formatCurrency(total)}`,
    payload: {
      orderId: id,
      total,
    },
  });
}

/**
 * Trigger notification when order status changes
 * @param {object} order - Order data
 * @param {string} order.id - Order ID
 * @param {string} order.customer_id - Customer user ID
 * @param {string} order.status - New order status
 * @param {string} [order.tracking_number] - Tracking number (for shipped status)
 * @returns {Promise<object>} Created notification
 */
async function onOrderStatusChanged(order) {
  const { id, customer_id, status, tracking_number } = order;

  const statusMessages = {
    confirmed: {
      title: 'Đơn hàng đã xác nhận',
      body: `Đơn hàng #${id.substring(0, 8)} đã được xác nhận và đang chuẩn bị.`,
    },
    processing: {
      title: 'Đang xử lý đơn hàng',
      body: `Đơn hàng #${id.substring(0, 8)} đang được chuẩn bị.`,
    },
    shipped: {
      title: 'Đơn hàng đang giao',
      body: tracking_number
        ? `Đơn hàng #${id.substring(0, 8)} đang được giao. Mã vận đơn: ${tracking_number}`
        : `Đơn hàng #${id.substring(0, 8)} đang được giao.`,
    },
    cancelled: {
      title: 'Đơn hàng đã hủy',
      body: `Đơn hàng #${id.substring(0, 8)} đã bị hủy.`,
    },
  };

  const message = statusMessages[status];
  if (!message) return null;

  const type = status === 'shipped' 
    ? ORDER_NOTIFICATION_TYPES.ORDER_SHIPPED 
    : status === 'cancelled'
    ? ORDER_NOTIFICATION_TYPES.ORDER_CANCELLED
    : ORDER_NOTIFICATION_TYPES.ORDER_CONFIRMED;

  return notificationService.send(customer_id, type, {
    title: message.title,
    body: message.body,
    payload: {
      orderId: id,
      status,
      trackingNumber: tracking_number || null,
    },
  });
}

/**
 * Trigger notification when order is delivered
 * @param {object} order - Order data
 * @param {string} order.id - Order ID
 * @param {string} order.customer_id - Customer user ID
 * @returns {Promise<object>} Created notification
 */
async function onOrderDelivered(order) {
  const { id, customer_id } = order;

  return notificationService.send(customer_id, ORDER_NOTIFICATION_TYPES.ORDER_DELIVERED, {
    title: 'Đơn hàng đã giao',
    body: `Đơn hàng #${id.substring(0, 8)} đã được giao thành công. Vui lòng xác nhận đã nhận hàng.`,
    payload: {
      orderId: id,
      action: 'confirm_receipt',
    },
  });
}

/**
 * Trigger notification to partner when new order is received
 * @param {object} order - Order data
 * @param {string} order.id - Order ID
 * @param {string} order.partner_id - Partner user ID
 * @param {number} order.total - Order total
 * @param {number} order.item_count - Number of items
 * @returns {Promise<object>} Created notification
 */
async function onNewOrderForPartner(order) {
  const { id, partner_id, total, item_count } = order;

  return notificationService.send(partner_id, ORDER_NOTIFICATION_TYPES.NEW_ORDER_PARTNER, {
    title: 'Đơn hàng mới',
    body: `Bạn có đơn hàng mới #${id.substring(0, 8)} với ${item_count} sản phẩm. Tổng: ${formatCurrency(total)}`,
    payload: {
      orderId: id,
      total,
      itemCount: item_count,
    },
  });
}

/**
 * Format currency for display
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

module.exports = {
  ORDER_NOTIFICATION_TYPES,
  onOrderCreated,
  onOrderStatusChanged,
  onOrderDelivered,
  onNewOrderForPartner,
};
