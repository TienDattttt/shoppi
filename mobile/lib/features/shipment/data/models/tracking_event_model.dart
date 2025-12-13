import '../../domain/entities/tracking_event_entity.dart';

class TrackingEventModel extends TrackingEventEntity {
  const TrackingEventModel({
    required super.id,
    required super.status,
    required super.statusVi,
    super.description,
    super.descriptionVi,
    super.locationName,
    super.locationAddress,
    super.lat,
    super.lng,
    super.actorName,
    required super.eventTime,
  });

  factory TrackingEventModel.fromJson(Map<String, dynamic> json) {
    return TrackingEventModel(
      id: json['id'] as String,
      status: json['status'] as String? ?? '',
      statusVi: json['statusVi'] as String? ?? 
                json['status_vi'] as String? ?? '',
      description: json['description'] as String?,
      descriptionVi: json['descriptionVi'] as String? ?? 
                     json['description_vi'] as String?,
      locationName: json['locationName'] as String? ?? 
                    json['location_name'] as String?,
      locationAddress: json['locationAddress'] as String? ?? 
                       json['location_address'] as String?,
      lat: (json['lat'] as num?)?.toDouble() ?? 
           (json['location_lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble() ?? 
           (json['location_lng'] as num?)?.toDouble(),
      actorName: json['actorName'] as String? ?? 
                 json['actor_name'] as String?,
      eventTime: _parseDateTime(json['eventTime'] ?? json['event_time']),
    );
  }

  static DateTime _parseDateTime(dynamic value) {
    if (value == null) return DateTime.now();
    if (value is DateTime) return value;
    final str = value as String;
    if (!str.endsWith('Z') && !str.contains('+')) {
      return DateTime.parse('${str}Z').toLocal();
    }
    return DateTime.parse(str).toLocal();
  }
}
