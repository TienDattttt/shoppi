import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/navigation_service.dart';
import '../../../../core/services/socket_service.dart';
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
  Set<Polyline> _polylines = {};
  BitmapDescriptor? _shipperIcon;
  bool _isLoading = false;
  
  // Navigation mode
  bool _isNavigating = false;
  NavigationRoute? _currentRoute;
  int _currentStepIndex = 0;


  @override
  void initState() {
    super.initState();
    _shipment = widget.shipment;
    _loadCustomMarker();
    _setupMarkers();
    _startLocationTracking();
    _initSocket();
  }

  @override
  void dispose() {
    _positionStream?.cancel();
    _mapController?.dispose();
    SocketService.instance.disconnect();
    super.dispose();
  }

  /// Initialize socket for real-time location emission
  void _initSocket() {
    SocketService.instance.connect();
  }

  /// Emit current location via socket for real-time tracking
  void _emitLocationViaSocket() {
    if (_currentPosition == null) return;
    
    SocketService.instance.emitShipperLocation(
      shipmentId: _shipment.id,
      shipperId: '', // Backend will get from auth
      latitude: _currentPosition!.latitude,
      longitude: _currentPosition!.longitude,
      heading: _currentPosition!.heading,
      speed: _currentPosition!.speed,
    );
  }

  void _loadCustomMarker() {
    // Use default green marker for shipper (no custom asset needed)
    _shipperIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen);
    if (mounted) setState(() {});
  }

  void _setupMarkers() {
    final isPickup = _shipment.status == ShipmentStatus.assigned;
    final targetLat = isPickup ? _shipment.pickupAddress.lat : _shipment.deliveryAddress.lat;
    final targetLng = isPickup ? _shipment.pickupAddress.lng : _shipment.deliveryAddress.lng;

    _markers = {
      if (targetLat != 0 && targetLng != 0)
        Marker(
          markerId: const MarkerId('destination'),
          position: LatLng(targetLat, targetLng),
          infoWindow: InfoWindow(
            title: isPickup ? 'Điểm lấy hàng' : 'Điểm giao hàng',
            snippet: isPickup ? _shipment.pickupContactName : _shipment.deliveryContactName,
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            isPickup ? BitmapDescriptor.hueBlue : BitmapDescriptor.hueRed,
          ),
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

    _currentPosition = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );
    _updateShipperMarker();

    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 5, // Update every 5 meters for smooth navigation
      ),
    ).listen((Position position) {
      if (mounted) {
        setState(() {
          _currentPosition = position;
          _updateShipperMarker();
          if (_isNavigating) {
            _updateNavigationProgress();
          }
        });
        // Emit location via socket for real-time tracking
        _emitLocationViaSocket();
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
      zIndex: 2,
    );

    setState(() {
      _markers.removeWhere((m) => m.markerId.value == 'shipper');
      _markers.add(shipperMarker);
    });

    // Follow shipper in navigation mode
    if (_isNavigating && _mapController != null) {
      _mapController!.animateCamera(
        CameraUpdate.newCameraPosition(CameraPosition(
          target: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
          zoom: 17,
          bearing: _currentPosition!.heading,
          tilt: 45,
        )),
      );
    }
  }


  /// Start in-app navigation
  Future<void> _startNavigation() async {
    if (_currentPosition == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đang lấy vị trí...')),
      );
      return;
    }

    setState(() => _isLoading = true);

    final isPickup = _shipment.status == ShipmentStatus.assigned;
    final destLat = isPickup ? _shipment.pickupAddress.lat : _shipment.deliveryAddress.lat;
    final destLng = isPickup ? _shipment.pickupAddress.lng : _shipment.deliveryAddress.lng;

    final route = await NavigationService.getRoute(
      origin: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
      destination: LatLng(destLat, destLng),
      profile: 'driving',
    );

    setState(() => _isLoading = false);

    if (route == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không thể lấy đường đi. Thử mở Google Maps?')),
      );
      return;
    }

    setState(() {
      _currentRoute = route;
      _isNavigating = true;
      _currentStepIndex = 0;
      
      // Draw route polyline
      _polylines = {
        Polyline(
          polylineId: const PolylineId('route'),
          points: route.polylinePoints,
          color: Colors.blue,
          width: 5,
        ),
      };
    });

    // Animate to navigation view
    _mapController?.animateCamera(
      CameraUpdate.newCameraPosition(CameraPosition(
        target: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
        zoom: 17,
        bearing: _currentPosition!.heading,
        tilt: 45,
      )),
    );
  }

  /// Stop navigation mode
  void _stopNavigation() {
    setState(() {
      _isNavigating = false;
      _currentRoute = null;
      _polylines = {};
    });

    // Reset camera
    _mapController?.animateCamera(
      CameraUpdate.newCameraPosition(CameraPosition(
        target: LatLng(_currentPosition?.latitude ?? 10.8, _currentPosition?.longitude ?? 106.6),
        zoom: 14,
        bearing: 0,
        tilt: 0,
      )),
    );
  }

  /// Update navigation progress based on current position
  void _updateNavigationProgress() {
    if (_currentRoute == null || _currentPosition == null) return;

    // Find nearest step
    for (int i = _currentStepIndex; i < _currentRoute!.steps.length; i++) {
      final step = _currentRoute!.steps[i];
      if (step.maneuverLocation != null) {
        final distance = _calculateDistance(
          _currentPosition!.latitude, _currentPosition!.longitude,
          step.maneuverLocation!.latitude, step.maneuverLocation!.longitude,
        );
        
        // If within 30m of maneuver point, move to next step
        if (distance < 30 && i > _currentStepIndex) {
          setState(() => _currentStepIndex = i);
          break;
        }
      }
    }
  }

  double _calculateDistance(double lat1, double lng1, double lat2, double lng2) {
    const p = 0.017453292519943295;
    final a = 0.5 - math.cos((lat2 - lat1) * p) / 2 +
        math.cos(lat1 * p) * math.cos(lat2 * p) *
        (1 - math.cos((lng2 - lng1) * p)) / 2;
    return 12742000 * math.asin(math.sqrt(a)); // meters
  }

  /// Show navigation options dialog
  void _showNavigationOptions() {
    final isPickup = _shipment.status == ShipmentStatus.assigned;
    final destLat = isPickup ? _shipment.pickupAddress.lat : _shipment.deliveryAddress.lat;
    final destLng = isPickup ? _shipment.pickupAddress.lng : _shipment.deliveryAddress.lng;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40, height: 4,
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
            ),
            const SizedBox(height: 20),
            Text('Chọn cách điều hướng', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 20),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.navigation, color: Colors.blue),
              ),
              title: const Text('Điều hướng trong app'),
              subtitle: const Text('Xem đường đi ngay trong ứng dụng'),
              onTap: () {
                Navigator.pop(context);
                _startNavigation();
              },
            ),
            const Divider(),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.map, color: Colors.green),
              ),
              title: const Text('Mở Google Maps'),
              subtitle: const Text('Điều hướng bằng Google Maps'),
              onTap: () {
                Navigator.pop(context);
                MapUtils.openNavigation(destLat, destLng);
              },
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
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
    // Check distance to destination before allowing delivery confirmation
    // Inspired by reference project - must be within 150m
    if (_currentPosition != null) {
      final distance = Geolocator.distanceBetween(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
        _shipment.deliveryAddress.lat,
        _shipment.deliveryAddress.lng,
      );

      if (distance > 150) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Bạn còn cách điểm giao ${(distance / 1000).toStringAsFixed(1)}km. Hãy đến gần hơn để xác nhận giao hàng.'),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }
    }
    
    Navigator.pushNamed(context, '/delivery-confirmation', arguments: _shipment);
  }

  Future<void> _makePhoneCall(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
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

  @override
  Widget build(BuildContext context) {
    // Navigation mode - full screen map
    if (_isNavigating) {
      return _buildNavigationView();
    }

    return BlocConsumer<ShipmentDetailCubit, ShipmentDetailState>(
      listener: (context, state) {
        print('[ShipmentDetailPage] BlocListener received state: $state');
        setState(() => _isLoading = false);
        if (state is ShipmentDetailUpdated) {
          print('[ShipmentDetailPage] Shipment updated, new status: ${state.shipment.status}');
          setState(() {
            _shipment = state.shipment;
            // Rebuild markers when status changes (e.g., from pickup to delivery)
            _setupMarkers();
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Cập nhật thành công!'), backgroundColor: AppColors.success),
          );
          // Navigate back to list after successful pickup/delivery
          Future.delayed(const Duration(milliseconds: 500), () {
            if (mounted) Navigator.pop(context, true); // Return true to indicate refresh needed
          });
        } else if (state is ShipmentDetailError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
          );
        }
      },
      builder: (context, state) => Scaffold(
        backgroundColor: AppColors.background,
        body: Stack(
          children: [
            CustomScrollView(
              slivers: [
                _buildHeader(),
                SliverToBoxAdapter(child: _buildMapSection()),
                SliverToBoxAdapter(child: _buildAddressSection()),
                if (_shipment.codAmount > 0)
                  SliverToBoxAdapter(child: _buildCodSection()),
                SliverToBoxAdapter(child: _buildTrackingSection()),
                const SliverToBoxAdapter(child: SizedBox(height: 100)),
              ],
            ),
            _buildBottomActions(),
            if (_isLoading)
              Container(
                color: Colors.black26,
                child: const Center(child: CircularProgressIndicator()),
              ),
          ],
        ),
      ),
    );
  }

  /// Build full-screen navigation view (like Google Maps navigation)
  Widget _buildNavigationView() {
    final currentStep = _currentRoute != null && _currentStepIndex < _currentRoute!.steps.length
        ? _currentRoute!.steps[_currentStepIndex]
        : null;

    return Scaffold(
      body: Stack(
        children: [
          // Full screen map
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: LatLng(
                _currentPosition?.latitude ?? 10.8231,
                _currentPosition?.longitude ?? 106.6297,
              ),
              zoom: 17,
              tilt: 45,
              bearing: _currentPosition?.heading ?? 0,
            ),
            onMapCreated: (controller) => _mapController = controller,
            markers: _markers,
            polylines: _polylines,
            myLocationEnabled: false,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            mapToolbarEnabled: false,
            compassEnabled: true,
          ),

          // Top navigation instruction banner
          if (currentStep != null)
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Container(
                  margin: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.green.shade600,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.3),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Center(
                                child: Text(currentStep.maneuverIcon, style: const TextStyle(fontSize: 28)),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    currentStep.formattedDistance,
                                    style: GoogleFonts.plusJakartaSans(
                                      color: Colors.white,
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    currentStep.instruction,
                                    style: GoogleFonts.plusJakartaSans(
                                      color: Colors.white.withOpacity(0.9),
                                      fontSize: 16,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.green.shade700,
                          borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _currentRoute?.formattedDuration ?? '',
                              style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w600),
                            ),
                            Text(
                              _currentRoute?.formattedDistance ?? '',
                              style: GoogleFonts.plusJakartaSans(color: Colors.white.withOpacity(0.8)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // Bottom controls
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Container(
                margin: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8)],
                      ),
                      child: IconButton(
                        onPressed: _stopNavigation,
                        icon: const Icon(Icons.close, color: Colors.red),
                        tooltip: 'Thoát điều hướng',
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8)],
                      ),
                      child: IconButton(
                        onPressed: () {
                          if (_currentPosition != null && _mapController != null) {
                            _mapController!.animateCamera(
                              CameraUpdate.newCameraPosition(CameraPosition(
                                target: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
                                zoom: 17,
                                bearing: _currentPosition!.heading,
                                tilt: 45,
                              )),
                            );
                          }
                        },
                        icon: const Icon(Icons.my_location, color: Colors.blue),
                        tooltip: 'Vị trí của tôi',
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8)],
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _shipment.status == ShipmentStatus.assigned ? Icons.store : Icons.location_on,
                            color: _shipment.status == ShipmentStatus.assigned ? Colors.blue : Colors.red,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _shipment.status == ShipmentStatus.assigned ? 'Điểm lấy hàng' : 'Điểm giao hàng',
                            style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return SliverAppBar(
      expandedHeight: 120,
      pinned: true,
      backgroundColor: _getStatusColor(_shipment.status),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back, color: Colors.white),
        onPressed: () => Navigator.pop(context),
      ),
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [_getStatusColor(_shipment.status), _getStatusColor(_shipment.status).withOpacity(0.8)],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(56, 8, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    _shipment.trackingNumber,
                    style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
                    child: Text(
                      _getStatusText(_shipment.status),
                      style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMapSection() {
    final isPickup = _shipment.status == ShipmentStatus.assigned;
    final targetLat = isPickup ? _shipment.pickupAddress.lat : _shipment.deliveryAddress.lat;
    final targetLng = isPickup ? _shipment.pickupAddress.lng : _shipment.deliveryAddress.lng;

    return Container(
      height: 280,
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: LatLng(targetLat != 0 ? targetLat : 10.8231, targetLng != 0 ? targetLng : 106.6297),
              zoom: 14,
            ),
            onMapCreated: (controller) => _mapController = controller,
            markers: _markers,
            polylines: _polylines,
            myLocationEnabled: false,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
          ),
          Positioned(
            bottom: 12,
            right: 12,
            child: FloatingActionButton.small(
              heroTag: 'navigate',
              backgroundColor: Colors.white,
              onPressed: _showNavigationOptions,
              child: const Icon(Icons.navigation, color: Colors.blue),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAddressSection() {
    final isPickup = _shipment.status == ShipmentStatus.assigned;
    final address = isPickup ? _shipment.pickupAddress : _shipment.deliveryAddress;
    final contactName = isPickup ? _shipment.pickupContactName : _shipment.deliveryContactName;
    final contactPhone = isPickup ? _shipment.pickupContactPhone : _shipment.deliveryContactPhone;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isPickup ? Colors.blue.shade50 : Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  isPickup ? Icons.store : Icons.location_on,
                  color: isPickup ? Colors.blue : Colors.red,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isPickup ? 'Điểm lấy hàng' : 'Điểm giao hàng',
                      style: GoogleFonts.plusJakartaSans(fontSize: 12, color: Colors.grey.shade600),
                    ),
                    Text(
                      contactName,
                      style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => _makePhoneCall(contactPhone),
                icon: const Icon(Icons.phone, color: Colors.green),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            address.fullAddress,
            style: GoogleFonts.plusJakartaSans(color: Colors.grey.shade700, height: 1.4),
          ),
          const SizedBox(height: 8),
          Text(
            contactPhone,
            style: GoogleFonts.plusJakartaSans(color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  Widget _buildCodSection() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.orange.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.orange.shade200),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: Colors.orange.shade100, borderRadius: BorderRadius.circular(12)),
            child: Icon(Icons.payments, color: Colors.orange.shade700),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Thu hộ (COD)', style: GoogleFonts.plusJakartaSans(color: Colors.orange.shade700, fontSize: 12)),
                Text(
                  '${_shipment.codAmount.toStringAsFixed(0)}đ',
                  style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 20, color: Colors.orange.shade800),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrackingSection() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Lịch sử vận chuyển', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 16),
          if (_shipment.trackingEvents.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Text('Chưa có thông tin', style: GoogleFonts.plusJakartaSans(color: Colors.grey)),
              ),
            )
          else
            TrackingTimeline(events: _shipment.trackingEvents),
        ],
      ),
    );
  }

  Widget _buildBottomActions() {
    final isPickup = _shipment.status == ShipmentStatus.assigned;
    final isDelivery = _shipment.status == ShipmentStatus.readyForDelivery || _shipment.status == ShipmentStatus.delivering;

    if (!isPickup && !isDelivery) return const SizedBox.shrink();

    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, -2))],
        ),
        child: SafeArea(
          child: Row(
            children: [
              if (isPickup) ...[
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _openBarcodeScanner,
                    icon: const Icon(Icons.qr_code_scanner),
                    label: const Text('Quét mã'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: _confirmPickup,
                    icon: const Icon(Icons.check),
                    label: const Text('Xác nhận lấy hàng'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
              if (isDelivery)
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _confirmDelivery,
                    icon: const Icon(Icons.check_circle),
                    label: const Text('Xác nhận giao hàng'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BarcodeScannerSheet extends StatefulWidget {
  final String expectedTrackingNumber;
  final Function(String) onSuccess;
  final Function(String) onError;

  const _BarcodeScannerSheet({
    required this.expectedTrackingNumber,
    required this.onSuccess,
    required this.onError,
  });

  @override
  State<_BarcodeScannerSheet> createState() => _BarcodeScannerSheetState();
}

class _BarcodeScannerSheetState extends State<_BarcodeScannerSheet> {
  final MobileScannerController _controller = MobileScannerController();
  bool _isProcessing = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_isProcessing) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode?.rawValue == null) return;

    setState(() => _isProcessing = true);
    final scannedCode = barcode!.rawValue!;

    if (scannedCode == widget.expectedTrackingNumber) {
      widget.onSuccess(scannedCode);
    } else {
      widget.onError('Mã vận đơn không khớp!\nMong đợi: ${widget.expectedTrackingNumber}\nĐã quét: $scannedCode');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Quét mã vận đơn', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 18)),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
              ],
            ),
          ),
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(16),
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(16)),
              child: MobileScanner(controller: _controller, onDetect: _onDetect),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Đưa mã vạch vào khung hình để quét',
              style: GoogleFonts.plusJakartaSans(color: Colors.grey.shade600),
            ),
          ),
        ],
      ),
    );
  }
}
