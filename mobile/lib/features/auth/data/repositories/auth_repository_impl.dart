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
    return ShipperEntity(
      id: 'mock-shipper-123',
      userId: 'mock-user-123',
      phone: phone,
      fullName: 'Test Shipper',
      status: 'active',
      vehicleType: 'motorcycle',
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
    
    // This might be deprecated if we only use Otp but keeping for flexibility
    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.login(phone, password);
        await _localDataSource.cacheToken(result.accessToken, result.refreshToken);
        return Right(result.shipper);
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
        await _localDataSource.cacheToken(result.accessToken, result.refreshToken);
        return Right(result.shipper);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      // Validate Property 1: Token storage happens on success
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
        final result = await _remoteDataSource.register(params);
        await _localDataSource.cacheToken(result.accessToken, result.refreshToken);
        return Right(result.shipper);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, void>> logout() async {
    try {
      await _localDataSource.clearCache();
      // Optionally call remote logout endpoint
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
        return Right(result);
      } catch (e) {
         // Should try to load from local cache if we implemented profile caching
         // For now just error
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }
}
