import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/shipper.dart';
import '../repositories/auth_repository.dart';

@lazySingleton
class GetCurrentShipperUseCase implements UseCase<ShipperEntity, NoParams> {
  final AuthRepository repository;

  GetCurrentShipperUseCase(this.repository);

  @override
  Future<Either<Failure, ShipperEntity>> call(NoParams params) async {
    return await repository.getCurrentShipper();
  }
}
