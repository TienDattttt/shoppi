/**
 * Notification Consumer
 * Handles notification events from RabbitMQ queue
 * 
 * Processes push notifications, emails, SMS and logs to Cassandra
 */

const rabbitmqClient = require('../rabbitmq.client');

// Lazy load services to avoid circular dependencies
let notificationService = null;
let pushService = null;
let cassandraClient = null;

function getNotificationService() {
  if (!notificationService) {
    notificationService = require('../../../modules/notification/notification.service');
  }
  return notificationService;
}

function getPushService() {
  if (!pushService) {
    pushService = require('../../../modules/notification/services/push.service');
  }
  return pushService;
}

function getCassandraClient() {
  if (!cassandraClient) {
    cassandraClient = require('../../cassandra/cassandra.client');
  }
  return cassandraClient;
}

// Queue name
const QUEUE_NAME = 'notifications';

// Notification types
const NOTIFICATION_TYPES = {
  PUSH: 'push',
  EMAIL: 'email',
  SMS: 'sms',
};

/**
 * Initialize notification consumer
 */
async function initialize() {
  const channel = await rabbitmqClient.getChannel();
  if (!channel) {
    console.warn('[NotificationConsumer] RabbitMQ not available, skipping initialization');
    return false;
  }
  
  // Assert queue
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  
  // Bind to notifications exchange
  await channel.bindQueue(QUEUE_NAME, rabbitmqClient.EXCHANGES.NOTIFICATIONS, 'push');
  await channel.bindQueue(QUEUE_NAME, rabbitmqClient.EXCHANGES.NOTIFICATIONS, 'email');
  await channel.bindQueue(QUEUE_NAME, rabbitmqClient.EXCHANGES.NOTIFICATIONS, 'sms');
  
  console.log('[NotificationConsumer] Initialized, listening for: push, email, sms');
  return true;
}

/**
 * Start consuming notification events
 */
async function start() {
  const initialized = await initialize();
  if (!initialized) return;
  
  await rabbitmqClient.consume(QUEUE_NAME, async (message) => {
    const { type, payload, timestamp } = message;
    
    console.log(`[NotificationConsumer] Received ${type} notification`, { 
      userId: payload?.userId,
      notificationType: payload?.type 
    });
    
    try {
      switch (type) {
        case NOTIFICATION_TYPES.PUSH:
          await handlePushNotification(payload, timestamp);
          break;
        case NOTIFICATION_TYPES.EMAIL:
          await handleEmailNotification(payload, timestamp);
          break;
        case NOTIFICATION_TYPES.SMS:
          await handleSmsNotification(payload, timestamp);
          break;
        default:
          console.warn(`[NotificationConsumer] Unknown notification type: ${type}`);
      }
      
      // Log to Cassandra
      await logNotification(type, payload, timestamp, 'success');
      
    } catch (error) {
      console.error(`[NotificationConsumer] Error handling ${type}:`, error.message);
      
      // Log failure to Cassandra
      await logNotification(type, payload, timestamp, 'failed', error.message);
      
      throw error; // Re-throw to trigger nack
    }
  });
  
  console.log('[NotificationConsumer] Started consuming notifications');
}

/**
 * Handle push notification
 */
async function handlePushNotification(payload, timestamp) {
  const { userId, userRole, type, orderId, message, ...rest } = payload;
  
  if (!userId) {
    console.warn('[NotificationConsumer] Push notification missing userId');
    return;
  }
  
  // Validate userId exists in users table before creating notification
  // This prevents FK constraint errors and infinite retry loops
  const { supabaseAdmin } = require('../../supabase/supabase.client');
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();
  
  if (userError || !user) {
    console.warn(`[NotificationConsumer] User ${userId} not found, skipping notification. This might be a shipper_id instead of user_id.`);
    return; // Skip instead of throwing - prevents infinite retry loop
  }
  
  // Build notification content based on type
  const notificationContent = buildNotificationContent(type, payload);
  
  // Create in-app notification
  try {
    const service = getNotificationService();
    await service.send(userId, type || 'general', {
      title: notificationContent.title,
      body: notificationContent.body,
      payload: {
        orderId,
        type,
        userRole,
        timestamp,
        ...rest,
      },
      sendPush: true,
    });
    
    console.log(`[NotificationConsumer] Push notification sent to user ${userId}`);
  } catch (error) {
    // Log error but don't throw - prevents infinite retry loop for non-recoverable errors
    if (error.message?.includes('foreign key constraint') || error.message?.includes('violates')) {
      console.error(`[NotificationConsumer] FK constraint error for user ${userId}, skipping:`, error.message);
      return;
    }
    // Re-throw other errors for retry
    throw error;
  }
}

