import 'package:injectable/injectable.dart';
import '../../../../core/network/api_client.dart';
import '../../../auth/data/models/auth_models.dart';

abstract class ProfileRemoteDataSource {
  Future<ShipperModel> getProfile();
  Future<ShipperModel> updateProfile(Map<String, dynamic> data);
  Future<void> changePassword(String currentPassword, String newPassword);
}

@LazySingleton(as: ProfileRemoteDataSource)
class ProfileRemoteDataSourceImpl implements ProfileRemoteDataSource {
  final ApiClient _client;

  ProfileRemoteDataSourceImpl(this._client);

  @override
  Future<ShipperModel> getProfile() async {
    // Backend endpoint: GET /api/shippers/me
    // Response is already unwrapped by interceptor
    final response = await _client.get('/shippers/me');
    return ShipperModel.fromJson(response);
  }

  @override
  Future<ShipperModel> updateProfile(Map<String, dynamic> data) async {
    // Need to get shipper ID first, then update
    // Backend endpoint: PATCH /api/shippers/:id
    final profile = await getProfile();
    final response = await _client.patch('/shippers/${profile.id}', data: data);
    return ShipperModel.fromJson(response);
  }

  @override
  Future<void> changePassword(String currentPassword, String newPassword) async {
    // Backend endpoint: POST /api/auth/password/change (if exists)
    // For now, this might not be implemented in backend
    await _client.post('/auth/password/change', data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }
}
