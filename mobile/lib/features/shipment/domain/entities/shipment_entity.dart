import 'package:equatable/equatable.dart';
import 'address_entity.dart';

enum ShipmentStatus {
  created,
  assigned,
  pickedUp, // picked_up
  delivering,
  delivered,
  failed,
  returning,
  returned,
}

class ShipmentEntity extends Equatable {
  final String id;
  final String trackingNumber;
  final ShipmentStatus status;
  
  // Pickup info
  final AddressEntity pickupAddress;
  final String pickupContactName;
  final String pickupContactPhone;
  
  // Delivery info
  final AddressEntity deliveryAddress;
  final String deliveryContactName;
  final String deliveryContactPhone;
  
  // Fees
  final double shippingFee;
  final double codAmount;
  final bool codCollected;
  
  // Distance & Time
  final double distanceKm;
  final int estimatedMinutes;
  
  final DateTime createdAt;
  final DateTime? pickedUpAt;
  final DateTime? deliveredAt;
  
  // Failure / Proof
  final String? failureReason;
  final String? deliveryPhotoUrl;
  final int deliveryAttempts;
  
  // Order info
  final String? subOrderId;
  final String? orderId;

  const ShipmentEntity({
    required this.id,
    required this.trackingNumber,
    required this.status,
    required this.pickupAddress,
    required this.pickupContactName,
    required this.pickupContactPhone,
    required this.deliveryAddress,
    required this.deliveryContactName,
    required this.deliveryContactPhone,
    required this.shippingFee,
    required this.codAmount,
    this.codCollected = false,
    required this.distanceKm,
    required this.estimatedMinutes,
    required this.createdAt,
    this.pickedUpAt,
    this.deliveredAt,
    this.failureReason,
    this.deliveryPhotoUrl,
    this.deliveryAttempts = 0,
    this.subOrderId,
    this.orderId,
  });

  /// Check if this is a COD order
  bool get isCod => codAmount > 0;
  
  /// Check if COD needs to be collected
  bool get needsCodCollection => isCod && !codCollected;

  @override
  List<Object?> get props => [
    id, trackingNumber, status, 
    pickupAddress, pickupContactName, pickupContactPhone,
    deliveryAddress, deliveryContactName, deliveryContactPhone,
    shippingFee, codAmount, codCollected, distanceKm, estimatedMinutes,
    createdAt, pickedUpAt, deliveredAt, failureReason, deliveryPhotoUrl,
    deliveryAttempts, subOrderId, orderId,
  ];
}
