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
    return await repository.markDelivered(params.id, params.photoUrl, params.signatureUrl);
  }
}

class MarkDeliveredParams {
  final String id;
  final String photoUrl;
  final String? signatureUrl;

  MarkDeliveredParams({required this.id, required this.photoUrl, this.signatureUrl});
}
