import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/constants/app_colors.dart';
import '../../domain/entities/shipment_entity.dart';
import '../cubit/shipment_list_cubit.dart';

class ShipmentListPage extends StatefulWidget {
  const ShipmentListPage({super.key});

  @override
  State<ShipmentListPage> createState() => _ShipmentListPageState();
}

class _ShipmentListPageState extends State<ShipmentListPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    context.read<ShipmentListCubit>().fetchShipments();
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
      body: Column(
        children: [
          // Orange Header
          Container(
            decoration: const BoxDecoration(
              gradient: AppColors.headerGradient,
            ),
            child: SafeArea(
              bottom: false,
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    child: Text(
                      'Đơn hàng của tôi',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  // Tab Bar
                  TabBar(
                    controller: _tabController,
                    indicatorColor: Colors.white,
                    indicatorWeight: 3,
                    labelColor: Colors.white,
                    unselectedLabelColor: Colors.white70,
                    labelStyle: const TextStyle(fontWeight: FontWeight.w600),
                    tabs: const [
                      Tab(text: 'Tất cả'),
                      Tab(text: 'Đang giao'),
                      Tab(text: 'Hoàn thành'),
                    ],
                  ),
                ],
              ),
            ),
          ),
          // Tab Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildShipmentList(filter: null),
                _buildShipmentList(filter: 'active'),
                _buildShipmentList(filter: 'completed'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShipmentList({String? filter}) {
    return BlocBuilder<ShipmentListCubit, ShipmentListState>(
      builder: (context, state) {
        if (state is ShipmentListLoading) {
          return const Center(child: CircularProgressIndicator(color: AppColors.primary));
        } else if (state is ShipmentListError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(state.message, style: const TextStyle(color: AppColors.textSecondary)),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => context.read<ShipmentListCubit>().fetchShipments(),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                  child: const Text('Thử lại', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          );
        } else if (state is ShipmentListLoaded) {
          var shipments = state.shipments;
          
          // Apply filter
          if (filter == 'active') {
            shipments = shipments.where((s) => 
              s.status == ShipmentStatus.assigned || 
              s.status == ShipmentStatus.pickedUp ||
              s.status == ShipmentStatus.delivering
            ).toList();
          } else if (filter == 'completed') {
            shipments = shipments.where((s) => s.status == ShipmentStatus.delivered).toList();
          }
          
          if (shipments.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.inbox_outlined, size: 64, color: AppColors.textHint),
                  const SizedBox(height: 16),
                  const Text('Chưa có đơn hàng', style: TextStyle(color: AppColors.textSecondary)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async {
              context.read<ShipmentListCubit>().fetchShipments();
            },
            child: ListView.builder(
              itemCount: shipments.length,
              padding: const EdgeInsets.all(16),
              itemBuilder: (context, index) {
                final shipment = shipments[index];
                return _buildShipmentCard(context, shipment);
              },
            ),
          );
        }
        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildShipmentCard(BuildContext context, ShipmentEntity shipment) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: () {
          context.push('/shipment/${shipment.id}', extra: shipment);
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "#${shipment.trackingNumber}",
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                   _buildStatusBadge(shipment.status),
                ],
              ),
              const Divider(height: 24),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.blue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.my_location, size: 14, color: Colors.blue),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      shipment.pickupAddress.fullAddress,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(Icons.location_on, size: 14, color: AppColors.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      shipment.deliveryAddress.fullAddress,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                 mainAxisAlignment: MainAxisAlignment.spaceBetween,
                 children: [
                   Text(
                     "${shipment.distanceKm} km",
                     style: const TextStyle(color: AppColors.textSecondary),
                   ),
                   Text(
                     shipment.codAmount > 0 ? 'COD: ${shipment.codAmount.toStringAsFixed(0)}đ' : 'Đã thanh toán',
                     style: TextStyle(
                       fontWeight: FontWeight.bold,
                       color: shipment.codAmount > 0 ? AppColors.warning : AppColors.success,
                     ),
                   ),
                 ],
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(ShipmentStatus status) {
    Color color;
    String text;
    switch (status) {
      case ShipmentStatus.created:
        color = AppColors.statusNew;
        text = "Chờ xử lý";
        break;
      case ShipmentStatus.pendingAssignment:
        color = AppColors.statusNew;
        text = "Chờ tài xế";
        break;
      case ShipmentStatus.assigned:
        color = AppColors.statusAssigned;
        text = "Cần lấy hàng";
        break;
      case ShipmentStatus.pickedUp:
        color = AppColors.statusPickedUp;
        text = "Cần giao hàng";
        break;
      case ShipmentStatus.inTransit:
        color = AppColors.statusPickedUp;
        text = "Đang trung chuyển";
        break;
      case ShipmentStatus.readyForDelivery:
        color = AppColors.statusPickedUp;
        text = "Đến bưu cục giao";
        break;
      case ShipmentStatus.delivering:
        color = AppColors.primary;
        text = "Đang giao";
        break;
      case ShipmentStatus.delivered:
        color = AppColors.success;
        text = "Giao thành công";
        break;
      case ShipmentStatus.failed:
        color = AppColors.error;
        text = "Giao thất bại";
        break;
      case ShipmentStatus.pendingRedelivery:
        color = AppColors.warning;
        text = "Chờ giao lại";
        break;
      case ShipmentStatus.returning:
        color = AppColors.statusReturning;
        text = "Đang hoàn";
        break;
      case ShipmentStatus.returned:
        color = AppColors.statusReturned;
        text = "Đã hoàn";
        break;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
      ),
    );
  }
}

