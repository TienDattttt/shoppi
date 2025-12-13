/**
 * Chat Cassandra Repository
 * Database operations for chat messages using Cassandra
 */

const cassandraClient = require('./cassandra.client');
const { v4: uuidv4 } = require('uuid');

/**
 * Save a new message to Cassandra
 */
async function saveMessage(message) {
  const messageId = message.id || uuidv4();
  const now = new Date();

  const query = `
    INSERT INTO chat_messages (
      room_id, message_id, sender_id, message_type, content, 
      metadata, is_read, is_deleted, reply_to_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    cassandraClient.types.Uuid.fromString(message.roomId),
    cassandraClient.types.Uuid.fromString(messageId),
    message.senderId ? cassandraClient.types.Uuid.fromString(message.senderId) : null,
    message.messageType || 'text',
    message.content || '',
    JSON.stringify(message.metadata || {}),
    false,
    false,
    message.replyToId ? cassandraClient.types.Uuid.fromString(message.replyToId) : null,
    message.createdAt || now,
    now,
  ];

  await cassandraClient.execute(query, params);

  return {
    id: messageId,
    room_id: message.roomId,
    sender_id: message.senderId,
    message_type: message.messageType || 'text',
    content: message.content,
    metadata: message.metadata || {},
    is_read: false,
    is_deleted: false,
    reply_to_id: message.replyToId,
    created_at: message.createdAt || now,
    updated_at: now,
  };
}

/**
 * Get messages for a room with pagination
 */
async function getMessages(roomId, options = {}) {
  const { limit = 50, before = null } = options;

  let query;
  let params;

  if (before) {
    query = `
      SELECT * FROM chat_messages 
      WHERE room_id = ? AND created_at < ?
      ORDER BY created_at DESC, message_id DESC
      LIMIT ?
    `;
    params = [
      cassandraClient.types.Uuid.fromString(roomId),
      new Date(before),
      limit,
    ];
  } else {
    query = `
      SELECT * FROM chat_messages 
      WHERE room_id = ?
      ORDER BY created_at DESC, message_id DESC
      LIMIT ?
    `;
    params = [
      cassandraClient.types.Uuid.fromString(roomId),
      limit,
    ];
  }

  const result = await cassandraClient.execute(query, params);

  // Transform and reverse to show oldest first
  const messages = result.rows.map(transformMessage).reverse();

  return {
    data: messages,
    pagination: {
      limit,
      hasMore: result.rows.length === limit,
    },
  };
}

/**
 * Get a single message by ID
 */
async function getMessageById(messageId) {
  const query = `
    SELECT * FROM chat_messages 
    WHERE message_id = ?
    LIMIT 1
    ALLOW FILTERING
  `;

  const result = await cassandraClient.execute(query, [
    cassandraClient.types.Uuid.fromString(messageId),
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  return transformMessage(result.rows[0]);
}

/**
 * Mark messages as read
 */
async function markMessagesAsRead(roomId, userId, beforeTime = null) {
  // In Cassandra, we need to update each message individually
  // First get unread messages
  const query = `
    SELECT room_id, created_at, message_id FROM chat_messages 
    WHERE room_id = ? AND is_read = false
    ALLOW FILTERING
  `;

  const result = await cassandraClient.execute(query, [
    cassandraClient.types.Uuid.fromString(roomId),
  ]);

  const now = new Date();
  const updateQuery = `
    UPDATE chat_messages 
    SET is_read = true, read_at = ?, updated_at = ?
    WHERE room_id = ? AND created_at = ? AND message_id = ?
  `;

  // Update each message
  for (const row of result.rows) {
    await cassandraClient.execute(updateQuery, [
      now,
      now,
      row.room_id,
      row.created_at,
      row.message_id,
    ]);
  }

  return result.rows.length;
}

/**
 * Soft delete a message
 */
async function deleteMessage(roomId, messageId, createdAt) {
  const now = new Date();

  const query = `
    UPDATE chat_messages 
    SET is_deleted = true, deleted_at = ?, content = null, updated_at = ?
    WHERE room_id = ? AND created_at = ? AND message_id = ?
  `;

  await cassandraClient.execute(query, [
    now,
    now,
    cassandraClient.types.Uuid.fromString(roomId),
    new Date(createdAt),
    cassandraClient.types.Uuid.fromString(messageId),
  ]);
}

/**
 * Get unread message count for a room
 */
async function getUnreadCount(roomId, userId) {
  const query = `
    SELECT COUNT(*) as count FROM chat_messages 
    WHERE room_id = ? AND is_read = false AND sender_id != ?
    ALLOW FILTERING
  `;

  const result = await cassandraClient.execute(query, [
    cassandraClient.types.Uuid.fromString(roomId),
    cassandraClient.types.Uuid.fromString(userId),
  ]);

  return result.rows[0]?.count?.toNumber() || 0;
}

/**
 * Transform Cassandra row to message object
 */
function transformMessage(row) {
  return {
    id: cassandraClient.uuidToString(row.message_id),
    room_id: cassandraClient.uuidToString(row.room_id),
    sender_id: cassandraClient.uuidToString(row.sender_id),
    message_type: row.message_type,
    content: row.is_deleted ? null : row.content,
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
    is_read: row.is_read,
    read_at: row.read_at,
    is_deleted: row.is_deleted,
    deleted_at: row.deleted_at,
    reply_to_id: cassandraClient.uuidToString(row.reply_to_id),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  saveMessage,
  getMessages,
  getMessageById,
  markMessagesAsRead,
  deleteMessage,
  getUnreadCount,
};
