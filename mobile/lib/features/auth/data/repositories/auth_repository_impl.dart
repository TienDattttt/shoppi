import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
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

  AuthRepositoryImpl(
    this._remoteDataSource,
    this._localDataSource,
    this._networkInfo,
  );

  @override
  Future<Either<Failure, ShipperEntity>> login(String phone, String password) async {
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
