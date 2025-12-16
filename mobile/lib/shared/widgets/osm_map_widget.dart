import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

/// OpenStreetMap widget - FREE alternative to Google Maps
/// Uses flutter_map with OpenStreetMap tiles
class OsmMapWidget extends StatefulWidget {
  final LatLng? initialCenter;
  final double initialZoom;
  final List<OsmMarker> markers;
  final List<OsmPolyline> polylines;
  final bool showControls;
  final bool showAttribution;
  final Function(LatLng)? onTap;
  final MapController? controller;

  const OsmMapWidget({
    super.key,
    this.initialCenter,
    this.initialZoom = 14,
    this.markers = const [],
    this.polylines = const [],
    this.showControls = true,
    this.showAttribution = true,
    this.onTap,
    this.controller,
  });

  @override
  State<OsmMapWidget> createState() => _OsmMapWidgetState();
}

class _OsmMapWidgetState extends State<OsmMapWidget> {
  late MapController _mapController;

  @override
  void initState() {
    super.initState();
    _mapController = widget.controller ?? MapController();
  }

  @override
  void dispose() {
    if (widget.controller == null) {
      _mapController.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: widget.initialCenter ?? const LatLng(10.8, 106.6),
            initialZoom: widget.initialZoom,
            minZoom: 5,
            maxZoom: 18,
            onTap: widget.onTap != null 
                ? (tapPosition, point) => widget.onTap!(point)
                : null,
          ),
          children: [
            // OpenStreetMap tile layer - FREE!
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.example.mobile',
              maxZoom: 19,
            ),
            // Polylines layer
            if (widget.polylines.isNotEmpty)
              PolylineLayer(
                polylines: widget.polylines.map((p) => Polyline(
                  points: p.points,
                  color: p.color,
                  strokeWidth: p.strokeWidth,
                  isDotted: p.isDotted,
                )).toList(),
              ),
            // Markers layer
            if (widget.markers.isNotEmpty)
              MarkerLayer(
                markers: widget.markers.map((m) => Marker(
                  point: m.point,
                  width: m.width,
                  height: m.height,
                  child: m.child,
                )).toList(),
              ),
          ],
        ),
        // Map controls
        if (widget.showControls)
          Positioned(
            right: 8,
            bottom: widget.showAttribution ? 24 : 8,
            child: Column(
              children: [
                _buildControlButton(Icons.add, () {
                  final zoom = _mapController.camera.zoom;
                  _mapController.move(_mapController.camera.center, zoom + 1);
                }),
                const SizedBox(height: 4),
                _buildControlButton(Icons.remove, () {
                  final zoom = _mapController.camera.zoom;
                  _mapController.move(_mapController.camera.center, zoom - 1);
                }),
              ],
            ),
          ),
        // Attribution
        if (widget.showAttribution)
          Positioned(
            left: 4,
            bottom: 4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.8),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text(
                '© OpenStreetMap',
                style: TextStyle(fontSize: 8, color: Colors.black54),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildControlButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
        ),
        child: Icon(icon, size: 20, color: Colors.black87),
      ),
    );
  }
}

/// Custom marker for OSM map
class OsmMarker {
  final LatLng point;
  final Widget child;
  final double width;
  final double height;

  const OsmMarker({
    required this.point,
    required this.child,
    this.width = 40,
    this.height = 40,
  });

  /// Factory for pickup marker (blue store icon)
  factory OsmMarker.pickup(LatLng point, {String? label}) {
    return OsmMarker(
      point: point,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.store, color: Colors.blue, size: 32),
          if (label != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.blue,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 10)),
            ),
        ],
      ),
      height: label != null ? 60 : 40,
    );
  }

  /// Factory for delivery marker (red location icon)
  factory OsmMarker.delivery(LatLng point, {String? label}) {
    return OsmMarker(
      point: point,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.location_on, color: Colors.red, size: 36),
          if (label != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 10)),
            ),
        ],
      ),
      height: label != null ? 60 : 40,
    );
  }

  /// Factory for shipper marker (green navigation icon with rotation)
  factory OsmMarker.shipper(LatLng point, {double heading = 0}) {
    return OsmMarker(
      point: point,
      width: 50,
      height: 50,
      child: Transform.rotate(
        angle: heading * 3.14159 / 180,
        child: Container(
          decoration: BoxDecoration(
            color: Colors.green,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 8)],
          ),
          child: const Icon(Icons.navigation, color: Colors.white, size: 28),
        ),
      ),
    );
  }
}

/// Custom polyline for OSM map
class OsmPolyline {
  final List<LatLng> points;
  final Color color;
  final double strokeWidth;
  final bool isDotted;

  const OsmPolyline({
    required this.points,
    this.color = Colors.blue,
    this.strokeWidth = 3,
    this.isDotted = false,
  });
}
