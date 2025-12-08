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
    final response = await _client.get('/shippers/me');
    return ShipperModel.fromJson(response.data['data']);
  }

  @override
  Future<ShipperModel> updateProfile(Map<String, dynamic> data) async {
    final response = await _client.put('/shippers/me', data: data);
    return ShipperModel.fromJson(response.data['data']);
  }

  @override
  Future<void> changePassword(String currentPassword, String newPassword) async {
    await _client.post('/auth/change-password', data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }
}
