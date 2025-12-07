import 'package:equatable/equatable.dart';

class ShipperEntity extends Equatable {
  final String id;
  final String userId;
  final String fullName;
  final String phone;
  final String vehicleType;
  final String vehiclePlate;
  final String status; // pending, active, suspended
  final bool isOnline;
  final double avgRating;
  final int totalDeliveries;

  const ShipperEntity({
    required this.id,
    required this.userId,
    required this.fullName,
    required this.phone,
    required this.vehicleType,
    required this.vehiclePlate,
    required this.status,
    required this.isOnline,
    required this.avgRating,
    required this.totalDeliveries,
  });

  @override
  List<Object?> get props => [
        id,
        userId,
        fullName,
        phone,
        vehicleType,
        vehiclePlate,
        status,
        isOnline,
        avgRating,
        totalDeliveries,
      ];
}
