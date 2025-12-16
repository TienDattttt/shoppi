import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../features/shipment/domain/entities/shipment_entity.dart';

class ShipmentItemCard extends StatelessWidget {
  Widget _buildStatusBadge(ShipmentStatus status) {
    Color bgColor;
    Color textColor;
    String text;
    
    switch (status) {
      case ShipmentStatus.created:
        bgColor = Colors.grey.shade100;
        textColor = Colors.grey.shade700;
        text = 'Chờ xử lý';
        break;
      case ShipmentStatus.pendingAssignment:
        bgColor = Colors.amber.shade100;
        textColor = Colors.amber.shade700;
        text = 'Đang tìm shipper';
        break;
      case ShipmentStatus.assigned:
        bgColor = Colors.blue.shade100;
        textColor = Colors.blue.shade700;
        text = 'Cần lấy hàng';
        break;
      case ShipmentStatus.pickedUp:
        bgColor = Colors.orange.shade100;
        textColor = Colors.orange.shade700;
        text = 'Đã lấy hàng';
        break;
      case ShipmentStatus.inTransit:
        bgColor = Colors.cyan.shade100;
        textColor = Colors.cyan.shade700;
        text = 'Đang trung chuyển';
        break;
      case ShipmentStatus.readyForDelivery:
        bgColor = Colors.teal.shade100;
        textColor = Colors.teal.shade700;
        text = 'Chờ giao hàng';
        break;
      case ShipmentStatus.delivering:
        bgColor = Colors.purple.shade100;
        textColor = Colors.purple.shade700;
        text = 'Đang giao';
        break;
      case ShipmentStatus.delivered:
        bgColor = Colors.green.shade100;
        textColor = Colors.green.shade700;
        text = 'Giao thành công';
        break;
      case ShipmentStatus.failed:
        bgColor = Colors.red.shade100;
        textColor = Colors.red.shade700;
        text = 'Giao thất bại';
        break;
      case ShipmentStatus.pendingRedelivery:
        bgColor = Colors.deepOrange.shade100;
        textColor = Colors.deepOrange.shade700;
        text = 'Chờ giao lại';
        break;
      case ShipmentStatus.returning:
        bgColor = Colors.orange.shade100;
        textColor = Colors.orange.shade700;
        text = 'Đang hoàn';
        break;
      case ShipmentStatus.returned:
        bgColor = Colors.indigo.shade100;
        textColor = Colors.indigo.shade700;
        text = 'Đã hoàn';
        break;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: textColor,
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
      ),
    );
  }

  final ShipmentEntity shipment;
  final VoidCallback onTap;

  const ShipmentItemCard({
    super.key,
    required this.shipment,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        "#${shipment.trackingNumber}",
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    _buildStatusBadge(shipment.status),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 18, color: AppColors.textSecondary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        shipment.deliveryAddress.fullAddress,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.attach_money, size: 18, color: AppColors.textSecondary),
                    const SizedBox(width: 8),
                    Text(
                      "\$${shipment.codAmount.toStringAsFixed(2)}", // Assuming codAmount exists
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
