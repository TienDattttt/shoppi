import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_colors.dart';
import '../../domain/entities/shipment_entity.dart';
import '../cubit/shipment_list_cubit.dart';

class ShipmentListPage extends StatefulWidget {
  const ShipmentListPage({super.key});

  @override
  State<ShipmentListPage> createState() => _ShipmentListPageState();
}

class _ShipmentListPageState extends State<ShipmentListPage> {
  @override
  void initState() {
    super.initState();
    context.read<ShipmentListCubit>().fetchShipments();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("My Shipments"),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: BlocBuilder<ShipmentListCubit, ShipmentListState>(
        builder: (context, state) {
          if (state is ShipmentListLoading) {
            return const Center(child: CircularProgressIndicator());
          } else if (state is ShipmentListError) {
            return Center(child: Text(state.message));
          } else if (state is ShipmentListLoaded) {
            if (state.shipments.isEmpty) {
              return const Center(child: Text("No active shipments."));
            }
            return RefreshIndicator(
              onRefresh: () async {
                 context.read<ShipmentListCubit>().fetchShipments();
              },
              child: ListView.builder(
                itemCount: state.shipments.length,
                padding: const EdgeInsets.all(16),
                itemBuilder: (context, index) {
                  final shipment = state.shipments[index];
                  return _buildShipmentCard(context, shipment);
                },
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildShipmentCard(BuildContext context, ShipmentEntity shipment) {
    return Card(
      elevation: 4,
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () {
          context.push('/shipment/${shipment.id}', extra: shipment);
        },
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
                  const Icon(Icons.my_location, size: 16, color: Colors.blue),
                  const SizedBox(width: 8),
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
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 16, color: Colors.red),
                  const SizedBox(width: 8),
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
                     style: const TextStyle(color: Colors.grey),
                   ),
                   Text(
                     shipment.codAmount > 0 ? 'COD: \$${shipment.codAmount}' : 'Prepaid',
                     style: TextStyle(
                       fontWeight: FontWeight.bold,
                       color: shipment.codAmount > 0 ? Colors.orange : Colors.green,
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
        color = Colors.grey;
        text = "New";
        break;
      case ShipmentStatus.assigned:
        color = Colors.blue;
        text = "Assigned";
        break;
      case ShipmentStatus.pickedUp:
        color = Colors.orange;
        text = "Picked Up";
        break;
      case ShipmentStatus.delivering:
        color = Colors.orangeAccent;
         text = "Delivering";
        break;
      case ShipmentStatus.delivered:
        color = Colors.green;
        text = "Delivered";
        break;
      case ShipmentStatus.failed:
        color = Colors.red;
        text = "Failed";
        break;
      // Removed cancelled case
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
      ),
    );
  }
}
