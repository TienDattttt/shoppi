import '../../domain/entities/shipper.dart';

class ShipperModel extends ShipperEntity {
  const ShipperModel({
    required super.id,
    required super.userId,
    required super.fullName,
    required super.phone,
    required super.vehicleType,
    required super.vehiclePlate,
    required super.status,
    required super.isOnline,
    required super.avgRating,
    required super.totalDeliveries,
  });

  factory ShipperModel.fromJson(Map<String, dynamic> json) {
    return ShipperModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      fullName: json['fullName'] as String,
      phone: json['phone'] as String,
      vehicleType: json['vehicleType'] as String,
      vehiclePlate: json['vehiclePlate'] as String,
      status: json['status'] as String,
      isOnline: json['isOnline'] as bool? ?? false,
      avgRating: (json['avgRating'] as num?)?.toDouble() ?? 0.0,
      totalDeliveries: json['totalDeliveries'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'fullName': fullName,
      'phone': phone,
      'vehicleType': vehicleType,
      'vehiclePlate': vehiclePlate,
      'status': status,
      'isOnline': isOnline,
      'avgRating': avgRating,
      'totalDeliveries': totalDeliveries,
    };
  }
}

class LoginResponseModel {
  final String accessToken;
  final String refreshToken;
  final ShipperModel shipper;

  const LoginResponseModel({
    required this.accessToken,
    required this.refreshToken,
    required this.shipper,
  });

  factory LoginResponseModel.fromJson(Map<String, dynamic> json) {
    return LoginResponseModel(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      shipper: ShipperModel.fromJson(json['shipper'] as Map<String, dynamic>),
    );
  }
}
