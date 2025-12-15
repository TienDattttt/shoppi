import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/location_entity.dart';

/// Location repository interface
/// Requirements: 13.4 - Send GPS location to backend every 30 seconds
abstract class LocationRepository {
  /// Get stream of location updates
  Stream<LocationEntity> getLocationStream();
  
  /// Get current location
  Future<Either<Failure, LocationEntity>> getCurrentLocation();
  
  /// Send location update to server
  /// [shipmentId] - Optional shipment ID to associate with location
  Future<Either<Failure, void>> updateLocationToServer(LocationEntity location, {String? shipmentId});
  
  /// Check if location service is enabled
  Future<Either<Failure, bool>> isLocationServiceEnabled();
  
  /// Check and request location permission
  Future<Either<Failure, bool>> checkPermission();
  
  /// Start location tracking with periodic updates
  /// [shipmentId] - Optional shipment ID to associate with location updates
  /// Requirements: 13.4 - Use background location service
  Future<Either<Failure, void>> startTracking({String? shipmentId});
  
  /// Stop location tracking
  Future<Either<Failure, void>> stopTracking();
}
