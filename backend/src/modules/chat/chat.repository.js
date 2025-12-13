/**
 * Chat Repository
 * Database operations for chat rooms (PostgreSQL) and messages (Cassandra)
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const cassandraClient = require('../../shared/cassandra/cassandra.client');
const chatCassandraRepo = require('../../shared/cassandra/chat.cassandra.repository');
const { AppError } = require('../../shared/utils/error.util');
const { v4: uuidv4 } = require('uuid');

// Flag to check if Cassandra is available
let cassandraAvailable = false;

/**
 * Initialize Cassandra connection
 */
async function initCassandra() {
  try {
    await cassandraClient.connect();
    cassandraAvailable = true;
    console.log('[ChatRepository] Cassandra initialized for messages');
  } catch (error) {
    console.warn('[ChatRepository] Cassandra not available, falling back to PostgreSQL:', error.message);
    cassandraAvailable = false;
  }
}

// Initialize on module load
initCassandra().catch(() => {});

/**
 * Create or get existing chat room between customer and partner
 */
async function createOrGetChatRoom(customerId, partnerId, productId = null, orderId = null) {
  // First try to get existing room
  const { data: existingRoom } = await supabaseAdmin
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
    .select('*', { count: 'exact' })
    .or(`customer_id.eq.${userId},partner_id.eq.${userId}`)
    .eq('status', status)
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: rooms, error, count } = await query;

  if (error) {
    throw new AppError(`Failed to get chat rooms: ${error.message}`, 500);
  }

  // Enrich with user data
  const data = await Promise.all((rooms || []).map(async (room) => {
    const { data: customer } = await supabaseAdmin
      .from('users')
      .select('id, full_name, avatar_url')
      .eq('id', room.customer_id)
      .single();

    const { data: partner } = await supabaseAdmin
      .from('users')
      .select('id, full_name, avatar_url, business_name')
      .eq('id', room.partner_id)
      .single();

    return { ...room, customer, partner };
  }));

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
  const { data: room, error } = await supabaseAdmin
    .from('chat_rooms')
    .select('*')
    .eq('id', roomId)
    .or(`customer_id.eq.${userId},partner_id.eq.${userId}`)
    .single();

  if (error || !room) {
    throw new AppError('Chat room not found or access denied', 404);
  }

  const { data: customer } = await supabaseAdmin
    .from('users')
    .select('id, full_name, avatar_url')
    .eq('id', room.customer_id)
    .single();

  const { data: partner } = await supabaseAdmin
    .from('users')
    .select('id, full_name, avatar_url, business_name')
    .eq('id', room.partner_id)
    .single();

  return { ...room, customer, partner };
}

/**
 * Send message to chat room - uses Cassandra if available
 */
async function sendMessage(roomId, senderId, messageType, content, metadata = {}, replyToId = null) {
  const messageId = uuidv4();
  const now = new Date();

  let messageData;

  if (cassandraAvailable) {
    // Save to Cassandra
    const savedMessage = await chatCassandraRepo.saveMessage({
      id: messageId,
      roomId,
      senderId,
      messageType,
      content,
      metadata,
      replyToId,
      createdAt: now,
    });

    // Get sender info from PostgreSQL
    const { data: sender } = await supabaseAdmin
      .from('users')
      .select('id, full_name, avatar_url')
      .eq('id', senderId)
      .single();

    messageData = {
      id: savedMessage.id,
      room_id: savedMessage.room_id,
      sender_id: savedMessage.sender_id,
      message_type: savedMessage.message_type,
      content: savedMessage.content,
      metadata: savedMessage.metadata,
      is_read: savedMessage.is_read,
      is_deleted: savedMessage.is_deleted,
      reply_to_id: savedMessage.reply_to_id,
      created_at: savedMessage.created_at,
      updated_at: savedMessage.updated_at,
      sender,
    };
  } else {
    // Fallback to PostgreSQL
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

    messageData = data;
  }

  // Update room's last_message_at and unread count
  await updateRoomLastMessage(roomId, now);
  await updateUnreadCount(roomId, senderId);

  return messageData;
}

/**
 * Update room's last message timestamp
 */
async function updateRoomLastMessage(roomId, timestamp) {
  await supabaseAdmin
    .from('chat_rooms')
    .update({ last_message_at: timestamp.toISOString() })
    .eq('id', roomId);
}

/**
 * Get messages in a chat room - uses Cassandra if available
 */
async function getMessages(roomId, userId, options = {}) {
  const { limit = 50, before = null } = options;

  // Verify user has access to this room
  await getChatRoomById(roomId, userId);

  if (cassandraAvailable) {
    const result = await chatCassandraRepo.getMessages(roomId, { limit, before });
    
    // Enrich with sender info
    const messagesWithSender = await Promise.all(
      result.data.map(async (msg) => {
        if (msg.sender_id) {
          const { data: sender } = await supabaseAdmin
            .from('users')
            .select('id, full_name, avatar_url')
            .eq('id', msg.sender_id)
            .single();
          return { ...msg, sender };
        }
        return msg;
      })
    );

    return {
      data: messagesWithSender,
      pagination: result.pagination,
    };
  }

  // Fallback to PostgreSQL
  const { page = 1 } = options;
  const offset = (page - 1) * limit;

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
    data: (data || []).reverse(),
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
  if (cassandraAvailable) {
    await chatCassandraRepo.markMessagesAsRead(roomId, userId);
  } else {
    await supabaseAdmin
      .from('chat_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('room_id', roomId)
      .neq('sender_id', userId)
      .eq('is_read', false);
  }

  // Reset unread count in PostgreSQL
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
      await supabaseAdmin
        .from('chat_rooms')
        .update({ partner_unread_count: (room.partner_unread_count || 0) + 1 })
        .eq('id', roomId);
    } else {
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
  if (cassandraAvailable) {
    const message = await chatCassandraRepo.getMessageById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }
    if (message.sender_id !== userId) {
      throw new AppError('You can only delete your own messages', 403);
    }
    await chatCassandraRepo.deleteMessage(message.room_id, messageId, message.created_at);
    return message;
  }

  // Fallback to PostgreSQL
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
  if (cassandraAvailable) {
    const message = await chatCassandraRepo.getMessageById(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }
    
    // Get sender info
    if (message.sender_id) {
      const { data: sender } = await supabaseAdmin
        .from('users')
        .select('id, full_name, avatar_url')
        .eq('id', message.sender_id)
        .single();
      message.sender = sender;
    }
    
    return message;
  }

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
  initCassandra,
};
