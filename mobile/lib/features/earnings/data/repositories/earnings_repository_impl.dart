import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/network_info.dart';
import '../../domain/entities/earnings_entity.dart';
import '../../domain/repositories/earnings_repository.dart';
import '../datasources/earnings_remote_data_source.dart';

@LazySingleton(as: EarningsRepository)
class EarningsRepositoryImpl implements EarningsRepository {
  final EarningsRemoteDataSource _remoteDataSource;
  final NetworkInfo _networkInfo;

  EarningsRepositoryImpl(this._remoteDataSource, this._networkInfo);

  @override
  Future<Either<Failure, EarningsEntity>> getEarningsStats({String period = 'weekly'}) async {
    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.getEarnings(period);
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }
}
