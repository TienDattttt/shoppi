import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/shipper.dart';
import '../repositories/auth_repository.dart';

@lazySingleton
class LoginUseCase implements UseCase<ShipperEntity, LoginParams> {
  final AuthRepository repository;

  LoginUseCase(this.repository);

  @override
  Future<Either<Failure, ShipperEntity>> call(LoginParams params) async {
    // Assuming Login via OTP verification as the primary entry point based on design
    return await repository.verifyOtp(params.phone, params.otp); 
  }
}

class LoginParams {
  final String phone;
  final String otp;

  LoginParams({required this.phone, required this.otp});
}
