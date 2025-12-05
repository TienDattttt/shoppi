/**
 * Chat Data Transfer Objects
 * Handles data transformation for API responses
 */

/**
 * Transform chat room to response DTO
 */
function toChatRoomDto(room, currentUserId = null) {
  const userId = currentUserId || room.customer_id;
  const isCustomer = room.customer_id === userId;
  
  return {
    id: room.id,
    customerId: room.customer_id,
    partnerId: room.partner_id,
    productId: room.product_id,
    orderId: room.order_id,
    status: room.status,
    lastMessageAt: room.last_message_at,
    unreadCount: isCustomer 
      ? room.customer_unread_count || 0
      : room.partner_unread_count || 0,
    participant: {
      id: isCustomer ? room.partner?.id : room.customer?.id,
      name: isCustomer 
        ? (room.partner?.shop_name || room.partner?.full_name) 
        : room.customer?.full_name,
      avatar: isCustomer ? room.partner?.avatar_url : room.customer?.avatar_url,
      isPartner: isCustomer,
    },
    product: room.product ? {
      id: room.product.id,
      name: room.product.name,
      image: room.product.images?.[0] || null,
    } : null,
    order: room.order ? {
      id: room.order.id,
      orderNumber: room.order.order_number,
      status: room.order.status,
    } : null,
    createdAt: room.created_at,
    updatedAt: room.updated_at,
  };
}

/**
 * Transform message to response DTO
 */
function toMessageDto(message) {
  return {
    id: message.id,
    roomId: message.room_id,
    senderId: message.sender_id,
    messageType: message.message_type,
    content: message.is_deleted ? null : message.content,
    metadata: message.metadata || {},
    isRead: message.is_read,
    readAt: message.read_at,
    isDeleted: message.is_deleted,
    deletedAt: message.deleted_at,
    sender: message.sender ? {
      id: message.sender.id,
      name: message.sender.full_name,
      avatar: message.sender.avatar_url,
    } : null,
    replyTo: message.reply_to ? {
      id: message.reply_to.id,
      content: message.reply_to.content,
      senderName: message.reply_to.sender?.full_name || null,
    } : null,
    createdAt: message.created_at,
    updatedAt: message.updated_at,
  };
}

/**
 * Transform chat room list to paginated response
 */
function toChatRoomListDto(result, currentUserId) {
  return {
    data: result.data.map(room => toChatRoomDto(room, currentUserId)),
    pagination: result.pagination,
  };
}

/**
 * Transform message list to paginated response
 */
function toMessageListDto(result) {
  return {
    data: result.data.map(message => toMessageDto(message)),
    pagination: result.pagination,
  };
}

/**
 * Transform start chat request from DTO
 */
function fromStartChatDto(data) {
  return {
    partnerId: data.partnerId,
    productId: data.productId || null,
    orderId: data.orderId || null,
  };
}

/**
 * Transform send message request from DTO
 */
function fromSendMessageDto(data) {
  return {
    content: data.content?.trim(),
    replyToId: data.replyToId || null,
  };
}

/**
 * Transform image metadata to DTO
 */
function toImageMetadataDto(file, url) {
  return {
    imageUrl: url,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
  };
}

/**
 * Transform product metadata to DTO
 */
function toProductMetadataDto(productId) {
  return {
    productId,
  };
}

/**
 * Transform order metadata to DTO
 */
function toOrderMetadataDto(orderId) {
  return {
    orderId,
  };
}

/**
 * Transform unread count response
 */
function toUnreadCountDto(count) {
  return {
    unreadCount: count,
  };
}

/**
 * Transform typing indicator payload
 */
function toTypingIndicatorDto(userId, isTyping) {
  return {
    userId,
    isTyping,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Transform realtime message event payload
 */
function toRealtimeMessageDto(message) {
  return {
    message: toMessageDto(message),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Transform realtime read status payload
 */
function toRealtimeReadStatusDto(userId) {
  return {
    userId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Transform realtime message deletion payload
 */
function toRealtimeMessageDeletionDto(messageId) {
  return {
    messageId,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  toChatRoomDto,
  toMessageDto,
  toChatRoomListDto,
  toMessageListDto,
  fromStartChatDto,
  fromSendMessageDto,
  toImageMetadataDto,
  toProductMetadataDto,
  toOrderMetadataDto,
  toUnreadCountDto,
  toTypingIndicatorDto,
  toRealtimeMessageDto,
  toRealtimeReadStatusDto,
  toRealtimeMessageDeletionDto,
};
