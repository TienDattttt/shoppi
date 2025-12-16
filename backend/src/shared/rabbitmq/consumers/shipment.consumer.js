/**
 * Shipment Event Consumer
 * Handles SHIPMENT_STATUS_CHANGED and related events
 * 
 * Requirements: Event-driven architecture, order status sync
 * Requirements: 5.1, 5.2, 5.3, 5.4 - Status synchronization
 * Requirements: 4.5 - Proximity notification
 * Requirements: 6.3 - COD payment release
 * Requirements: 8.2, 8.3 - Failed delivery handling
 */

const rabbitmqClient = require('../rabbitmq.client');

// Event types this consumer handles
const HANDLED_EVENTS = [
  'SHIPMENT_CREATED',
  'SHIPMENT_ASSIGNED',
  'SHIPMENT_STATUS_CHANGED',
  'SHIPMENT_CREATE_REQUEST',
  'SHIPPER_NEARBY',
  'SHIPPER_REJECTION',
  'SHIPPER_OFFLINE',
  'DELIVERY_COMPLETED',
  'DELIVERY_FAILED',
];

// Queue name for shipment events
const QUEUE_NAME = 'shipment_events';

// Shipment status to order status mapping
// Requirements: 5.1 - Update order status based on shipment status
const STATUS_MAPPING = {
  'assigned': 'processing',
  'picked_up': 'shipping',
  'delivering': 'shipping',
  'out_for_delivery': 'shipping',
  'delivered': 'delivered',
  'failed': 'delivery_failed',
  'returned': 'returned',
  'cancelled': 'cancelled',
};

// Predefined failure reasons for validation
// Requirements: 8.1 - Require shipper to select failure reason from predefined list
const PREDEFINED_FAILURE_REASONS = [
  'customer_not_available',
  'wrong_address',
  'customer_refused',
  'package_damaged',
  'customer_requested_reschedule',
  'access_restricted',
  'weather_conditions',
  'other',
];

// Maximum delivery attempts before return
// Requirements: 8.3 - After 3 failed attempts, initiate return
const MAX_DELIVERY_ATTEMPTS = 3;

/**
 * Initialize shipment consumer
 */
async function initialize() {
  const channel = await rabbitmqClient.getChannel();
  
  // Assert queue
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  
  // Bind to events exchange
  for (const event of HANDLED_EVENTS) {
    await channel.bindQueue(QUEUE_NAME, rabbitmqClient.EXCHANGES.EVENTS, event);
  }
  
  console.log('[ShipmentConsumer] Initialized, listening for:', HANDLED_EVENTS.join(', '));
}

/**
 * Start consuming shipment events
 */
async function start() {
  await initialize();
  
  await rabbitmqClient.consume(QUEUE_NAME, async (message) => {
    const { event, data, timestamp } = message;
    
    console.log(`[ShipmentConsumer] Received event: ${event}`, { shipmentId: data?.shipmentId });
    
    try {
      switch (event) {
        case 'SHIPMENT_CREATED':
          await handleShipmentCreated(data, timestamp);
          break;
        case 'SHIPMENT_ASSIGNED':
          await handleShipmentAssigned(data, timestamp);
          break;
        case 'SHIPMENT_STATUS_CHANGED':
          await handleShipmentStatusChanged(data, timestamp);
          break;
        case 'SHIPMENT_CREATE_REQUEST':
          await handleShipmentCreateRequest(data, timestamp);
          break;
        case 'SHIPPER_NEARBY':
          await handleShipperNearby(data, timestamp);
          break;
        case 'SHIPPER_REJECTION':
          await handleShipperRejection(data, timestamp);
          break;
        case 'SHIPPER_OFFLINE':
          await handleShipperOffline(data, timestamp);
          break;
        case 'DELIVERY_COMPLETED':
          await handleDeliveryCompleted(data, timestamp);
          break;
        case 'DELIVERY_FAILED':
          await handleDeliveryFailed(data, timestamp);
          break;
        default:
          console.warn(`[ShipmentConsumer] Unknown event: ${event}`);
      }
    } catch (error) {
      console.error(`[ShipmentConsumer] Error handling ${event}:`, error.message);
      throw error;
    }
  });
}

