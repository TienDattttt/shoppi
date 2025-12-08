import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../repositories/notification_repository.dart';

@lazySingleton
class RegisterDeviceTokenUseCase implements UseCase<void, NoParams> {
  final NotificationRepository repository;

  RegisterDeviceTokenUseCase(this.repository);

  @override
  Future<Either<Failure, void>> call(NoParams params) async {
    return await repository.registerDeviceToken();
  }
}
