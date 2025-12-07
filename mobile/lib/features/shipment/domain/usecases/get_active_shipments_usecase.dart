import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/shipment_entity.dart';
import '../repositories/shipment_repository.dart';

@lazySingleton
class GetActiveShipmentsUseCase implements UseCase<List<ShipmentEntity>, NoParams> {
  final ShipmentRepository repository;

  GetActiveShipmentsUseCase(this.repository);

  @override
  Future<Either<Failure, List<ShipmentEntity>>> call(NoParams params) async {
    return await repository.getActiveShipments();
  }
}