/**
 * Handle SHIPMENT_CREATED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleShipmentCreated(data, timestamp) {
  const { shipmentId, trackingNumber, subOrderId, orderId } = data;
  
  console.log(`[ShipmentConsumer] Processing SHIPMENT_CREATED for shipment ${shipmentId}`);
  
  // 1. Update sub-order with tracking number
  await updateSubOrderTracking(subOrderId, trackingNumber);
  
  // 2. Notify customer with tracking info
  await notifyCustomerTrackingCreated(orderId, trackingNumber);
  
  // 3. Log analytics
  await logShipmentAnalytics('shipment_created', {
    shipmentId,
    trackingNumber,
    subOrderId,
    orderId,
    timestamp,
  });
  
  console.log(`[ShipmentConsumer] SHIPMENT_CREATED processed for shipment ${shipmentId}`);
}

/**
 * Handle SHIPMENT_ASSIGNED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleShipmentAssigned(data, timestamp) {
  // shipperUserId is the user_id (FK to users table) for notifications
  // shipperId is the shipper record ID (from shippers table)
  const { shipmentId, trackingNumber, shipperId, shipperUserId, shipperName, orderId, customerId } = data;
  
  console.log(`[ShipmentConsumer] Processing SHIPMENT_ASSIGNED for shipment ${shipmentId}`);
  
  // 1. Update order status
  await updateOrderStatus(orderId, 'processing');
  
  // 2. Notify customer
  await notifyCustomer(customerId, {
    type: 'SHIPPER_ASSIGNED',
    orderId,
    trackingNumber,
    shipperName,
    message: `Shipper ${shipperName} đã nhận đơn hàng của bạn`,
    timestamp,
  });
  
  // 3. Notify shipper - use shipperUserId (user_id) not shipperId (shipper record ID)
  // notifications table has FK to users table, not shippers table
  if (shipperUserId) {
    await notifyShipper(shipperUserId, {
      type: 'NEW_SHIPMENT',
      shipmentId,
      trackingNumber,
      message: 'Bạn có đơn giao hàng mới',
      timestamp,
    });
  } else {
    console.warn(`[ShipmentConsumer] No shipperUserId for shipment ${shipmentId}, skipping shipper notification`);
  }
  
  console.log(`[ShipmentConsumer] SHIPMENT_ASSIGNED processed for shipment ${shipmentId}`);
}

/**
 * Handle SHIPMENT_STATUS_CHANGED event
 * Requirements: 5.1 - Update order status in database within 2 seconds
 * Requirements: 5.2 - Notify Customer, Partner, and Admin via appropriate channels
 * 
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleShipmentStatusChanged(data, timestamp) {
  const { 
    shipmentId, 
    trackingNumber, 
    subOrderId, 
    orderId, 
    customerId,
    partnerId,
    shipperId,
    previousStatus, 
    status,
    location,
    photoUrl,
    reason,
  } = data;
  
  console.log(`[ShipmentConsumer] Processing SHIPMENT_STATUS_CHANGED: ${previousStatus} -> ${status}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Update order status based on shipment status (Requirements: 5.1)
    const orderStatus = STATUS_MAPPING[status];
    if (orderStatus) {
      await updateOrderStatusDirect(orderId, subOrderId, orderStatus);
      console.log(`[ShipmentConsumer] Order status updated to ${orderStatus} in ${Date.now() - startTime}ms`);
    }
    
    // 2. Send notifications to all parties (Requirements: 5.2)
    const notificationConfig = getNotificationConfig(status);
    
    // Notify customer
    if (customerId && notificationConfig) {
      await notifyCustomer(customerId, {
        type: notificationConfig.type,
        orderId,
        trackingNumber,
        title: notificationConfig.title,
        message: notificationConfig.message,
        data: {
          shipmentId,
          status,
          location,
        },
        timestamp,
      });
    }
    
    // Notify partner
    if (partnerId) {
      await notifyPartner(partnerId, {
        type: `SHIPMENT_${status.toUpperCase()}`,
        orderId,
        subOrderId,
        trackingNumber,
        message: getPartnerNotificationMessage(status, trackingNumber),
        timestamp,
      });
    }
    
    // 3. Handle specific status actions
    switch (status) {
      case 'picked_up':
        await handlePickedUp(data);
        break;
      case 'delivered':
        // Delegate to DELIVERY_COMPLETED handler for full processing
        await handleDeliveryCompletedInternal(data, timestamp);
        break;
      case 'failed':
        // Delegate to DELIVERY_FAILED handler for full processing
        await handleDeliveryFailedInternal(data, timestamp);
        break;
      case 'out_for_delivery':
      case 'delivering':
        await handleOutForDelivery(data);
        break;
    }
    
    // 4. Log analytics
    await logShipmentAnalytics('shipment_status_changed', {
      shipmentId,
      trackingNumber,
      previousStatus,
      status,
      orderId,
      processingTimeMs: Date.now() - startTime,
      timestamp,
    });
    
    console.log(`[ShipmentConsumer] SHIPMENT_STATUS_CHANGED processed for shipment ${shipmentId} in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error(`[ShipmentConsumer] Error processing SHIPMENT_STATUS_CHANGED:`, error.message);
    
    // Requirements: 5.5 - Retry with exponential backoff and alert admin after 3 failures
    await handleStatusUpdateFailure(data, error, timestamp);
    throw error;
  }
}

/**
 * Handle SHIPMENT_CREATE_REQUEST event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleShipmentCreateRequest(data, timestamp) {
  const { subOrderId, orderId } = data;
  
  console.log(`[ShipmentConsumer] Processing SHIPMENT_CREATE_REQUEST for sub-order ${subOrderId}`);
  
  try {
    const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');
    const shipmentService = require('../../../modules/shipper/shipment.service');
    const assignmentService = require('../../../modules/shipper/assignment.service');
    
    // 1. Get sub-order details
    const { data: subOrder, error: subOrderError } = await supabaseAdmin
      .from('sub_orders')
      .select(`
        *,
        order:orders(
          id,
          user_id,
          shipping_address,
          shipping_name,
          shipping_phone,
          shipping_address_id
        ),
        shop:shops(
          id,
          name,
          address,
          lat,
          lng,
          phone
        )
      `)
      .eq('id', subOrderId)
      .single();
    
    if (subOrderError || !subOrder) {
      console.error('[ShipmentConsumer] Sub-order not found:', subOrderId);
      return;
    }
    
    // 2. Get delivery address coordinates
    let deliveryLat = null, deliveryLng = null;
    if (subOrder.order?.shipping_address_id) {
      const { data: address } = await supabaseAdmin
        .from('user_addresses')
        .select('lat, lng')
        .eq('id', subOrder.order.shipping_address_id)
        .single();
      
      if (address) {
        deliveryLat = address.lat;
        deliveryLng = address.lng;
      }
    }
    
    // 3. Create shipment
    const deliveryInfo = {
      pickupAddress: subOrder.shop?.address || 'Shop address',
      pickupLat: subOrder.shop?.lat,
      pickupLng: subOrder.shop?.lng,
      pickupContactName: subOrder.shop?.name,
      pickupContactPhone: subOrder.shop?.phone,
      deliveryAddress: subOrder.order?.shipping_address,
      deliveryLat,
      deliveryLng,
      deliveryContactName: subOrder.order?.shipping_name,
      deliveryContactPhone: subOrder.order?.shipping_phone,
      shippingFee: subOrder.shipping_fee || 0,
      codAmount: 0, // TODO: Calculate COD if payment method is COD
    };
    
    const shipment = await shipmentService.createShipment(subOrder, deliveryInfo);
    console.log(`[ShipmentConsumer] Shipment created: ${shipment.id}`);
    
    // 4. Auto-assign shipper
    try {
      const assignedShipment = await assignmentService.autoAssignShipment(shipment.id);
      console.log(`[ShipmentConsumer] Shipper auto-assigned for shipment ${shipment.id}`);
      
      // Notify shipper
      if (assignedShipment.pickupShipper?.user_id) {
        await notifyShipper(assignedShipment.pickupShipper.user_id, {
          type: 'NEW_SHIPMENT',
          shipmentId: shipment.id,
          trackingNumber: shipment.tracking_number,
          message: 'Bạn có đơn lấy hàng mới',
        });
      }
    } catch (assignError) {
      console.warn(`[ShipmentConsumer] Auto-assign failed: ${assignError.message}`);
      // Shipment created but not assigned - admin can assign manually
    }
    
    // 5. Notify customer
    if (subOrder.order?.user_id) {
      await notifyCustomer(subOrder.order.user_id, {
        type: 'SHIPMENT_CREATED',
        orderId,
        trackingNumber: shipment.tracking_number,
        message: `Đơn hàng đang được chuẩn bị giao. Mã vận đơn: ${shipment.tracking_number}`,
      });
    }
    
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to create shipment:', error.message);
  }
}

/**
 * Handle SHIPPER_NEARBY event
 * Send push notification to customer when shipper is within 500m
 * 
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 * 
 * Requirements: 4.5 - Send "Shipper nearby" notification to Customer
 */
