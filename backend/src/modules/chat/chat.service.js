/**
 * Chat Service
 * Business logic for chat functionality
 */

const chatRepository = require('./chat.repository');
const storageClient = require('../../shared/supabase/storage.client');
const realtimeClient = require('../../shared/supabase/realtime.client');
const chatValidator = require('./chat.validator');
const chatDto = require('./chat.dto');
const { AppError } = require('../../shared/utils/error.util');

// Chat storage bucket
const CHAT_BUCKET = 'chat';

/**
 * Start or get chat with partner
 */
async function startChat(customerId, partnerId, productId = null, orderId = null) {
  const room = await chatRepository.createOrGetChatRoom(customerId, partnerId, productId, orderId);
  return room;
}

/**
 * Get user's chat rooms
 */
async function getChatRooms(userId, options = {}) {
  return chatRepository.getChatRooms(userId, options);
}

/**
 * Get chat room details
 */
async function getChatRoom(roomId, userId) {
  return chatRepository.getChatRoomById(roomId, userId);
}

/**
 * Send text message
 */
async function sendTextMessage(roomId, senderId, content, replyToId = null) {
  // Validate content
  chatValidator.validateMessageContent(content);

  const message = await chatRepository.sendMessage(
    roomId,
    senderId,
    'text',
    content.trim(),
    {},
    replyToId
  );

  // Broadcast message via realtime
  await broadcastMessage(roomId, message);

  return message;
}

/**
 * Send image message
 */
async function sendImageMessage(roomId, senderId, imageFile, caption = '') {
  // Validate image file
  chatValidator.validateImageFile(imageFile);

  // Upload image to storage
  const imagePath = `${roomId}/${Date.now()}_${imageFile.originalname}`;
  const { url } = await storageClient.uploadFile(CHAT_BUCKET, imagePath, imageFile.buffer, {
    contentType: imageFile.mimetype,
  });

  const metadata = chatDto.toImageMetadataDto(imageFile, url);

  const message = await chatRepository.sendMessage(
    roomId,
    senderId,
    'image',
    caption,
    metadata
  );

  // Broadcast message via realtime
  await broadcastMessage(roomId, message);

  return message;
}

/**
 * Send product message (share product in chat)
 */
async function sendProductMessage(roomId, senderId, productId, messageText = '') {
  const metadata = chatDto.toProductMetadataDto(productId);

  const message = await chatRepository.sendMessage(
    roomId,
    senderId,
    'product',
    messageText,
    metadata
  );

  // Broadcast message via realtime
  await broadcastMessage(roomId, message);

  return message;
}

/**
 * Send order message (share order in chat)
 */
async function sendOrderMessage(roomId, senderId, orderId, messageText = '') {
  const metadata = chatDto.toOrderMetadataDto(orderId);

  const message = await chatRepository.sendMessage(
    roomId,
    senderId,
    'order',
    messageText,
    metadata
  );

  // Broadcast message via realtime
  await broadcastMessage(roomId, message);

  return message;
}

/**
 * Send system message (automated messages)
 */
async function sendSystemMessage(roomId, messageType, content, metadata = {}) {
  // System messages need a special sender - use null or a system user ID
  // For now, we'll skip the sender validation in repository for system messages
  const message = await chatRepository.sendMessage(
    roomId,
    null, // System messages have no sender
    'system',
    content,
    { type: messageType, ...metadata }
  );

  // Broadcast message via realtime
  await broadcastMessage(roomId, message);

  return message;
}

/**
 * Get messages in chat room
 */
async function getMessages(roomId, userId, options = {}) {
  return chatRepository.getMessages(roomId, userId, options);
}

/**
 * Mark messages as read
 */
async function markAsRead(roomId, userId) {
  await chatRepository.markMessagesAsRead(roomId, userId);
  
  // Broadcast read status via realtime
  await broadcastReadStatus(roomId, userId);
}

/**
 * Delete message
 */
async function deleteMessage(messageId, userId) {
  const message = await chatRepository.deleteMessage(messageId, userId);
  
  // Broadcast deletion via realtime
  await broadcastMessageDeletion(message.room_id, messageId);
  
  return message;
}

/**
 * Close chat room
 */
async function closeChatRoom(roomId, userId) {
  return chatRepository.updateChatRoomStatus(roomId, userId, 'closed');
}

/**
 * Archive chat room
 */
async function archiveChatRoom(roomId, userId) {
  return chatRepository.updateChatRoomStatus(roomId, userId, 'archived');
}

/**
 * Reopen chat room
 */
async function reopenChatRoom(roomId, userId) {
  return chatRepository.updateChatRoomStatus(roomId, userId, 'active');
}

/**
 * Get unread message count
 */
