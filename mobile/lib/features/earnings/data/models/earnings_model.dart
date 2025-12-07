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

  factory EarningsModel.fromJson(Map<String, dynamic> json) {
    return EarningsModel(
      totalEarnings: (json['totalEarnings'] as num).toDouble(),
      pendingBalance: (json['pendingBalance'] as num).toDouble(),
      paidBalance: (json['paidBalance'] as num).toDouble(),
      totalTrips: json['totalTrips'] as int,
      successRate: (json['successRate'] as num).toDouble(),
      weeklyChartData: (json['weeklyChartData'] as List)
          .map((e) => DailyEarning(
                date: DateTime.parse(e['date']),
                amount: (e['amount'] as num).toDouble(),
              ))
          .toList(),
    );
  }
}
