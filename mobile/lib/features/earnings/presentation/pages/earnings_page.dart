import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/features/earnings/domain/entities/earnings_entity.dart';
import 'package:mobile/features/earnings/presentation/cubit/earnings_cubit.dart';
import 'package:mobile/injection.dart';

class EarningsPage extends StatelessWidget {
  const EarningsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => getIt<EarningsCubit>()..fetchEarnings(),
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: Text("Earnings", style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold)),
          backgroundColor: Colors.transparent,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          centerTitle: true,
        ),
        body: BlocBuilder<EarningsCubit, EarningsState>(
          builder: (context, state) {
            if (state is EarningsLoading) {
              return const Center(child: CircularProgressIndicator());
            } else if (state is EarningsError) {
              return Center(child: Text(state.message));
            } else if (state is EarningsLoaded) {
              return _buildContent(context, state.earnings);
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, EarningsEntity earnings) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Total Earnings Card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF4838D1), Color(0xFF2980B9)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF4838D1).withOpacity(0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                const Text("Total Balance", style: TextStyle(color: Colors.white70, fontSize: 14)),
                const SizedBox(height: 8),
                Text(
                  "\$${earnings.totalEarnings.toStringAsFixed(2)}",
                  style: GoogleFonts.plusJakartaSans(
                    color: Colors.white,
                    fontSize: 36,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildBalanceItem("Withdrawable", "\$${earnings.paidBalance}", Colors.white),
                    Container(height: 40, width: 1, color: Colors.white24),
                    _buildBalanceItem("Pending (COD)", "\$${earnings.pendingBalance}", Colors.orangeAccent),
                  ],
                )
              ],
            ),
          ),
          const SizedBox(height: 24),
          
          // Stats Row
          Row(
            children: [
              Expanded(child: _buildStatCard("Trips", "${earnings.totalTrips}", Icons.local_shipping, const Color(0xFF2980B9))),
              const SizedBox(width: 16),
              Expanded(child: _buildStatCard("Success Rate", "${(earnings.successRate * 100).toStringAsFixed(1)}%", Icons.check_circle, AppColors.success)),
            ],
          ),
          
          const SizedBox(height: 32),
          Text("Weekly Overview", style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          
          // Chart
          Container(
            height: 220,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
            ),
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: _getMaxY(earnings.weeklyChartData),
                barGroups: earnings.weeklyChartData.asMap().entries.map((e) {
                  return BarChartGroupData(
                    x: e.key,
                    barRods: [
                      BarChartRodData(
                        toY: e.value.amount,
                        color: AppColors.primary,
                        width: 12,
                        borderRadius: BorderRadius.circular(4),
                        backDrawRodData: BackgroundBarChartRodData(
                          show: true,
                          toY: _getMaxY(earnings.weeklyChartData),
                          color: AppColors.background,
                        ),
                      ),
                    ],
                  );
                }).toList(),
                titlesData: FlTitlesData(
                  show: true,
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        if (value.toInt() >= 0 && value.toInt() < earnings.weeklyChartData.length) {
                           final date = earnings.weeklyChartData[value.toInt()].date;
                           return Padding(
                             padding: const EdgeInsets.only(top: 8.0),
                             child: Text(
                               "${date.day}/${date.month}",
                               style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                             ),
                           );
                        }
                        return const SizedBox.shrink();
                      },
                      reservedSize: 30,
                    ),
                  ),
                  leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
                gridData: const FlGridData(show: false),
              ),
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildBalanceItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: GoogleFonts.plusJakartaSans(color: color, fontWeight: FontWeight.bold, fontSize: 18)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 12),
          Text(value, style: GoogleFonts.plusJakartaSans(fontSize: 20, fontWeight: FontWeight.bold)),
          Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
        ],
      ),
    );
  }
  
  double _getMaxY(List<DailyEarning> data) {
    if (data.isEmpty) return 100;
    return data.map((e) => e.amount).reduce((a, b) => a > b ? a : b) * 1.2;
  }
}
