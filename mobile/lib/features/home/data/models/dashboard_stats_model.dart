import '../../domain/entities/dashboard_stats.dart';

class DashboardStatsModel extends DashboardStatsEntity {
  const DashboardStatsModel({
    required super.todayEarnings,
    required super.todayTrips,
    required super.currentRating,
    required super.activeShipmentsCount,
  });

  /// Parse from single JSON response (legacy format)
  factory DashboardStatsModel.fromJson(Map<String, dynamic> json) {
    final data = json['data'] ?? json;
    return DashboardStatsModel(
      todayEarnings: (data['todayEarnings'] as num?)?.toDouble() ?? 
                     (data['today_earnings'] as num?)?.toDouble() ?? 
                     (data['totalEarnings'] as num?)?.toDouble() ?? 0.0,
      todayTrips: data['todayTrips'] as int? ?? 
                  data['today_trips'] as int? ?? 
                  data['totalDeliveries'] as int? ?? 0,
      currentRating: (data['currentRating'] as num?)?.toDouble() ?? 
                     (data['current_rating'] as num?)?.toDouble() ?? 
                     (data['avg_rating'] as num?)?.toDouble() ?? 0.0,
      activeShipmentsCount: data['activeShipmentsCount'] as int? ?? 
                            data['active_shipments_count'] as int? ?? 0,
    );
  }

  /// Build stats from multiple API responses
  factory DashboardStatsModel.fromMultipleSources({
    required dynamic earnings,
    required dynamic shipper,
    required dynamic activeShipments,
  }) {
    // Parse earnings data
    final earningsData = earnings is Map<String, dynamic> 
        ? (earnings['data'] ?? earnings) 
        : <String, dynamic>{};
    
    // Parse shipper data
    final shipperData = shipper is Map<String, dynamic> 
        ? (shipper['data'] ?? shipper) 
        : <String, dynamic>{};
    
    // Parse active shipments (could be list or object with data key)
    int activeCount = 0;
    if (activeShipments is List) {
      activeCount = activeShipments.length;
    } else if (activeShipments is Map<String, dynamic>) {
      final data = activeShipments['data'];
      if (data is List) {
        activeCount = data.length;
      }
    }

    return DashboardStatsModel(
      todayEarnings: (earningsData['totalEarnings'] as num?)?.toDouble() ?? 
                     (earningsData['total_earnings'] as num?)?.toDouble() ?? 0.0,
      todayTrips: earningsData['totalDeliveries'] as int? ?? 
                  earningsData['total_deliveries'] as int? ?? 0,
      currentRating: (shipperData['avg_rating'] as num?)?.toDouble() ?? 
                     (shipperData['avgRating'] as num?)?.toDouble() ?? 0.0,
      activeShipmentsCount: activeCount,
    );
  }
}
