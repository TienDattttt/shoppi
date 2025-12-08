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
    // Fetch data when home is initialized
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
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Hello, Shipper!",
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
            Text(
              "Your Dashboard",
              style: GoogleFonts.plusJakartaSans(
                fontSize: 20,
                color: AppColors.textPrimary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        centerTitle: false,
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: Stack(
              children: [
                const Icon(Icons.notifications_outlined, size: 28, color: AppColors.textPrimary),
                Positioned(
                  right: 0,
                  top: 0,
                  child: Container(
                    width: 10,
                    height: 10,
                    decoration: const BoxDecoration(
                      color: AppColors.error,
                      shape: BoxShape.circle,
                    ),
                  ),
                )
              ],
            ),
            onPressed: () => context.push('/notifications'),
          ),
          const SizedBox(width: 8),
          BlocBuilder<OnlineStatusCubit, OnlineStatusState>(
            builder: (context, state) {
              final isOnline = state is OnlineStatusOnline;
              return Switch(
                value: isOnline,
                activeColor: AppColors.success,
                activeTrackColor: AppColors.success.withOpacity(0.2),
                inactiveThumbColor: AppColors.textSecondary,
                onChanged: _isNetworkOffline ? null : (value) {
                  context.read<OnlineStatusCubit>().toggleOnlineStatus(value);
                },
              );
            },
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          context.read<DashboardCubit>().fetchStats();
          context.read<ShipmentListCubit>().fetchShipments();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_isNetworkOffline) ...[
                  const SizedBox(height: 16),
                  OfflineIndicatorWidget(isOffline: _isNetworkOffline),
                ],
                const SizedBox(height: 24),
                _buildStatsSection(),
                const SizedBox(height: 32),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Recent Shipments",
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    TextButton(
                      onPressed: () {
                        // Navigate to Orders Tab using deep link or context navigation if possible,
                        // otherwise user relies on bottom bar.
                        // Ideally we find the shell and switch branch.
                         // But simple push for now is fine if it acts as a shortcut.
                         // Actually, since we have the bottom bar, maybe we don't need "View All" button unless it switches tabs.
                         // context.go('/orders'); // This should switch the branch.
                         context.go('/orders');
                      },
                      child: const Text("View All", style: TextStyle(color: AppColors.primary)),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildShipmentListSection(),
                const SizedBox(height: 80), // Bottom padding
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatsSection() {
    return BlocBuilder<DashboardCubit, DashboardState>(
      builder: (context, state) {
        if (state is DashboardLoading) {
           return const Center(child: CircularProgressIndicator());
        }
        if (state is DashboardLoaded) {
          final stats = state.stats;
          return Row(
            children: [
              StatCard(
                label: "Today's Earnings",
                value: "\$${stats.todayEarnings}",
                icon: Icons.account_balance_wallet,
                color: AppColors.success,
                onTap: () => context.go('/earnings'),
              ),
              const SizedBox(width: 16),
              StatCard(
                label: "Completed Trips",
                value: "${stats.todayTrips}",
                icon: Icons.local_shipping,
                color: AppColors.info,
              ),
            ],
          );
        }
        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildShipmentListSection() {
    return BlocBuilder<ShipmentListCubit, ShipmentListState>(
      builder: (context, state) {
        if (state is ShipmentListLoading) {
          return const Center(child: CircularProgressIndicator());
        } else if (state is ShipmentListError) {
          return Center(child: Text(state.message));
        } else if (state is ShipmentListLoaded) {
          if (state.shipments.isEmpty) {
            return Container(
              padding: const EdgeInsets.all(32),
              alignment: Alignment.center,
              child: Column(
                children: [
                  Icon(Icons.inbox_outlined, size: 64, color: AppColors.textHint),
                  const SizedBox(height: 16),
                  const Text("No active shipments", style: TextStyle(color: AppColors.textSecondary)),
                ],
              ),
            );
          }
          // Show only top 5 items on dashboard
          final recentShipments = state.shipments.take(5).toList();
          return Column(
            children: recentShipments.map((shipment) => ShipmentItemCard(
              shipment: shipment,
              onTap: () => context.push('/shipment/${shipment.id}', extra: shipment),
            )).toList(),
          );
        }
        return const SizedBox.shrink();
      },
    );
  }
}

