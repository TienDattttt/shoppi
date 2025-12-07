import 'package:equatable/equatable.dart';

class DashboardStatsEntity extends Equatable {
  final double todayEarnings;
  final int todayTrips;
  final double currentRating;
  final int activeShipmentsCount;

  const DashboardStatsEntity({
    required this.todayEarnings,
    required this.todayTrips,
    required this.currentRating,
    required this.activeShipmentsCount,
  });

  @override
  List<Object?> get props => [todayEarnings, todayTrips, currentRating, activeShipmentsCount];
}
