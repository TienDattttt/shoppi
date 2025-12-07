import '../../domain/entities/address_entity.dart';

class AddressModel extends AddressEntity {
  const AddressModel({
    required super.fullAddress,
    required super.lat,
    required super.lng,
    super.district,
    super.city,
  });

  factory AddressModel.fromJson(Map<String, dynamic> json) {
    return AddressModel(
      fullAddress: json['fullAddress'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      district: json['district'] as String?,
      city: json['city'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'fullAddress': fullAddress,
      'lat': lat,
      'lng': lng,
      'district': district,
      'city': city,
    };
  }
}
