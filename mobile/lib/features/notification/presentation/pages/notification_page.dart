import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
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
        title: 'Đơn hàng mới',
        body: 'Bạn được giao đơn hàng #GH123456',
        timestamp: DateTime.now().subtract(const Duration(minutes: 5)),
        type: NotificationType.shipment,
        relatedId: '123',
      ),
      NotificationEntity(
        id: '2',
        title: 'Thanh toán thành công',
        body: 'Bạn nhận được 50.000đ tiền chia.',
        timestamp: DateTime.now().subtract(const Duration(hours: 2)),
        type: NotificationType.payment,
        isRead: true,
      ),
      NotificationEntity(
        id: '3',
        title: 'Bảo trì hệ thống',
        body: 'Hệ thống sẽ bảo trì lúc 2 giờ sáng.',
        timestamp: DateTime.now().subtract(const Duration(days: 1)),
        type: NotificationType.system,
        isRead: true,
      ),
    ];

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
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                    Expanded(
                      child: Text(
                        'Thông báo',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(width: 48), // Balance for back button
                  ],
                ),
              ),
            ),
          ),
          // Content
          Expanded(
            child: notifications.isEmpty
                ? const EmptyStateWidget(
                    message: 'Chưa có thông báo',
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
                        tileColor: notification.isRead ? null : AppColors.primarySoft,
                        onTap: () {
                          // Navigate if shipment
                          if (notification.type == NotificationType.shipment && notification.relatedId != null) {
                            context.push('/shipment/${notification.relatedId}');
                          }
                        },
                      );
                    },
                  ),
          ),
        ],
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
        color = AppColors.success;
        break;
      case NotificationType.system:
        icon = Icons.info;
        color = Colors.blue;
        break;
      case NotificationType.info:
      default:
        icon = Icons.notifications;
        color = AppColors.textSecondary;
        break;
    }

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: color, size: 22),
    );
  }
}

