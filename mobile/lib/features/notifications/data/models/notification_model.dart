import '../../domain/entities/notification_entity.dart';

class NotificationModel extends NotificationEntity {
  const NotificationModel({
    required super.id,
    required super.title,
    required super.body,
    required super.createdAt,
    required super.isRead,
    super.type,
    super.data,
  });

  /// Parse from backend response (supports both camelCase and snake_case)
  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? json['message'] as String? ?? '',
      createdAt: _parseDateTime(json['created_at'] ?? json['createdAt']),
      isRead: json['is_read'] as bool? ?? json['isRead'] as bool? ?? false,
      type: json['type'] as String?,
      data: json['data']?.toString(),
    );
  }

  static DateTime _parseDateTime(dynamic value) {
    if (value == null) return DateTime.now();
    if (value is DateTime) return value;
    final str = value as String;
    // Handle timestamps without timezone (assume UTC)
    if (!str.endsWith('Z') && !str.contains('+')) {
      return DateTime.parse('${str}Z').toLocal();
    }
    return DateTime.parse(str).toLocal();
  }
}
