/**
 * Shipper Notification Triggers
 * Handles notifications for delivery-related events
 */

const notificationService = require('../notification.service');

// Notification types for shippers
const SHIPPER_NOTIFICATION_TYPES = {
  ORDER_READY_PICKUP: 'shipper_order_ready',
  DELIVERY_ASSIGNED: 'shipper_delivery_assigned',
  DELIVERY_REASSIGNED: 'shipper_delivery_reassigned',
  DELIVERY_REMINDER: 'shipper_delivery_reminder',
  ADDRESS_UPDATED: 'shipper_address_updated',
};

/**
 * Trigger notification when order is ready for pickup
 * @param {object} data - Delivery data
 * @param {string} data.shipper_id - Shipper user ID
 * @param {string} data.order_id - Order ID
 * @param {string} data.pickup_address - Pickup address
 * @param {string} [data.partner_name] - Partner/shop name
 * @returns {Promise<object>} Created notification
 */
async function onOrderReadyForPickup(data) {
  const { shipper_id, order_id, pickup_address, partner_name } = data;

  return notificationService.send(shipper_id, SHIPPER_NOTIFICATION_TYPES.ORDER_READY_PICKUP, {
    title: 'Đơn hàng sẵn sàng lấy',
    body: partner_name
      ? `Đơn hàng #${order_id.substring(0, 8)} tại ${partner_name} đã sẵn sàng để lấy.`
      : `Đơn hàng #${order_id.substring(0, 8)} đã sẵn sàng để lấy.`,
    payload: {
      orderId: order_id,
      pickupAddress: pickup_address,
      partnerName: partner_name || null,
      action: 'pickup',
    },
  });
}

/**
 * Trigger notification when delivery is reassigned
 * Notifies both old and new shipper
 * @param {object} data - Reassignment data
 * @param {string} data.old_shipper_id - Previous shipper user ID
 * @param {string} data.new_shipper_id - New shipper user ID
 * @param {string} data.order_id - Order ID
 * @param {string} [data.reason] - Reassignment reason
 * @returns {Promise<object[]>} Created notifications
 */
async function onDeliveryReassigned(data) {
  const { old_shipper_id, new_shipper_id, order_id, reason } = data;

  const notifications = [];

  // Notify old shipper
  if (old_shipper_id) {
    const oldNotification = await notificationService.send(
      old_shipper_id,
      SHIPPER_NOTIFICATION_TYPES.DELIVERY_REASSIGNED,
      {
        title: 'Đơn hàng đã chuyển',
        body: `Đơn hàng #${order_id.substring(0, 8)} đã được chuyển cho shipper khác.`,
        payload: {
          orderId: order_id,
          reassignedFrom: true,
          reason: reason || null,
        },
      }
    );
    notifications.push(oldNotification);
  }

  // Notify new shipper
  if (new_shipper_id) {
    const newNotification = await notificationService.send(
      new_shipper_id,
      SHIPPER_NOTIFICATION_TYPES.DELIVERY_ASSIGNED,
      {
        title: 'Đơn hàng mới được giao',
        body: `Bạn được giao đơn hàng #${order_id.substring(0, 8)}.`,
        payload: {
          orderId: order_id,
          reassignedTo: true,
          reason: reason || null,
        },
      }
    );
    notifications.push(newNotification);
  }

  return notifications;
}

/**
 * Trigger reminder notification for delivery deadline
 * @param {object} data - Delivery data
 * @param {string} data.shipper_id - Shipper user ID
 * @param {string} data.order_id - Order ID
 * @param {string} data.delivery_address - Delivery address
 * @param {Date|string} data.deadline - Delivery deadline
 * @returns {Promise<object>} Created notification
 */
async function onDeliveryReminder(data) {
  const { shipper_id, order_id, delivery_address, deadline } = data;

  const deadlineDate = new Date(deadline);
  const timeLeft = formatTimeLeft(deadlineDate);

  return notificationService.send(shipper_id, SHIPPER_NOTIFICATION_TYPES.DELIVERY_REMINDER, {
    title: 'Nhắc nhở giao hàng',
    body: `Đơn hàng #${order_id.substring(0, 8)} cần giao trong ${timeLeft}.`,
    payload: {
      orderId: order_id,
      deliveryAddress: delivery_address,
      deadline: deadlineDate.toISOString(),
    },
  });
}

/**
 * Trigger notification when customer updates delivery address
 * @param {object} data - Address update data
 * @param {string} data.shipper_id - Shipper user ID
 * @param {string} data.order_id - Order ID
 * @param {string} data.old_address - Previous address
 * @param {string} data.new_address - New address
 * @returns {Promise<object>} Created notification
 */
async function onAddressUpdated(data) {
  const { shipper_id, order_id, old_address, new_address } = data;

  return notificationService.send(shipper_id, SHIPPER_NOTIFICATION_TYPES.ADDRESS_UPDATED, {
    title: 'Địa chỉ giao hàng thay đổi',
    body: `Đơn hàng #${order_id.substring(0, 8)} có địa chỉ giao mới.`,
    payload: {
      orderId: order_id,
      oldAddress: old_address,
      newAddress: new_address,
    },
  });
}

/**
 * Format time left until deadline
 * @param {Date} deadline
 * @returns {string}
 */
function formatTimeLeft(deadline) {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) return 'đã quá hạn';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
}

module.exports = {
  SHIPPER_NOTIFICATION_TYPES,
  onOrderReadyForPickup,
  onDeliveryReassigned,
  onDeliveryReminder,
  onAddressUpdated,
};
