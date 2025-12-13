import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/location_entity.dart';

abstract class LocationDataSource {
  Stream<LocationEntity> getLocationStream();
  Future<LocationEntity> getCurrentLocation();
  Future<bool> checkPermission();
  Future<bool> isServiceEnabled();
  Future<void> startTracking();
  Future<void> stopTracking();
}

@LazySingleton(as: LocationDataSource)
class LocationDataSourceImpl implements LocationDataSource {
  final ApiClient _client;
  final StreamController<LocationEntity> _locationController = StreamController.broadcast();
  StreamSubscription<Position>? _positionSubscription;
  bool _isTracking = false;

  LocationDataSourceImpl(this._client);

  @override
  Stream<LocationEntity> getLocationStream() {
    return _locationController.stream;
  }

  @override
  Future<LocationEntity> getCurrentLocation() async {
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
      ),
    );
    return LocationEntity(
      lat: position.latitude,
      lng: position.longitude,
      accuracy: position.accuracy,
      speed: position.speed,
      heading: position.heading,
      timestamp: position.timestamp,
    );
  }

  @override
  Future<bool> checkPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }
  
  @override
  Future<bool> isServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }

  String? _shipperId;
  
  /// Set shipper ID for location updates
  void setShipperId(String shipperId) {
    _shipperId = shipperId;
  }

  @override
  Future<void> startTracking() async {
    if (_isTracking) return;
    _isTracking = true;

    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 50, // Update every 50 meters
    );

    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen((Position position) async {
      final entity = LocationEntity(
        lat: position.latitude,
        lng: position.longitude,
        accuracy: position.accuracy,
        speed: position.speed,
        heading: position.heading,
        timestamp: position.timestamp,
      );
      _locationController.add(entity);

      // Send location update to backend
      // Backend endpoint: POST /api/shippers/:id/location
      if (_shipperId != null) {
        try {
          await _client.post('/shippers/$_shipperId/location', data: {
            'lat': position.latitude,
            'lng': position.longitude,
            'accuracy': position.accuracy,
            'heading': position.heading,
            'speed': position.speed,
          });
        } catch (e) {
          // Ignore error - location update failed, will retry on next position
        }
      }
    });
  }

  @override
  Future<void> stopTracking() async {
    _isTracking = false;
    await _positionSubscription?.cancel();
    _positionSubscription = null;
  }
}
