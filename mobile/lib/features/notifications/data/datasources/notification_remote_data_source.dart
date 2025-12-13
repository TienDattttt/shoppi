import 'package:injectable/injectable.dart';
import '../../../../core/network/api_client.dart';
import '../models/notification_model.dart';

abstract class NotificationRemoteDataSource {
  Future<List<NotificationModel>> getNotifications();
  Future<void> markAsRead(String id);
  Future<void> registerDeviceToken(String token);
}

@LazySingleton(as: NotificationRemoteDataSource)
class NotificationRemoteDataSourceImpl implements NotificationRemoteDataSource {
  final ApiClient _client;

  NotificationRemoteDataSourceImpl(this._client);

  @override
  Future<List<NotificationModel>> getNotifications() async {
    // Backend endpoint: GET /api/notifications
    final response = await _client.get('/notifications');
    if (response is List) {
      return response.map((e) => NotificationModel.fromJson(e)).toList();
    }
    // Handle paginated response
    final data = response['data'] ?? response['notifications'] ?? response;
    return (data as List).map((e) => NotificationModel.fromJson(e)).toList();
  }

  @override
  Future<void> markAsRead(String id) async {
    // Backend endpoint: PATCH /api/notifications/:id/read
    await _client.put('/notifications/$id/read');
  }

  @override
  Future<void> registerDeviceToken(String token) async {
    // Backend endpoint: POST /api/notifications/device-token
    await _client.post('/notifications/device-token', data: {
      'token': token,
      'platform': 'android', // or 'ios' based on platform
    });
  }
}
