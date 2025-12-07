import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../location/presentation/cubit/online_status_cubit.dart';
import '../../../shipment/presentation/cubit/shipment_list_cubit.dart';
import '../../../shipment/presentation/pages/shipment_list_page.dart'; // Reuse parts if possible, or just reimplement list view here
import 'cubit/dashboard_cubit.dart';

// We will make HomePage the main dashboard that contains stats + list of shipments
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  void initState() {
    super.initState();
    context.read<DashboardCubit>().fetchStats();
    context.read<ShipmentListCubit>().fetchShipments(); // Ensure shipments are fetched
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("SPX Shipper Dashboard"),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          BlocBuilder<OnlineStatusCubit, OnlineStatusState>(
            builder: (context, state) {
              final isOnline = state is OnlineStatusOnline;
              return Row(
                children: [
                   Text(isOnline ? "ONLINE" : "OFFLINE", style: const TextStyle(fontWeight: FontWeight.bold)),
                   Switch(
                    value: isOnline,
                    activeColor: Colors.white,
                    activeTrackColor: Colors.green,
                    onChanged: (value) {
                      context.read<OnlineStatusCubit>().toggleOnlineStatus(value);
                    },
                  ),
                ],
              );
            },
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          context.read<DashboardCubit>().fetchStats();
          context.read<ShipmentListCubit>().fetchShipments();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildStatsSection(),
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 24, 16, 8),
                child: Text(
                  "Active Shipments",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              _buildShipmentListSection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsSection() {
    return BlocBuilder<DashboardCubit, DashboardState>(
      builder: (context, state) {
        if (state is DashboardLoading) {
           return const Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator()));
        }
        if (state is DashboardLoaded) {
          final stats = state.stats;
          return Container(
            padding: const EdgeInsets.all(16),
            color: AppColors.primary.withOpacity(0.05),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem("Today's Earnings", "\$${stats.todayEarnings}", Icons.attach_money, Colors.green),
                _buildStatItem("Trips", "${stats.todayTrips}", Icons.local_shipping, Colors.blue),
                _buildStatItem("Rating", "${stats.currentRating}", Icons.star, Colors.orange),
              ],
            ),
          );
        }
        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 28),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }

  Widget _buildShipmentListSection() {
    // We can reuse the list building logic from ShipmentListPage or just copy it for simplicity in this composition
    return BlocBuilder<ShipmentListCubit, ShipmentListState>(
      builder: (context, state) {
        if (state is ShipmentListLoading) {
          return const Padding(padding: EdgeInsets.all(50), child: Center(child: CircularProgressIndicator()));
        } else if (state is ShipmentListError) {
          return Center(child: Text(state.message));
        } else if (state is ShipmentListLoaded) {
          if (state.shipments.isEmpty) {
            return const Padding(
              padding: EdgeInsets.all(32.0),
              child: Center(child: Text("No active shipments found.")),
            );
          }
          // We must not use ListView inside SingleChildScrollView without shrinkWrap or physics, 
          // but here we are composed inside the parent SingleScrollView
          return ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: state.shipments.length,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemBuilder: (context, index) {
              final shipment = state.shipments[index];
              // Reuse logic? Or create a separate widget. 
              // To avoid duplication, ideally ShipmentCard is a shared widget.
              // For now, I'll assume valid to duplicate the card UI for speed, or better yet, create the ShipmentCard widget now.
              return Card(
                elevation: 2,
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  title: Text("#${shipment.trackingNumber}"),
                  subtitle: Text(shipment.deliveryAddress.fullAddress),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                  onTap: () {
                     context.push('/shipment/${shipment.id}', extra: shipment);
                  },
                ),
              );
            },
          );
        }
        return const SizedBox.shrink();
      },
    );
  }
}
