import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/features/shipment/domain/entities/shipment_entity.dart';
import 'package:mobile/shared/widgets/status_badge.dart';
import 'package:intl/intl.dart';

import 'app_card.dart';

class ShipmentCard extends StatelessWidget {
  final ShipmentEntity shipment;
  final VoidCallback onTap;

  const ShipmentCard({
    super.key,
    required this.shipment,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'vi_VN', symbol: 'đ');

    return AppCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '#${shipment.trackingNumber}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: AppColors.primary,
                ),
              ),
              StatusBadge(status: shipment.status),
            ],
          ),
          const Divider(height: 24),
          _buildLocationRow(
            icon: Icons.my_location,
            color: Colors.blue,
            title: 'Từ',
            address: shipment.pickupAddress.fullAddress,
          ),
          const SizedBox(height: 12),
          _buildLocationRow(
            icon: Icons.location_on,
            color: Colors.red,
            title: 'Đến',
            address: shipment.deliveryAddress.fullAddress,
          ),
          const Divider(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('COD', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  Text(
                    currencyFormat.format(shipment.codAmount),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                   const Text('Phí ship', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  Text(
                    currencyFormat.format(shipment.shippingFee),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.secondary),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLocationRow({
    required IconData icon,
    required Color color,
    required String title,
    required String address,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
               Text(title, style: const TextStyle(color: Colors.grey, fontSize: 12)),
              Text(
                address,
                style: const TextStyle(fontSize: 14),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
