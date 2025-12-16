import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/map_utils.dart';
import '../../../../injection.dart';
import '../../../../shared/widgets/tracking_timeline.dart';
import '../../domain/entities/shipment_entity.dart';
import '../cubit/shipment_detail_cubit.dart';

class ShipmentDetailPage extends StatelessWidget {
  final ShipmentEntity shipment;

  const ShipmentDetailPage({super.key, required this.shipment});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => getIt<ShipmentDetailCubit>(),
      child: ShipmentDetailView(shipment: shipment),
    );
  }
}

class ShipmentDetailView extends StatefulWidget {
  final ShipmentEntity shipment;
  const ShipmentDetailView({super.key, required this.shipment});

  @override
  State<ShipmentDetailView> createState() => _ShipmentDetailViewState();
}

class _ShipmentDetailViewState extends State<ShipmentDetailView> {
  late ShipmentEntity _shipment;
  GoogleMapController? _mapController;
  Position? _currentPosition;
  StreamSubscription<Position>? _positionStream;
  Set<Marker> _markers = {};
  BitmapDescriptor? _shipperIcon;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _shipment = widget.shipment;
    _loadCustomMarker();
    _setupMarkers();
    _startLocationTracking();
  }

  @override
  void dispose() {
    _positionStream?.cancel();
    _mapController?.dispose();
    super.dispose();
  }


  Future<void> _loadCustomMarker() async {
    try {
      _shipperIcon = await BitmapDescriptor.asset(
        const ImageConfiguration(size: Size(48, 48)),
        'assets/images/shipper_marker.png',
      );
    } catch (_) {
      _shipperIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen);
    }
    if (mounted) setState(() {});
  }

  void _setupMarkers() {
    final pickupLat = _shipment.pickupAddress.lat;
    final pickupLng = _shipment.pickupAddress.lng;
    final deliveryLat = _shipment.deliveryAddress.lat;
    final deliveryLng = _shipment.deliveryAddress.lng;

    _markers = {
      if (pickupLat != 0 && pickupLng != 0)
        Marker(
          markerId: const MarkerId('pickup'),
          position: LatLng(pickupLat, pickupLng),
          infoWindow: InfoWindow(
            title: 'Điểm lấy hàng',
            snippet: _shipment.pickupContactName,
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
        ),
      if (deliveryLat != 0 && deliveryLng != 0)
        Marker(
          markerId: const MarkerId('delivery'),
          position: LatLng(deliveryLat, deliveryLng),
          infoWindow: InfoWindow(
            title: 'Điểm giao hàng',
            snippet: _shipment.deliveryContactName,
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        ),
    };
  }

  void _startLocationTracking() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    // Get initial position
    _currentPosition = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );
    _updateShipperMarker();

    // Start streaming location updates
    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((Position position) {
      if (mounted) {
        setState(() {
          _currentPosition = position;
          _updateShipperMarker();
        });
      }
    });
  }

  void _updateShipperMarker() {
    if (_currentPosition == null) return;
    
    final shipperMarker = Marker(
      markerId: const MarkerId('shipper'),
      position: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
      icon: _shipperIcon ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
      rotation: _currentPosition!.heading,
      anchor: const Offset(0.5, 0.5),
      flat: true,
      infoWindow: const InfoWindow(title: 'Vị trí của bạn'),
    );

    setState(() {
      _markers.removeWhere((m) => m.markerId.value == 'shipper');
      _markers.add(shipperMarker);
    });
  }

  void _openBarcodeScanner() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _BarcodeScannerSheet(
        expectedTrackingNumber: _shipment.trackingNumber,
        onSuccess: (scannedCode) {
          Navigator.pop(context);
          _confirmPickupWithScan(scannedCode);
        },
        onError: (message) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(message), backgroundColor: AppColors.error),
          );
        },
      ),
    );
  }

  void _confirmPickupWithScan(String trackingNumber) {
    setState(() => _isLoading = true);
    context.read<ShipmentDetailCubit>().scanPickup(trackingNumber);
  }

  void _confirmPickup() {
    setState(() => _isLoading = true);
    context.read<ShipmentDetailCubit>().pickUpShipment(_shipment.id);
  }

  void _confirmDelivery() {
    Navigator.pushNamed(context, '/delivery-confirmation', arguments: _shipment);
  }

  Future<void> _makePhoneCall(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _openNavigation(double lat, double lng) {
    MapUtils.openNavigation(lat, lng);
  }

  String _getStatusText(ShipmentStatus status) {
    switch (status) {
      case ShipmentStatus.created: return 'Chờ xử lý';
      case ShipmentStatus.pendingAssignment: return 'Đang tìm shipper';
      case ShipmentStatus.assigned: return 'Cần lấy hàng';
      case ShipmentStatus.pickedUp: return 'Đã lấy hàng';
      case ShipmentStatus.inTransit: return 'Đang trung chuyển';
      case ShipmentStatus.readyForDelivery: return 'Chờ giao hàng';
      case ShipmentStatus.delivering: return 'Đang giao';
      case ShipmentStatus.delivered: return 'Giao thành công';
      case ShipmentStatus.failed: return 'Giao thất bại';
      case ShipmentStatus.pendingRedelivery: return 'Chờ giao lại';
      case ShipmentStatus.returning: return 'Đang hoàn';
      case ShipmentStatus.returned: return 'Đã hoàn';
    }
  }

  Color _getStatusColor(ShipmentStatus status) {
    switch (status) {
      case ShipmentStatus.assigned: return Colors.blue;
      case ShipmentStatus.pickedUp:
      case ShipmentStatus.inTransit: return Colors.orange;
      case ShipmentStatus.readyForDelivery:
      case ShipmentStatus.delivering: return Colors.purple;
      case ShipmentStatus.delivered: return Colors.green;
      case ShipmentStatus.failed: return Colors.red;
      default: return Colors.grey;
    }
  }
