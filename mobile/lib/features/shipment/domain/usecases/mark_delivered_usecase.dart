import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/shipment_entity.dart';
import '../repositories/shipment_repository.dart';

@lazySingleton
class MarkDeliveredUseCase implements UseCase<ShipmentEntity, MarkDeliveredParams> {
  final ShipmentRepository repository;

  MarkDeliveredUseCase(this.repository);

  @override
  Future<Either<Failure, ShipmentEntity>> call(MarkDeliveredParams params) async {
    return await repository.markDelivered(
      params.id, 
      params.photoUrls, 
      params.signatureUrl,
      codCollected: params.codCollected,
    );
  }
}

class MarkDeliveredParams {
  final String id;
  /// Array of 1-3 delivery proof photo URLs
  final List<String> photoUrls;
  final String? signatureUrl;
  final bool codCollected;

  MarkDeliveredParams({
    required this.id, 
    required this.photoUrls, 
    this.signatureUrl,
    this.codCollected = false,
  });
}
