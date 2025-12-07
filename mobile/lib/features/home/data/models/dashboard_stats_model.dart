import '../../domain/entities/dashboard_stats.dart';

class DashboardStatsModel extends DashboardStatsEntity {
  const DashboardStatsModel({
    required super.todayEarnings,
    required super.todayTrips,
    required super.currentRating,
    required super.activeShipmentsCount,
  });

  factory DashboardStatsModel.fromJson(Map<String, dynamic> json) {
    return DashboardStatsModel(
      todayEarnings: (json['todayEarnings'] as num).toDouble(),
      todayTrips: json['todayTrips'] as int,
      currentRating: (json['currentRating'] as num).toDouble(),
      activeShipmentsCount: json['activeShipmentsCount'] as int,
    );
  }
}
