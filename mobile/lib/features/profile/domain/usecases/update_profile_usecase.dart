import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../../../auth/domain/entities/shipper.dart';
import '../repositories/profile_repository.dart';

@lazySingleton
class UpdateProfileUseCase implements UseCase<ShipperEntity, ShipperEntity> {
  final ProfileRepository repository;

  UpdateProfileUseCase(this.repository);

  @override
  Future<Either<Failure, ShipperEntity>> call(ShipperEntity params) async {
    return await repository.updateProfile(params);
  }
}
