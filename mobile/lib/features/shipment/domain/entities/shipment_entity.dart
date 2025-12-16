import 'package:equatable/equatable.dart';
import 'address_entity.dart';

/// Tracking event for shipment history
class TrackingEvent extends Equatable {
  final String id;
  final String status;
  final String description;
  final DateTime timestamp;
  final String? location;
  final String? note;

  const TrackingEvent({
    required this.id,
    required this.status,
    required this.description,
    required this.timestamp,
    this.location,
    this.note,
  });

  factory TrackingEvent.fromJson(Map<String, dynamic> json) {
    return TrackingEvent(
      id: json['id'] ?? '',
      status: json['status'] ?? '',
      description: json['description'] ?? '',
      timestamp: json['timestamp'] != null 
          ? DateTime.parse(json['timestamp']) 
          : DateTime.now(),
      location: json['location'],
      note: json['note'],
    );
  }

  @override
  List<Object?> get props => [id, status, description, timestamp, location, note];
}

enum ShipmentStatus {
  created,
  pendingAssignment, // pending_assignment
  assigned,
  pickedUp, // picked_up
  inTransit, // in_transit - đang trung chuyển
  readyForDelivery, // ready_for_delivery - đã đến bưu cục giao, chờ shipper giao
  delivering,
  delivered,
  failed,
  pendingRedelivery, // pending_redelivery - chờ giao lại
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
  
  // Shipment type for shipper
  final String shipmentType; // 'pickup' | 'delivery' | 'both'
  
  // Transit info
  final String? sourceRegion;
  final String? destRegion;
  final bool isCrossRegion;
  
  // Tracking events
  final List<TrackingEvent> trackingEvents;

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
    this.shipmentType = 'both',
    this.sourceRegion,
    this.destRegion,
    this.isCrossRegion = false,
    this.trackingEvents = const [],
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
    deliveryAttempts, subOrderId, orderId, shipmentType, sourceRegion, destRegion, isCrossRegion, trackingEvents,
  ];
}
