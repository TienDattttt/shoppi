import 'package:equatable/equatable.dart';

class TrackingEventEntity extends Equatable {
  final String id;
  final String status;
  final String statusVi;
  final String? description;
  final String? descriptionVi;
  final String? locationName;
  final String? locationAddress;
  final double? lat;
  final double? lng;
  final String? actorName;
  final DateTime eventTime;

  const TrackingEventEntity({
    required this.id,
    required this.status,
    required this.statusVi,
    this.description,
    this.descriptionVi,
    this.locationName,
    this.locationAddress,
    this.lat,
    this.lng,
    this.actorName,
    required this.eventTime,
  });

  @override
  List<Object?> get props => [
        id,
        status,
        statusVi,
        description,
        descriptionVi,
        locationName,
        locationAddress,
        lat,
        lng,
        actorName,
        eventTime,
      ];

  /// Get icon based on status
  String get statusIcon {
    switch (status) {
      case 'order_placed':
        return '📦';
      case 'shop_confirmed':
        return '✅';
      case 'shop_packed':
        return '📦';
      case 'shipper_assigned':
        return '🛵';
      case 'picked_up':
        return '📤';
      case 'arrived_pickup_office':
        return '🏢';
      case 'left_pickup_office':
        return '🚚';
      case 'arrived_sorting_hub':
        return '🏭';
      case 'left_sorting_hub':
        return '🚛';
      case 'arrived_delivery_office':
        return '🏢';
      case 'out_for_delivery':
        return '🛵';
      case 'delivered':
        return '✅';
      case 'delivery_failed':
        return '❌';
      case 'returning':
        return '↩️';
      case 'returned':
        return '📦';
      default:
        return '📍';
    }
  }
}
