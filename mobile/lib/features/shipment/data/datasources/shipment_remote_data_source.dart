import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/network/api_client.dart';
import '../models/shipment_model.dart';
import '../models/tracking_event_model.dart';

abstract class ShipmentRemoteDataSource {
  Future<List<ShipmentModel>> getActiveShipments();
  Future<List<ShipmentModel>> getHistory({DateTime? fromDate, DateTime? toDate});
  Future<ShipmentModel> getShipmentById(String id);
  Future<ShipmentModel> markPickedUp(String id);
  Future<ShipmentModel> markDelivered(String id, String photoPath, String? signaturePath);
  Future<ShipmentModel> markFailed(String id, String reason);
  Future<List<TrackingEventModel>> getTrackingHistory(String shipmentId);
}

@LazySingleton(as: ShipmentRemoteDataSource)
class ShipmentRemoteDataSourceImpl implements ShipmentRemoteDataSource {
  final ApiClient _client;

  ShipmentRemoteDataSourceImpl(this._client);

  @override
  Future<List<ShipmentModel>> getActiveShipments() async {
    // Backend endpoint: GET /api/shipments/active
    final response = await _client.get('/shipments/active');
    // Response is { data: [...] } which gets unwrapped to [...]
    if (response is List) {
      return response.map((e) => ShipmentModel.fromJson(e)).toList();
    }
    // Handle case where response might be wrapped in 'data' key
    final data = response['data'] ?? response;
    return (data as List).map((e) => ShipmentModel.fromJson(e)).toList();
  }

  @override
  Future<List<ShipmentModel>> getHistory({DateTime? fromDate, DateTime? toDate}) async {
    // Backend endpoint: GET /api/shipments?status=delivered,failed
    final response = await _client.get('/shipments', queryParameters: {
      'status': 'delivered,failed',
      if (fromDate != null) 'fromDate': fromDate.toIso8601String(),
      if (toDate != null) 'toDate': toDate.toIso8601String(),
    });
    if (response is List) {
      return response.map((e) => ShipmentModel.fromJson(e)).toList();
    }
    final data = response['data'] ?? response;
    return (data as List).map((e) => ShipmentModel.fromJson(e)).toList();
  }

  @override
  Future<ShipmentModel> getShipmentById(String id) async {
    // Backend endpoint: GET /api/shipments/:id
    final response = await _client.get('/shipments/$id');
    if (response is Map<String, dynamic> && response.containsKey('data')) {
      return ShipmentModel.fromJson(response['data']);
    }
    return ShipmentModel.fromJson(response);
  }

  @override
  Future<ShipmentModel> markPickedUp(String id) async {
    // Backend endpoint: PATCH /api/shipments/:id/status
    final response = await _client.patch('/shipments/$id/status', data: {
      'status': 'picked_up',
    });
    if (response is Map<String, dynamic> && response.containsKey('data')) {
      return ShipmentModel.fromJson(response['data']);
    }
    return ShipmentModel.fromJson(response);
  }

  @override
  Future<ShipmentModel> markDelivered(String id, String photoPath, String? signaturePath) async {
    // Backend endpoint: PATCH /api/shipments/:id/status
    // For now, send as JSON with URLs (photo upload should be done separately)
    // TODO: Implement proper file upload to storage first, then send URLs
    final response = await _client.patch('/shipments/$id/status', data: {
      'status': 'delivered',
      'photoUrl': photoPath, // Should be uploaded URL
      if (signaturePath != null) 'signatureUrl': signaturePath,
    });
    if (response is Map<String, dynamic> && response.containsKey('data')) {
      return ShipmentModel.fromJson(response['data']);
    }
    return ShipmentModel.fromJson(response);
  }

  @override
  Future<ShipmentModel> markFailed(String id, String reason) async {
    // Backend endpoint: PATCH /api/shipments/:id/status
    final response = await _client.patch('/shipments/$id/status', data: {
      'status': 'failed',
      'failureReason': reason,
    });
    if (response is Map<String, dynamic> && response.containsKey('data')) {
      return ShipmentModel.fromJson(response['data']);
    }
    return ShipmentModel.fromJson(response);
  }

  @override
  Future<List<TrackingEventModel>> getTrackingHistory(String shipmentId) async {
    // Backend endpoint: GET /api/shipments/:id/tracking
    final response = await _client.get('/shipments/$shipmentId/tracking');
    
    // Response format: { data: { shipment: {...}, events: [...] } }
    List<dynamic> events = [];
    if (response is Map<String, dynamic>) {
      if (response.containsKey('events')) {
        events = response['events'] as List;
      } else if (response.containsKey('data') && response['data'] is Map) {
        events = response['data']['events'] as List? ?? [];
      }
    }
    
    return events.map((e) => TrackingEventModel.fromJson(e)).toList();
  }
}
