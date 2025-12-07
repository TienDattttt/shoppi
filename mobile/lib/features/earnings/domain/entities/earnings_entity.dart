import 'package:equatable/equatable.dart';

class DailyEarning extends Equatable {
  final DateTime date;
  final double amount;

  const DailyEarning({required this.date, required this.amount});

  @override
  List<Object?> get props => [date, amount];
}

class EarningsEntity extends Equatable {
  final double totalEarnings;
  final double pendingBalance; // COD collected but not yet remitted or processed
  final double paidBalance;
  final int totalTrips;
  final double successRate; // 0.0 to 1.0
  final List<DailyEarning> weeklyChartData;

  const EarningsEntity({
    required this.totalEarnings,
    required this.pendingBalance,
    required this.paidBalance,
    required this.totalTrips,
    required this.successRate,
    required this.weeklyChartData,
  });

  @override
  List<Object?> get props => [totalEarnings, pendingBalance, paidBalance, totalTrips, successRate, weeklyChartData];
}
