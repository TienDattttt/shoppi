import 'package:equatable/equatable.dart';

class LocationEntity extends Equatable {
  final double lat;
  final double lng;
  final double? accuracy;
  final double? speed;
  final double? heading;
  final DateTime timestamp;

  const LocationEntity({
    required this.lat,
    required this.lng,
    this.accuracy,
    this.speed,
    this.heading,
    required this.timestamp,
  });

  @override
  List<Object?> get props => [lat, lng, accuracy, speed, heading, timestamp];
}
