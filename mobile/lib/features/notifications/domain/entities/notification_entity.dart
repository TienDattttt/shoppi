import 'package:equatable/equatable.dart';

class NotificationEntity extends Equatable {
  final String id;
  final String title;
  final String body;
  final DateTime createdAt;
  final bool isRead;
  final String? type; // 'order', 'system', 'promotion'
  final String? data; // JSON string for deep linking

  const NotificationEntity({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
    required this.isRead,
    this.type,
    this.data,
  });

  @override
  List<Object?> get props => [id, title, body, createdAt, isRead, type, data];
}
