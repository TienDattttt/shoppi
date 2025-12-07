import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/location_entity.dart';

abstract class LocationRepository {
  Stream<LocationEntity> getLocationStream();
  Future<Either<Failure, LocationEntity>> getCurrentLocation();
  Future<Either<Failure, void>> updateLocationToServer(LocationEntity location);
  Future<Either<Failure, bool>> isLocationServiceEnabled();
  Future<Either<Failure, bool>> checkPermission();
}
