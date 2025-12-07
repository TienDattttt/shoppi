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

  factory ShipmentModel.fromJson(Map<String, dynamic> json) {
    return ShipmentModel(
      id: json['id'] as String,
      trackingNumber: json['trackingNumber'] as String,
      status: _mapStatus(json['status'] as String),
      pickupAddress: AddressModel.fromJson(json['pickupAddress'] as Map<String, dynamic>),
      pickupContactName: json['pickupContactName'] as String,
      pickupContactPhone: json['pickupContactPhone'] as String,
      deliveryAddress: AddressModel.fromJson(json['deliveryAddress'] as Map<String, dynamic>),
      deliveryContactName: json['deliveryContactName'] as String,
      deliveryContactPhone: json['deliveryContactPhone'] as String,
      shippingFee: (json['shippingFee'] as num).toDouble(),
      codAmount: (json['codAmount'] as num).toDouble(),
      distanceKm: (json['distanceKm'] as num).toDouble(),
      estimatedMinutes: json['estimatedMinutes'] as int,
      createdAt: DateTime.parse(json['createdAt'] as String),
      pickedUpAt: json['pickedUpAt'] != null ? DateTime.parse(json['pickedUpAt'] as String) : null,
      deliveredAt: json['deliveredAt'] != null ? DateTime.parse(json['deliveredAt'] as String) : null,
      failureReason: json['failureReason'] as String?,
      deliveryPhotoUrl: json['deliveryPhotoUrl'] as String?,
    );
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
      default:
        return ShipmentStatus.created;
    }
  }
}
