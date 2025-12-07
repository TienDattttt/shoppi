import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/shipment_entity.dart';
import '../repositories/shipment_repository.dart';

@lazySingleton
class MarkPickedUpUseCase implements UseCase<ShipmentEntity, String> {
  final ShipmentRepository repository;

  MarkPickedUpUseCase(this.repository);

  @override
  Future<Either<Failure, ShipmentEntity>> call(String id) async {
    return await repository.markPickedUp(id);
  }
}
