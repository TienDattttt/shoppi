import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../location/presentation/cubit/online_status_cubit.dart';
import '../../../../shared/widgets/offline_indicator_widget.dart';
import '../../../shipment/presentation/cubit/shipment_list_cubit.dart';
import '../cubit/dashboard_cubit.dart';
import '../../../../shared/widgets/stat_card.dart';
import '../../../../shared/widgets/shipment_item_card.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late StreamSubscription<List<ConnectivityResult>> _connectivitySubscription;
  bool _isNetworkOffline = false;

  @override
  void initState() {
    super.initState();
    context.read<DashboardCubit>().fetchStats();
    context.read<ShipmentListCubit>().fetchShipments();
    
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((results) {
       setState(() {
         _isNetworkOffline = results.contains(ConnectivityResult.none) && results.length == 1; 
       });
    });
  }

  @override
  void dispose() {
    _connectivitySubscription.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async {
          context.read<DashboardCubit>().fetchStats();
          context.read<ShipmentListCubit>().fetchShipments();
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // Orange Gradient Header
            SliverToBoxAdapter(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: AppColors.headerGradient,
                ),
                child: SafeArea(
                  bottom: false,
                  child: Column(
                    children: [
                      // Top Bar
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          children: [
                            // Logo
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.local_shipping, color: AppColors.primary, size: 20),
                                  const SizedBox(width: 6),
                                  Text(
                                    'SPX Shipper',
                                    style: GoogleFonts.plusJakartaSans(
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Spacer(),
                            // Notifications
                            IconButton(
                              icon: Stack(
                                children: [
                                  const Icon(Icons.notifications_outlined, size: 28, color: Colors.white),
                                  Positioned(
                                    right: 0,
                                    top: 0,
                                    child: Container(
                                      width: 10,
                                      height: 10,
                                      decoration: BoxDecoration(
                                        color: Colors.yellow,
                                        shape: BoxShape.circle,
                                        border: Border.all(color: AppColors.primary, width: 1),
                                      ),
                                    ),
                                  )
                                ],
                              ),
                              onPressed: () => context.push('/notifications'),
                            ),
                            // Online Toggle
                            BlocBuilder<OnlineStatusCubit, OnlineStatusState>(
                              builder: (context, state) {
                                final isOnline = state is OnlineStatusOnline;
                                return Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: isOnline ? Colors.white : Colors.white.withValues(alpha: 0.3),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Container(
                                        width: 8,
                                        height: 8,
                                        decoration: BoxDecoration(
                                          color: isOnline ? AppColors.success : AppColors.textSecondary,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        isOnline ? 'Đang nhận đơn' : 'Nghỉ',
                                        style: TextStyle(
                                          color: isOnline ? AppColors.primary : Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      Switch(
                                        value: isOnline,
                                        activeColor: AppColors.success,
                                        activeTrackColor: AppColors.success.withValues(alpha: 0.3),
                                        inactiveThumbColor: Colors.grey,
                                        inactiveTrackColor: Colors.grey.withValues(alpha: 0.3),
                                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                        onChanged: _isNetworkOffline ? null : (value) {
                                          context.read<OnlineStatusCubit>().toggleOnlineStatus(value);
                                        },
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      // Welcome Message
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Xin chào, Shipper!',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Chúc bạn một ngày làm việc hiệu quả!',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.white.withValues(alpha: 0.9),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      // Stats Cards
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _buildStatsSection(),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ),
            // Offline Indicator
            if (_isNetworkOffline)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: OfflineIndicatorWidget(isOffline: _isNetworkOffline),
                ),
              ),
            // Recent Shipments Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Đơn hàng gần đây',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    TextButton(
                      onPressed: () => context.go('/orders'),
                      child: Text(
                        'Xem tất cả',
                        style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Shipment List
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: _buildShipmentListSliver(),
            ),
            // Bottom padding
            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsSection() {
    return BlocBuilder<DashboardCubit, DashboardState>(
      builder: (context, state) {
        if (state is DashboardLoading) {
          return const Center(child: CircularProgressIndicator(color: Colors.white));
        }
        if (state is DashboardLoaded) {
          final stats = state.stats;
          return Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  icon: Icons.account_balance_wallet,
                  label: 'Thu nhập hôm nay',
                  value: '${stats.todayEarnings.toStringAsFixed(0)}đ',
                  onTap: () => context.go('/earnings'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  icon: Icons.local_shipping,
                  label: 'Đơn hoàn thành',
                  value: '${stats.todayTrips}',
                ),
              ),
            ],
          );
        }
        // Default/initial state
        return Row(
          children: [
            Expanded(child: _buildStatCard(icon: Icons.account_balance_wallet, label: 'Thu nhập hôm nay', value: '0đ')),
            const SizedBox(width: 12),
            Expanded(child: _buildStatCard(icon: Icons.local_shipping, label: 'Đơn hoàn thành', value: '0')),
          ],
        );
      },
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String label,
    required String value,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primarySoft,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: AppColors.primary, size: 24),
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShipmentListSliver() {
    return BlocBuilder<ShipmentListCubit, ShipmentListState>(
      builder: (context, state) {
        if (state is ShipmentListLoading) {
          return const SliverToBoxAdapter(
            child: Center(child: Padding(
              padding: EdgeInsets.all(32),
              child: CircularProgressIndicator(),
            )),
          );
        } else if (state is ShipmentListError) {
          return SliverToBoxAdapter(
            child: Center(child: Text(state.message)),
          );
        } else if (state is ShipmentListLoaded) {
          if (state.shipments.isEmpty) {
            return SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.all(32),
                alignment: Alignment.center,
                child: Column(
                  children: [
                    Icon(Icons.inbox_outlined, size: 64, color: AppColors.textHint),
                    const SizedBox(height: 16),
                    const Text('Chưa có đơn hàng', style: TextStyle(color: AppColors.textSecondary)),
                  ],
                ),
              ),
            );
          }
          final recentShipments = state.shipments.take(5).toList();
          return SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) => ShipmentItemCard(
                shipment: recentShipments[index],
                onTap: () => context.push('/shipment/${recentShipments[index].id}', extra: recentShipments[index]),
              ),
              childCount: recentShipments.length,
            ),
          );
        }
        return const SliverToBoxAdapter(child: SizedBox.shrink());
      },
    );
  }
}
