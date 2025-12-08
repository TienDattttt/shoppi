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

  @override
  Widget build(BuildContext context) {
    return BlocListener<ShipmentDetailCubit, ShipmentDetailState>(
      listener: (context, state) {
        if (state is ShipmentDetailUpdated) {
          setState(() {
            _shipment = state.shipment;
          });
          ScaffoldMessenger.of(context).showSnackBar(
             const SnackBar(content: Text("Shipment updated successfully")),
          );
        } else if (state is ShipmentDetailError) {
          ScaffoldMessenger.of(context).showSnackBar(
             SnackBar(content: Text(state.message)),
          );
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: Text(
            "Tracking Details",
            style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold),
          ),
          backgroundColor: Colors.transparent,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          centerTitle: true,
          actions: [
            IconButton(
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10),
                  ],
                ),
                child: const Icon(Icons.navigation, color: AppColors.primary, size: 20),
              ),
              onPressed: () {
                MapUtils.openNavigation(
                  _shipment.deliveryAddress.lat,
                  _shipment.deliveryAddress.lng,
                );
              },
            ),
            const SizedBox(width: 16),
          ],
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Map Section
              Container(
                height: 200,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                clipBehavior: Clip.antiAlias,
                child: Stack(
                  children: [
                    ShipmentMapView(shipment: _shipment),
                    Positioned(
                      bottom: 12,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                           BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4),
                         ],
                        ),
                        child: Text(
                          _shipment.status.name.toUpperCase(),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primary),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              
              // Timeline ID
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text("Tracking Number", style: GoogleFonts.plusJakartaSans(color: AppColors.textSecondary)),
                  Text(
                    "#${_shipment.trackingNumber}", 
                    style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              TrackingTimeline(currentStatus: _shipment.status),
              
              const SizedBox(height: 24),
              
              // Addresses
              _buildAddressSection("Pickup Location", _shipment.pickupAddress.fullAddress, _shipment.pickupContactName, _shipment.pickupContactPhone, true),
              const SizedBox(height: 16),
              _buildAddressSection("Delivery Location", _shipment.deliveryAddress.fullAddress, _shipment.deliveryContactName, _shipment.deliveryContactPhone, false),
              
              const SizedBox(height: 32),
              
              // Action Buttons
              if (_shipment.status == ShipmentStatus.assigned)
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _onPickupPressed,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 4,
                      shadowColor: AppColors.primary.withOpacity(0.4),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Text("Confirm Pickup", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ),
                
              if (_shipment.status == ShipmentStatus.pickedUp || _shipment.status == ShipmentStatus.delivering)
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _onDeliverPressed,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      foregroundColor: Colors.white,
                      elevation: 4,
                      shadowColor: AppColors.success.withOpacity(0.4),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Text("Complete Delivery", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ),
                
              const SizedBox(height: 40),
            ],
          ),
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
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isPickup ? Colors.orange.withOpacity(0.1) : Colors.blue.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isPickup ? Icons.inventory_2 : Icons.location_on,
              color: isPickup ? Colors.orange : Colors.blue,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                const SizedBox(height: 4),
                Text(address, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.person, size: 14, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(contactName, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    const Spacer(),
                    InkWell(
                      onTap: () {
                         // Implement Call
                      },
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.success.withOpacity(0.1),
                          shape: BoxShape.circle,
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
