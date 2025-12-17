import 'package:injectable/injectable.dart';
import '../../../../core/network/api_client.dart';
import '../models/shipment_model.dart';
import '../models/tracking_event_model.dart';

/// Predefined failure reasons matching backend (Requirements: 8.1)
class FailureReasons {
  static const String customerNotAvailable = 'customer_not_available';
  static const String wrongAddress = 'wrong_address';
  static const String customerRefused = 'customer_refused';
  static const String customerRescheduled = 'customer_rescheduled';
  static const String damagedPackage = 'damaged_package';
  static const String other = 'other';
  
  static const List<String> all = [
    customerNotAvailable,
    wrongAddress,
    customerRefused,
    customerRescheduled,
    damagedPackage,
    other,
  ];
}

abstract class ShipmentRemoteDataSource {
  /// Get shipments for current shipper
  /// [status] can be 'pending', 'active', or 'completed'
  /// Requirements: 13.2
  Future<List<ShipmentModel>> getShipments({String status = 'active', int page = 1, int limit = 20});
  
  /// Get shipment history (completed/failed)
  Future<List<ShipmentModel>> getHistory({DateTime? fromDate, DateTime? toDate});
  
  /// Get shipment by ID
  Future<ShipmentModel> getShipmentById(String id);
  
  /// Mark shipment as picked up
  /// Requirements: 13.3
  Future<ShipmentModel> markPickedUp(String id, {Map<String, double>? location});
  
  /// Mark shipment as delivering (in transit to customer)
  Future<ShipmentModel> markDelivering(String id, {Map<String, double>? location});
  
  /// Mark shipment as delivered with proof
  /// Requirements: 7.1, 13.3
  Future<ShipmentModel> markDelivered(String id, {
    required String photoUrl,
    String? signatureUrl,
    required bool codCollected,
    Map<String, double>? location,
  });
  
  /// Mark shipment as failed with reason
  /// Requirements: 8.1, 13.3
  Future<ShipmentModel> markFailed(String id, String reason, {Map<String, double>? location});
  
  /// Reject assigned shipment
  /// Requirements: 3.4
  Future<void> rejectShipment(String id, String reason);
  
  /// Get tracking history for a shipment
  Future<List<TrackingEventModel>> getTrackingHistory(String shipmentId);
  
  /// Scan barcode to pickup shipment
  /// Requirements: Barcode scan for pickup confirmation
  Future<ShipmentModel> scanPickup(String trackingNumber, {Map<String, double>? location});
}

@LazySingleton(as: ShipmentRemoteDataSource)
class ShipmentRemoteDataSourceImpl implements ShipmentRemoteDataSource {
  final ApiClient _client;

  ShipmentRemoteDataSourceImpl(this._client);

