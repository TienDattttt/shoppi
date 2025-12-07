import 'package:equatable/equatable.dart';

class AddressEntity extends Equatable {
  final String fullAddress;
  final double lat;
  final double lng;
  final String? district;
  final String? city;

  const AddressEntity({
    required this.fullAddress,
    required this.lat,
    required this.lng,
    this.district,
    this.city,
  });

  @override
  List<Object?> get props => [fullAddress, lat, lng, district, city];
}