/**
 * Handle email notification
 */
async function handleEmailNotification(payload, timestamp) {
  const { userId, email, subject, body, template, templateData } = payload;
  
  // TODO: Implement email sending via SendGrid
  console.log(`[NotificationConsumer] Email notification queued for ${email || userId}`);
}

/**
 * Handle SMS notification
 */
async function handleSmsNotification(payload, timestamp) {
  const { userId, phone, message } = payload;
  
  // TODO: Implement SMS sending via Infobip/Twilio
  console.log(`[NotificationConsumer] SMS notification queued for ${phone || userId}`);
}

/**
 * Build notification content based on type
 */
function buildNotificationContent(type, payload) {
  const { orderId, totalAmount, itemCount, reason, message, trackingNumber, distanceMeters } = payload;
  
  const contentMap = {
    'NEW_ORDER': {
      title: 'Đơn hàng mới',
      body: `Bạn có đơn hàng mới${orderId ? ` #${orderId.substring(0, 8)}` : ''}${itemCount ? ` với ${itemCount} sản phẩm` : ''}`,
    },
    'ORDER_CONFIRMED': {
      title: 'Đơn hàng đã xác nhận',
      body: `Đơn hàng${orderId ? ` #${orderId.substring(0, 8)}` : ''} đã được xác nhận`,
    },
    'ORDER_PROCESSING': {
      title: 'Đang xử lý đơn hàng',
      body: `Đơn hàng${orderId ? ` #${orderId.substring(0, 8)}` : ''} đang được chuẩn bị`,
    },
    'ORDER_READY': {
      title: 'Đơn hàng sẵn sàng',
      body: `Đơn hàng${orderId ? ` #${orderId.substring(0, 8)}` : ''} sẵn sàng giao`,
    },
    'ORDER_SHIPPED': {
      title: 'Đơn hàng đang giao',
      body: `Đơn hàng${orderId ? ` #${orderId.substring(0, 8)}` : ''} đang được giao đến bạn`,
    },
    'ORDER_DELIVERED': {
      title: 'Đơn hàng đã giao',
      body: `Đơn hàng${orderId ? ` #${orderId.substring(0, 8)}` : ''} đã giao thành công`,
    },
    'ORDER_COMPLETED': {
      title: 'Đơn hàng hoàn tất',
      body: `Đơn hàng${orderId ? ` #${orderId.substring(0, 8)}` : ''} đã hoàn tất`,
    },
    'ORDER_CANCELLED': {
      title: 'Đơn hàng đã hủy',
      body: `Đơn hàng${orderId ? ` #${orderId.substring(0, 8)}` : ''} đã bị hủy${reason ? `. Lý do: ${reason}` : ''}`,
    },
    'SHIPPER_NEARBY': {
      title: 'Shipper đang đến! 🚚',
      body: `Shipper đang trên đường giao hàng đến bạn${trackingNumber ? ` (${trackingNumber})` : ''}${distanceMeters ? `, còn khoảng ${distanceMeters}m` : ''}. Chú ý điện thoại!`,
    },
  };
  
  return contentMap[type] || {
    title: 'Thông báo',
    body: message || 'Bạn có thông báo mới',
  };
}

/**
 * Log notification to Cassandra
 */
async function logNotification(type, payload, timestamp, status, errorMessage = null) {
  try {
    const client = getCassandraClient();
    if (!client.isClientConnected()) {
      return; // Cassandra not available
    }
    
    await client.execute(
      `INSERT INTO notification_logs (
        id, user_id, notification_type, channel, payload, status, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client.types.Uuid.random(),
        payload.userId ? client.types.Uuid.fromString(payload.userId) : null,
        payload.type || 'general',
        type,
        JSON.stringify(payload),
        status,
        errorMessage,
        new Date(timestamp),
      ]
    );
  } catch (error) {
    console.error('[NotificationConsumer] Failed to log notification:', error.message);
  }
}

/**
 * Stop consumer
 */
async function stop() {
  console.log('[NotificationConsumer] Stopping...');
}

module.exports = {
  initialize,
  start,
  stop,
  QUEUE_NAME,
  NOTIFICATION_TYPES,
};
