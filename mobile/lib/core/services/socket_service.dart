import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/app_config.dart';

/// Socket Service for real-time shipper location tracking
/// Inspired by Flutter-Delivery-App reference project
class SocketService {
  static SocketService? _instance;
  IO.Socket? _socket;
  bool _isConnected = false;

  SocketService._();

  static SocketService get instance {
    _instance ??= SocketService._();
    return _instance!;
  }

  bool get isConnected => _isConnected;

  /// Initialize socket connection
  void connect() {
    if (_socket != null && _isConnected) return;

    _socket = IO.io(
      AppConfig.wsBaseUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(1000)
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
      print('SocketService: Connected');
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      print('SocketService: Disconnected');
    });

    _socket!.onConnectError((error) {
      print('SocketService: Connection error - $error');
    });

    _socket!.connect();
  }

  /// Disconnect socket
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }

  /// Emit shipper location to server (for shipper app)
  /// Server will broadcast to clients tracking this shipment
  void emitShipperLocation({
    required String shipmentId,
    required String shipperId,
    required double latitude,
    required double longitude,
    double? heading,
    double? speed,
  }) {
    if (_socket == null || !_isConnected) {
      print('SocketService: Not connected, cannot emit location');
      return;
    }

    _socket!.emit('shipper:location', {
      'shipmentId': shipmentId,
      'shipperId': shipperId,
      'latitude': latitude,
      'longitude': longitude,
      'heading': heading ?? 0,
      'speed': speed ?? 0,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  /// Join a shipment room to receive location updates (for customer tracking)
  void joinShipmentTracking(String shipmentId) {
    if (_socket == null || !_isConnected) return;
    _socket!.emit('tracking:join', {'shipmentId': shipmentId});
  }

  /// Leave shipment tracking room
  void leaveShipmentTracking(String shipmentId) {
    if (_socket == null || !_isConnected) return;
    _socket!.emit('tracking:leave', {'shipmentId': shipmentId});
  }

  /// Listen for shipper location updates (for customer tracking)
  void onShipperLocationUpdate(
    String shipmentId,
    void Function(ShipperLocationUpdate) callback,
  ) {
    if (_socket == null) return;

    _socket!.on('shipper:location:$shipmentId', (data) {
      try {
        final update = ShipperLocationUpdate.fromJson(data);
        callback(update);
      } catch (e) {
        print('SocketService: Error parsing location update - $e');
      }
    });
  }

  /// Remove listener for shipper location updates
  void offShipperLocationUpdate(String shipmentId) {
    _socket?.off('shipper:location:$shipmentId');
  }

  /// Listen for shipment status updates
  void onShipmentStatusUpdate(void Function(ShipmentStatusUpdate) callback) {
    if (_socket == null) return;

    _socket!.on('shipment:status', (data) {
      try {
        final update = ShipmentStatusUpdate.fromJson(data);
        callback(update);
      } catch (e) {
        print('SocketService: Error parsing status update - $e');
      }
    });
  }

  /// Authenticate shipper after login
  void authenticateShipper(String shipperId, String token) {
    if (_socket == null || !_isConnected) return;
    _socket!.emit('shipper:auth', {
      'shipperId': shipperId,
      'token': token,
    });
  }
}

/// Shipper location update model
class ShipperLocationUpdate {
  final String shipmentId;
  final String shipperId;
  final LatLng location;
  final double heading;
  final double speed;
  final DateTime timestamp;

  ShipperLocationUpdate({
    required this.shipmentId,
    required this.shipperId,
    required this.location,
    required this.heading,
    required this.speed,
    required this.timestamp,
  });

  factory ShipperLocationUpdate.fromJson(Map<String, dynamic> json) {
    return ShipperLocationUpdate(
      shipmentId: json['shipmentId'] ?? '',
      shipperId: json['shipperId'] ?? '',
      location: LatLng(
        (json['latitude'] as num?)?.toDouble() ?? 0,
        (json['longitude'] as num?)?.toDouble() ?? 0,
      ),
      heading: (json['heading'] as num?)?.toDouble() ?? 0,
      speed: (json['speed'] as num?)?.toDouble() ?? 0,
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'])
          : DateTime.now(),
    );
  }
}

/// Shipment status update model
class ShipmentStatusUpdate {
  final String shipmentId;
  final String status;
  final String? message;
  final DateTime timestamp;

  ShipmentStatusUpdate({
    required this.shipmentId,
    required this.status,
    this.message,
    required this.timestamp,
  });

  factory ShipmentStatusUpdate.fromJson(Map<String, dynamic> json) {
    return ShipmentStatusUpdate(
      shipmentId: json['shipmentId'] ?? '',
      status: json['status'] ?? '',
      message: json['message'],
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'])
          : DateTime.now(),
    );
  }
}
