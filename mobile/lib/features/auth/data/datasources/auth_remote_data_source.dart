import 'dart:io';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/register_params.dart';
import '../models/auth_models.dart';

abstract class AuthRemoteDataSource {
  Future<LoginResponseModel> login(String phone, String password);
  Future<void> requestOtp(String phone);
  Future<LoginResponseModel> verifyOtp(String phone, String otp);
  Future<Map<String, String?>> uploadDocuments({
    String? idCardFrontPath,
    String? idCardBackPath,
    String? driverLicensePath,
  });
  Future<LoginResponseModel> register(RegisterParams params);
  Future<ShipperModel> getCurrentShipper();
}

@LazySingleton(as: AuthRemoteDataSource)
class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient _client;

  AuthRemoteDataSourceImpl(this._client);

  @override
  Future<LoginResponseModel> login(String phone, String password) async {
    final response = await _client.post('/auth/login', data: {
      'identifier': phone,
      'password': password,
    });
    return LoginResponseModel.fromJson(response);
  }

  @override
  Future<void> requestOtp(String phone) async {
    await _client.post('/auth/login/otp/request', data: {
      'phone': phone,
    });
  }

  @override
  Future<LoginResponseModel> verifyOtp(String phone, String otp) async {
    final response = await _client.post('/auth/login/otp/verify', data: {
      'phone': phone,
      'otp': otp,
    });
    return LoginResponseModel.fromJson(response);
  }

  @override
  Future<Map<String, String?>> uploadDocuments({
    String? idCardFrontPath,
    String? idCardBackPath,
    String? driverLicensePath,
  }) async {
    final formData = FormData();
    
    if (idCardFrontPath != null && idCardFrontPath.isNotEmpty) {
      formData.files.add(MapEntry(
        'idCardFront',
        await MultipartFile.fromFile(idCardFrontPath, filename: 'id_card_front.jpg'),
      ));
    }
    
    if (idCardBackPath != null && idCardBackPath.isNotEmpty) {
      formData.files.add(MapEntry(
        'idCardBack',
        await MultipartFile.fromFile(idCardBackPath, filename: 'id_card_back.jpg'),
      ));
    }
    
    if (driverLicensePath != null && driverLicensePath.isNotEmpty) {
      formData.files.add(MapEntry(
        'driverLicense',
        await MultipartFile.fromFile(driverLicensePath, filename: 'driver_license.jpg'),
      ));
    }
    
    final response = await _client.postFormData('/shippers/upload-documents', formData);
    final data = response['data'] as Map<String, dynamic>?;
    
    return {
      'idCardFrontUrl': data?['idCardFrontUrl'] as String?,
      'idCardBackUrl': data?['idCardBackUrl'] as String?,
      'driverLicenseUrl': data?['driverLicenseUrl'] as String?,
    };
  }

  @override
  Future<LoginResponseModel> register(RegisterParams params) async {
    final response = await _client.post('/auth/register/shipper', data: {
      'fullName': params.fullName,
      'phone': params.phone,
      'password': params.password,
      'idCardNumber': params.idCardNumber,
      'vehicleType': params.vehicleType,
      'vehiclePlate': params.vehiclePlate,
      'vehicleBrand': params.vehicleBrand,
      'vehicleModel': params.vehicleModel,
      'workingArea': params.workingArea,
      // Document URLs from upload
      'idCardFrontUrl': params.idCardFrontUrl,
      'idCardBackUrl': params.idCardBackUrl,
      'driverLicenseUrl': params.driverLicenseUrl,
    });
    return LoginResponseModel.fromJson(response);
  }

  @override
  Future<ShipperModel> getCurrentShipper() async {
    final response = await _client.get('/shippers/me');
    return ShipperModel.fromJson(response);
  }
}

