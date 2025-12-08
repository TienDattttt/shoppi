import 'package:equatable/equatable.dart';

enum NotificationType {
  info,
  shipment,
  system,
  payment
}

class NotificationEntity extends Equatable {
  final String id;
  final String title;
  final String body;
  final DateTime timestamp;
  final bool isRead;
  final NotificationType type;
  final String? relatedId; // e.g. shipmentId

  const NotificationEntity({
    required this.id,
    required this.title,
    required this.body,
    required this.timestamp,
    this.isRead = false,
    this.type = NotificationType.info,
    this.relatedId,
  });

  @override
  List<Object?> get props => [id, title, body, timestamp, isRead, type, relatedId];
}
