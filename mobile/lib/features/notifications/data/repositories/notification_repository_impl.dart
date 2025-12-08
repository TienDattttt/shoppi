import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/network_info.dart';
import '../../../../core/services/notification_service.dart';
import '../../domain/entities/notification_entity.dart';
import '../../domain/repositories/notification_repository.dart';
import '../datasources/notification_remote_data_source.dart';

@LazySingleton(as: NotificationRepository)
class NotificationRepositoryImpl implements NotificationRepository {
  final NotificationRemoteDataSource _remoteDataSource;
  final NetworkInfo _networkInfo;
  final NotificationService _notificationService;

  NotificationRepositoryImpl(
    this._remoteDataSource,
    this._networkInfo,
    this._notificationService,
  );

  @override
  Future<Either<Failure, List<NotificationEntity>>> getNotifications() async {
    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.getNotifications();
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, void>> markAsRead(String id) async {
    if (await _networkInfo.isConnected) {
      try {
        await _remoteDataSource.markAsRead(id);
        return const Right(null);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, void>> registerDeviceToken() async {
    if (await _networkInfo.isConnected) {
      try {
        // Request permission flow
        await _notificationService.requestPermission();
        final token = await _notificationService.getToken();
        if (token != null) {
          await _remoteDataSource.registerDeviceToken(token);
        }
        return const Right(null);
      } catch (e) {
        // Fail silently or log
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }
}
