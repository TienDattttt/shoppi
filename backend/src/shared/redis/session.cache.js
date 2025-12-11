/**
 * Session Cache Service
 * Redis caching layer for session data to reduce database queries
 */

const { getRedisClient } = require('./redis.client');

const SESSION_PREFIX = 'session:';
const USER_SESSIONS_PREFIX = 'user_sessions:';
const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days (match refresh token expiry)

/**
 * Cache session data
 * @param {string} sessionId
 * @param {object} sessionData
 * @returns {Promise<boolean>}
 */
async function cacheSession(sessionId, sessionData) {
  try {
    const client = await getRedisClient();
    const key = `${SESSION_PREFIX}${sessionId}`;
    await client.setEx(key, SESSION_TTL, JSON.stringify(sessionData));
    
    // Also track user's sessions
    if (sessionData.user_id) {
      const userKey = `${USER_SESSIONS_PREFIX}${sessionData.user_id}`;
      await client.sAdd(userKey, sessionId);
      await client.expire(userKey, SESSION_TTL);
    }
    
    return true;
  } catch (error) {
    console.error('Session cache error:', error.message);
    return false;
  }
}

/**
 * Get cached session
 * @param {string} sessionId
 * @returns {Promise<object|null>}
 */
async function getCachedSession(sessionId) {
  try {
    const client = await getRedisClient();
    const key = `${SESSION_PREFIX}${sessionId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Session cache get error:', error.message);
    return null;
  }
}

/**
 * Invalidate session cache
 * @param {string} sessionId
 * @returns {Promise<boolean>}
 */
async function invalidateSession(sessionId) {
  try {
    const client = await getRedisClient();
    const key = `${SESSION_PREFIX}${sessionId}`;
    
    // Get session to find user_id
    const session = await getCachedSession(sessionId);
    if (session?.user_id) {
      const userKey = `${USER_SESSIONS_PREFIX}${session.user_id}`;
      await client.sRem(userKey, sessionId);
    }
    
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Session cache invalidate error:', error.message);
    return false;
  }
}

/**
 * Invalidate all sessions for a user
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function invalidateUserSessions(userId) {
  try {
    const client = await getRedisClient();
    const userKey = `${USER_SESSIONS_PREFIX}${userId}`;
    
    // Get all session IDs for user
    const sessionIds = await client.sMembers(userKey);
    
    // Delete all session caches
    if (sessionIds.length > 0) {
      const sessionKeys = sessionIds.map(id => `${SESSION_PREFIX}${id}`);
      await client.del([...sessionKeys, userKey]);
    }
    
    return true;
  } catch (error) {
    console.error('User sessions invalidate error:', error.message);
    return false;
  }
}

/**
 * Get user's active session count
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getUserSessionCount(userId) {
  try {
    const client = await getRedisClient();
    const userKey = `${USER_SESSIONS_PREFIX}${userId}`;
    return await client.sCard(userKey);
  } catch (error) {
    console.error('Session count error:', error.message);
    return 0;
  }
}

module.exports = {
  cacheSession,
  getCachedSession,
  invalidateSession,
  invalidateUserSessions,
  getUserSessionCount,
  SESSION_PREFIX,
  USER_SESSIONS_PREFIX,
};
