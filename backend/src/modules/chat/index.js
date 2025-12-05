/**
 * Chat Module - Public API
 * 
 * This file defines the public interface for the chat module.
 * Other modules should only import from this file, not from internal files.
 */

// Services (Public API)
const chatService = require('./chat.service');

// Routes
const chatRoutes = require('./chat.routes');

// Module initialization
const chatModule = require('./chat.module');

// DTOs (for serialization)
const chatDTO = require('./chat.dto');

module.exports = {
  // Services
  chatService,
  
  // Routes
  routes: chatRoutes,
  
  // Module
  initialize: chatModule.initializeModule,
  
  // DTOs
  chatDTO,
};
