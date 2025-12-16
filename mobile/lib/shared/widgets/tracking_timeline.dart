import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../features/shipment/domain/entities/shipment_entity.dart';

/// Timeline widget showing tracking events
class TrackingTimeline extends StatelessWidget {
  final List<TrackingEvent>? events;
  final ShipmentStatus? currentStatus;

  const TrackingTimeline({
    super.key,
    this.events,
    this.currentStatus,
  });

  @override
  Widget build(BuildContext context) {
    // If events provided, show detailed timeline
    if (events != null && events!.isNotEmpty) {
      return _buildEventsTimeline();
    }

    // Fallback to status-based timeline
    if (currentStatus != null) {
      return _buildStatusTimeline();
    }

    return const SizedBox.shrink();
  }

  Widget _buildEventsTimeline() {
    return Column(
      children: List.generate(events!.length, (index) {
        final event = events![index];
        final isLast = index == events!.length - 1;
        final isFirst = index == 0;

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Timeline indicator
            Column(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: isFirst ? AppColors.primary : Colors.grey.shade400,
                    shape: BoxShape.circle,
                  ),
                ),
                if (!isLast)
                  Container(
                    width: 2,
                    height: 50,
                    color: Colors.grey.shade300,
                  ),
              ],
            ),
            const SizedBox(width: 12),
            // Event content
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(bottom: isLast ? 0 : 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.description,
                      style: GoogleFonts.plusJakartaSans(
                        fontWeight: isFirst ? FontWeight.w600 : FontWeight.normal,
                        color: isFirst ? Colors.black : Colors.grey.shade700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          DateFormat('HH:mm').format(event.timestamp),
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            color: Colors.grey.shade500,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          DateFormat('dd/MM/yyyy').format(event.timestamp),
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            color: Colors.grey.shade500,
                          ),
                        ),
                        if (event.location != null) ...[
                          const SizedBox(width: 8),
                          Icon(Icons.location_on, size: 12, color: Colors.grey.shade400),
                          const SizedBox(width: 2),
                          Expanded(
                            child: Text(
                              event.location!,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 12,
                                color: Colors.grey.shade500,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      }),
    );
  }

  Widget _buildStatusTimeline() {
    int currentStep = _getStepIndex(currentStatus!);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          _buildStep(0, 'Tạo đơn', currentStep >= 0, currentStep == 0),
          _buildLine(currentStep >= 1),
          _buildStep(1, 'Đã lấy', currentStep >= 1, currentStep == 1),
          _buildLine(currentStep >= 2),
          _buildStep(2, 'Đang giao', currentStep >= 2, currentStep == 2),
          _buildLine(currentStep >= 3),
          _buildStep(3, 'Hoàn thành', currentStep >= 3, currentStep == 3),
        ],
      ),
    );
  }

  Widget _buildStep(int index, String label, bool isActive, bool isCurrent) {
    return Column(
      children: [
        CircleAvatar(
          radius: 12,
          backgroundColor: isActive ? AppColors.primary : Colors.grey[300],
          child: isActive ? const Icon(Icons.check, size: 14, color: Colors.white) : null,
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: isActive ? AppColors.primary : Colors.grey,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _buildLine(bool isActive) {
    return Expanded(
      child: Container(
        height: 2,
        color: isActive ? AppColors.primary : Colors.grey[300],
        margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
      ),
    );
  }

  int _getStepIndex(ShipmentStatus status) {
    switch (status) {
      case ShipmentStatus.created:
      case ShipmentStatus.assigned:
        return 0;
      case ShipmentStatus.pickedUp:
      case ShipmentStatus.inTransit:
        return 1;
      case ShipmentStatus.readyForDelivery:
      case ShipmentStatus.delivering:
        return 2;
      case ShipmentStatus.delivered:
        return 3;
      default:
        return 0;
    }
  }
}
