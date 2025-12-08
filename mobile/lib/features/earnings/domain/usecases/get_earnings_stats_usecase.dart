import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/earnings_entity.dart';
import '../repositories/earnings_repository.dart';

@lazySingleton
class GetEarningsStatsUseCase implements UseCase<EarningsEntity, String> {
  final EarningsRepository repository;

  GetEarningsStatsUseCase(this.repository);

  // Params: period ('weekly', 'monthly')
  @override
  Future<Either<Failure, EarningsEntity>> call(String period) async {
    return await repository.getEarningsStats(period: period);
  }
}
