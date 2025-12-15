import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../domain/entities/location_entity.dart';
import '../../domain/repositories/location_repository.dart';
import '../datasources/location_data_source.dart';
import '../../../../core/errors/failures.dart';

/// Location repository implementation
/// Requirements: 13.4 - Send GPS location to backend every 30 seconds
@LazySingleton(as: LocationRepository)
class LocationRepositoryImpl implements LocationRepository {
  final LocationDataSource _dataSource;

  LocationRepositoryImpl(this._dataSource);

  @override
  Stream<LocationEntity> getLocationStream() {
    return _dataSource.getLocationStream();
  }

  @override
  Future<Either<Failure, LocationEntity>> getCurrentLocation() async {
    try {
      final hasPermission = await _dataSource.checkPermission();
      if (!hasPermission) {
        return const Left(LocationFailure('Location permission denied'));
      }
      final location = await _dataSource.getCurrentLocation();
      return Right(location);
    } catch (e) {
      return Left(LocationFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> updateLocationToServer(LocationEntity location, {String? shipmentId}) async {
    try {
      // Requirements: 4.1, 13.4 - Update shipper location
      await _dataSource.sendLocationUpdate(location, shipmentId: shipmentId);
      return const Right(null);
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
  
  @override
  Future<Either<Failure, bool>> isLocationServiceEnabled() async {
    try {
      final result = await _dataSource.isServiceEnabled();
      return Right(result);
    } catch (e) {
      return Left(LocationFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, bool>> checkPermission() async {
    try {
      final result = await _dataSource.checkPermission();
      return Right(result);
    } catch (e) {
      return Left(LocationFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> startTracking({String? shipmentId}) async {
    try {
      // Requirements: 13.4 - Use background location service
      await _dataSource.startTracking(shipmentId: shipmentId);
      return const Right(null);
    } catch (e) {
      return Left(LocationFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> stopTracking() async {
    try {
      await _dataSource.stopTracking();
      return const Right(null);
    } catch (e) {
      return Left(LocationFailure(e.toString()));
    }
  }
}
