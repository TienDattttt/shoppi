import 'package:dio/dio.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../config/app_config.dart';

/// Navigation Service using Mapbox Directions API
/// Provides turn-by-turn directions and route polylines
class NavigationService {
  static final Dio _dio = Dio();
  
  /// Mapbox Directions API endpoint
  static const String _baseUrl = 'https://api.mapbox.com/directions/v5/mapbox';
  
  /// Get route and directions from origin to destination
  static Future<NavigationRoute?> getRoute({
    required LatLng origin,
    required LatLng destination,
    String profile = 'driving', // driving, walking, cycling
  }) async {
    try {
      final url = '$_baseUrl/$profile/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}';
      
      final response = await _dio.get(url, queryParameters: {
        'access_token': AppConfig.mapboxAccessToken,
        'geometries': 'geojson',
        'steps': 'true',
        'overview': 'full',
        'language': 'vi',
        'voice_instructions': 'true',
        'banner_instructions': 'true',
      });

      if (response.statusCode == 200 && response.data['routes'] != null && (response.data['routes'] as List).isNotEmpty) {
        final route = response.data['routes'][0];
        return NavigationRoute.fromMapbox(route);
      }
      return null;
    } catch (e) {
      print('NavigationService error: $e');
      return null;
    }
  }

  /// Decode GeoJSON coordinates to LatLng list
  static List<LatLng> decodeGeoJson(List<dynamic> coordinates) {
    return coordinates.map((coord) => LatLng(coord[1].toDouble(), coord[0].toDouble())).toList();
  }
}

/// Navigation route with polyline and steps
class NavigationRoute {
  final List<LatLng> polylinePoints;
  final List<NavigationStep> steps;
  final double distanceMeters;
  final double durationSeconds;
  final String? summary;

  NavigationRoute({
    required this.polylinePoints,
    required this.steps,
    required this.distanceMeters,
    required this.durationSeconds,
    this.summary,
  });

  factory NavigationRoute.fromMapbox(Map<String, dynamic> json) {
    final geometry = json['geometry'];
    final legs = json['legs'] as List? ?? [];
    
    // Decode polyline from GeoJSON
    List<LatLng> points = [];
    if (geometry != null && geometry['coordinates'] != null) {
      points = NavigationService.decodeGeoJson(geometry['coordinates']);
    }

    // Parse steps
    List<NavigationStep> steps = [];
    for (final leg in legs) {
      final legSteps = leg['steps'] as List? ?? [];
      for (final step in legSteps) {
        steps.add(NavigationStep.fromMapbox(step));
      }
    }

    return NavigationRoute(
      polylinePoints: points,
      steps: steps,
      distanceMeters: (json['distance'] ?? 0).toDouble(),
      durationSeconds: (json['duration'] ?? 0).toDouble(),
      summary: legs.isNotEmpty ? legs[0]['summary'] : null,
    );
  }

  String get formattedDistance {
    if (distanceMeters >= 1000) {
      return '${(distanceMeters / 1000).toStringAsFixed(1)} km';
    }
    return '${distanceMeters.toInt()} m';
  }

  String get formattedDuration {
    final minutes = (durationSeconds / 60).round();
    if (minutes >= 60) {
      final hours = minutes ~/ 60;
      final mins = minutes % 60;
      return '$hours giờ $mins phút';
    }
    return '$minutes phút';
  }
}


/// Single navigation step with instruction
class NavigationStep {
  final String instruction;
  final String? modifier; // left, right, straight, etc.
  final String maneuverType; // turn, arrive, depart, etc.
  final double distanceMeters;
  final double durationSeconds;
  final LatLng? maneuverLocation;
  final String? name; // Street name

  NavigationStep({
    required this.instruction,
    this.modifier,
    required this.maneuverType,
    required this.distanceMeters,
    required this.durationSeconds,
    this.maneuverLocation,
    this.name,
  });

  factory NavigationStep.fromMapbox(Map<String, dynamic> json) {
    final maneuver = json['maneuver'] ?? {};
    final bannerInstructions = json['bannerInstructions'] as List?;
    
    String instruction = '';
    if (bannerInstructions != null && bannerInstructions.isNotEmpty) {
      instruction = bannerInstructions[0]['primary']?['text'] ?? '';
    } else {
      instruction = maneuver['instruction'] ?? '';
    }

    LatLng? location;
    if (maneuver['location'] != null) {
      final loc = maneuver['location'] as List;
      location = LatLng(loc[1].toDouble(), loc[0].toDouble());
    }

    return NavigationStep(
      instruction: instruction,
      modifier: maneuver['modifier'],
      maneuverType: maneuver['type'] ?? '',
      distanceMeters: (json['distance'] ?? 0).toDouble(),
      durationSeconds: (json['duration'] ?? 0).toDouble(),
      maneuverLocation: location,
      name: json['name'],
    );
  }

  /// Get icon for maneuver type
  String get maneuverIcon {
    switch (maneuverType) {
      case 'turn':
        if (modifier == 'left') return '↰';
        if (modifier == 'right') return '↱';
        if (modifier == 'sharp left') return '↰';
        if (modifier == 'sharp right') return '↱';
        if (modifier == 'slight left') return '↖';
        if (modifier == 'slight right') return '↗';
        return '↑';
      case 'arrive':
        return '🏁';
      case 'depart':
        return '🚀';
      case 'roundabout':
        return '↻';
      case 'merge':
        return '⤵';
      case 'fork':
        return '⑂';
      default:
        return '↑';
    }
  }

  String get formattedDistance {
    if (distanceMeters >= 1000) {
      return '${(distanceMeters / 1000).toStringAsFixed(1)} km';
    }
    return '${distanceMeters.toInt()} m';
  }
}
