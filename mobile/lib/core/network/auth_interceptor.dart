import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:injectable/injectable.dart';

@injectable
class AuthInterceptor extends Interceptor {
  final FlutterSecureStorage _storage;

  AuthInterceptor(this._storage);

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storage.read(key: 'access_token');
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    super.onRequest(options, handler);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Handle token expiration: clear storage, navigate to login
      await _storage.delete(key: 'access_token');
      // Navigation logic typically requires context or global key, 
      // or we can stream this event to AuthBloc.
      // For now, simple return, assuming AuthBloc handles "unauthenticated" state if api calls fail.
    }
    super.onError(err, handler);
  }
}