  @override
  Future<List<ShipmentModel>> getShipments({String status = 'active', int page = 1, int limit = 20}) async {
    // Backend endpoint: GET /api/shipper/shipments
    // Requirements: 13.2 - Fetch shipments from /api/shipper/shipments
    final response = await _client.get('/shipper/shipments', queryParameters: {
      'status': status,
      'page': page,
      'limit': limit,
    });
    
    // Response format: { data: [...], pagination: {...} }
    List<dynamic> shipments = [];
    if (response is List) {
      shipments = response;
    } else if (response is Map<String, dynamic>) {
      shipments = response['data'] as List? ?? [];
    }
    
    return shipments.map((e) => ShipmentModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<List<ShipmentModel>> getHistory({DateTime? fromDate, DateTime? toDate}) async {
    // Backend endpoint: GET /api/shipper/shipments?status=completed
    final response = await _client.get('/shipper/shipments', queryParameters: {
      'status': 'completed',
      if (fromDate != null) 'fromDate': fromDate.toIso8601String(),
      if (toDate != null) 'toDate': toDate.toIso8601String(),
    });
    
    List<dynamic> shipments = [];
    if (response is List) {
      shipments = response;
    } else if (response is Map<String, dynamic>) {
      shipments = response['data'] as List? ?? [];
    }
    
    return shipments.map((e) => ShipmentModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<ShipmentModel> getShipmentById(String id) async {
    // Backend endpoint: GET /api/shipper/shipments/:id
    final response = await _client.get('/shipper/shipments/$id');
    
    if (response is Map<String, dynamic>) {
      final data = response['data'] ?? response;
      return ShipmentModel.fromJson(data as Map<String, dynamic>);
    }
    throw Exception('Invalid response format');
  }

  @override
  Future<ShipmentModel> markPickedUp(String id, {Map<String, double>? location}) async {
    // Backend endpoint: POST /api/shipper/shipments/:id/status
    // Requirements: 13.3 - Update status via /api/shipper/shipments/:id/status
    final response = await _client.post('/shipper/shipments/$id/status', data: {
      'status': 'picked_up',
      if (location != null) 'location': location,
    });
    
    if (response is Map<String, dynamic>) {
      final data = response['data'] ?? response;
      return ShipmentModel.fromJson(data as Map<String, dynamic>);
    }
    throw Exception('Invalid response format');
  }

  @override
  Future<ShipmentModel> markDelivering(String id, {Map<String, double>? location}) async {
    // Backend endpoint: POST /api/shipper/shipments/:id/status
    final response = await _client.post('/shipper/shipments/$id/status', data: {
      'status': 'delivering',
      if (location != null) 'location': location,
    });
    
    if (response is Map<String, dynamic>) {
      final data = response['data'] ?? response;
      return ShipmentModel.fromJson(data as Map<String, dynamic>);
    }
    throw Exception('Invalid response format');
  }

  @override
  Future<ShipmentModel> markDelivered(String id, {
    required String photoUrl,
    String? signatureUrl,
    required bool codCollected,
    Map<String, double>? location,
  }) async {
    // Backend endpoint: POST /api/shipper/shipments/:id/status
    // Requirements: 7.1 - Photo required for delivered status
    // Requirements: 6.2 - COD collection confirmation required
    final response = await _client.post('/shipper/shipments/$id/status', data: {
      'status': 'delivered',
      'photoUrl': photoUrl,
      if (signatureUrl != null) 'signatureUrl': signatureUrl,
      'codCollected': codCollected,
      if (location != null) 'location': location,
    });
    
    if (response is Map<String, dynamic>) {
      final data = response['data'] ?? response;
      return ShipmentModel.fromJson(data as Map<String, dynamic>);
    }
    throw Exception('Invalid response format');
  }

  @override
  Future<ShipmentModel> markFailed(String id, String reason, {Map<String, double>? location}) async {
    // Backend endpoint: POST /api/shipper/shipments/:id/status
    // Requirements: 8.1 - Reason required from predefined list
    if (!FailureReasons.all.contains(reason)) {
      throw Exception('Invalid failure reason. Must be one of: ${FailureReasons.all.join(', ')}');
    }
    
    final response = await _client.post('/shipper/shipments/$id/status', data: {
      'status': 'failed',
      'reason': reason,
      if (location != null) 'location': location,
    });
    
    if (response is Map<String, dynamic>) {
      final data = response['data'] ?? response;
      return ShipmentModel.fromJson(data as Map<String, dynamic>);
    }
    throw Exception('Invalid response format');
  }

  @override
  Future<void> rejectShipment(String id, String reason) async {
    // Backend endpoint: POST /api/shipper/shipments/:id/reject
    // Requirements: 3.4 - Handle shipper rejection
    await _client.post('/shipper/shipments/$id/reject', data: {
      'reason': reason,
    });
  }

  @override
  Future<List<TrackingEventModel>> getTrackingHistory(String shipmentId) async {
    // Backend endpoint: GET /api/shipments/:id/tracking
    final response = await _client.get('/shipments/$shipmentId/tracking');
    
    List<dynamic> events = [];
    if (response is Map<String, dynamic>) {
      if (response.containsKey('events')) {
        events = response['events'] as List;
      } else if (response.containsKey('data') && response['data'] is Map) {
        events = (response['data'] as Map)['events'] as List? ?? [];
      }
    }
    
    return events.map((e) => TrackingEventModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<ShipmentModel> scanPickup(String trackingNumber, {Map<String, double>? location}) async {
    // Backend endpoint: POST /api/shipper/shipments/scan/pickup
    // Validates tracking number and marks as picked_up
    final response = await _client.post('/shipper/shipments/scan/pickup', data: {
      'trackingNumber': trackingNumber,
      if (location != null) 'location': location,
    });
    
    print('[ShipmentRemoteDataSource] scanPickup response: $response');
    
    if (response is Map<String, dynamic>) {
      // ApiClient unwraps { success, data } -> data
      // So response is: { message, shipment, scannedAt, action }
      final shipmentData = response['shipment'] ?? response;
      print('[ShipmentRemoteDataSource] scanPickup parsed shipment: $shipmentData');
      final model = ShipmentModel.fromJson(shipmentData as Map<String, dynamic>);
      print('[ShipmentRemoteDataSource] scanPickup model status: ${model.status}');
      return model;
    }
    throw Exception('Invalid response format');
  }
}
