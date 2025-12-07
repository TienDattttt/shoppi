import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../domain/entities/shipment_entity.dart';

class ShipmentMapView extends StatefulWidget {
  final ShipmentEntity shipment;

  const ShipmentMapView({super.key, required this.shipment});

  @override
  State<ShipmentMapView> createState() => _ShipmentMapViewState();
}

class _ShipmentMapViewState extends State<ShipmentMapView> {
  late GoogleMapController _controller;
  Set<Marker> _markers = {};

  @override
  void initState() {
    super.initState();
    _setupMarkers();
  }

  void _setupMarkers() {
    _markers = {
      Marker(
        markerId: const MarkerId('pickup'),
        position: LatLng(
          widget.shipment.pickupAddress.lat,
          widget.shipment.pickupAddress.lng,
        ),
        infoWindow: InfoWindow(title: 'Pickup', snippet: widget.shipment.pickupAddress.fullAddress),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
      ),
      Marker(
        markerId: const MarkerId('delivery'),
        position: LatLng(
          widget.shipment.deliveryAddress.lat,
          widget.shipment.deliveryAddress.lng,
        ),
        infoWindow: InfoWindow(title: 'Delivery', snippet: widget.shipment.deliveryAddress.fullAddress),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    // Initial camera position centered between pickup and delivery (simplified)
    final lat = widget.shipment.pickupAddress.lat;
    final lng = widget.shipment.pickupAddress.lng;

    return SizedBox(
      height: 200,
      width: double.infinity,
      child: GoogleMap(
        initialCameraPosition: CameraPosition(
          target: LatLng(lat, lng),
          zoom: 12,
        ),
        markers: _markers,
        onMapCreated: (controller) {
          _controller = controller;
          // Fit bounds
          Future.delayed(const Duration(milliseconds: 500), () {
            try {
              _controller.animateCamera(CameraUpdate.newLatLngBounds(
                 _bounds(_markers),
                 50,
              ));
            } catch (e) {
              // Handle error
            }
          });
        },
        myLocationEnabled: true,
        myLocationButtonEnabled: false,
      ),
    );
  }

  LatLngBounds _bounds(Set<Marker> markers) {
    if (markers.isEmpty) {
       return LatLngBounds(northeast: const LatLng(0,0), southwest: const LatLng(0,0)); 
    }
    double minLat = 90.0, minLng = 180.0, maxLat = -90.0, maxLng = -180.0;

    for (final m in markers) {
      if (m.position.latitude < minLat) minLat = m.position.latitude;
      if (m.position.latitude > maxLat) maxLat = m.position.latitude;
      if (m.position.longitude < minLng) minLng = m.position.longitude;
      if (m.position.longitude > maxLng) maxLng = m.position.longitude;
    }

    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }
}
