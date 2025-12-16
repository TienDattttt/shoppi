import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import '../../features/shipment/domain/entities/shipment_entity.dart'; // Depending on feature

class StatusBadge extends StatelessWidget {
  final ShipmentStatus status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;

    switch (status) {
      case ShipmentStatus.created:
        color = AppColors.statusCreated;
        label = "Created";
        break;
      case ShipmentStatus.pendingAssignment:
        color = AppColors.statusAssigned;
        label = "Pending Assignment";
        break;
      case ShipmentStatus.assigned:
        color = AppColors.statusAssigned;
        label = "Assigned";
        break;
      case ShipmentStatus.pickedUp:
        color = AppColors.statusPickedUp;
        label = "Picked Up";
        break;
      case ShipmentStatus.inTransit:
        color = AppColors.statusPickedUp;
        label = "In Transit";
        break;
      case ShipmentStatus.readyForDelivery:
        color = AppColors.statusPickedUp;
        label = "Ready For Delivery";
        break;
      case ShipmentStatus.delivering:
        color = AppColors.statusDelivering;
        label = "Directing";
        break;
      case ShipmentStatus.delivered:
        color = AppColors.statusDelivered;
        label = "Delivered";
        break;
      case ShipmentStatus.failed:
        color = AppColors.statusFailed;
        label = "Failed";
        break;
      case ShipmentStatus.pendingRedelivery:
        color = AppColors.statusFailed;
        label = "Pending Redelivery";
        break;
      case ShipmentStatus.returning:
        color = AppColors.statusReturning;
        label = "Returning";
        break;
      case ShipmentStatus.returned:
        color = AppColors.statusReturned;
        label = "Returned";
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}