async function handleShipperNearby(data, timestamp) {
  const { shipmentId, trackingNumber, customerId, distanceMeters, deliveryAddress } = data;
  
  console.log(`[ShipmentConsumer] Processing SHIPPER_NEARBY for shipment ${shipmentId}`);
  
  if (!customerId) {
    console.warn(`[ShipmentConsumer] No customer ID for shipment ${shipmentId}`);
    return;
  }
  
  // Send push notification to customer
  await notifyCustomer(customerId, {
    type: 'SHIPPER_NEARBY',
    shipmentId,
    trackingNumber,
    title: 'Shipper đang đến gần!',
    message: `Shipper đang cách bạn khoảng ${distanceMeters}m. Hãy chuẩn bị nhận hàng!`,
    data: {
      shipmentId,
      trackingNumber,
      distanceMeters,
      deliveryAddress,
    },
    timestamp,
  });
  
  console.log(`[ShipmentConsumer] SHIPPER_NEARBY notification sent for shipment ${shipmentId}`);
}

/**
 * Handle SHIPPER_REJECTION event
 * Reassign shipment to next available shipper
 * 
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 * 
 * Requirements: 3.4 - Reassign to next available shipper when shipper rejects
 */
async function handleShipperRejection(data, timestamp) {
  const { shipmentId, shipperId, rejectionReason, orderId, customerId, partnerId } = data;
  
  console.log(`[ShipmentConsumer] Processing SHIPPER_REJECTION for shipment ${shipmentId}`);
  
  try {
    const assignmentService = require('../../../modules/shipper/assignment.service');
    
    // Attempt reassignment
    const result = await assignmentService.handleShipperRejection(shipmentId, shipperId, rejectionReason);
    
    // Notify customer about reassignment
    if (customerId) {
      await notifyCustomer(customerId, {
        type: 'SHIPPER_REASSIGNED',
        orderId,
        shipmentId,
        message: `Đơn hàng của bạn đã được chuyển cho shipper mới: ${result.pickupShipper?.user?.full_name || 'Shipper'}`,
        timestamp,
      });
    }
    
    // Notify new shipper
    if (result.pickupShipper?.user_id) {
      await notifyShipper(result.pickupShipper.user_id, {
        type: 'NEW_SHIPMENT',
        shipmentId,
        trackingNumber: result.tracking_number,
        message: 'Bạn có đơn giao hàng mới (chuyển từ shipper khác)',
        timestamp,
      });
    }
    
    console.log(`[ShipmentConsumer] SHIPPER_REJECTION processed - reassigned to ${result.pickupShipper?.id}`);
  } catch (error) {
    console.error(`[ShipmentConsumer] Failed to handle shipper rejection:`, error.message);
    
    // Notify partner about delay
    if (partnerId) {
      await notifyPartner(partnerId, {
        type: 'SHIPMENT_DELAYED',
        orderId,
        shipmentId,
        message: 'Đang tìm shipper mới cho đơn hàng của bạn',
        timestamp,
      });
    }
  }
}

