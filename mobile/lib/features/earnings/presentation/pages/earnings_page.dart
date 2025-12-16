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
        body: BlocBuilder<EarningsCubit, EarningsState>(
          builder: (context, state) {
            if (state is EarningsLoading) {
              return const Center(child: CircularProgressIndicator(color: AppColors.primary));
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
    return CustomScrollView(
      slivers: [
        // Orange Header with earnings
        SliverToBoxAdapter(
          child: Container(
            decoration: const BoxDecoration(
              gradient: AppColors.headerGradient,
            ),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Text(
                      'Thu nhập của tôi',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Total Balance
                    Text(
                      'Tổng thu nhập',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.8),
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${earnings.totalEarnings.toStringAsFixed(0)}đ',
                      style: GoogleFonts.plusJakartaSans(
                        color: Colors.white,
                        fontSize: 36,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Balance Row
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildBalanceItem('Có thể rút', '${earnings.paidBalance.toStringAsFixed(0)}đ', Icons.account_balance_wallet),
                          Container(height: 40, width: 1, color: Colors.white30),
                          _buildBalanceItem('Đang chờ', '${earnings.pendingBalance.toStringAsFixed(0)}đ', Icons.hourglass_empty),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
        ),
        
        // Stats Cards
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverToBoxAdapter(
            child: Row(
              children: [
                Expanded(child: _buildStatCard('Số chuyến', '${earnings.totalTrips}', Icons.local_shipping, AppColors.primary)),
                const SizedBox(width: 12),
                Expanded(child: _buildStatCard('Tỷ lệ thành công', '${(earnings.successRate * 100).toStringAsFixed(1)}%', Icons.check_circle, AppColors.success)),
              ],
            ),
          ),
        ),
        
        // Weekly Chart
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          sliver: SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Thu nhập tuần này', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                Container(
                  height: 220,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
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
                              width: 16,
                              borderRadius: BorderRadius.circular(6),
                              backDrawRodData: BackgroundBarChartRodData(
                                show: true,
                                toY: _getMaxY(earnings.weeklyChartData),
                                color: AppColors.primarySoft,
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
              ],
            ),
          ),
        ),
        
        // Bottom padding
        const SliverToBoxAdapter(child: SizedBox(height: 100)),
      ],
    );
  }

  Widget _buildBalanceItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Colors.white70, size: 20),
        const SizedBox(height: 8),
        Text(value, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 4),
        Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12)),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
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

