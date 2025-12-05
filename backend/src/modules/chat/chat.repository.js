/**
 * Chat Repository
 * Database operations for chat rooms and messages
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { AppError } = require('../../shared/utils/error.util');

/**
 * Create or get existing chat room between customer and partner
 */
async function createOrGetChatRoom(customerId, partnerId, productId = null, orderId = null) {
  // First try to get existing room
  const { data: existingRoom, error: findError } = await supabaseAdmin
    .from('chat_rooms')
    .select('*')
    .eq('customer_id', customerId)
    .eq('partner_id', partnerId)
    .single();

  if (existingRoom) {
    return existingRoom;
  }

  // Create new room if not exists
  const { data: newRoom, error: createError } = await supabaseAdmin
    .from('chat_rooms')
    .insert({
      customer_id: customerId,
      partner_id: partnerId,
      product_id: productId,
      order_id: orderId,
    })
    .select()
    .single();

  if (createError) {
    throw new AppError(`Failed to create chat room: ${createError.message}`, 500);
  }

  return newRoom;
}

/**
 * Get chat rooms for a user
 */
async function getChatRooms(userId, options = {}) {
  const { page = 1, limit = 20, status = 'active' } = options;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('chat_rooms')
    .select(`
      *,
      customer:users!customer_id(id, full_name, avatar_url),
      partner:users!partner_id(id, full_name, avatar_url, shop_name),
      product:products(id, name, images),
      order:orders(id, order_number, status)
    `, { count: 'exact' })
    .or(`customer_id.eq.${userId},partner_id.eq.${userId}`)
    .eq('status', status)
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new AppError(`Failed to get chat rooms: ${error.message}`, 500);
  }

  return {
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    },
  };
}

/**
 * Get chat room by ID
 */
async function getChatRoomById(roomId, userId) {
  const { data, error } = await supabaseAdmin
    .from('chat_rooms')
    .select(`
      *,
      customer:users!customer_id(id, full_name, avatar_url),
      partner:users!partner_id(id, full_name, avatar_url, shop_name),
      product:products(id, name, images),
      order:orders(id, order_number, status)
    `)
    .eq('id', roomId)
    .or(`customer_id.eq.${userId},partner_id.eq.${userId}`)
    .single();

  if (error || !data) {
    throw new AppError('Chat room not found or access denied', 404);
  }

  return data;
}

/**
 * Send message to chat room
 */
async function sendMessage(roomId, senderId, messageType, content, metadata = {}, replyToId = null) {
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      room_id: roomId,
      sender_id: senderId,
      message_type: messageType,
      content,
      metadata,
      reply_to_id: replyToId,
    })
    .select(`
      *,
      sender:users(id, full_name, avatar_url),
      reply_to:chat_messages(id, content, sender:users(full_name))
    `)
    .single();

  if (error) {
    throw new AppError(`Failed to send message: ${error.message}`, 500);
  }

  // Update unread count for the other user
  await updateUnreadCount(roomId, senderId);

  return data;
}

/**
 * Get messages in a chat room
 */
async function getMessages(roomId, userId, options = {}) {
  const { page = 1, limit = 50, before = null } = options;
  const offset = (page - 1) * limit;

  // Verify user has access to this room
  await getChatRoomById(roomId, userId);

  let query = supabaseAdmin
    .from('chat_messages')
    .select(`
      *,
      sender:users(id, full_name, avatar_url),
      reply_to:chat_messages(id, content, sender:users(full_name))
    `, { count: 'exact' })
    .eq('room_id', roomId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new AppError(`Failed to get messages: ${error.message}`, 500);
  }

  return {
    data: (data || []).reverse(), // Reverse to show oldest first
    pagination: {
      page,
      limit,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    },
  };
}

/**
 * Mark messages as read
 */
async function markMessagesAsRead(roomId, userId) {
  // Update messages
  const { error: updateError } = await supabaseAdmin
    .from('chat_messages')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('room_id', roomId)
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (updateError) {
    throw new AppError(`Failed to mark messages as read: ${updateError.message}`, 500);
  }

  // Reset unread count for this user
  const { data: room } = await supabaseAdmin
    .from('chat_rooms')
    .select('customer_id, partner_id')
    .eq('id', roomId)
    .single();

  if (room) {
    const updateField = room.customer_id === userId ? 'customer_unread_count' : 'partner_unread_count';
    
    await supabaseAdmin
      .from('chat_rooms')
      .update({ [updateField]: 0 })
      .eq('id', roomId);
  }
}

/**
 * Update unread count when new message is sent
 */
async function updateUnreadCount(roomId, senderId) {
  const { data: room } = await supabaseAdmin
    .from('chat_rooms')
    .select('customer_id, partner_id, customer_unread_count, partner_unread_count')
    .eq('id', roomId)
    .single();

  if (room) {
    if (room.customer_id === senderId) {
      // Customer sent message, increment partner's unread count
      await supabaseAdmin
        .from('chat_rooms')
        .update({ partner_unread_count: (room.partner_unread_count || 0) + 1 })
        .eq('id', roomId);
    } else {
      // Partner sent message, increment customer's unread count
      await supabaseAdmin
        .from('chat_rooms')
        .update({ customer_unread_count: (room.customer_unread_count || 0) + 1 })
        .eq('id', roomId);
    }
  }
}

/**
 * Delete message (soft delete)
 */
async function deleteMessage(messageId, userId) {
  // First verify the user owns this message
  const { data: message, error: findError } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('id', messageId)
    .single();

  if (findError || !message) {
    throw new AppError('Message not found', 404);
  }

  if (message.sender_id !== userId) {
    throw new AppError('You can only delete your own messages', 403);
  }

  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      content: null,
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to delete message: ${error.message}`, 500);
  }

  return data;
}

/**
 * Update chat room status
 */
async function updateChatRoomStatus(roomId, userId, status) {
  // Verify user is a participant
  const { data: room, error: findError } = await supabaseAdmin
    .from('chat_rooms')
    .select('*')
    .eq('id', roomId)
    .or(`customer_id.eq.${userId},partner_id.eq.${userId}`)
    .single();

  if (findError || !room) {
    throw new AppError('Chat room not found or access denied', 404);
  }

  const { data, error } = await supabaseAdmin
    .from('chat_rooms')
    .update({ status })
    .eq('id', roomId)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to update chat room status: ${error.message}`, 500);
  }

  return data;
}

/**
 * Get unread message count for user
 */
async function getUnreadCount(userId) {
  const { data, error } = await supabaseAdmin
    .from('chat_rooms')
    .select('customer_id, partner_id, customer_unread_count, partner_unread_count')
    .or(`customer_id.eq.${userId},partner_id.eq.${userId}`)
    .eq('status', 'active');

  if (error) {
    throw new AppError(`Failed to get unread count: ${error.message}`, 500);
  }

  let totalUnread = 0;
  data?.forEach(room => {
    if (room.customer_id === userId) {
      totalUnread += room.customer_unread_count || 0;
    } else {
      totalUnread += room.partner_unread_count || 0;
    }
  });

  return totalUnread;
}

/**
 * Get message by ID
 */
async function getMessageById(messageId) {
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .select(`
      *,
      sender:users(id, full_name, avatar_url)
    `)
    .eq('id', messageId)
    .single();

  if (error || !data) {
    throw new AppError('Message not found', 404);
  }

  return data;
}

module.exports = {
  createOrGetChatRoom,
  getChatRooms,
  getChatRoomById,
  sendMessage,
  getMessages,
  markMessagesAsRead,
  deleteMessage,
  updateChatRoomStatus,
  getUnreadCount,
  getMessageById,
};
