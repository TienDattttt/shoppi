/**
 * Firebase Admin SDK Client
 * For sending push notifications via FCM
 */

const admin = require('firebase-admin');

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Check if service account credentials are provided
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccount) {
      // Parse JSON credentials from environment variable
      const credentials = JSON.parse(serviceAccount);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use default credentials from file path
      firebaseApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } else {
      console.warn('Firebase credentials not configured. Push notifications will be disabled.');
      return null;
    }

    console.log('Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error.message);
    return null;
  }
}

/**
 * Get Firebase Messaging instance
 */
function getMessaging() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  
  if (!firebaseApp) {
    return null;
  }
  
  return admin.messaging();
}

/**
 * Send push notification to a single device
 * @param {string} token - FCM device token
 * @param {object} payload - Notification payload
 * @returns {Promise<string>} - Message ID
 */
async function sendToDevice(token, payload) {
  const messaging = getMessaging();
  
  if (!messaging) {
    console.warn('Firebase not initialized. Skipping push notification.');
    return null;
  }

  const message = {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        clickAction: payload.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: payload.badge || 1,
        },
      },
    },
    webpush: {
      notification: {
        icon: payload.icon || '/icon.png',
      },
    },
  };

  try {
    const response = await messaging.send(message);
    return response;
  } catch (error) {
    // Check if token is invalid
    if (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered'
    ) {
      throw { code: 'INVALID_TOKEN', token, originalError: error };
    }
    throw error;
  }
}

/**
 * Send push notification to multiple devices
 * @param {string[]} tokens - Array of FCM device tokens
 * @param {object} payload - Notification payload
 * @returns {Promise<object>} - Batch response
 */
async function sendToDevices(tokens, payload) {
  const messaging = getMessaging();
  
  if (!messaging) {
    console.warn('Firebase not initialized. Skipping push notifications.');
    return { successCount: 0, failureCount: tokens.length, responses: [] };
  }

  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, responses: [] };
  }

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  };

  try {
    const response = await messaging.sendEachForMulticast({
      tokens,
      ...message,
    });

    // Identify invalid tokens
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        if (
          resp.error.code === 'messaging/invalid-registration-token' ||
          resp.error.code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
      responses: response.responses,
    };
  } catch (error) {
    console.error('Failed to send batch push:', error);
    throw error;
  }
}

module.exports = {
  initializeFirebase,
  getMessaging,
  sendToDevice,
  sendToDevices,
};
