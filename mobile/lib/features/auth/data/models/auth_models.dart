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
    super.successRate,
  });

  /// Parse from backend response (snake_case)
  factory ShipperModel.fromJson(Map<String, dynamic> json) {
    // Handle nested data structure from backend
    final data = json['data'] ?? json;
    
    return ShipperModel(
      id: data['id'] as String,
      userId: data['user_id'] as String? ?? data['userId'] as String? ?? '',
      fullName: data['full_name'] as String? ?? 
                data['fullName'] as String? ?? 
                (data['user'] as Map<String, dynamic>?)?['full_name'] as String? ?? '',
      phone: data['phone'] as String? ?? 
             (data['user'] as Map<String, dynamic>?)?['phone'] as String? ?? '',
      vehicleType: data['vehicle_type'] as String? ?? data['vehicleType'] as String? ?? 'motorbike',
      vehiclePlate: data['vehicle_plate'] as String? ?? data['vehiclePlate'] as String? ?? '',
      status: data['status'] as String? ?? 'pending',
      isOnline: data['is_online'] as bool? ?? data['isOnline'] as bool? ?? false,
      avgRating: (data['avg_rating'] as num?)?.toDouble() ?? 
                 (data['avgRating'] as num?)?.toDouble() ?? 
                 (data['statistics'] as Map<String, dynamic>?)?['avgRating'] as double? ?? 0.0,
      totalDeliveries: data['total_deliveries'] as int? ?? 
                       data['totalDeliveries'] as int? ?? 
                       (data['statistics'] as Map<String, dynamic>?)?['totalDeliveries'] as int? ?? 0,
      successRate: (data['success_rate'] as num?)?.toDouble() ?? 
                   (data['successRate'] as num?)?.toDouble() ?? 
                   (data['statistics'] as Map<String, dynamic>?)?['successRate'] as double? ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'full_name': fullName,
      'phone': phone,
      'vehicle_type': vehicleType,
      'vehicle_plate': vehiclePlate,
      'status': status,
      'is_online': isOnline,
      'avg_rating': avgRating,
      'total_deliveries': totalDeliveries,
      'success_rate': successRate,
    };
  }
}

class LoginResponseModel {
  final String accessToken;
  final String? refreshToken;
  final UserModel? user;
  final ShipperModel? shipper;
  final String? message;

  const LoginResponseModel({
    required this.accessToken,
    this.refreshToken,
    this.user,
    this.shipper,
    this.message,
  });

  /// Parse from backend response
  /// Login returns: { accessToken, refreshToken, user: {...}, shipper: {...} }
  /// Register returns: { user: {...}, message: "..." } (no token for pending approval)
  factory LoginResponseModel.fromJson(Map<String, dynamic> json) {
    // Handle nested data structure
    final data = json['data'] ?? json;
    
    // Parse shipper data - may be nested in user or at root level
    ShipperModel? shipperModel;
    if (data['shipper'] != null) {
      shipperModel = ShipperModel.fromJson(data['shipper'] as Map<String, dynamic>);
    }
    
    return LoginResponseModel(
      // Token may be empty for registration (pending approval)
      accessToken: data['accessToken'] as String? ?? 
                   data['access_token'] as String? ?? '',
      refreshToken: data['refreshToken'] as String? ?? 
                    data['refresh_token'] as String?,
      user: data['user'] != null 
          ? UserModel.fromJson(data['user'] as Map<String, dynamic>)
          : null,
      shipper: shipperModel,
      message: data['message'] as String?,
    );
  }
  
  /// Check if this response has valid authentication tokens
  bool get hasValidToken => accessToken.isNotEmpty;
}

/// User model from auth response
class UserModel {
  final String id;
  final String? email;
  final String? phone;
  final String? fullName;
  final String role;
  final String? avatarUrl;

  const UserModel({
    required this.id,
    this.email,
    this.phone,
    this.fullName,
    required this.role,
    this.avatarUrl,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      fullName: json['full_name'] as String? ?? json['fullName'] as String?,
      role: json['role'] as String? ?? 'shipper',
      avatarUrl: json['avatar_url'] as String? ?? json['avatarUrl'] as String?,
    );
  }
}
