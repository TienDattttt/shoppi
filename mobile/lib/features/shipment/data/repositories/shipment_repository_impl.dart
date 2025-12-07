import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/network_info.dart';
import '../../domain/entities/shipment_entity.dart';
import '../../domain/repositories/shipment_repository.dart';
import '../datasources/shipment_remote_data_source.dart';

@LazySingleton(as: ShipmentRepository)
class ShipmentRepositoryImpl implements ShipmentRepository {
  final ShipmentRemoteDataSource _remoteDataSource;
  final NetworkInfo _networkInfo;

  ShipmentRepositoryImpl(this._remoteDataSource, this._networkInfo);

  @override
  Future<Either<Failure, List<ShipmentEntity>>> getActiveShipments() async {
    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.getActiveShipments();
        // Validation Property 5: Active shipments sorted by distance.
        // Assuming API returns sorted, or we sort here. 
        // Let's sort locally to guarantee Property 5.
        // Note: Sort logic needs current location, if distanceKm is relative to current location it's fine.
        result.sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      // TODO: Implement local storage cache for offline viewing
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, List<ShipmentEntity>>> getShipmentHistory({DateTime? fromDate, DateTime? toDate}) async {
    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.getHistory(fromDate: fromDate, toDate: toDate);
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, ShipmentEntity>> getShipmentById(String id) async {
     if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.getShipmentById(id);
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, ShipmentEntity>> markPickedUp(String id) async {
     if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.markPickedUp(id);
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, ShipmentEntity>> markDelivered(String id, String photoUrl, String? signatureUrl) async {
     if (await _networkInfo.isConnected) {
      try {
        // Here photoUrl is effectively a file path for remote upload
        final result = await _remoteDataSource.markDelivered(id, photoUrl, signatureUrl);
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, ShipmentEntity>> markFailed(String id, String reason) async {
     if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.markFailed(id, reason);
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }
}
