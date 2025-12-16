import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/services/socket_service.dart';
import '../../domain/entities/location_entity.dart';

abstract class LocationDataSource {
  Stream<LocationEntity> getLocationStream();
  Future<LocationEntity> getCurrentLocation();
  Future<bool> checkPermission();
  Future<bool> isServiceEnabled();
  Future<void> startTracking({String? shipmentId});
  Future<void> stopTracking();
  Future<void> sendLocationUpdate(LocationEntity location, {String? shipmentId});
}

/// Location data source implementation
/// Requirements: 13.4 - Send GPS location to backend every 30 seconds
@LazySingleton(as: LocationDataSource)
class LocationDataSourceImpl implements LocationDataSource {
  final ApiClient _client;
  final StreamController<LocationEntity> _locationController = StreamController.broadcast();
  StreamSubscription<Position>? _positionSubscription;
  Timer? _periodicUpdateTimer;
  bool _isTracking = false;
  LocationEntity? _lastLocation;
  String? _currentShipmentId;

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

  @override
  Future<void> startTracking({String? shipmentId}) async {
    if (_isTracking) return;
    _isTracking = true;
    _currentShipmentId = shipmentId;

    // Use distance filter from config
    final locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: AppConfig.locationDistanceFilter.toInt(),
    );

    // Listen to position stream for real-time updates
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
      _lastLocation = entity;
      _locationController.add(entity);
    });

    // Requirements: 13.4 - Send GPS updates every 30 seconds
    // Start periodic timer to send location to backend
    _periodicUpdateTimer = Timer.periodic(
      Duration(seconds: AppConfig.locationUpdateInterval),
      (_) => _sendPeriodicUpdate(),
    );

    // Send initial location immediately
    try {
      final initialLocation = await getCurrentLocation();
      _lastLocation = initialLocation;
      _locationController.add(initialLocation);
      await sendLocationUpdate(initialLocation, shipmentId: shipmentId);
    } catch (e) {
      // Ignore initial location error
    }
  }

  /// Send periodic location update to backend
  Future<void> _sendPeriodicUpdate() async {
    if (_lastLocation != null) {
      await sendLocationUpdate(_lastLocation!, shipmentId: _currentShipmentId);
    }
  }

  @override
  Future<void> sendLocationUpdate(LocationEntity location, {String? shipmentId}) async {
    try {
      // Backend endpoint: POST /api/shipper/location
      // Requirements: 4.1, 13.4 - Update shipper location
      await _client.post('/shipper/location', data: {
        'lat': location.lat,
        'lng': location.lng,
        'accuracy': location.accuracy,
        'heading': location.heading,
        'speed': location.speed,
        if (shipmentId != null) 'shipmentId': shipmentId,
      });

      // Also emit via Socket.io for real-time tracking
      // This allows customers to see shipper location in real-time
      if (shipmentId != null) {
        SocketService.instance.emitShipperLocation(
          shipmentId: shipmentId,
          shipperId: '', // Will be filled by backend from auth token
          latitude: location.lat,
          longitude: location.lng,
          heading: location.heading,
          speed: location.speed,
        );
      }
    } catch (e) {
      // Ignore error - location update failed, will retry on next interval
      // In production, could queue for retry or log to analytics
    }
  }

  @override
  Future<void> stopTracking() async {
    _isTracking = false;
    _currentShipmentId = null;
    
    // Cancel position stream subscription
    await _positionSubscription?.cancel();
    _positionSubscription = null;
    
    // Cancel periodic update timer
    _periodicUpdateTimer?.cancel();
    _periodicUpdateTimer = null;
  }
}
