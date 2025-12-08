import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:injectable/injectable.dart';

abstract class NotificationService {
  Future<String?> getToken();
  Stream<RemoteMessage> get onMessage;
  Stream<RemoteMessage> get onMessageOpenedApp;
  Future<void> requestPermission();
}

@LazySingleton(as: NotificationService)
class NotificationServiceImpl implements NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

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
}
