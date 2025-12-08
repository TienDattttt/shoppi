import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../features/shipment/domain/entities/shipment_entity.dart';

class TrackingTimeline extends StatelessWidget {
  final ShipmentStatus currentStatus;

  const TrackingTimeline({super.key, required this.currentStatus});

  @override
  Widget build(BuildContext context) {
    // Determine current step index
    int currentStep = _getStepIndex(currentStatus);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            children: [
              _buildStep(context, 0, "Created", currentStep >= 0, currentStep == 0),
              _buildLine(currentStep >= 1),
              _buildStep(context, 1, "Picked Up", currentStep >= 1, currentStep == 1),
              _buildLine(currentStep >= 2),
              _buildStep(context, 2, "In Transit", currentStep >= 2, currentStep == 2),
              _buildLine(currentStep >= 3),
              _buildStep(context, 3, "Delivered", currentStep >= 3, currentStep == 3),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStep(BuildContext context, int index, String label, bool isActive, bool isCurrent) {
    return Column(
      children: [
        CircleAvatar(
          radius: 12,
          backgroundColor: isActive ? AppColors.primary : Colors.grey[300],
          child: isActive
              ? const Icon(Icons.check, size: 14, color: Colors.white)
              : null,
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: isActive ? AppColors.primary : Colors.grey,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _buildLine(bool isActive) {
    return Expanded(
      child: Container(
        height: 2,
        color: isActive ? AppColors.primary : Colors.grey[300],
        margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 12), // Adjust vertical alignment
      ),
    );
  }

  int _getStepIndex(ShipmentStatus status) {
    switch (status) {
      case ShipmentStatus.created:
      case ShipmentStatus.assigned:
        return 0;
      case ShipmentStatus.pickedUp:
        return 1;
      case ShipmentStatus.delivering:
        return 2;
      case ShipmentStatus.delivered:
        return 3;
      default:
        return 0;
    }
  }
}
