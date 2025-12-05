/**
 * Chat Routes
 * Defines API endpoints for chat operations
 */

const express = require('express');
const multer = require('multer');
const chatController = require('./chat.controller');
const { authenticate } = require('../auth/auth.middleware');

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
    }
  },
});

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route POST /api/chat/start
 * @desc Start or get chat with partner
 * @access Private
 * @body {string} partnerId - Partner user ID (required)
 * @body {string} [productId] - Optional product ID to associate with chat
 * @body {string} [orderId] - Optional order ID to associate with chat
 */
router.post('/start', chatController.startChat);

/**
 * @route GET /api/chat/rooms
 * @desc Get user's chat rooms
 * @access Private
 * @query {number} [page=1] - Page number
 * @query {number} [limit=20] - Items per page (max 100)
 * @query {string} [status=active] - Room status filter (active, closed, archived)
 */
router.get('/rooms', chatController.getChatRooms);

/**
 * @route GET /api/chat/unread-count
 * @desc Get total unread message count across all rooms
 * @access Private
 */
router.get('/unread-count', chatController.getUnreadCount);

/**
 * @route GET /api/chat/rooms/:roomId
 * @desc Get chat room details
 * @access Private
 * @param {string} roomId - Chat room ID
 */
router.get('/rooms/:roomId', chatController.getChatRoom);

/**
 * @route GET /api/chat/rooms/:roomId/messages
 * @desc Get messages in chat room
 * @access Private
 * @param {string} roomId - Chat room ID
 * @query {number} [page=1] - Page number
 * @query {number} [limit=50] - Items per page (max 100)
 * @query {string} [before] - Get messages before this timestamp (ISO 8601)
 */
router.get('/rooms/:roomId/messages', chatController.getMessages);

/**
 * @route POST /api/chat/rooms/:roomId/messages
 * @desc Send text message
 * @access Private
 * @param {string} roomId - Chat room ID
 * @body {string} content - Message content (1-1000 characters)
 * @body {string} [replyToId] - Optional message ID to reply to
 */
router.post('/rooms/:roomId/messages', chatController.sendMessage);

/**
 * @route POST /api/chat/rooms/:roomId/images
 * @desc Send image message
 * @access Private
 * @param {string} roomId - Chat room ID
 * @body {file} image - Image file (JPEG, PNG, GIF, WebP, max 5MB)
 * @body {string} [caption] - Optional image caption (max 200 characters)
 */
router.post('/rooms/:roomId/images', upload.single('image'), chatController.sendImage);

/**
 * @route POST /api/chat/rooms/:roomId/product
 * @desc Share product in chat
 * @access Private
 * @param {string} roomId - Chat room ID
 * @body {string} productId - Product ID to share
 * @body {string} [message] - Optional message (max 200 characters)
 */
router.post('/rooms/:roomId/product', chatController.sendProduct);

/**
 * @route POST /api/chat/rooms/:roomId/order
 * @desc Share order in chat
 * @access Private
 * @param {string} roomId - Chat room ID
 * @body {string} orderId - Order ID to share
 * @body {string} [message] - Optional message (max 200 characters)
 */
router.post('/rooms/:roomId/order', chatController.sendOrder);

/**
 * @route PUT /api/chat/rooms/:roomId/read
 * @desc Mark all messages in room as read
 * @access Private
 * @param {string} roomId - Chat room ID
 */
router.put('/rooms/:roomId/read', chatController.markAsRead);

/**
 * @route POST /api/chat/rooms/:roomId/typing
 * @desc Send typing indicator
 * @access Private
 * @param {string} roomId - Chat room ID
 * @body {boolean} [isTyping=true] - Whether user is typing
 */
router.post('/rooms/:roomId/typing', chatController.sendTyping);

/**
 * @route PUT /api/chat/rooms/:roomId/close
 * @desc Close chat room
 * @access Private
 * @param {string} roomId - Chat room ID
 */
router.put('/rooms/:roomId/close', chatController.closeChatRoom);

/**
 * @route PUT /api/chat/rooms/:roomId/archive
 * @desc Archive chat room
 * @access Private
 * @param {string} roomId - Chat room ID
 */
router.put('/rooms/:roomId/archive', chatController.archiveChatRoom);

/**
 * @route PUT /api/chat/rooms/:roomId/reopen
 * @desc Reopen closed/archived chat room
 * @access Private
 * @param {string} roomId - Chat room ID
 */
router.put('/rooms/:roomId/reopen', chatController.reopenChatRoom);

/**
 * @route DELETE /api/chat/messages/:messageId
 * @desc Delete message (soft delete, only own messages)
 * @access Private
 * @param {string} messageId - Message ID
 */
router.delete('/messages/:messageId', chatController.deleteMessage);

module.exports = router;
