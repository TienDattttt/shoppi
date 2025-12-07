import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import 'shipper.dart';
import 'register_params.dart';

abstract class AuthRepository {
  Future<Either<Failure, ShipperEntity>> login(String phone, String password); // Changing to password based on common flows, or OTP if strict
  // Design said "Login Screen: OTP input". So flow is likely: Request OTP -> Verify OTP -> Login.
  // But usually for "Login", we mean the verification step returning the token.
  
  Future<Either<Failure, void>> requestOtp(String phone);
  
  Future<Either<Failure, ShipperEntity>> verifyOtp(String phone, String otp);

  Future<Either<Failure, ShipperEntity>> register(RegisterParams params);

  Future<Either<Failure, void>> logout();

  Future<Either<Failure, ShipperEntity>> getCurrentShipper();
}
