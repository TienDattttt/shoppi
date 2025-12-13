import '../../domain/entities/shipment_entity.dart';
import 'address_model.dart';

class ShipmentModel extends ShipmentEntity {
  const ShipmentModel({
    required super.id,
    required super.trackingNumber,
    required super.status,
    required AddressModel super.pickupAddress,
    required super.pickupContactName,
    required super.pickupContactPhone,
    required AddressModel super.deliveryAddress,
    required super.deliveryContactName,
    required super.deliveryContactPhone,
    required super.shippingFee,
    required super.codAmount,
    required super.distanceKm,
    required super.estimatedMinutes,
    required super.createdAt,
    super.pickedUpAt,
    super.deliveredAt,
    super.failureReason,
    super.deliveryPhotoUrl,
  });

  /// Parse from backend response (snake_case format)
  factory ShipmentModel.fromJson(Map<String, dynamic> json) {
    // Handle nested data structure
    final data = json['data'] ?? json;
    
    return ShipmentModel(
      id: data['id'] as String,
      trackingNumber: data['tracking_number'] as String? ?? 
                      data['trackingNumber'] as String? ?? '',
      status: _mapStatus(data['status'] as String? ?? 'created'),
      pickupAddress: _parsePickupAddress(data),
      pickupContactName: data['pickup_contact_name'] as String? ?? 
                         data['pickupContactName'] as String? ?? '',
      pickupContactPhone: data['pickup_contact_phone'] as String? ?? 
                          data['pickupContactPhone'] as String? ?? '',
      deliveryAddress: _parseDeliveryAddress(data),
      deliveryContactName: data['delivery_contact_name'] as String? ?? 
                           data['deliveryContactName'] as String? ?? '',
      deliveryContactPhone: data['delivery_contact_phone'] as String? ?? 
                            data['deliveryContactPhone'] as String? ?? '',
      shippingFee: (data['shipping_fee'] as num?)?.toDouble() ?? 
                   (data['shippingFee'] as num?)?.toDouble() ?? 0.0,
      codAmount: (data['cod_amount'] as num?)?.toDouble() ?? 
                 (data['codAmount'] as num?)?.toDouble() ?? 0.0,
      distanceKm: (data['distance_km'] as num?)?.toDouble() ?? 
                  (data['distanceKm'] as num?)?.toDouble() ?? 0.0,
      estimatedMinutes: data['estimated_duration_minutes'] as int? ?? 
                        data['estimatedMinutes'] as int? ?? 30,
      createdAt: _parseDateTime(data['created_at'] ?? data['createdAt']),
      pickedUpAt: _parseDateTimeNullable(data['picked_up_at'] ?? data['pickedUpAt']),
      deliveredAt: _parseDateTimeNullable(data['delivered_at'] ?? data['deliveredAt']),
      failureReason: data['failure_reason'] as String? ?? 
                     data['failureReason'] as String?,
      deliveryPhotoUrl: data['delivery_photo_url'] as String? ?? 
                        data['deliveryPhotoUrl'] as String?,
    );
  }

  /// Parse pickup address from flat or nested structure
  static AddressModel _parsePickupAddress(Map<String, dynamic> data) {
    // Check if nested pickupAddress object exists
    if (data['pickupAddress'] is Map<String, dynamic>) {
      return AddressModel.fromJson(data['pickupAddress'] as Map<String, dynamic>);
    }
    
    // Parse from flat structure (backend format)
    return AddressModel(
      fullAddress: data['pickup_address'] as String? ?? '',
      lat: (data['pickup_lat'] as num?)?.toDouble() ?? 0.0,
      lng: (data['pickup_lng'] as num?)?.toDouble() ?? 0.0,
    );
  }

  /// Parse delivery address from flat or nested structure
  static AddressModel _parseDeliveryAddress(Map<String, dynamic> data) {
    // Check if nested deliveryAddress object exists
    if (data['deliveryAddress'] is Map<String, dynamic>) {
      return AddressModel.fromJson(data['deliveryAddress'] as Map<String, dynamic>);
    }
    
    // Parse from flat structure (backend format)
    return AddressModel(
      fullAddress: data['delivery_address'] as String? ?? '',
      lat: (data['delivery_lat'] as num?)?.toDouble() ?? 0.0,
      lng: (data['delivery_lng'] as num?)?.toDouble() ?? 0.0,
    );
  }

  static DateTime _parseDateTime(dynamic value) {
    if (value == null) return DateTime.now();
    if (value is DateTime) return value;
    return DateTime.parse(value as String);
  }

  static DateTime? _parseDateTimeNullable(dynamic value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    return DateTime.parse(value as String);
  }

  static ShipmentStatus _mapStatus(String status) {
    switch (status) {
      case 'assigned':
        return ShipmentStatus.assigned;
      case 'picked_up':
      case 'pickedUp':
        return ShipmentStatus.pickedUp;
      case 'delivering':
        return ShipmentStatus.delivering;
      case 'delivered':
        return ShipmentStatus.delivered;
      case 'failed':
        return ShipmentStatus.failed;
      case 'created':
      default:
        return ShipmentStatus.created;
    }
  }
}
