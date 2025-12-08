import 'package:hive/hive.dart';

part 'offline_action.g.dart';

@HiveType(typeId: 10)
class OfflineAction extends HiveObject {
  @HiveField(0)
  final String id;
  
  @HiveField(1)
  final String type; // 'pickup', 'deliver', 'fail'
  
  @HiveField(2)
  final Map<String, dynamic> payload;
  
  @HiveField(3)
  final DateTime timestamp;

  OfflineAction({
    required this.id,
    required this.type,
    required this.payload,
    required this.timestamp,
  });
}
