/**
 * Chat Controller
 * Handles HTTP requests for chat operations
 */

const chatService = require('./chat.service');
const chatValidator = require('./chat.validator');
const chatDto = require('./chat.dto');
const responseUtil = require('../../shared/utils/response.util');
const { AppError, ValidationError } = require('../../shared/utils/error.util');

/**
 * Start or get chat with partner
 * POST /api/chat/start
 */
async function startChat(req, res) {
  try {
    const customerId = req.user.userId;
    const { partnerId, productId, orderId } = req.body;

    const validatedData = chatValidator.validateStartChat({
      customerId,
      partnerId,
      productId,
      orderId,
    });

    const room = await chatService.startChat(
      validatedData.customerId,
      validatedData.partnerId,
      validatedData.productId,
      validatedData.orderId
    );

    const responseData = chatDto.toChatRoomDto(room, customerId);
    return responseUtil.sendCreated(res, responseData);
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Get user's chat rooms
 * GET /api/chat/rooms
 */
async function getChatRooms(req, res) {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, status = 'active' } = req.query;

    const validatedQuery = chatValidator.validateGetChatRooms({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
    });

    const result = await chatService.getChatRooms(userId, validatedQuery);
    const responseData = chatDto.toChatRoomListDto(result, userId);

    return responseUtil.sendSuccess(res, responseData);
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Get chat room details
 * GET /api/chat/rooms/:roomId
 */
async function getChatRoom(req, res) {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;

    const validatedData = chatValidator.validateRoomId({ roomId });
    const room = await chatService.getChatRoom(validatedData.roomId, userId);
    const responseData = chatDto.toChatRoomDto(room, userId);

    return responseUtil.sendSuccess(res, responseData);
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Send text message
 * POST /api/chat/rooms/:roomId/messages
 */
async function sendMessage(req, res) {
  try {
    const senderId = req.user.userId;
    const { roomId } = req.params;
    const { content, replyToId } = req.body;

    const validatedData = chatValidator.validateSendMessage({
      roomId,
      content,
      replyToId,
    });

    const message = await chatService.sendTextMessage(
      validatedData.roomId,
      senderId,
      validatedData.content,
      validatedData.replyToId
    );

    const responseData = chatDto.toMessageDto(message);
    return responseUtil.sendCreated(res, responseData);
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Send image message
 * POST /api/chat/rooms/:roomId/images
 */
async function sendImage(req, res) {
  try {
    const senderId = req.user.userId;
    const { roomId } = req.params;
    const { caption = '' } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return responseUtil.sendError(res, 'MISSING_FILE', 'Image file is required', 400);
    }

    const validatedData = chatValidator.validateSendImage({
      roomId,
      caption,
    });

    const message = await chatService.sendImageMessage(
      validatedData.roomId,
      senderId,
      imageFile,
      validatedData.caption
    );

    const responseData = chatDto.toMessageDto(message);
    return responseUtil.sendCreated(res, responseData);
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Send product message
 * POST /api/chat/rooms/:roomId/product
 */
async function sendProduct(req, res) {
  try {
    const senderId = req.user.userId;
    const { roomId } = req.params;
    const { productId, message = '' } = req.body;

    const validatedData = chatValidator.validateSendProduct({
      roomId,
      productId,
      message,
    });

    const chatMessage = await chatService.sendProductMessage(
      validatedData.roomId,
      senderId,
      validatedData.productId,
      validatedData.message
    );

    const responseData = chatDto.toMessageDto(chatMessage);
    return responseUtil.sendCreated(res, responseData);
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Send order message
 * POST /api/chat/rooms/:roomId/order
 */
async function sendOrder(req, res) {
  try {
    const senderId = req.user.userId;
    const { roomId } = req.params;
    const { orderId, message = '' } = req.body;

    const validatedData = chatValidator.validateSendOrder({
      roomId,
      orderId,
      message,
    });

    const chatMessage = await chatService.sendOrderMessage(
      validatedData.roomId,
      senderId,
      validatedData.orderId,
      validatedData.message
    );

    const responseData = chatDto.toMessageDto(chatMessage);
    return responseUtil.sendCreated(res, responseData);
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Get messages in chat room
 * GET /api/chat/rooms/:roomId/messages
 */
async function getMessages(req, res) {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;
    const { page = 1, limit = 50, before } = req.query;

    const validatedData = chatValidator.validateGetMessages({
      roomId,
      page: parseInt(page),
      limit: parseInt(limit),
      before: before || null,
    });

    const result = await chatService.getMessages(
      validatedData.roomId,
      userId,
      {
        page: validatedData.page,
        limit: validatedData.limit,
        before: validatedData.before,
      }
    );

    const responseData = chatDto.toMessageListDto(result);
    return responseUtil.sendSuccess(res, responseData);
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Mark messages as read
 * PUT /api/chat/rooms/:roomId/read
 */
async function markAsRead(req, res) {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;

    const validatedData = chatValidator.validateRoomId({ roomId });
    await chatService.markAsRead(validatedData.roomId, userId);

    return responseUtil.sendSuccess(res, { message: 'Messages marked as read' });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Delete message
 * DELETE /api/chat/messages/:messageId
 */
async function deleteMessage(req, res) {
  try {
    const userId = req.user.userId;
    const { messageId } = req.params;

    const validatedData = chatValidator.validateMessageId({ messageId });
    await chatService.deleteMessage(validatedData.messageId, userId);

    return responseUtil.sendSuccess(res, { message: 'Message deleted' });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Close chat room
 * PUT /api/chat/rooms/:roomId/close
 */
async function closeChatRoom(req, res) {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;

    const validatedData = chatValidator.validateRoomId({ roomId });
    const room = await chatService.closeChatRoom(validatedData.roomId, userId);
    const responseData = chatDto.toChatRoomDto(room, userId);

    return responseUtil.sendSuccess(res, responseData);
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Archive chat room
 * PUT /api/chat/rooms/:roomId/archive
 */
async function archiveChatRoom(req, res) {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;

    const validatedData = chatValidator.validateRoomId({ roomId });
    const room = await chatService.archiveChatRoom(validatedData.roomId, userId);
    const responseData = chatDto.toChatRoomDto(room, userId);

    return responseUtil.sendSuccess(res, responseData);
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Reopen chat room
 * PUT /api/chat/rooms/:roomId/reopen
 */
async function reopenChatRoom(req, res) {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;

    const validatedData = chatValidator.validateRoomId({ roomId });
    const room = await chatService.reopenChatRoom(validatedData.roomId, userId);
    const responseData = chatDto.toChatRoomDto(room, userId);

    return responseUtil.sendSuccess(res, responseData);
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Get unread message count
 * GET /api/chat/unread-count
 */
async function getUnreadCount(req, res) {
  try {
    const userId = req.user.userId;
    const count = await chatService.getUnreadCount(userId);
    const responseData = chatDto.toUnreadCountDto(count);

    return responseUtil.sendSuccess(res, responseData);
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Send typing indicator
 * POST /api/chat/rooms/:roomId/typing
 */
async function sendTyping(req, res) {
  try {
    const userId = req.user.userId;
    const { roomId } = req.params;
    const { isTyping = true } = req.body;

    const validatedData = chatValidator.validateTyping({
      roomId,
      isTyping,
    });

    await chatService.sendTypingIndicator(
      validatedData.roomId,
      userId,
      validatedData.isTyping
    );

    return responseUtil.sendSuccess(res, { message: 'Typing indicator sent' });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * Handle errors and send appropriate response
 */
function handleError(res, error) {
  console.error('Chat Controller Error:', error);

  // Zod validation errors
  if (error.name === 'ZodError') {
    return responseUtil.sendValidationError(res, error.errors);
  }

  // Custom app errors
  if (error instanceof AppError) {
    return responseUtil.sendError(res, error.code, error.message, error.statusCode);
  }

  // Generic errors
  if (error.message) {
    // Check for specific error messages
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return responseUtil.sendNotFound(res, error.message);
    }
    if (error.message.includes('unauthorized') || error.message.includes('only delete your own')) {
      return responseUtil.sendForbidden(res, error.message);
    }
  }

  // Unknown errors
  return responseUtil.sendError(res, 'INTERNAL_ERROR', 'An unexpected error occurred', 500);
}

module.exports = {
  startChat,
  getChatRooms,
  getChatRoom,
  sendMessage,
  sendImage,
  sendProduct,
  sendOrder,
  getMessages,
  markAsRead,
  deleteMessage,
  closeChatRoom,
  archiveChatRoom,
  reopenChatRoom,
  getUnreadCount,
  sendTyping,
};
