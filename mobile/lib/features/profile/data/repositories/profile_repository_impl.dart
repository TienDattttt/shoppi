import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/network_info.dart';
import '../../../auth/domain/entities/shipper.dart';
import '../../domain/repositories/profile_repository.dart';
import '../datasources/profile_remote_data_source.dart';

@LazySingleton(as: ProfileRepository)
class ProfileRepositoryImpl implements ProfileRepository {
  final ProfileRemoteDataSource _remoteDataSource;
  final NetworkInfo _networkInfo;

  ProfileRepositoryImpl(this._remoteDataSource, this._networkInfo);

  @override
  Future<Either<Failure, ShipperEntity>> getProfile() async {
    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.getProfile();
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, ShipperEntity>> updateProfile(ShipperEntity shipper) async {
    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.updateProfile({
          'fullName': shipper.fullName,
          'vehicleType': shipper.vehicleType,
          'vehiclePlate': shipper.vehiclePlate,
        });
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, void>> changePassword(String currentPassword, String newPassword) async {
    if (await _networkInfo.isConnected) {
      try {
        await _remoteDataSource.changePassword(currentPassword, newPassword);
        return const Right(null);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }
}
