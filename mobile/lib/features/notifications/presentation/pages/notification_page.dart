import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/features/notifications/domain/entities/notification_entity.dart';
import 'package:mobile/features/notifications/presentation/cubit/notification_cubit.dart';
import 'package:mobile/injection.dart';
import 'package:intl/intl.dart';

class NotificationPage extends StatelessWidget {
  const NotificationPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => getIt<NotificationCubit>()..fetchNotifications(),
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: Text("Notifications", style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold)),
          backgroundColor: Colors.transparent,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          centerTitle: true,
        ),
        body: BlocBuilder<NotificationCubit, NotificationState>(
          builder: (context, state) {
            if (state is NotificationLoading) {
              return const Center(child: CircularProgressIndicator());
            } else if (state is NotificationError) {
              return Center(child: Text(state.message));
            } else if (state is NotificationLoaded) {
              if (state.notifications.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_none, size: 64, color: AppColors.textHint),
                      const SizedBox(height: 16),
                      Text("No notifications", style: TextStyle(color: AppColors.textSecondary)),
                    ],
                  ),
                );
              }
              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: state.notifications.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final notification = state.notifications[index];
                  return _buildNotificationItem(notification);
                },
              );
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildNotificationItem(NotificationEntity notification) {
    return Container(
      decoration: BoxDecoration(
        color: notification.isRead ? Colors.white : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: notification.isRead ? null : Border.all(color: AppColors.primary.withOpacity(0.3), width: 1),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: notification.isRead ? Colors.grey[100] : AppColors.primary.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(
            Icons.notifications,
            color: notification.isRead ? Colors.grey : AppColors.primary,
            size: 24,
          ),
        ),
        title: Text(
          notification.title,
          style: GoogleFonts.plusJakartaSans(
            fontWeight: notification.isRead ? FontWeight.w600 : FontWeight.bold,
            fontSize: 16,
            color: AppColors.textPrimary,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 8),
            Text(notification.body, style: const TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 8),
            Text(
              DateFormat('dd/MM/yyyy HH:mm').format(notification.createdAt),
              style: const TextStyle(fontSize: 10, color: AppColors.textHint),
            ),
          ],
        ),
        onTap: () {
          // TODO: Mark as read and Navigate based on type
        },
      ),
    );
  }
}
