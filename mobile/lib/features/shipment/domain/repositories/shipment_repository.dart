import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/shipment_entity.dart';

abstract class ShipmentRepository {
  Future<Either<Failure, List<ShipmentEntity>>> getActiveShipments();
  Future<Either<Failure, List<ShipmentEntity>>> getShipmentHistory({DateTime? fromDate, DateTime? toDate});
  Future<Either<Failure, ShipmentEntity>> getShipmentById(String id);
  
  // Status Updates
  Future<Either<Failure, ShipmentEntity>> markPickedUp(String id);
  Future<Either<Failure, ShipmentEntity>> markDelivered(String id, String photoUrl, String? signatureUrl);
  Future<Either<Failure, ShipmentEntity>> markFailed(String id, String reason);
}
