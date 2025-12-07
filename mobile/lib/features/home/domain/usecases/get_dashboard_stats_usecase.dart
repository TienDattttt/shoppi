import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/dashboard_stats.dart';
import '../repositories/dashboard_repository.dart';

@lazySingleton
class GetDashboardStatsUseCase implements UseCase<DashboardStatsEntity, NoParams> {
  final DashboardRepository repository;

  GetDashboardStatsUseCase(this.repository);

  @override
  Future<Either<Failure, DashboardStatsEntity>> call(NoParams params) async {
    return await repository.getDashboardStats();
  }
}
