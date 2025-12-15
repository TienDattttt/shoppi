import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:injectable/injectable.dart';
import '../models/auth_models.dart';

abstract class AuthLocalDataSource {
  Future<void> cacheToken(String accessToken, String? refreshToken);
  Future<String?> getAccessToken();
  Future<String?> getRefreshToken();
  Future<void> cacheShipper(ShipperModel shipper);
  Future<ShipperModel?> getCachedShipper();
  Future<void> clearCache();
}

@LazySingleton(as: AuthLocalDataSource)
class AuthLocalDataSourceImpl implements AuthLocalDataSource {
  final FlutterSecureStorage _storage;

  AuthLocalDataSourceImpl(this._storage);

  // Use lowercase keys to match AuthInterceptor
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _shipperKey = 'shipper_data';

  @override
  Future<void> cacheToken(String accessToken, String? refreshToken) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    if (refreshToken != null) {
      await _storage.write(key: _refreshTokenKey, value: refreshToken);
    }
  }

  @override
  Future<String?> getAccessToken() async {
    return await _storage.read(key: _accessTokenKey);
  }

  @override
  Future<String?> getRefreshToken() async {
    return await _storage.read(key: _refreshTokenKey);
  }

  @override
  Future<void> cacheShipper(ShipperModel shipper) async {
    final jsonString = jsonEncode(shipper.toJson());
    await _storage.write(key: _shipperKey, value: jsonString);
  }

  @override
  Future<ShipperModel?> getCachedShipper() async {
    final jsonString = await _storage.read(key: _shipperKey);
    if (jsonString == null) return null;
    try {
      final json = jsonDecode(jsonString) as Map<String, dynamic>;
      return ShipperModel.fromJson(json);
    } catch (e) {
      return null;
    }
  }

  @override
  Future<void> clearCache() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
    await _storage.delete(key: _shipperKey);
  }
}
