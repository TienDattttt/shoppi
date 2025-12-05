/**
 * Chat Module
 * Exports all chat-related components
 */

const chatController = require('./chat.controller');
const chatService = require('./chat.service');
const chatRepository = require('./chat.repository');
const chatRoutes = require('./chat.routes');
const chatValidator = require('./chat.validator');
const chatDto = require('./chat.dto');

module.exports = {
  controller: chatController,
  service: chatService,
  repository: chatRepository,
  routes: chatRoutes,
  validator: chatValidator,
  dto: chatDto,
};
