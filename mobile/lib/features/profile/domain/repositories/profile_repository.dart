import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../../../auth/domain/entities/shipper.dart';

abstract class ProfileRepository {
  Future<Either<Failure, ShipperEntity>> getProfile();
  Future<Either<Failure, ShipperEntity>> updateProfile(ShipperEntity shipper);
  Future<Either<Failure, void>> changePassword(String currentPassword, String newPassword);
}
