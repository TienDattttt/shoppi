import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/earnings_entity.dart';

abstract class EarningsRepository {
  Future<Either<Failure, EarningsEntity>> getEarningsStats({String period = 'weekly'});
}
