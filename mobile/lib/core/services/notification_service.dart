import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
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
/// Requirements: 13.5 - Register device token, handle notification tap
abstract class NotificationService {
  /// Get Firebase device token
  Future<String?> getToken();
  
  /// Stream of foreground messages
  Stream<RemoteMessage> get onMessage;
  
  /// Stream of messages that opened the app
  Stream<RemoteMessage> get onMessageOpenedApp;
  
  /// Request notification permission
  Future<void> requestPermission();
  
  /// Initialize notification service and register token with backend
  /// Requirements: 13.5 - Register device token
  Future<void> initialize();
  
  /// Register device token with backend
  Future<void> registerToken(String token);
  
  /// Handle notification tap
  /// Requirements: 13.5 - Handle notification tap
  void handleNotificationTap(RemoteMessage message, void Function(NotificationData) onTap);
  
  /// Get initial message if app was opened from notification
  Future<RemoteMessage?> getInitialMessage();
  
  /// Stream of parsed notification data
  Stream<NotificationData> get onNotificationData;
}

@LazySingleton(as: NotificationService)
class NotificationServiceImpl implements NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final ApiClient _apiClient;
  
  final StreamController<NotificationData> _notificationDataController = 
      StreamController<NotificationData>.broadcast();
  
  String? _currentToken;
  bool _initialized = false;

  NotificationServiceImpl(this._apiClient);

  @override
  Future<String?> getToken() => _messaging.getToken();

  @override
  Stream<RemoteMessage> get onMessage => FirebaseMessaging.onMessage;

  @override
  Stream<RemoteMessage> get onMessageOpenedApp => FirebaseMessaging.onMessageOpenedApp;

  @override
  Future<void> requestPermission() async {
    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
  }

  @override
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;
    
    // Request permission
    await requestPermission();
    
    // Get and register token
    final token = await getToken();
    if (token != null) {
      _currentToken = token;
      await registerToken(token);
    }
    
    // Listen for token refresh
    _messaging.onTokenRefresh.listen((newToken) async {
      if (newToken != _currentToken) {
        _currentToken = newToken;
        await registerToken(newToken);
      }
    });
    
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((message) {
      final data = NotificationData.fromMessage(message);
      _notificationDataController.add(data);
    });
    
    // Handle background/terminated message taps
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      final data = NotificationData.fromMessage(message);
      _notificationDataController.add(data);
    });
    
    // Check if app was opened from notification
    final initialMessage = await getInitialMessage();
    if (initialMessage != null) {
      final data = NotificationData.fromMessage(initialMessage);
      _notificationDataController.add(data);
    }
  }

  @override
  Future<void> registerToken(String token) async {
    try {
      // Backend endpoint: POST /api/notifications/device-token
      // Requirements: 13.5 - Register device token
      await _apiClient.post('/notifications/device-token', data: {
        'token': token,
        'platform': 'android', // or 'ios' based on platform
        'deviceType': 'shipper_app',
      });
    } catch (e) {
      // Ignore registration errors - will retry on next app launch
    }
  }

  @override
  void handleNotificationTap(RemoteMessage message, void Function(NotificationData) onTap) {
    final data = NotificationData.fromMessage(message);
    onTap(data);
  }

  @override
  Future<RemoteMessage?> getInitialMessage() {
    return _messaging.getInitialMessage();
  }

  @override
  Stream<NotificationData> get onNotificationData => _notificationDataController.stream;
}