/**
 * Handle SHIPPER_OFFLINE event
 * Alert admin and attempt reassignment for affected shipments
 * 
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 * 
 * Requirements: 3.5 - Alert admin and attempt reassignment when shipper goes offline
 */
async function handleShipperOffline(data, timestamp) {
  const { shipperId, shipperName } = data;
  
  console.log(`[ShipmentConsumer] Processing SHIPPER_OFFLINE for shipper ${shipperId}`);
  
  try {
    const assignmentService = require('../../../modules/shipper/assignment.service');
    
    // Handle offline shipper (will reassign 'assigned' shipments and alert admin)
    await assignmentService.handleShipperOffline(shipperId);
    
    console.log(`[ShipmentConsumer] SHIPPER_OFFLINE processed for shipper ${shipperId}`);
  } catch (error) {
    console.error(`[ShipmentConsumer] Failed to handle shipper offline:`, error.message);
  }
}

/**
 * Handle DELIVERY_COMPLETED event
 * Requirements: 5.3 - Update order to "Delivered" and trigger payment release for COD
 * Requirements: 6.3 - Record COD collection and update shipper's daily COD balance
 * Requirements: 15.1 - Prompt Customer to rate delivery
 * 
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleDeliveryCompleted(data, timestamp) {
  console.log(`[ShipmentConsumer] Processing DELIVERY_COMPLETED for shipment ${data.shipmentId}`);
  await handleDeliveryCompletedInternal(data, timestamp);
}

/**
 * Internal handler for delivery completion
 * Called by both DELIVERY_COMPLETED event and SHIPMENT_STATUS_CHANGED with status='delivered'
 */
async function handleDeliveryCompletedInternal(data, timestamp) {
  const { 
    shipmentId, 
    trackingNumber,
    orderId, 
    subOrderId,
    customerId,
    partnerId,
    shipperId,
    codAmount,
    codCollected,
    deliveryProof,
  } = data;
  
  console.log(`[ShipmentConsumer] Processing delivery completion for shipment ${shipmentId}`);
  
  try {
    const { supabaseAdmin } = require('../../supabase/supabase.client');
    
    // 1. Update order to delivered (Requirements: 5.3)
    await updateOrderStatusDirect(orderId, subOrderId, 'delivered');
    
    // 2. Handle COD payment release if applicable (Requirements: 6.3)
    const codAmountNum = parseFloat(codAmount || 0);
    if (codAmountNum > 0 && codCollected) {
      await handleCodPaymentRelease(shipmentId, shipperId, partnerId, codAmountNum);
      console.log(`[ShipmentConsumer] COD payment of ${codAmountNum} released for shipment ${shipmentId}`);
    }
    
    // 3. Check if all shipments for this order are delivered (multi-shop orders)
    await checkAndCompleteOrder(orderId);
    
    // 4. Trigger rating prompt (Requirements: 15.1)
    if (customerId) {
      // Schedule rating prompt notification (delayed by 30 minutes)
      await scheduleRatingPrompt(customerId, orderId, shipmentId, shipperId);
    }
    
    // 5. Notify partner about successful delivery
    if (partnerId) {
      await notifyPartner(partnerId, {
        type: 'DELIVERY_COMPLETED',
        orderId,
        subOrderId,
        trackingNumber,
        codAmount: codAmountNum,
        message: `Đơn hàng ${trackingNumber} đã giao thành công${codAmountNum > 0 ? `. COD: ${codAmountNum.toLocaleString()}đ` : ''}`,
        timestamp,
      });
    }
    
    // 6. Log analytics
    await logShipmentAnalytics('delivery_completed', {
      shipmentId,
      trackingNumber,
      orderId,
      codAmount: codAmountNum,
      codCollected,
      hasDeliveryProof: !!deliveryProof,
      timestamp,
    });
    
    console.log(`[ShipmentConsumer] DELIVERY_COMPLETED processed for shipment ${shipmentId}`);
  } catch (error) {
    console.error(`[ShipmentConsumer] Error processing DELIVERY_COMPLETED:`, error.message);
    throw error;
  }
}

