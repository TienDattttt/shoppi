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
  
  // Location APIs for registration
  Future<List<ProvinceModel>> getProvinces();
  Future<List<WardModel>> getWards(String provinceCode);
  Future<List<PostOfficeModel>> getPostOffices(String wardCode);
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
      'postOfficeId': params.postOfficeId,
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

  // ============================================
  // Location APIs for registration
  // ============================================

  @override
  Future<List<ProvinceModel>> getProvinces() async {
    final response = await _client.get('/public/provinces');
    // Response after interceptor unwrap is the array directly
    final provinces = response as List<dynamic>? ?? [];
    return provinces.map((p) => ProvinceModel.fromJson(p as Map<String, dynamic>)).toList();
  }

  @override
  Future<List<WardModel>> getWards(String provinceCode) async {
    final response = await _client.get('/public/wards?province_code=$provinceCode');
    // Response after interceptor unwrap is the array directly
    final wards = response as List<dynamic>? ?? [];
    return wards.map((w) => WardModel.fromJson(w as Map<String, dynamic>)).toList();
  }

  @override
  Future<List<PostOfficeModel>> getPostOffices(String wardCode) async {
    final response = await _client.get('/public/post-offices?ward_code=$wardCode');
    // Response after interceptor unwrap is the array directly
    final offices = response as List<dynamic>? ?? [];
    return offices.map((o) => PostOfficeModel.fromJson(o as Map<String, dynamic>)).toList();
  }
}

// Location Models
class ProvinceModel {
  final String code;
  final String name;
  final String? fullName;
  final String? region;

  ProvinceModel({
    required this.code,
    required this.name,
    this.fullName,
    this.region,
  });

  factory ProvinceModel.fromJson(Map<String, dynamic> json) {
    return ProvinceModel(
      code: json['code']?.toString() ?? '',
      name: json['name'] ?? '',
      fullName: json['full_name'],
      region: json['region'],
    );
  }
}

class WardModel {
  final String code;
  final String name;
  final String provinceCode;
  final String? wardType;

  WardModel({
    required this.code,
    required this.name,
    required this.provinceCode,
    this.wardType,
  });

  factory WardModel.fromJson(Map<String, dynamic> json) {
    return WardModel(
      code: json['code']?.toString() ?? '',
      name: json['name'] ?? '',
      provinceCode: json['province_code']?.toString() ?? '',
      wardType: json['ward_type'],
    );
  }
}

class PostOfficeModel {
  final String id;
  final String code;
  final String? name;
  final String nameVi;
  final String? address;
  final String? district;
  final String? city;

  PostOfficeModel({
    required this.id,
    required this.code,
    this.name,
    required this.nameVi,
    this.address,
    this.district,
    this.city,
  });

  factory PostOfficeModel.fromJson(Map<String, dynamic> json) {
    return PostOfficeModel(
      id: json['id'] ?? '',
      code: json['code'] ?? '',
      name: json['name'],
      nameVi: json['name_vi'] ?? json['name'] ?? '',
      address: json['address'],
      district: json['district'],
      city: json['city'],
    );
  }
}

