import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../domain/entities/location_entity.dart';
import '../../domain/repositories/location_repository.dart';
import '../datasources/location_data_source.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/api_client.dart';

@LazySingleton(as: LocationRepository)
class LocationRepositoryImpl implements LocationRepository {
  final LocationDataSource _dataSource;
  final ApiClient _apiClient; // To update location to server

  LocationRepositoryImpl(this._dataSource, this._apiClient);

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
  Future<Either<Failure, void>> updateLocationToServer(LocationEntity location) async {
    try {
      // Mock API call to update location
      await _apiClient.post('/shipper/location/update', data: {
        'lat': location.lat,
        'lng': location.lng,
        'speed': location.speed,
        'heading': location.heading,
      });
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
}
