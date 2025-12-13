import '../../domain/entities/address_entity.dart';

class AddressModel extends AddressEntity {
  const AddressModel({
    required super.fullAddress,
    required super.lat,
    required super.lng,
    super.district,
    super.city,
  });

  /// Parse from backend response (supports both camelCase and snake_case)
  factory AddressModel.fromJson(Map<String, dynamic> json) {
    return AddressModel(
      fullAddress: json['full_address'] as String? ?? 
                   json['fullAddress'] as String? ?? 
                   json['address'] as String? ?? '',
      lat: (json['lat'] as num?)?.toDouble() ?? 
           (json['latitude'] as num?)?.toDouble() ?? 0.0,
      lng: (json['lng'] as num?)?.toDouble() ?? 
           (json['longitude'] as num?)?.toDouble() ?? 0.0,
      district: json['district'] as String?,
      city: json['city'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'full_address': fullAddress,
      'lat': lat,
      'lng': lng,
      'district': district,
      'city': city,
    };
  }
}
