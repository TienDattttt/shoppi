import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/core/utils/map_utils.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/features/shipment/domain/entities/shipment_entity.dart';
import 'package:mobile/features/shipment/presentation/cubit/shipment_detail_cubit.dart';
import 'package:mobile/features/shipment/presentation/widgets/shipment_map_view.dart';
import '../../../../shared/widgets/tracking_timeline.dart';
import 'package:mobile/injection.dart';

class ShipmentDetailPage extends StatelessWidget {
  final ShipmentEntity shipment;

  const ShipmentDetailPage({super.key, required this.shipment});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => getIt<ShipmentDetailCubit>(),
      child: ShipmentDetailView(shipment: shipment),
    );
  }
}

class ShipmentDetailView extends StatefulWidget {
  final ShipmentEntity shipment;
  const ShipmentDetailView({super.key, required this.shipment});

  @override
  State<ShipmentDetailView> createState() => _ShipmentDetailViewState();
}

class _ShipmentDetailViewState extends State<ShipmentDetailView> {
  late ShipmentEntity _shipment;

  @override
  void initState() {
    super.initState();
    _shipment = widget.shipment;
  }

  void _onPickupPressed() {
    context.read<ShipmentDetailCubit>().pickUpShipment(_shipment.id);
  }

  void _onDeliverPressed() {
    context.read<ShipmentDetailCubit>().deliverShipment(_shipment.id, "mock/path/to/photo.jpg", null);
  }

  String _getStatusText(ShipmentStatus status) {
    switch (status) {
      case ShipmentStatus.created: return 'Mới';
      case ShipmentStatus.assigned: return 'Đã nhận';
      case ShipmentStatus.pickedUp: return 'Đã lấy';
      case ShipmentStatus.delivering: return 'Đang giao';
      case ShipmentStatus.delivered: return 'Hoàn thành';
      case ShipmentStatus.failed: return 'Thất bại';
      case ShipmentStatus.returning: return 'Đang trả';
      case ShipmentStatus.returned: return 'Đã trả';
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<ShipmentDetailCubit, ShipmentDetailState>(
      listener: (context, state) {
        if (state is ShipmentDetailUpdated) {
          setState(() {
            _shipment = state.shipment;
          });
          ScaffoldMessenger.of(context).showSnackBar(
             const SnackBar(content: Text('Cập nhật thành công'), backgroundColor: AppColors.success),
          );
        } else if (state is ShipmentDetailError) {
          ScaffoldMessenger.of(context).showSnackBar(
             SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
          );
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: CustomScrollView(
          slivers: [
            // Orange Header
            SliverToBoxAdapter(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: AppColors.headerGradient,
                ),
                child: SafeArea(
                  bottom: false,
                  child: Column(
                    children: [
                      // App Bar
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                        child: Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.arrow_back, color: Colors.white),
                              onPressed: () => Navigator.pop(context),
                            ),
                            Expanded(
                              child: Text(
                                'Chi tiết đơn hàng',
                                style: GoogleFonts.plusJakartaSans(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 18,
                                  color: Colors.white,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                            IconButton(
                              icon: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.2),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.navigation, color: Colors.white, size: 18),
                              ),
                              onPressed: () {
                                MapUtils.openNavigation(
                                  _shipment.deliveryAddress.lat,
                                  _shipment.deliveryAddress.lng,
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      // Tracking Number
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Mã vận đơn',
                                    style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '#${_shipment.trackingNumber}',
                                    style: GoogleFonts.plusJakartaSans(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 18,
                                    ),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  _getStatusText(_shipment.status),
                                  style: TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ),
            
            // Content
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Map Section
                    Container(
                      height: 180,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, 4)),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: ShipmentMapView(shipment: _shipment),
                    ),
                    const SizedBox(height: 24),
                    
                    TrackingTimeline(currentStatus: _shipment.status),
                    
                    const SizedBox(height: 24),
                    
                    // Addresses
                    _buildAddressSection('Điểm lấy hàng', _shipment.pickupAddress.fullAddress, _shipment.pickupContactName, _shipment.pickupContactPhone, true),
                    const SizedBox(height: 12),
                    _buildAddressSection('Điểm giao hàng', _shipment.deliveryAddress.fullAddress, _shipment.deliveryContactName, _shipment.deliveryContactPhone, false),
                    
                    const SizedBox(height: 32),
                    
                    // Action Buttons
                    if (_shipment.status == ShipmentStatus.assigned)
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton.icon(
                          onPressed: _onPickupPressed,
                          icon: const Icon(Icons.inventory_2, color: Colors.white),
                          label: Text('Xác nhận lấy hàng', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            elevation: 4,
                            shadowColor: AppColors.primary.withValues(alpha: 0.4),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                      ),
                      
                    if (_shipment.status == ShipmentStatus.pickedUp || _shipment.status == ShipmentStatus.delivering)
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton.icon(
                          onPressed: _onDeliverPressed,
                          icon: const Icon(Icons.check_circle, color: Colors.white),
                          label: Text('Xác nhận giao hàng', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.success,
                            elevation: 4,
                            shadowColor: AppColors.success.withValues(alpha: 0.4),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                      ),
                      
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddressSection(String title, String address, String contactName, String contactPhone, bool isPickup) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 2)),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isPickup ? Colors.blue.withValues(alpha: 0.1) : AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isPickup ? Icons.inventory_2 : Icons.location_on,
              color: isPickup ? Colors.blue : AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                const SizedBox(height: 4),
                Text(address, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.person, size: 14, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Expanded(child: Text(contactName, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary))),
                    InkWell(
                      onTap: () {
                         // Implement Call
                      },
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.success.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.phone, size: 16, color: AppColors.success),
                      ),
                    )
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