async function getUnreadCount(userId) {
  return chatRepository.getUnreadCount(userId);
}

// ==================== REALTIME FUNCTIONS ====================

// Store active broadcast channels
const activeChannels = new Map();

/**
 * Get or create broadcast channel for a room
 */
function getOrCreateRoomChannel(roomId) {
  const channelKey = `chat_room_${roomId}`;
  
  if (!activeChannels.has(channelKey)) {
    const subscriptionId = realtimeClient.createBroadcastChannel(channelKey, () => {
      // This callback handles incoming broadcasts - mainly for server-side logging
    });
    activeChannels.set(channelKey, subscriptionId);
  }
  
  return activeChannels.get(channelKey);
}

/**
 * Broadcast message to room participants via realtime
 */
async function broadcastMessage(roomId, message) {
  try {
    const subscriptionId = getOrCreateRoomChannel(roomId);
    const payload = chatDto.toRealtimeMessageDto(message);
    
    console.log(`[Chat] Broadcasting message to channel: ${subscriptionId}`, { 
      roomId, 
      messageId: message.id,
      senderId: message.sender_id 
    });
    
    await realtimeClient.broadcast(subscriptionId, 'new_message', payload);
    console.log(`[Chat] Broadcast successful for room: ${roomId}`);
  } catch (error) {
    console.error('[Chat] Failed to broadcast message:', error);
    // Don't throw error as message was already saved
  }
}

/**
 * Broadcast read status
 */
async function broadcastReadStatus(roomId, userId) {
  try {
    const subscriptionId = getOrCreateRoomChannel(roomId);
    const payload = chatDto.toRealtimeReadStatusDto(userId);
    
    await realtimeClient.broadcast(subscriptionId, 'messages_read', payload);
  } catch (error) {
    console.error('Failed to broadcast read status:', error);
  }
}

/**
 * Broadcast message deletion
 */
async function broadcastMessageDeletion(roomId, messageId) {
  try {
    const subscriptionId = getOrCreateRoomChannel(roomId);
    const payload = chatDto.toRealtimeMessageDeletionDto(messageId);
    
    await realtimeClient.broadcast(subscriptionId, 'message_deleted', payload);
  } catch (error) {
    console.error('Failed to broadcast message deletion:', error);
  }
}

/**
 * Send typing indicator
 */
async function sendTypingIndicator(roomId, userId, isTyping) {
  try {
    const subscriptionId = getOrCreateRoomChannel(roomId);
    const payload = chatDto.toTypingIndicatorDto(userId, isTyping);
    
    await realtimeClient.broadcast(subscriptionId, 'user_typing', payload);
  } catch (error) {
    console.error('Failed to send typing indicator:', error);
  }
}

/**
 * Subscribe to chat room updates (for server-side use)
 */
function subscribeToChatRoom(roomId, callbacks) {
  const channelKey = `chat_room_${roomId}`;
  
  const subscriptionId = realtimeClient.createBroadcastChannel(channelKey, (event) => {
    switch (event.event) {
      case 'new_message':
        if (callbacks.onNewMessage) {
          callbacks.onNewMessage(event.payload.message);
        }
        break;
      case 'messages_read':
        if (callbacks.onMessagesRead) {
          callbacks.onMessagesRead(event.payload.userId);
        }
        break;
      case 'message_deleted':
        if (callbacks.onMessageDeleted) {
          callbacks.onMessageDeleted(event.payload.messageId);
        }
        break;
      case 'user_typing':
        if (callbacks.onUserTyping) {
          callbacks.onUserTyping(event.payload.userId, event.payload.isTyping);
        }
        break;
    }
  });

  return subscriptionId;
}

/**
 * Unsubscribe from chat room
 */
async function unsubscribeFromChatRoom(subscriptionId) {
  await realtimeClient.unsubscribe(subscriptionId);
}

/**
 * Clean up room channel
 */
async function cleanupRoomChannel(roomId) {
  const channelKey = `chat_room_${roomId}`;
  const subscriptionId = activeChannels.get(channelKey);
  
  if (subscriptionId) {
    await realtimeClient.unsubscribe(subscriptionId);
    activeChannels.delete(channelKey);
  }
}

module.exports = {
  // Chat operations
  startChat,
  getChatRooms,
  getChatRoom,
  sendTextMessage,
  sendImageMessage,
  sendProductMessage,
  sendOrderMessage,
  sendSystemMessage,
  getMessages,
  markAsRead,
  deleteMessage,
  closeChatRoom,
  archiveChatRoom,
  reopenChatRoom,
  getUnreadCount,
  
  // Realtime operations
  sendTypingIndicator,
  subscribeToChatRoom,
  unsubscribeFromChatRoom,
  cleanupRoomChannel,
};
