import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/features/notification/domain/entities/notification_entity.dart';
import 'package:mobile/shared/widgets/empty_state_widget.dart';

class NotificationPage extends StatelessWidget {
  const NotificationPage({super.key});

  @override
  Widget build(BuildContext context) {
    // Mock Data
    final notifications = [
      NotificationEntity(
        id: '1',
        title: 'New Shipment Assigned',
        body: 'You have been assigned shipment #GH123456',
        timestamp: DateTime.now().subtract(const Duration(minutes: 5)),
        type: NotificationType.shipment,
        relatedId: '123',
      ),
      NotificationEntity(
        id: '2',
        title: 'Payment Received',
        body: 'You received 50.000d for split payment.',
        timestamp: DateTime.now().subtract(const Duration(hours: 2)),
        type: NotificationType.payment,
        isRead: true,
      ),
      NotificationEntity(
        id: '3',
        title: 'System Maintenance',
        body: 'System will be down for maintenance at 2AM.',
        timestamp: DateTime.now().subtract(const Duration(days: 1)),
        type: NotificationType.system,
        isRead: true,
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text("Notifications"),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: notifications.isEmpty
          ? const EmptyStateWidget(
              message: "No notifications yet",
              icon: Icons.notifications_off_outlined,
            )
          : ListView.separated(
              itemCount: notifications.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final notification = notifications[index];
                return ListTile(
                  leading: _buildIcon(notification.type),
                  title: Text(
                    notification.title,
                    style: TextStyle(
                      fontWeight: notification.isRead ? FontWeight.normal : FontWeight.bold,
                    ),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text(notification.body, maxLines: 2, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 4),
                      Text(
                        DateFormat('dd/MM/yyyy HH:mm').format(notification.timestamp),
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                  tileColor: notification.isRead ? null : AppColors.primary.withOpacity(0.05),
                  onTap: () {
                    // Navigate if shipment
                    if (notification.type == NotificationType.shipment && notification.relatedId != null) {
                      context.push('/shipment/${notification.relatedId}');
                    }
                  },
                );
              },
            ),
    );
  }

  Widget _buildIcon(NotificationType type) {
    IconData icon;
    Color color;

    switch (type) {
      case NotificationType.shipment:
        icon = Icons.local_shipping;
        color = AppColors.primary;
        break;
      case NotificationType.payment:
        icon = Icons.attach_money;
        color = Colors.green;
        break;
      case NotificationType.system:
        icon = Icons.info;
        color = Colors.blue;
        break;
      case NotificationType.info:
      default:
        icon = Icons.notifications;
        color = Colors.grey;
        break;
    }

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, color: color, size: 24),
    );
  }
}
