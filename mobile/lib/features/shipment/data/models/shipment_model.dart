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
    super.codCollected,
    super.deliveryAttempts,
    super.subOrderId,
    super.orderId,
    super.shipmentType,
    super.sourceRegion,
    super.destRegion,
    super.isCrossRegion,
  });

  /// Parse from backend response (snake_case format)
  /// Handles the shipper mobile API response format
  factory ShipmentModel.fromJson(Map<String, dynamic> json) {
    // Handle nested data structure
    final data = json['data'] ?? json;
    
    // Parse pickup info from nested structure (shipper mobile API format)
    final pickup = data['pickup'] as Map<String, dynamic>?;
    final delivery = data['delivery'] as Map<String, dynamic>?;
    final cod = data['cod'] as Map<String, dynamic>?;
    final timestamps = data['timestamps'] as Map<String, dynamic>?;
    
    return ShipmentModel(
      id: data['id'] as String,
      trackingNumber: data['trackingNumber'] as String? ?? 
                      data['tracking_number'] as String? ?? '',
      status: _mapStatus(data['status'] as String? ?? 'created'),
      pickupAddress: _parsePickupAddress(data, pickup),
      pickupContactName: pickup?['contactName'] as String? ??
                         data['pickup_contact_name'] as String? ?? '',
      pickupContactPhone: pickup?['contactPhone'] as String? ??
                          data['pickup_contact_phone'] as String? ?? '',
      deliveryAddress: _parseDeliveryAddress(data, delivery),
      deliveryContactName: delivery?['contactName'] as String? ??
                           data['delivery_contact_name'] as String? ?? '',
      deliveryContactPhone: delivery?['contactPhone'] as String? ??
                            data['delivery_contact_phone'] as String? ?? '',
      shippingFee: (data['shippingFee'] as num?)?.toDouble() ?? 
                   (data['shipping_fee'] as num?)?.toDouble() ?? 0.0,
      codAmount: (cod?['amount'] as num?)?.toDouble() ??
                 (data['cod_amount'] as num?)?.toDouble() ?? 0.0,
      codCollected: cod?['collected'] as bool? ?? 
                    data['cod_collected'] as bool? ?? false,
      distanceKm: (data['distanceKm'] as num?)?.toDouble() ?? 
                  (data['distance_km'] as num?)?.toDouble() ?? 0.0,
      estimatedMinutes: data['estimatedDurationMinutes'] as int? ?? 
                        data['estimated_duration_minutes'] as int? ?? 30,
      createdAt: _parseDateTime(timestamps?['created'] ?? data['created_at']),
      pickedUpAt: _parseDateTimeNullable(timestamps?['pickedUp'] ?? data['picked_up_at']),
      deliveredAt: _parseDateTimeNullable(timestamps?['delivered'] ?? data['delivered_at']),
      failureReason: data['failureReason'] as String? ?? 
                     data['failure_reason'] as String?,
      deliveryPhotoUrl: data['deliveryPhotoUrl'] as String? ?? 
                        data['delivery_photo_url'] as String?,
      deliveryAttempts: data['deliveryAttempts'] as int? ??
                        data['delivery_attempts'] as int? ?? 0,
      subOrderId: data['subOrderId'] as String? ?? data['sub_order_id'] as String?,
      orderId: data['orderId'] as String? ?? data['order_id'] as String?,
      shipmentType: data['shipmentType'] as String? ?? 
                    data['shipment_type'] as String? ?? 'both',
      sourceRegion: _parseTransitRegion(data, 'sourceRegion', 'source_region'),
      destRegion: _parseTransitRegion(data, 'destRegion', 'dest_region'),
      isCrossRegion: _parseTransitBool(data, 'isCrossRegion', 'is_cross_region'),
    );
  }
  
  /// Parse transit region from nested or flat structure
  static String? _parseTransitRegion(Map<String, dynamic> data, String camelKey, String snakeKey) {
    final transit = data['transit'] as Map<String, dynamic>?;
    if (transit != null) {
      return transit[camelKey] as String? ?? transit[snakeKey] as String?;
    }
    return data[camelKey] as String? ?? data[snakeKey] as String?;
  }
  
  /// Parse transit boolean from nested or flat structure
  static bool _parseTransitBool(Map<String, dynamic> data, String camelKey, String snakeKey) {
    final transit = data['transit'] as Map<String, dynamic>?;
    if (transit != null) {
      return transit[camelKey] as bool? ?? transit[snakeKey] as bool? ?? false;
    }
    return data[camelKey] as bool? ?? data[snakeKey] as bool? ?? false;
  }

  /// Parse pickup address from flat or nested structure
  static AddressModel _parsePickupAddress(Map<String, dynamic> data, Map<String, dynamic>? pickup) {
    // Check if nested pickup object exists (shipper mobile API format)
    if (pickup != null) {
      return AddressModel(
        fullAddress: pickup['address'] as String? ?? '',
        lat: (pickup['lat'] as num?)?.toDouble() ?? 0.0,
        lng: (pickup['lng'] as num?)?.toDouble() ?? 0.0,
      );
    }
    
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
  static AddressModel _parseDeliveryAddress(Map<String, dynamic> data, Map<String, dynamic>? delivery) {
    // Check if nested delivery object exists (shipper mobile API format)
    if (delivery != null) {
      return AddressModel(
        fullAddress: delivery['address'] as String? ?? '',
        lat: (delivery['lat'] as num?)?.toDouble() ?? 0.0,
        lng: (delivery['lng'] as num?)?.toDouble() ?? 0.0,
      );
    }
    
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
    try {
      return DateTime.parse(value as String);
    } catch (e) {
      return null;
    }
  }

  static ShipmentStatus _mapStatus(String status) {
    switch (status) {
      case 'pending_assignment':
      case 'pendingAssignment':
        return ShipmentStatus.pendingAssignment;
      case 'assigned':
        return ShipmentStatus.assigned;
      case 'picked_up':
      case 'pickedUp':
        return ShipmentStatus.pickedUp;
      case 'in_transit':
      case 'inTransit':
        return ShipmentStatus.inTransit;
      case 'ready_for_delivery':
      case 'readyForDelivery':
        return ShipmentStatus.readyForDelivery;
      case 'delivering':
      case 'out_for_delivery':
        return ShipmentStatus.delivering;
      case 'delivered':
        return ShipmentStatus.delivered;
      case 'failed':
        return ShipmentStatus.failed;
      case 'pending_redelivery':
      case 'pendingRedelivery':
        return ShipmentStatus.pendingRedelivery;
      case 'returning':
        return ShipmentStatus.returning;
      case 'returned':
        return ShipmentStatus.returned;
      case 'created':
      default:
        return ShipmentStatus.created;
    }
  }
}
