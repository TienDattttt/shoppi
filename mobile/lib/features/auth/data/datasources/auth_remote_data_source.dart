import 'package:injectable/injectable.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/register_params.dart';
import '../models/auth_models.dart';

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
    // Backend auth endpoint: POST /api/auth/login
    final response = await _client.post('/auth/login', data: {
      'email': phone, // Backend accepts email or phone in email field
      'password': password,
    });
    return LoginResponseModel.fromJson(response);
  }

  @override
  Future<void> requestOtp(String phone) async {
    // Backend auth endpoint: POST /api/auth/login/otp/request
    await _client.post('/auth/login/otp/request', data: {
      'phone': phone,
    });
  }

  @override
  Future<LoginResponseModel> verifyOtp(String phone, String otp) async {
    // Backend auth endpoint: POST /api/auth/login/otp/verify
    final response = await _client.post('/auth/login/otp/verify', data: {
      'phone': phone,
      'otp': otp,
    });
    return LoginResponseModel.fromJson(response);
  }

  @override
  Future<LoginResponseModel> register(RegisterParams params) async {
    // Step 1: Register shipper account via auth endpoint
    final response = await _client.post('/auth/register/shipper', data: {
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
    // Backend shipper endpoint: GET /api/shippers/me
    final response = await _client.get('/shippers/me');
    return ShipperModel.fromJson(response);
  }
}
