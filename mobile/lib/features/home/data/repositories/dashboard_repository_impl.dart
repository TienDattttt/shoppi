import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/network_info.dart';
import '../../domain/entities/dashboard_stats.dart';
import '../../domain/repositories/dashboard_repository.dart';
import '../datasources/dashboard_remote_data_source.dart';

@LazySingleton(as: DashboardRepository)
class DashboardRepositoryImpl implements DashboardRepository {
  final DashboardRemoteDataSource _remoteDataSource;
  final NetworkInfo _networkInfo;

  DashboardRepositoryImpl(this._remoteDataSource, this._networkInfo);

  @override
  Future<Either<Failure, DashboardStatsEntity>> getDashboardStats() async {
    // Mock mode for UI testing
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 300));
      return const Right(DashboardStatsEntity(
        todayEarnings: 450000,
        todayTrips: 12,
        currentRating: 4.8,
        activeShipmentsCount: 3,
      ));
    }

    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.getStats();
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }
}
