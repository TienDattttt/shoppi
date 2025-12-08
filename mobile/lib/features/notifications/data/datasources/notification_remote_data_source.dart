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
    final response = await _client.get('/shipper/notifications');
    return (response as List).map((e) => NotificationModel.fromJson(e)).toList();
  }

  @override
  Future<void> markAsRead(String id) async {
    await _client.post('/shipper/notifications/$id/read');
  }

  @override
  Future<void> registerDeviceToken(String token) async {
    await _client.post('/shipper/device-token', data: {'token': token});
  }
}
