/**
 * Chat Validators
 * Validates request data for chat operations
 */

const { z } = require('zod');

const uuidSchema = z.string().uuid('Invalid UUID format');

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_MESSAGE_LENGTH = 1000;

/**
 * Validate start chat request
 */
function validateStartChat(data) {
  const schema = z.object({
    customerId: uuidSchema,
    partnerId: uuidSchema,
    productId: uuidSchema.optional().nullable(),
    orderId: uuidSchema.optional().nullable(),
  });

  return schema.parse(data);
}

/**
 * Validate get chat rooms query
 */
function validateGetChatRooms(data) {
  const schema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    status: z.enum(['active', 'closed', 'archived']).default('active'),
  });

  return schema.parse(data);
}

/**
 * Validate room ID
 */
function validateRoomId(data) {
  const schema = z.object({
    roomId: uuidSchema,
  });

  return schema.parse(data);
}

/**
 * Validate message ID
 */
function validateMessageId(data) {
  const schema = z.object({
    messageId: uuidSchema,
  });

  return schema.parse(data);
}

/**
 * Validate send message request
 */
function validateSendMessage(data) {
  const schema = z.object({
    roomId: uuidSchema,
    content: z
      .string()
      .min(1, 'Message cannot be empty')
      .max(MAX_MESSAGE_LENGTH, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`)
      .refine(
        (val) => val.trim().length > 0,
        'Message cannot be empty or whitespace only'
      ),
    replyToId: uuidSchema.optional().nullable(),
  });

  return schema.parse(data);
}

/**
 * Validate message content only
 */
function validateMessageContent(content) {
  const schema = z
    .string()
    .min(1, 'Message cannot be empty')
    .max(MAX_MESSAGE_LENGTH, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`)
    .refine(
      (val) => val.trim().length > 0,
      'Message cannot be empty or whitespace only'
    );

  return schema.parse(content);
}

/**
 * Validate send image request
 */
function validateSendImage(data) {
  const schema = z.object({
    roomId: uuidSchema,
    caption: z.string().max(200, 'Caption cannot exceed 200 characters').default(''),
  });

  return schema.parse(data);
}

/**
 * Validate image file
 */
function validateImageFile(file) {
  if (!file) {
    throw new Error('Image file is required');
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`File size exceeds ${MAX_IMAGE_SIZE / (1024 * 1024)}MB limit`);
  }

  return true;
}

/**
 * Validate send product request
 */
function validateSendProduct(data) {
  const schema = z.object({
    roomId: uuidSchema,
    productId: uuidSchema,
    message: z.string().max(200, 'Message cannot exceed 200 characters').default(''),
  });

  return schema.parse(data);
}

/**
 * Validate send order request
 */
function validateSendOrder(data) {
  const schema = z.object({
    roomId: uuidSchema,
    orderId: uuidSchema,
    message: z.string().max(200, 'Message cannot exceed 200 characters').default(''),
  });

  return schema.parse(data);
}

/**
 * Validate get messages query
 */
function validateGetMessages(data) {
  const schema = z.object({
    roomId: uuidSchema,
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(50),
    before: z.string().datetime().optional().nullable(),
  });

  return schema.parse(data);
}

/**
 * Validate typing indicator
 */
function validateTyping(data) {
  const schema = z.object({
    roomId: uuidSchema,
    isTyping: z.boolean().default(true),
  });

  return schema.parse(data);
}

/**
 * Validate room status update
 */
function validateRoomStatus(data) {
  const schema = z.object({
    roomId: uuidSchema,
    status: z.enum(['active', 'closed', 'archived']),
  });

  return schema.parse(data);
}

module.exports = {
  validateStartChat,
  validateGetChatRooms,
  validateRoomId,
  validateMessageId,
  validateSendMessage,
  validateMessageContent,
  validateSendImage,
  validateImageFile,
  validateSendProduct,
  validateSendOrder,
  validateGetMessages,
  validateTyping,
  validateRoomStatus,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  MAX_MESSAGE_LENGTH,
};
