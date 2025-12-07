import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile/core/utils/map_utils.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/features/shipment/domain/entities/shipment_entity.dart';
import 'package:mobile/features/shipment/presentation/cubit/shipment_detail_cubit.dart';
import 'package:mobile/features/shipment/presentation/widgets/shipment_map_view.dart'; // We will create this
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
    // Navigate to camera/photo capture logic
    // For now mocking result.
    // In real app, push to CameraPage -> get path -> call cubit
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
        appBar: AppBar(
          title: Text("Shipment ${_shipment.trackingNumber}"),
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          actions: [
            IconButton(
              icon: const Icon(Icons.navigation),
              onPressed: () {
                MapUtils.openNavigation(
                  _shipment.deliveryAddress.lat,
                  _shipment.deliveryAddress.lng,
                );
              },
            ),
          ],
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Status Card
              Card(
                child: ListTile(
                  title: const Text("Status"),
                  trailing: Text(
                    _shipment.status.name.toUpperCase(),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: _shipment.status == ShipmentStatus.delivered ? Colors.green : Colors.blue,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              
              // Addresses
              const Text("Pickup", style: TextStyle(fontWeight: FontWeight.bold)),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_shipment.pickupAddress.fullAddress),
                      const SizedBox(height: 4),
                      Text("Contact: ${_shipment.pickupContactName} - ${_shipment.pickupContactPhone}", style: const TextStyle(color: Colors.grey)),
                    ],
                  ),
                ),
              ),
              
              const SizedBox(height: 16),
              const Text("Delivery", style: TextStyle(fontWeight: FontWeight.bold)),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_shipment.deliveryAddress.fullAddress),
                      const SizedBox(height: 4),
                      Text("Contact: ${_shipment.deliveryContactName} - ${_shipment.deliveryContactPhone}", style: const TextStyle(color: Colors.grey)),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),
              Card(
                clipBehavior: Clip.antiAlias,
                child: ShipmentMapView(shipment: _shipment),
              ),
              const SizedBox(height: 30),
              
              // Action Buttons
              if (_shipment.status == ShipmentStatus.assigned)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _onPickupPressed,
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
                    child: const Text("CONFIRM PICKUP"),
                  ),
                ),
                
              if (_shipment.status == ShipmentStatus.pickedUp || _shipment.status == ShipmentStatus.delivering)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _onDeliverPressed,
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                    child: const Text("COMPLETE DELIVERY (PHOTO REQUIRED)"),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