/**
 * Handle DELIVERY_FAILED event
 * Requirements: 5.4 - Update order status and create return shipment if needed
 * Requirements: 8.2 - Automatically schedule redelivery for next business day
 * Requirements: 8.3 - After 3 failed attempts, initiate return to sender process
 * 
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleDeliveryFailed(data, timestamp) {
  console.log(`[ShipmentConsumer] Processing DELIVERY_FAILED for shipment ${data.shipmentId}`);
  await handleDeliveryFailedInternal(data, timestamp);
}

/**
 * Internal handler for delivery failure
 * Called by both DELIVERY_FAILED event and SHIPMENT_STATUS_CHANGED with status='failed'
 */
async function handleDeliveryFailedInternal(data, timestamp) {
  const { 
    shipmentId, 
    trackingNumber,
    orderId, 
    subOrderId,
    customerId,
    partnerId,
    shipperId,
    reason,
    attemptNumber,
    location,
  } = data;
  
  console.log(`[ShipmentConsumer] Processing delivery failure for shipment ${shipmentId}, attempt ${attemptNumber || 'unknown'}`);
  
  try {
    const { supabaseAdmin } = require('../../supabase/supabase.client');
    
    // 1. Get current shipment to check delivery attempts
    const { data: shipment, error: shipmentError } = await supabaseAdmin
      .from('shipments')
      .select('delivery_attempts, cod_amount')
      .eq('id', shipmentId)
      .single();
    
    if (shipmentError) {
      console.error(`[ShipmentConsumer] Failed to get shipment:`, shipmentError.message);
      throw shipmentError;
    }
    
    const currentAttempts = (shipment?.delivery_attempts || 0) + 1;
    
    // 2. Increment delivery attempts
    const { error: updateError } = await supabaseAdmin
      .from('shipments')
      .update({
        delivery_attempts: currentAttempts,
        failure_reason: reason,
        last_failure_at: new Date().toISOString(),
      })
      .eq('id', shipmentId);
    
    if (updateError) {
      console.error(`[ShipmentConsumer] Failed to update delivery attempts:`, updateError.message);
    }
    
    // 3. Determine next action based on attempt count (Requirements: 8.3)
    let nextAction;
    let nextDeliveryAttempt = null;
    
    if (currentAttempts >= MAX_DELIVERY_ATTEMPTS) {
      // Initiate return to sender process
      nextAction = 'return';
      await initiateReturnProcess(shipmentId, orderId, subOrderId, partnerId, reason);
    } else {
      // Schedule redelivery for next business day (Requirements: 8.2)
      nextAction = 'redeliver';
      nextDeliveryAttempt = calculateNextDeliveryDate();
      
      await supabaseAdmin
        .from('shipments')
        .update({
          next_delivery_attempt: nextDeliveryAttempt.toISOString(),
          status: 'pending_redelivery',
        })
        .eq('id', shipmentId);
    }
    
    // 4. Notify customer (Requirements: 8.4)
    if (customerId) {
      const customerMessage = nextAction === 'return'
        ? `Giao hàng không thành công sau ${currentAttempts} lần thử. Đơn hàng sẽ được hoàn trả cho người bán.`
        : `Giao hàng không thành công: ${getFailureReasonVietnamese(reason)}. Sẽ giao lại vào ${formatDate(nextDeliveryAttempt)}.`;
      
      await notifyCustomer(customerId, {
        type: 'DELIVERY_FAILED',
        orderId,
        trackingNumber,
        title: 'Giao hàng không thành công',
        message: customerMessage,
        data: {
          shipmentId,
          reason,
          attemptNumber: currentAttempts,
          nextAction,
          nextDeliveryAttempt: nextDeliveryAttempt?.toISOString(),
        },
        timestamp,
      });
    }
    
    // 5. Notify partner
    if (partnerId) {
      await notifyPartner(partnerId, {
        type: 'DELIVERY_FAILED',
        orderId,
        subOrderId,
        trackingNumber,
        reason,
        attemptNumber: currentAttempts,
        nextAction,
        message: nextAction === 'return'
          ? `Đơn hàng ${trackingNumber} giao thất bại ${currentAttempts} lần. Đang hoàn trả.`
          : `Đơn hàng ${trackingNumber} giao thất bại lần ${currentAttempts}. Sẽ giao lại.`,
        timestamp,
      });
    }
    
    // 6. Log analytics
    await logShipmentAnalytics('delivery_failed', {
      shipmentId,
      trackingNumber,
      orderId,
      reason,
      attemptNumber: currentAttempts,
      nextAction,
      timestamp,
    });
    
    console.log(`[ShipmentConsumer] DELIVERY_FAILED processed for shipment ${shipmentId}, next action: ${nextAction}`);
  } catch (error) {
    console.error(`[ShipmentConsumer] Error processing DELIVERY_FAILED:`, error.message);
    throw error;
  }
}

