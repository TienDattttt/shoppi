import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/shipment_entity.dart';

abstract class ShipmentRepository {
  /// Get active shipments for current shipper
  /// Requirements: 13.2
  Future<Either<Failure, List<ShipmentEntity>>> getActiveShipments();
  
  /// Get shipment history (completed/failed)
  Future<Either<Failure, List<ShipmentEntity>>> getShipmentHistory({DateTime? fromDate, DateTime? toDate});
  
  /// Get shipment by ID
  Future<Either<Failure, ShipmentEntity>> getShipmentById(String id);
  
  // Status Updates - Requirements: 13.3
  
  /// Mark shipment as picked up
  Future<Either<Failure, ShipmentEntity>> markPickedUp(String id);
  
  /// Mark shipment as delivering (in transit)
  Future<Either<Failure, ShipmentEntity>> markDelivering(String id);
  
  /// Mark shipment as delivered with proof
  /// Requirements: 7.1 - At least 1 photo required (max 3)
  /// Requirements: 6.2 - COD collection confirmation required for COD orders
  Future<Either<Failure, ShipmentEntity>> markDelivered(
    String id, 
    List<String> photoUrls, 
    String? signatureUrl,
    {required bool codCollected}
  );
  
  /// Mark shipment as failed with reason
  /// Requirements: 8.1 - Reason from predefined list
  Future<Either<Failure, ShipmentEntity>> markFailed(String id, String reason);
  
  /// Reject assigned shipment
  /// Requirements: 3.4
  Future<Either<Failure, void>> rejectShipment(String id, String reason);
  
  /// Scan barcode to pickup shipment
  /// Validates tracking number and marks as picked_up
  Future<Either<Failure, ShipmentEntity>> scanPickup(String trackingNumber);
}
