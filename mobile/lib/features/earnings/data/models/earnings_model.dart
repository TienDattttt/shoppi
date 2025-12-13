import '../../domain/entities/earnings_entity.dart';

class EarningsModel extends EarningsEntity {
  const EarningsModel({
    required super.totalEarnings,
    required super.pendingBalance,
    required super.paidBalance,
    required super.totalTrips,
    required super.successRate,
    required super.weeklyChartData,
  });

  /// Parse from backend response (supports both camelCase and snake_case)
  factory EarningsModel.fromJson(Map<String, dynamic> json) {
    // Handle nested data structure
    final data = json['data'] ?? json;
    
    // Parse weekly chart data if available
    List<DailyEarning> chartData = [];
    final deliveries = data['deliveries'] as List?;
    if (deliveries != null) {
      // Group deliveries by date for chart
      final Map<String, double> dailyTotals = {};
      for (final d in deliveries) {
        final deliveredAt = d['deliveredAt'] as String?;
        if (deliveredAt != null) {
          final date = DateTime.parse(deliveredAt).toLocal();
          final dateKey = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
          dailyTotals[dateKey] = (dailyTotals[dateKey] ?? 0) + 
              ((d['shippingFee'] as num?)?.toDouble() ?? 0);
        }
      }
      chartData = dailyTotals.entries
          .map((e) => DailyEarning(date: DateTime.parse(e.key), amount: e.value))
          .toList()
        ..sort((a, b) => a.date.compareTo(b.date));
    }
    
    // Also check for weeklyChartData from mock or formatted response
    if (data['weeklyChartData'] is List) {
      chartData = (data['weeklyChartData'] as List)
          .map((e) => DailyEarning(
                date: DateTime.parse(e['date'] as String),
                amount: (e['amount'] as num).toDouble(),
              ))
          .toList();
    }

    final totalDeliveries = data['totalDeliveries'] as int? ?? 
                            data['total_deliveries'] as int? ?? 0;
    
    return EarningsModel(
      totalEarnings: (data['totalEarnings'] as num?)?.toDouble() ?? 
                     (data['total_earnings'] as num?)?.toDouble() ?? 0.0,
      pendingBalance: (data['pendingBalance'] as num?)?.toDouble() ?? 
                      (data['pending_balance'] as num?)?.toDouble() ?? 0.0,
      paidBalance: (data['paidBalance'] as num?)?.toDouble() ?? 
                   (data['paid_balance'] as num?)?.toDouble() ?? 0.0,
      totalTrips: totalDeliveries,
      successRate: totalDeliveries > 0 ? 100.0 : 0.0, // All returned are successful
      weeklyChartData: chartData,
    );
  }
}
