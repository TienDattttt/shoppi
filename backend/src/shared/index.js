/**
 * Shared Module Entry Point
 * Exports all shared utilities, clients, and helpers
 */

module.exports = {
  // Database Clients
  supabase: require('./supabase/supabase.client'),
  supabaseStorage: require('./supabase/storage.client'),
  supabaseRealtime: require('./supabase/realtime.client'),
  redis: require('./redis/redis.client'),
  elasticsearch: require('./elasticsearch/elasticsearch.client'),
  cassandra: require('./cassandra/cassandra.client'),
  
  // Message Queue
  rabbitmq: require('./rabbitmq/rabbitmq.client'),
  
  // External Services
  firebase: require('./firebase/firebase.client'),
  googleMaps: require('./google-maps/maps.client'),
  
  // Utils
  response: require('./utils/response.util'),
  error: require('./utils/error.util'),
};
