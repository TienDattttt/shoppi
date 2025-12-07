import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../repositories/auth_repository.dart';

@lazySingleton
class RequestOtpUseCase implements UseCase<void, String> {
  final AuthRepository repository;

  RequestOtpUseCase(this.repository);

  @override
  Future<Either<Failure, void>> call(String phone) async {
    return await repository.requestOtp(phone);
  }
}
