import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/network/api_client.dart';
import '../models/shipment_model.dart';

abstract class ShipmentRemoteDataSource {
  Future<List<ShipmentModel>> getActiveShipments();
  Future<List<ShipmentModel>> getHistory({DateTime? fromDate, DateTime? toDate});
  Future<ShipmentModel> getShipmentById(String id);
  Future<ShipmentModel> markPickedUp(String id);
  Future<ShipmentModel> markDelivered(String id, String photoPath, String? signaturePath);
  Future<ShipmentModel> markFailed(String id, String reason);
}

@LazySingleton(as: ShipmentRemoteDataSource)
class ShipmentRemoteDataSourceImpl implements ShipmentRemoteDataSource {
  final ApiClient _client;

  ShipmentRemoteDataSourceImpl(this._client);

  @override
  Future<List<ShipmentModel>> getActiveShipments() async {
    final response = await _client.get('/shipper/shipments/active');
    return (response as List).map((e) => ShipmentModel.fromJson(e)).toList();
  }

  @override
  Future<List<ShipmentModel>> getHistory({DateTime? fromDate, DateTime? toDate}) async {
    final response = await _client.get('/shipper/shipments/history', queryParameters: {
      if (fromDate != null) 'fromDate': fromDate.toIso8601String(),
      if (toDate != null) 'toDate': toDate.toIso8601String(),
    });
    return (response as List).map((e) => ShipmentModel.fromJson(e)).toList();
  }

  @override
  Future<ShipmentModel> getShipmentById(String id) async {
    final response = await _client.get('/shipper/shipments/$id');
    return ShipmentModel.fromJson(response);
  }

  @override
  Future<ShipmentModel> markPickedUp(String id) async {
    final response = await _client.post('/shipments/$id/status', data: {
      'status': 'picked_up',
    });
    return ShipmentModel.fromJson(response);
  }

  @override
  Future<ShipmentModel> markDelivered(String id, String photoPath, String? signaturePath) async {
    // Validate Property 4: Image Validation (Max 5MB) - Technically should be done in UI or Domain, 
    // but good to check here or ensure we send multipart correctly.
    
    final formData = FormData.fromMap({
      'status': 'delivered',
      'photo': await MultipartFile.fromFile(photoPath),
      if (signaturePath != null) 'signature': await MultipartFile.fromFile(signaturePath),
    });

    final response = await _client.post(
      '/shipments/$id/status',
      data: formData,
    );
    return ShipmentModel.fromJson(response);
  }

  @override
  Future<ShipmentModel> markFailed(String id, String reason) async {
    final response = await _client.post('/shipments/$id/status', data: {
      'status': 'failed',
      'failureReason': reason,
    });
    return ShipmentModel.fromJson(response);
  }
}
