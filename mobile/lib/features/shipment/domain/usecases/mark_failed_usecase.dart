import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/shipment_entity.dart';
import '../repositories/shipment_repository.dart';

@lazySingleton
class MarkFailedUseCase implements UseCase<ShipmentEntity, MarkFailedParams> {
  final ShipmentRepository repository;

  MarkFailedUseCase(this.repository);

  @override
  Future<Either<Failure, ShipmentEntity>> call(MarkFailedParams params) async {
    return await repository.markFailed(params.id, params.reason);
  }
}

class MarkFailedParams {
  final String id;
  final String reason;

  MarkFailedParams({required this.id, required this.reason});
}
