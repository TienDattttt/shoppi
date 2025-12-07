import 'package:equatable/equatable.dart';
import 'address_entity.dart';

enum ShipmentStatus {
  created,
  assigned,
  pickedUp, // picked_up
  delivering,
  delivered,
  failed,
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
  
  // Distance & Time
  final double distanceKm;
  final int estimatedMinutes;
  
  final DateTime createdAt;
  final DateTime? pickedUpAt;
  final DateTime? deliveredAt;
  
  // Failure / Proof
  final String? failureReason;
  final String? deliveryPhotoUrl;

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
    required this.distanceKm,
    required this.estimatedMinutes,
    required this.createdAt,
    this.pickedUpAt,
    this.deliveredAt,
    this.failureReason,
    this.deliveryPhotoUrl,
  });

  @override
  List<Object?> get props => [
    id, trackingNumber, status, 
    pickupAddress, pickupContactName, pickupContactPhone,
    deliveryAddress, deliveryContactName, deliveryContactPhone,
    shippingFee, codAmount, distanceKm, estimatedMinutes,
    createdAt, pickedUpAt, deliveredAt, failureReason, deliveryPhotoUrl
  ];
}
