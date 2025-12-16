import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:injectable/injectable.dart';
import '../network/api_client.dart';

/// Notification data types for handling different notification actions
class NotificationData {
  final String? type;
  final String? shipmentId;
  final String? orderId;
  final Map<String, dynamic> raw;

  NotificationData({
    this.type,
    this.shipmentId,
    this.orderId,
    required this.raw,
  });

  factory NotificationData.fromMessage(RemoteMessage message) {
    final data = message.data;
    return NotificationData(
      type: data['type'] as String?,
      shipmentId: data['shipmentId'] as String?,
      orderId: data['orderId'] as String?,
      raw: data,
    );
  }
}

/// Push notification service for shipper mobile app
abstract class NotificationService {
  Future<String?> getToken();
  Stream<RemoteMessage> get onMessage;
  Stream<RemoteMessage> get onMessageOpenedApp;
  Future<void> requestPermission();
  Future<void> initialize();
  Future<void> registerToken(String token);
  void handleNotificationTap(RemoteMessage message, void Function(NotificationData) onTap);
  Future<RemoteMessage?> getInitialMessage();
  Stream<NotificationData> get onNotificationData;
}

@LazySingleton(as: NotificationService)
class NotificationServiceImpl implements NotificationService {
  final ApiClient _apiClient;
  
  final StreamController<NotificationData> _notificationDataController = 
      StreamController<NotificationData>.broadcast();
  
  String? _currentToken;
  bool _initialized = false;

  NotificationServiceImpl(this._apiClient);

  // Safe accessor for FirebaseMessaging
  FirebaseMessaging? get _messaging {
    try {
      return FirebaseMessaging.instance;
    } catch (e) {
      debugPrint('FirebaseMessaging not available: $e');
      return null;
    }
  }

  @override
  Future<String?> getToken() async {
    try {
      return await _messaging?.getToken();
    } catch (_) {
      return null;
    }
  }

  @override
  Stream<RemoteMessage> get onMessage {
    try {
      return FirebaseMessaging.onMessage;
    } catch (_) {
      return const Stream.empty();
    }
  }

  @override
  Stream<RemoteMessage> get onMessageOpenedApp {
     try {
       return FirebaseMessaging.onMessageOpenedApp;
     } catch (_) {
       return const Stream.empty();
     }
  }

  @override
  Future<void> requestPermission() async {
    try {
      await _messaging?.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
    } catch (_) {}
  }

  @override
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;
    
    if (_messaging == null) {
      debugPrint('NotificationService: Firebase not initialized, skipping setup.');
      return;
    }

    try {
      // Request permission
      await requestPermission();
      
      // Get and register token
      final token = await getToken();
      if (token != null) {
        _currentToken = token;
        await registerToken(token);
      }
      
      // Listen for token refresh
      _messaging!.onTokenRefresh.listen((newToken) async {
        if (newToken != _currentToken) {
          _currentToken = newToken;
          await registerToken(newToken);
        }
      });
      
      // Handle foreground messages
      onMessage.listen((message) {
        final data = NotificationData.fromMessage(message);
        _notificationDataController.add(data);
      });
      
      // Handle background/terminated message taps
      onMessageOpenedApp.listen((message) {
        final data = NotificationData.fromMessage(message);
        _notificationDataController.add(data);
      });
      
      // Check if app was opened from notification
      final initialMessage = await getInitialMessage();
      if (initialMessage != null) {
        final data = NotificationData.fromMessage(initialMessage);
        _notificationDataController.add(data);
      }
    } catch (e) {
      debugPrint('NotificationService initialization failed: $e');
    }
  }

  @override
  Future<void> registerToken(String token) async {
    try {
      await _apiClient.post('/notifications/device-token', data: {
        'token': token,
        'platform': 'android', 
        'deviceType': 'shipper_app',
      });
    } catch (e) {
      // Ignore registration errors
    }
  }

  @override
  void handleNotificationTap(RemoteMessage message, void Function(NotificationData) onTap) {
    final data = NotificationData.fromMessage(message);
    onTap(data);
  }

  @override
  Future<RemoteMessage?> getInitialMessage() async {
    try {
      return await _messaging?.getInitialMessage();
    } catch (_) {
      return null;
    }
  }

  @override
  Stream<NotificationData> get onNotificationData => _notificationDataController.stream;
}
