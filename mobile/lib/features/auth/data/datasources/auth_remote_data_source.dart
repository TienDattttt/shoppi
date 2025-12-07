import 'package:injectable/injectable.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/register_params.dart';
import 'auth_models.dart';

abstract class AuthRemoteDataSource {
  Future<LoginResponseModel> login(String phone, String password); // Or OTP verify
  Future<void> requestOtp(String phone);
  Future<LoginResponseModel> verifyOtp(String phone, String otp);
  Future<LoginResponseModel> register(RegisterParams params);
  Future<ShipperModel> getCurrentShipper();
}

@LazySingleton(as: AuthRemoteDataSource)
class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient _client;

  AuthRemoteDataSourceImpl(this._client);

  @override
  Future<LoginResponseModel> login(String phone, String password) async {
    // Ideally this endpoint returns tokens
    final response = await _client.post('/shipper/auth/login', data: {
      'phone': phone,
      'password': password,
    });
    return LoginResponseModel.fromJson(response);
  }

  @override
  Future<void> requestOtp(String phone) async {
    await _client.post('/shipper/auth/otp/request', data: {
      'phone': phone,
    });
  }

  @override
  Future<LoginResponseModel> verifyOtp(String phone, String otp) async {
    final response = await _client.post('/shipper/auth/otp/verify', data: {
      'phone': phone,
      'otp': otp,
    });
    return LoginResponseModel.fromJson(response);
  }

  @override
  Future<LoginResponseModel> register(RegisterParams params) async {
    final response = await _client.post('/shipper/auth/register', data: {
      'fullName': params.fullName,
      'phone': params.phone,
      'password': params.password,
      'vehicleType': params.vehicleType,
      'vehiclePlate': params.vehiclePlate,
      'vehicleBrand': params.vehicleBrand,
      'vehicleModel': params.vehicleModel,
      'workingArea': params.workingArea,
    });
    return LoginResponseModel.fromJson(response);
  }

  @override
  Future<ShipperModel> getCurrentShipper() async {
    final response = await _client.get('/shipper/profile/me');
    return ShipperModel.fromJson(response);
  }
}
