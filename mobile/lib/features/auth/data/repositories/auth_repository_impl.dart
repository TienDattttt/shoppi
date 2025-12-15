import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/network_info.dart';
import '../../domain/entities/register_params.dart';
import '../../domain/entities/shipper.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_local_data_source.dart';
import '../datasources/auth_remote_data_source.dart';
import '../models/auth_models.dart';

@LazySingleton(as: AuthRepository)
class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final AuthLocalDataSource _localDataSource;
  final NetworkInfo _networkInfo;
  
  // Mock shipper for UI testing
  ShipperEntity? _mockShipper;

  AuthRepositoryImpl(
    this._remoteDataSource,
    this._localDataSource,
    this._networkInfo,
  );
  
  // Helper to create mock shipper
  ShipperEntity _createMockShipper(String phone) {
    return const ShipperEntity(
      id: 'mock-shipper-123',
      userId: 'mock-user-123',
      phone: '0901234567',
      fullName: 'Test Shipper',
      status: 'active',
      vehicleType: 'motorbike',
      vehiclePlate: '59-A1 12345',
      isOnline: true,
      avgRating: 4.8,
      totalDeliveries: 150,
    );
  }

  @override
  Future<Either<Failure, ShipperEntity>> login(String phone, String password) async {
    // Mock mode for UI testing
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 500));
      _mockShipper = _createMockShipper(phone);
      return Right(_mockShipper!);
    }
    
    // This might be deprecated if we only use OTP but keeping for flexibility
    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.login(phone, password);
        await _localDataSource.cacheToken(result.accessToken, result.refreshToken);
        
        // Get shipper profile after login
        final shipper = await _remoteDataSource.getCurrentShipper();
        await _localDataSource.cacheShipper(shipper);
        return Right(shipper);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, void>> requestOtp(String phone) async {
    // Mock mode for UI testing
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 500));
      return const Right(null);
    }
    
    if (await _networkInfo.isConnected) {
      try {
        await _remoteDataSource.requestOtp(phone);
        return const Right(null);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, ShipperEntity>> verifyOtp(String phone, String otp) async {
    // Mock mode for UI testing - accept any 6-digit OTP
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 500));
      if (otp.length == 6) {
        _mockShipper = _createMockShipper(phone);
        return Right(_mockShipper!);
      }
      return const Left(ServerFailure('Invalid OTP'));
    }
    
    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.verifyOtp(phone, otp);
        // Store token securely (Requirements: 13.1)
        await _localDataSource.cacheToken(result.accessToken, result.refreshToken);
        
        // Get shipper profile after OTP verification
        final shipper = await _remoteDataSource.getCurrentShipper();
        await _localDataSource.cacheShipper(shipper);
        return Right(shipper);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, ShipperEntity>> register(RegisterParams params) async {
    // Mock mode for UI testing
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 800));
      _mockShipper = ShipperEntity(
        id: 'mock-shipper-${DateTime.now().millisecondsSinceEpoch}',
        userId: 'mock-user-${DateTime.now().millisecondsSinceEpoch}',
        phone: params.phone,
        fullName: params.fullName,
        status: 'pending',
        vehicleType: params.vehicleType,
        vehiclePlate: params.vehiclePlate,
        isOnline: false,
        avgRating: 5.0,
        totalDeliveries: 0,
      );
      return Right(_mockShipper!);
    }
    
    if (await _networkInfo.isConnected) {
      try {
        // Step 1: Upload documents if provided (file paths)
        RegisterParams updatedParams = params;
        if (_hasDocumentsToUpload(params)) {
          final uploadedUrls = await _remoteDataSource.uploadDocuments(
            idCardFrontPath: params.idCardFront.isNotEmpty ? params.idCardFront : null,
            idCardBackPath: params.idCardBack.isNotEmpty ? params.idCardBack : null,
            driverLicensePath: params.licenseFront.isNotEmpty ? params.licenseFront : null,
          );
          
          // Update params with uploaded URLs
          updatedParams = params.copyWith(
            idCardFrontUrl: uploadedUrls['idCardFrontUrl'],
            idCardBackUrl: uploadedUrls['idCardBackUrl'],
            driverLicenseUrl: uploadedUrls['driverLicenseUrl'],
          );
        }
        
        // Step 2: Register with document URLs
        final result = await _remoteDataSource.register(updatedParams);
        
        // Registration returns user info but NO token (shipper needs admin approval)
        // If we have a token, cache it and get shipper profile
        if (result.accessToken.isNotEmpty) {
          await _localDataSource.cacheToken(result.accessToken, result.refreshToken);
          
          // Get shipper profile after registration
          final shipper = await _remoteDataSource.getCurrentShipper();
          await _localDataSource.cacheShipper(shipper);
          return Right(shipper);
        }
        
        // No token means pending approval - return shipper from registration response
        // or create a pending shipper entity from user data
        if (result.user != null) {
          final pendingShipper = ShipperEntity(
            id: '', // No shipper ID yet
            userId: result.user!.id,
            phone: result.user!.phone ?? params.phone,
            fullName: result.user!.fullName ?? params.fullName,
            status: 'pending',
            vehicleType: params.vehicleType,
            vehiclePlate: params.vehiclePlate,
            isOnline: false,
            avgRating: 0.0,
            totalDeliveries: 0,
          );
          return Right(pendingShipper);
        }
        
        // Fallback: create pending shipper from params
        final pendingShipper = ShipperEntity(
          id: '',
          userId: '',
          phone: params.phone,
          fullName: params.fullName,
          status: 'pending',
          vehicleType: params.vehicleType,
          vehiclePlate: params.vehiclePlate,
          isOnline: false,
          avgRating: 0.0,
          totalDeliveries: 0,
        );
        return Right(pendingShipper);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }
  
  /// Check if there are documents to upload (file paths provided)
  bool _hasDocumentsToUpload(RegisterParams params) {
    return params.idCardFront.isNotEmpty || 
           params.idCardBack.isNotEmpty || 
           params.licenseFront.isNotEmpty;
  }

  @override
  Future<Either<Failure, void>> logout() async {
    try {
      await _localDataSource.clearCache();
      _mockShipper = null;
      return const Right(null);
    } catch (e) {
      return Left(CacheFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, ShipperEntity>> getCurrentShipper() async {
    // Mock mode for UI testing
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 300));
      if (_mockShipper != null) {
        return Right(_mockShipper!);
      }
      return const Left(ServerFailure('Not logged in'));
    }
    
    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.getCurrentShipper();
        await _localDataSource.cacheShipper(result);
        return Right(result);
      } catch (e) {
        // Try to load from local cache if network request fails
        final cachedShipper = await _localDataSource.getCachedShipper();
        if (cachedShipper != null) {
          return Right(cachedShipper);
        }
        return Left(ServerFailure(e.toString()));
      }
    } else {
      // Try to load from local cache when offline
      final cachedShipper = await _localDataSource.getCachedShipper();
      if (cachedShipper != null) {
        return Right(cachedShipper);
      }
      return const Left(NetworkFailure());
    }
  }
  
  /// Check if user is authenticated by checking for stored token
  Future<bool> isAuthenticated() async {
    final token = await _localDataSource.getAccessToken();
    return token != null && token.isNotEmpty;
  }
}
