import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../shared/widgets/shipment_item_card.dart';
import '../../domain/entities/shipment_entity.dart';
import '../cubit/shipment_list_cubit.dart';

class ShipmentsPage extends StatefulWidget {
  const ShipmentsPage({super.key});

  @override
  State<ShipmentsPage> createState() => _ShipmentsPageState();
}

class _ShipmentsPageState extends State<ShipmentsPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          "My Shipments",
          style: GoogleFonts.plusJakartaSans(
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          labelStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600),
          tabs: const [
            Tab(text: "All"),
            Tab(text: "Active"),
            Tab(text: "Completed"), // Assuming 'DELIVERED' or 'CANCELLED'
          ],
        ),
      ),
      body: BlocBuilder<ShipmentListCubit, ShipmentListState>(
        builder: (context, state) {
           if (state is ShipmentListLoading) {
            return const Center(child: CircularProgressIndicator());
          } else if (state is ShipmentListError) {
             return Center(child: Column(
               mainAxisAlignment: MainAxisAlignment.center,
               children: [
                 Text(state.message),
                 const SizedBox(height: 16),
                 ElevatedButton(
                   onPressed: () => context.read<ShipmentListCubit>().fetchShipments(),
                   child: const Text("Retry"),
                 )
               ],
             ));
          } else if (state is ShipmentListLoaded) {
            return TabBarView(
              controller: _tabController,
              children: [
                _buildList(state.shipments),
                _buildList(state.shipments.where((s) => !_isCompleted(s.status)).toList()),
                _buildList(state.shipments.where((s) => _isCompleted(s.status)).toList()),
              ],
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  bool _isCompleted(ShipmentStatus status) {
    return status == ShipmentStatus.delivered || status == ShipmentStatus.failed;
  }

  Widget _buildList(List<ShipmentEntity> shipments) {
    if (shipments.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined, size: 64, color: AppColors.textHint),
             const SizedBox(height: 16),
             Text("No shipments found", style: TextStyle(color: AppColors.textSecondary)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: () async {
         context.read<ShipmentListCubit>().fetchShipments();
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
         itemCount: shipments.length,
         itemBuilder: (context, index) {
           final shipment = shipments[index];
           return ShipmentItemCard(
             shipment: shipment,
             onTap: () => context.push('/shipment/${shipment.id}', extra: shipment),
           );
         },
      ),
    );
  }
}
