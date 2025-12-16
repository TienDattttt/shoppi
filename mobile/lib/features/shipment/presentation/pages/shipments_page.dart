import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/constants/app_colors.dart';
import '../../domain/entities/shipment_entity.dart';
import '../cubit/shipment_list_cubit.dart';

class ShipmentsPage extends StatefulWidget {
  const ShipmentsPage({super.key});

  @override
  State<ShipmentsPage> createState() => _ShipmentsPageState();
}

class _ShipmentsPageState extends State<ShipmentsPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          SliverAppBar(
            floating: true,
            pinned: true,
            snap: true,
            backgroundColor: Colors.white,
            elevation: 0,
            title: Text(
              'Đơn hàng của tôi',
              style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
                fontSize: 18,
              ),
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(48),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border(
                    bottom: BorderSide(color: Colors.grey.shade200),
                  ),
                ),
                child: TabBar(
                  controller: _tabController,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary,
                  indicatorWeight: 3,
                  labelStyle: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                  tabs: const [
                    Tab(text: 'Cần lấy'),
                    Tab(text: 'Cần giao'),
                    Tab(text: 'Hoàn thành'),
                    Tab(text: 'Tất cả'),
                  ],
                ),
              ),
            ),
          ),
        ],
        body: BlocBuilder<ShipmentListCubit, ShipmentListState>(
          builder: (context, state) {
            if (state is ShipmentListLoading) {
              return const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              );
            } else if (state is ShipmentListError) {
              return _buildErrorView(state.message);
            } else if (state is ShipmentListLoaded) {
              return TabBarView(
                controller: _tabController,
                children: [
                  // Cần lấy: nhóm theo shop
                  _buildGroupedPickupList(
                    state.shipments.where((s) => _needsPickup(s.status)).toList(),
                  ),
                  // Cần giao: nhóm theo khu vực
                  _buildGroupedDeliveryList(
                    state.shipments.where((s) => _needsDelivery(s.status)).toList(),
                  ),
                  // Hoàn thành
                  _buildCompletedList(
                    state.shipments.where((s) => _isCompleted(s.status)).toList(),
                  ),
                  // Tất cả
                  _buildAllList(state.shipments),
                ],
              );
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildErrorView(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: AppColors.error),
          const SizedBox(height: 16),
          Text(message, style: TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => context.read<ShipmentListCubit>().fetchShipments(),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            child: const Text('Thử lại', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  bool _needsPickup(ShipmentStatus status) {
    return status == ShipmentStatus.assigned;
  }

  bool _needsDelivery(ShipmentStatus status) {
    return status == ShipmentStatus.pickedUp ||
        status == ShipmentStatus.inTransit ||
        status == ShipmentStatus.readyForDelivery ||
        status == ShipmentStatus.delivering ||
        status == ShipmentStatus.pendingRedelivery;
  }

  bool _isCompleted(ShipmentStatus status) {
    return status == ShipmentStatus.delivered ||
        status == ShipmentStatus.failed ||
        status == ShipmentStatus.returned;
  }

  /// Build grouped pickup list - nhóm theo shop (địa chỉ lấy hàng)
  Widget _buildGroupedPickupList(List<ShipmentEntity> shipments) {
    if (shipments.isEmpty) {
      return _buildEmptyView('Không có đơn cần lấy', Icons.inventory_2_outlined);
    }

    // Nhóm theo địa chỉ shop (pickup address)
    final grouped = <String, List<ShipmentEntity>>{};
    for (final s in shipments) {
      final key = s.pickupContactName.isNotEmpty 
          ? s.pickupContactName 
          : s.pickupAddress.fullAddress;
      grouped.putIfAbsent(key, () => []).add(s);
    }

    // Tính tổng COD
    final totalCod = shipments.fold<double>(0, (sum, s) => sum + s.codAmount);

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async => context.read<ShipmentListCubit>().fetchShipments(),
      child: CustomScrollView(
        slivers: [
          // Summary bar
          SliverToBoxAdapter(
            child: _buildSummaryBar(
              totalOrders: shipments.length,
              totalShops: grouped.length,
              totalCod: totalCod,
              icon: Icons.inventory_2,
              color: Colors.blue,
              label: 'điểm lấy',
            ),
          ),
          // List
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final shopName = grouped.keys.elementAt(index);
                final shopShipments = grouped[shopName]!;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: _buildShopGroupCard(
                    shopName: shopName,
                    address: shopShipments.first.pickupAddress.fullAddress,
                    phone: shopShipments.first.pickupContactPhone,
                    shipments: shopShipments,
                    isPickup: true,
                  ),
                );
              },
              childCount: grouped.length,
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }

  /// Build grouped delivery list - nhóm theo khu vực giao
  Widget _buildGroupedDeliveryList(List<ShipmentEntity> shipments) {
    if (shipments.isEmpty) {
      return _buildEmptyView('Không có đơn cần giao', Icons.local_shipping_outlined);
    }

    // Nhóm theo khu vực (lấy phần cuối địa chỉ - quận/huyện)
    final grouped = <String, List<ShipmentEntity>>{};
    for (final s in shipments) {
      final parts = s.deliveryAddress.fullAddress.split(',');
      final area = parts.length >= 2 
          ? parts[parts.length - 2].trim() 
          : 'Khác';
      grouped.putIfAbsent(area, () => []).add(s);
    }

    // Tính tổng COD
    final totalCod = shipments.fold<double>(0, (sum, s) => sum + s.codAmount);

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async => context.read<ShipmentListCubit>().fetchShipments(),
      child: CustomScrollView(
        slivers: [
          // Summary bar
          SliverToBoxAdapter(
            child: _buildSummaryBar(
              totalOrders: shipments.length,
              totalShops: grouped.length,
              totalCod: totalCod,
              icon: Icons.local_shipping,
              color: Colors.orange,
              label: 'khu vực',
            ),
          ),
          // List
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final area = grouped.keys.elementAt(index);
                final areaShipments = grouped[area]!;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: _buildAreaGroupCard(
                    areaName: area,
                    shipments: areaShipments,
                  ),
                );
              },
              childCount: grouped.length,
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }

  /// Build completed list - danh sách đơn hoàn thành
  Widget _buildCompletedList(List<ShipmentEntity> shipments) {
    if (shipments.isEmpty) {
      return _buildEmptyView('Chưa có đơn hoàn thành', Icons.check_circle_outline);
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async => context.read<ShipmentListCubit>().fetchShipments(),
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: shipments.length,
        itemBuilder: (context, index) => _buildCompactShipmentCard(shipments[index]),
      ),
    );
  }

  /// Build all list
  Widget _buildAllList(List<ShipmentEntity> shipments) {
    if (shipments.isEmpty) {
      return _buildEmptyView('Chưa có đơn hàng', Icons.inbox_outlined);
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async => context.read<ShipmentListCubit>().fetchShipments(),
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: shipments.length,
        itemBuilder: (context, index) => _buildCompactShipmentCard(shipments[index]),
      ),
    );
  }

  Widget _buildEmptyView(String message, IconData icon) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: AppColors.textHint),
          const SizedBox(height: 16),
          Text(message, style: TextStyle(color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  /// Summary bar hiển thị tổng quan
  Widget _buildSummaryBar({
    required int totalOrders,
    required int totalShops,
    required double totalCod,
    required IconData icon,
    required Color color,
    required String label,
  }) {
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color.withOpacity(0.1), color.withOpacity(0.05)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          // Tổng đơn
          Expanded(
            child: _buildSummaryItem(
              icon: icon,
              value: '$totalOrders',
              label: 'đơn hàng',
              color: color,
            ),
          ),
          Container(
            width: 1,
            height: 40,
            color: color.withOpacity(0.2),
          ),
          // Số điểm
          Expanded(
            child: _buildSummaryItem(
              icon: Icons.place,
              value: '$totalShops',
              label: label,
              color: color,
            ),
          ),
          Container(
            width: 1,
            height: 40,
            color: color.withOpacity(0.2),
          ),
          // Tổng COD
          Expanded(
            child: _buildSummaryItem(
              icon: Icons.payments,
              value: _formatCurrency(totalCod),
              label: 'COD',
              color: Colors.green,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem({
    required IconData icon,
    required String value,
    required String label,
    required Color color,
  }) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 4),
            Text(
              value,
              style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  /// Card nhóm theo shop (cho tab Cần lấy)
  Widget _buildShopGroupCard({
    required String shopName,
    required String address,
    required String phone,
    required List<ShipmentEntity> shipments,
    required bool isPickup,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header - Shop info
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.05),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.store,
                    color: AppColors.primary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        shopName,
                        style: GoogleFonts.plusJakartaSans(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        address,
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                // Số đơn
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${shipments.length} đơn',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Danh sách đơn
          ...shipments.map((s) => _buildMiniShipmentItem(s, isPickup: true)),
          // Footer - Actions
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: Colors.grey.shade100)),
            ),
            child: Row(
              children: [
                // Gọi shop
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _makePhoneCall(phone),
                    icon: const Icon(Icons.phone, size: 16),
                    label: const Text('Gọi shop'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: BorderSide(color: AppColors.primary),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Chỉ đường
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _openMaps(
                      shipments.first.pickupAddress.lat,
                      shipments.first.pickupAddress.lng,
                      shopName,
                    ),
                    icon: const Icon(Icons.directions, size: 16),
                    label: const Text('Chỉ đường'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.blue,
                      side: const BorderSide(color: Colors.blue),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Card nhóm theo khu vực (cho tab Cần giao)
  Widget _buildAreaGroupCard({
    required String areaName,
    required List<ShipmentEntity> shipments,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header - Area info
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.orange.withOpacity(0.05),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.location_on,
                    color: Colors.orange,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    areaName,
                    style: GoogleFonts.plusJakartaSans(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.orange,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${shipments.length} đơn',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Danh sách đơn với nút gọi/chỉ đường
          ...shipments.map((s) => _buildDeliveryShipmentItem(s)),
        ],
      ),
    );
  }

  /// Delivery shipment item với nút gọi khách và chỉ đường
  Widget _buildDeliveryShipmentItem(ShipmentEntity shipment) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey.shade100)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: Tracking + Status
          Row(
            children: [
              Text(
                '#${shipment.trackingNumber}',
                style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
              const Spacer(),
              _buildMiniStatusBadge(shipment.status),
            ],
          ),
          const SizedBox(height: 6),
          // Row 2: Customer name + COD
          Row(
            children: [
              Icon(Icons.person_outline, size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  shipment.deliveryContactName,
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w500,
                    fontSize: 13,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (shipment.codAmount > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '${_formatCurrency(shipment.codAmount)}đ',
                    style: TextStyle(
                      color: Colors.green.shade700,
                      fontWeight: FontWeight.w600,
                      fontSize: 11,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          // Row 3: Address
          Text(
            shipment.deliveryAddress.fullAddress,
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          // Row 4: Action buttons
          Row(
            children: [
              // Gọi khách
              Expanded(
                child: SizedBox(
                  height: 32,
                  child: OutlinedButton.icon(
                    onPressed: () => _makePhoneCall(shipment.deliveryContactPhone),
                    icon: const Icon(Icons.phone, size: 14),
                    label: const Text('Gọi', style: TextStyle(fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.green,
                      side: const BorderSide(color: Colors.green),
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Chỉ đường
              Expanded(
                child: SizedBox(
                  height: 32,
                  child: OutlinedButton.icon(
                    onPressed: () => _openMaps(
                      shipment.deliveryAddress.lat,
                      shipment.deliveryAddress.lng,
                      shipment.deliveryContactName,
                    ),
                    icon: const Icon(Icons.directions, size: 14),
                    label: const Text('Đường', style: TextStyle(fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.blue,
                      side: const BorderSide(color: Colors.blue),
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Chi tiết
              Expanded(
                child: SizedBox(
                  height: 32,
                  child: ElevatedButton(
                    onPressed: () => context.push('/shipment/${shipment.id}', extra: shipment),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: EdgeInsets.zero,
                      elevation: 0,
                    ),
                    child: const Text('Chi tiết', style: TextStyle(fontSize: 12)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Mini shipment item trong group
  Widget _buildMiniShipmentItem(ShipmentEntity shipment, {required bool isPickup}) {
    return InkWell(
      onTap: () => context.push('/shipment/${shipment.id}', extra: shipment),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.grey.shade100)),
        ),
        child: Row(
          children: [
            // Tracking number
            Expanded(
              flex: 2,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '#${shipment.trackingNumber}',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isPickup 
                        ? shipment.deliveryContactName
                        : shipment.deliveryAddress.fullAddress,
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            // COD amount
            if (shipment.codAmount > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                margin: const EdgeInsets.only(right: 8),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '${_formatCurrency(shipment.codAmount)}đ',
                  style: TextStyle(
                    color: Colors.green.shade700,
                    fontWeight: FontWeight.w600,
                    fontSize: 11,
                  ),
                ),
              ),
            // Status badge
            _buildMiniStatusBadge(shipment.status),
            const SizedBox(width: 4),
            Icon(Icons.chevron_right, color: AppColors.textHint, size: 20),
          ],
        ),
      ),
    );
  }

  /// Compact shipment card cho tab Hoàn thành và Tất cả
  Widget _buildCompactShipmentCard(ShipmentEntity shipment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => context.push('/shipment/${shipment.id}', extra: shipment),
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Icon based on status
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _getStatusColor(shipment.status).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  _getStatusIcon(shipment.status),
                  color: _getStatusColor(shipment.status),
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          '#${shipment.trackingNumber}',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                        const Spacer(),
                        _buildMiniStatusBadge(shipment.status),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      shipment.deliveryAddress.fullAddress,
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(Icons.chevron_right, color: AppColors.textHint),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMiniStatusBadge(ShipmentStatus status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: _getStatusColor(status).withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        _getStatusText(status),
        style: TextStyle(
          color: _getStatusColor(status),
          fontWeight: FontWeight.w600,
          fontSize: 10,
        ),
      ),
    );
  }

  Color _getStatusColor(ShipmentStatus status) {
    switch (status) {
      case ShipmentStatus.assigned:
        return Colors.blue;
      case ShipmentStatus.pickedUp:
      case ShipmentStatus.inTransit:
        return Colors.orange;
      case ShipmentStatus.readyForDelivery:
      case ShipmentStatus.delivering:
        return Colors.purple;
      case ShipmentStatus.delivered:
        return Colors.green;
      case ShipmentStatus.failed:
      case ShipmentStatus.pendingRedelivery:
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(ShipmentStatus status) {
    switch (status) {
      case ShipmentStatus.assigned:
        return Icons.inventory_2;
      case ShipmentStatus.pickedUp:
      case ShipmentStatus.inTransit:
        return Icons.local_shipping;
      case ShipmentStatus.readyForDelivery:
      case ShipmentStatus.delivering:
        return Icons.delivery_dining;
      case ShipmentStatus.delivered:
        return Icons.check_circle;
      case ShipmentStatus.failed:
        return Icons.cancel;
      default:
        return Icons.help_outline;
    }
  }

  String _getStatusText(ShipmentStatus status) {
    switch (status) {
      case ShipmentStatus.assigned:
        return 'Cần lấy';
      case ShipmentStatus.pickedUp:
        return 'Đã lấy';
      case ShipmentStatus.inTransit:
        return 'Trung chuyển';
      case ShipmentStatus.readyForDelivery:
        return 'Chờ giao';
      case ShipmentStatus.delivering:
        return 'Đang giao';
      case ShipmentStatus.delivered:
        return 'Thành công';
      case ShipmentStatus.failed:
        return 'Thất bại';
      case ShipmentStatus.pendingRedelivery:
        return 'Giao lại';
      case ShipmentStatus.returned:
        return 'Đã hoàn';
      default:
        return 'Chờ xử lý';
    }
  }

  String _formatCurrency(double amount) {
    if (amount >= 1000000) {
      return '${(amount / 1000000).toStringAsFixed(1)}tr';
    } else if (amount >= 1000) {
      return '${(amount / 1000).toStringAsFixed(0)}k';
    }
    return amount.toStringAsFixed(0);
  }

  /// Gọi điện thoại
  Future<void> _makePhoneCall(String phoneNumber) async {
    if (phoneNumber.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không có số điện thoại')),
      );
      return;
    }
    final uri = Uri.parse('tel:$phoneNumber');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không thể gọi điện')),
        );
      }
    }
  }

  /// Mở Google Maps chỉ đường
  Future<void> _openMaps(double lat, double lng, String label) async {
    if (lat == 0 || lng == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không có tọa độ địa điểm')),
      );
      return;
    }
    
    // Try Google Maps first
    final googleMapsUrl = Uri.parse(
      'google.navigation:q=$lat,$lng&mode=d',
    );
    
    // Fallback to web Google Maps
    final webMapsUrl = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng',
    );
    
    if (await canLaunchUrl(googleMapsUrl)) {
      await launchUrl(googleMapsUrl);
    } else if (await canLaunchUrl(webMapsUrl)) {
      await launchUrl(webMapsUrl, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không thể mở bản đồ')),
        );
      }
    }
  }
}