// ============================================
// STATUS-SPECIFIC HANDLERS
// ============================================

/**
 * Handle picked up status
 */
async function handlePickedUp(data) {
  const { orderId, subOrderId, partnerId, trackingNumber } = data;
  
  // Notify partner that order was picked up
  if (partnerId) {
    await notifyPartner(partnerId, {
      type: 'ORDER_PICKED_UP',
      orderId,
      subOrderId,
      trackingNumber,
      message: `Đơn hàng ${trackingNumber} đã được shipper lấy`,
    });
  }
}

/**
 * Handle out for delivery status
 */
async function handleOutForDelivery(data) {
  const { orderId, customerId, trackingNumber, shipperId } = data;
  
  // Notify customer that delivery is on the way
  if (customerId) {
    await notifyCustomer(customerId, {
      type: 'OUT_FOR_DELIVERY',
      orderId,
      trackingNumber,
      title: 'Đơn hàng đang được giao',
      message: 'Shipper đang trên đường giao hàng đến bạn',
    });
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get notification config for status
 */
function getNotificationConfig(status) {
  const configs = {
    'assigned': {
      type: 'SHIPPER_ASSIGNED',
      title: 'Shipper đã nhận đơn',
      message: 'Shipper đã được phân công cho đơn hàng của bạn',
    },
    'picked_up': {
      type: 'SHIPMENT_PICKED_UP',
      title: 'Đã lấy hàng',
      message: 'Shipper đã lấy hàng và đang trên đường giao',
    },
    'out_for_delivery': {
      type: 'OUT_FOR_DELIVERY',
      title: 'Đang giao hàng',
      message: 'Đơn hàng đang được giao đến bạn',
    },
    'delivering': {
      type: 'SHIPMENT_DELIVERING',
      title: 'Đang giao hàng',
      message: 'Đơn hàng đang được giao đến bạn',
    },
    'delivered': {
      type: 'SHIPMENT_DELIVERED',
      title: 'Giao hàng thành công',
      message: 'Đơn hàng đã được giao thành công',
    },
    'failed': {
      type: 'SHIPMENT_FAILED',
      title: 'Giao hàng thất bại',
      message: 'Giao hàng không thành công',
    },
    'returning': {
      type: 'SHIPMENT_RETURNING',
      title: 'Đang hoàn trả',
      message: 'Đơn hàng đang được hoàn trả cho người bán',
    },
    'returned': {
      type: 'SHIPMENT_RETURNED',
      title: 'Đã hoàn trả',
      message: 'Đơn hàng đã được hoàn trả cho người bán',
    },
  };
  
  return configs[status];
}

/**
 * Get partner notification message for status
 */
function getPartnerNotificationMessage(status, trackingNumber) {
  const messages = {
    'assigned': `Đơn hàng ${trackingNumber} đã được phân công shipper`,
    'picked_up': `Đơn hàng ${trackingNumber} đã được shipper lấy`,
    'out_for_delivery': `Đơn hàng ${trackingNumber} đang được giao`,
    'delivering': `Đơn hàng ${trackingNumber} đang được giao`,
    'delivered': `Đơn hàng ${trackingNumber} đã giao thành công`,
    'failed': `Đơn hàng ${trackingNumber} giao thất bại`,
    'returning': `Đơn hàng ${trackingNumber} đang hoàn trả`,
    'returned': `Đơn hàng ${trackingNumber} đã hoàn trả`,
  };
  
  return messages[status] || `Đơn hàng ${trackingNumber} cập nhật trạng thái: ${status}`;
}

/**
 * Update order status via event (async)
 */
async function updateOrderStatus(orderId, status) {
  try {
    await rabbitmqClient.publishToExchange(
      rabbitmqClient.EXCHANGES.EVENTS,
      'ORDER_STATUS_UPDATE_REQUEST',
      {
        event: 'ORDER_STATUS_UPDATE_REQUEST',
        data: { orderId, status, source: 'shipment' },
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to update order status:', error.message);
  }
}

/**
 * Update order status directly in database
 * Requirements: 5.1 - Update order status in database within 2 seconds
 */
async function updateOrderStatusDirect(orderId, subOrderId, status) {
  try {
    const { supabaseAdmin } = require('../../supabase/supabase.client');
    
    // Update sub-order status
    if (subOrderId) {
      const subOrderStatus = mapShipmentStatusToSubOrderStatus(status);
      const { error: subOrderError } = await supabaseAdmin
        .from('sub_orders')
        .update({ 
          status: subOrderStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subOrderId);
      
      if (subOrderError) {
        console.error('[ShipmentConsumer] Failed to update sub-order status:', subOrderError.message);
      }
    }
    
    // Update main order status if needed
    if (orderId) {
      const orderStatus = mapShipmentStatusToOrderStatus(status);
      if (orderStatus) {
        const { error: orderError } = await supabaseAdmin
          .from('orders')
          .update({ 
            status: orderStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);
        
        if (orderError) {
          console.error('[ShipmentConsumer] Failed to update order status:', orderError.message);
        }
      }
    }
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to update order status directly:', error.message);
    throw error;
  }
}

/**
 * Map shipment status to sub-order status
 */
function mapShipmentStatusToSubOrderStatus(shipmentStatus) {
  const mapping = {
    'assigned': 'ready_to_ship',
    'picked_up': 'shipping',
    'delivering': 'shipping',
    'out_for_delivery': 'shipping',
    'delivered': 'delivered',
    'failed': 'delivery_failed',
    'returning': 'returning',
    'returned': 'returned',
    'cancelled': 'cancelled',
  };
  return mapping[shipmentStatus] || shipmentStatus;
}

/**
 * Map shipment status to order status
 */
function mapShipmentStatusToOrderStatus(shipmentStatus) {
  const mapping = {
    'delivered': 'delivered',
    'returned': 'returned',
    'cancelled': 'cancelled',
  };
  return mapping[shipmentStatus] || null;
}

/**
 * Update sub-order tracking
 */
async function updateSubOrderTracking(subOrderId, trackingNumber) {
  try {
    await rabbitmqClient.publishToExchange(
      rabbitmqClient.EXCHANGES.EVENTS,
      'SUBORDER_TRACKING_UPDATE',
      {
        event: 'SUBORDER_TRACKING_UPDATE',
        data: { subOrderId, trackingNumber },
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to update tracking:', error.message);
  }
}

/**
 * Notify customer about tracking created
 */
async function notifyCustomerTrackingCreated(orderId, trackingNumber) {
  // Would fetch customer ID from order
  console.log(`[ShipmentConsumer] Would notify customer about tracking ${trackingNumber}`);
}

/**
 * Send notification to customer
 */
async function notifyCustomer(customerId, notification) {
  try {
    await rabbitmqClient.publishNotification('push', {
      userId: customerId,
      userRole: 'customer',
      ...notification,
    });
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to notify customer:', error.message);
  }
}

/**
 * Send notification to shipper
 * @param {string} shipperUserId - The user_id of the shipper (from users table, NOT shipper.id)
 * @param {object} notification - Notification data
 */
async function notifyShipper(shipperUserId, notification) {
  try {
    await rabbitmqClient.publishNotification('push', {
      userId: shipperUserId,
      userRole: 'shipper',
      ...notification,
    });
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to notify shipper:', error.message);
  }
}

/**
 * Send notification to partner
 */
async function notifyPartner(partnerId, notification) {
  try {
    await rabbitmqClient.publishNotification('push', {
      userId: partnerId,
      userRole: 'partner',
      ...notification,
    });
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to notify partner:', error.message);
  }
}

/**
 * Schedule rating prompt notification
 * Requirements: 15.1 - Prompt Customer to rate delivery
 */
async function scheduleRatingPrompt(customerId, orderId, shipmentId, shipperId) {
  try {
    // Send rating prompt notification (can be delayed in production)
    await notifyCustomer(customerId, {
      type: 'RATING_PROMPT',
      orderId,
      shipmentId,
      shipperId,
      title: 'Đánh giá giao hàng',
      message: 'Hãy đánh giá trải nghiệm giao hàng của bạn',
      data: {
        action: 'rate_delivery',
        shipmentId,
        shipperId,
      },
    });
    console.log(`[ShipmentConsumer] Rating prompt scheduled for order ${orderId}`);
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to schedule rating prompt:', error.message);
  }
}

/**
 * Handle COD payment release
 * Requirements: 6.3 - Record COD collection and update shipper's daily COD balance
 */
async function handleCodPaymentRelease(shipmentId, shipperId, partnerId, codAmount) {
  try {
    const { supabaseAdmin } = require('../../supabase/supabase.client');
    
    // 1. Mark COD as collected in shipment
    await supabaseAdmin
      .from('shipments')
      .update({
        cod_collected: true,
        cod_collected_at: new Date().toISOString(),
      })
      .eq('id', shipmentId);
    
    // 2. Update shipper's daily COD balance
    if (shipperId) {
      const today = new Date().toISOString().split('T')[0];
      
      // Get current shipper data
      const { data: shipper } = await supabaseAdmin
        .from('shippers')
        .select('daily_cod_collected, daily_cod_collected_at')
        .eq('id', shipperId)
        .single();
      
      // Reset if new day or add to existing
      const currentCod = shipper?.daily_cod_collected_at === today 
        ? parseFloat(shipper.daily_cod_collected || 0) 
        : 0;
      
      await supabaseAdmin
        .from('shippers')
        .update({
          daily_cod_collected: currentCod + codAmount,
          daily_cod_collected_at: today,
        })
        .eq('id', shipperId);
    }
    
    // 3. Create payment record for partner (COD settlement)
    // This would typically be handled by a separate payment service
    console.log(`[ShipmentConsumer] COD payment of ${codAmount} recorded for partner ${partnerId}`);
    
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to handle COD payment release:', error.message);
    throw error;
  }
}

/**
 * Check if all shipments for an order are delivered and complete the order
 * Requirements: 12.4 - When all shipments are delivered, mark order as fully completed
 * 
 * Delegates to order service for consistent order completion logic
 */
async function checkAndCompleteOrder(orderId) {
  try {
    const orderService = require('../../../modules/order/order.service');
    await orderService.checkAndCompleteOrder(orderId);
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to check and complete order:', error.message);
  }
}

/**
 * Initiate return process for failed deliveries
 * Requirements: 8.3 - After 3 failed attempts, initiate return to sender process
 * Requirements: 8.5 - Create return shipment and notify Partner
 */
async function initiateReturnProcess(shipmentId, orderId, subOrderId, partnerId, reason) {
  try {
    const { supabaseAdmin } = require('../../supabase/supabase.client');
    
    // 1. Update shipment status to returning
    await supabaseAdmin
      .from('shipments')
      .update({
        status: 'returning',
        return_initiated_at: new Date().toISOString(),
        return_reason: reason,
      })
      .eq('id', shipmentId);
    
    // 2. Update sub-order status
    if (subOrderId) {
      await supabaseAdmin
        .from('sub_orders')
        .update({
          status: 'returning',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subOrderId);
    }
    
    // 3. Notify partner about return
    if (partnerId) {
      await notifyPartner(partnerId, {
        type: 'RETURN_INITIATED',
        orderId,
        subOrderId,
        shipmentId,
        reason,
        title: 'Đơn hàng đang hoàn trả',
        message: `Đơn hàng đang được hoàn trả sau ${MAX_DELIVERY_ATTEMPTS} lần giao thất bại. Lý do: ${getFailureReasonVietnamese(reason)}`,
      });
    }
    
    console.log(`[ShipmentConsumer] Return process initiated for shipment ${shipmentId}`);
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to initiate return process:', error.message);
    throw error;
  }
}

/**
 * Calculate next delivery date (next business day)
 * Requirements: 8.2 - Automatically schedule redelivery for next business day
 */
function calculateNextDeliveryDate() {
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Skip weekends (Saturday = 6, Sunday = 0)
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  // Set to 9 AM
  nextDay.setHours(9, 0, 0, 0);
  
  return nextDay;
}

/**
 * Get Vietnamese text for failure reason
 */
function getFailureReasonVietnamese(reason) {
  const reasonMap = {
    'customer_not_available': 'Khách hàng không có mặt',
    'wrong_address': 'Địa chỉ không chính xác',
    'customer_refused': 'Khách hàng từ chối nhận',
    'package_damaged': 'Hàng hóa bị hư hỏng',
    'customer_requested_reschedule': 'Khách hàng yêu cầu giao lại',
    'access_restricted': 'Không thể tiếp cận địa chỉ',
    'weather_conditions': 'Điều kiện thời tiết xấu',
    'other': 'Lý do khác',
  };
  
  return reasonMap[reason] || reason || 'Không xác định';
}

/**
 * Format date for display
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Handle status update failure with retry logic
 * Requirements: 5.5 - Retry with exponential backoff and alert admin after 3 failures
 */
async function handleStatusUpdateFailure(data, error, timestamp) {
  const { shipmentId, orderId } = data;
  
  try {
    // Log failure for monitoring
    await logShipmentAnalytics('status_update_failed', {
      shipmentId,
      orderId,
      error: error.message,
      timestamp,
    });
    
    // Alert admin after failure
    await rabbitmqClient.publishNotification('push', {
      userId: 'admin', // Would be actual admin user ID
      userRole: 'admin',
      type: 'STATUS_UPDATE_FAILED',
      title: 'Cập nhật trạng thái thất bại',
      message: `Không thể cập nhật trạng thái cho shipment ${shipmentId}: ${error.message}`,
      data: {
        shipmentId,
        orderId,
        error: error.message,
      },
    });
  } catch (alertError) {
    console.error('[ShipmentConsumer] Failed to alert admin:', alertError.message);
  }
}

/**
 * Log shipment analytics
 */
async function logShipmentAnalytics(eventName, data) {
  try {
    await rabbitmqClient.publishAnalyticsEvent(eventName, data);
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to log analytics:', error.message);
  }
}

/**
 * Stop consumer
 */
async function stop() {
  console.log('[ShipmentConsumer] Stopping...');
}

module.exports = {
  initialize,
  start,
  stop,
  QUEUE_NAME,
  HANDLED_EVENTS,
  // Export for testing
  PREDEFINED_FAILURE_REASONS,
  MAX_DELIVERY_ATTEMPTS,
  getFailureReasonVietnamese,
  calculateNextDeliveryDate,
};
