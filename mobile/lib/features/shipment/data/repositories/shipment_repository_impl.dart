import 'package:dartz/dartz.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/network/network_info.dart';
import 'package:uuid/uuid.dart';
import '../../../../core/offline/offline_action.dart';
import '../../../../core/offline/offline_sync_service.dart';
import '../../domain/entities/address_entity.dart';
import '../../domain/entities/shipment_entity.dart';
import '../../domain/repositories/shipment_repository.dart';
import '../datasources/shipment_remote_data_source.dart';

@LazySingleton(as: ShipmentRepository)
class ShipmentRepositoryImpl implements ShipmentRepository {
  final ShipmentRemoteDataSource _remoteDataSource;
  final NetworkInfo _networkInfo;
  final OfflineSyncService _offlineSyncService;

  ShipmentRepositoryImpl(
    this._remoteDataSource, 
    this._networkInfo,
    this._offlineSyncService,
  );

  @override
  Future<Either<Failure, List<ShipmentEntity>>> getActiveShipments() async {
    // Mock mode for UI testing
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 400));
      return Right(_getMockShipments());
    }

    if (await _networkInfo.isConnected) {
      try {
        // Requirements: 13.2 - Fetch shipments from /api/shipper/shipments
        final result = await _remoteDataSource.getShipments(status: 'active');
        // Sort by distance for optimal delivery route
        result.sort((a, b) => (a.distanceKm).compareTo(b.distanceKm));
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  List<ShipmentEntity> _getMockShipments() {
    return [
      ShipmentEntity(
        id: 'ship-001',
        trackingNumber: 'SPX123456789',
        status: ShipmentStatus.assigned,
        pickupAddress: const AddressEntity(
          fullAddress: '123 Nguyễn Huệ, Q.1, TP.HCM',
          lat: 10.7731,
          lng: 106.7030,
          district: 'Quận 1',
          city: 'TP.HCM',
        ),
        pickupContactName: 'Shop ABC',
        pickupContactPhone: '0901234567',
        deliveryAddress: const AddressEntity(
          fullAddress: '456 Lê Lợi, Q.3, TP.HCM',
          lat: 10.7769,
          lng: 106.6910,
          district: 'Quận 3',
          city: 'TP.HCM',
        ),
        deliveryContactName: 'Nguyễn Văn A',
        deliveryContactPhone: '0909876543',
        shippingFee: 25000,
        codAmount: 350000,
        distanceKm: 2.5,
        estimatedMinutes: 15,
        createdAt: DateTime.now().subtract(const Duration(hours: 1)),
      ),
      ShipmentEntity(
        id: 'ship-002',
        trackingNumber: 'SPX987654321',
        status: ShipmentStatus.pickedUp,
        pickupAddress: const AddressEntity(
          fullAddress: '789 Hai Bà Trưng, Q.1, TP.HCM',
          lat: 10.7850,
          lng: 106.7000,
          district: 'Quận 1',
          city: 'TP.HCM',
        ),
        pickupContactName: 'Shop XYZ',
        pickupContactPhone: '0912345678',
        deliveryAddress: const AddressEntity(
          fullAddress: '321 Điện Biên Phủ, Bình Thạnh, TP.HCM',
          lat: 10.8010,
          lng: 106.7150,
          district: 'Bình Thạnh',
          city: 'TP.HCM',
        ),
        deliveryContactName: 'Trần Thị B',
        deliveryContactPhone: '0918765432',
        shippingFee: 30000,
        codAmount: 0,
        distanceKm: 4.2,
        estimatedMinutes: 20,
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
        pickedUpAt: DateTime.now().subtract(const Duration(minutes: 30)),
      ),
    ];
  }

  @override
  Future<Either<Failure, List<ShipmentEntity>>> getShipmentHistory({DateTime? fromDate, DateTime? toDate}) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 400));
      return const Right([]);
    }
    
    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.getHistory(fromDate: fromDate, toDate: toDate);
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, ShipmentEntity>> getShipmentById(String id) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 300));
      final mockShipments = _getMockShipments();
      final shipment = mockShipments.firstWhere(
        (s) => s.id == id,
        orElse: () => mockShipments.first,
      );
      return Right(shipment);
    }
    
    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.getShipmentById(id);
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, ShipmentEntity>> markPickedUp(String id) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 500));
      final mockShipments = _getMockShipments();
      return Right(mockShipments.first);
    }
    
    if (await _networkInfo.isConnected) {
      try {
        // Requirements: 13.3 - Update status via /api/shipper/shipments/:id/status
        final result = await _remoteDataSource.markPickedUp(id);
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      // Queue offline action for later sync
      await _offlineSyncService.queueAction(OfflineAction(
        id: const Uuid().v4(),
        type: 'pickup',
        payload: {'shipmentId': id},
        timestamp: DateTime.now(),
      ));
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, ShipmentEntity>> markDelivering(String id) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 500));
      final mockShipments = _getMockShipments();
      return Right(mockShipments.first);
    }
    
    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.markDelivering(id);
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      await _offlineSyncService.queueAction(OfflineAction(
        id: const Uuid().v4(),
        type: 'delivering',
        payload: {'shipmentId': id},
        timestamp: DateTime.now(),
      ));
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, ShipmentEntity>> markDelivered(
    String id, 
    String photoUrl, 
    String? signatureUrl,
    {required bool codCollected}
  ) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 500));
      final mockShipments = _getMockShipments();
      return Right(mockShipments.first);
    }
    
    if (await _networkInfo.isConnected) {
      try {
        // Requirements: 7.1 - Photo required for delivered status
        // Requirements: 6.2 - COD collection confirmation required
        final result = await _remoteDataSource.markDelivered(
          id,
          photoUrl: photoUrl,
          signatureUrl: signatureUrl,
          codCollected: codCollected,
        );
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      await _offlineSyncService.queueAction(OfflineAction(
        id: const Uuid().v4(),
        type: 'deliver',
        payload: {
          'shipmentId': id, 
          'photoUrl': photoUrl, 
          'signatureUrl': signatureUrl,
          'codCollected': codCollected,
        },
        timestamp: DateTime.now(),
      ));
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, ShipmentEntity>> markFailed(String id, String reason) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 500));
      final mockShipments = _getMockShipments();
      return Right(mockShipments.first);
    }
    
    if (await _networkInfo.isConnected) {
      try {
        // Requirements: 8.1 - Reason from predefined list
        final result = await _remoteDataSource.markFailed(id, reason);
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      await _offlineSyncService.queueAction(OfflineAction(
        id: const Uuid().v4(),
        type: 'fail',
        payload: {'shipmentId': id, 'reason': reason},
        timestamp: DateTime.now(),
      ));
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, void>> rejectShipment(String id, String reason) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 500));
      return const Right(null);
    }
    
    if (await _networkInfo.isConnected) {
      try {
        // Requirements: 3.4 - Handle shipper rejection
        await _remoteDataSource.rejectShipment(id, reason);
        return const Right(null);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      await _offlineSyncService.queueAction(OfflineAction(
        id: const Uuid().v4(),
        type: 'reject',
        payload: {'shipmentId': id, 'reason': reason},
        timestamp: DateTime.now(),
      ));
      return const Left(NetworkFailure());
    }
  }

  @override
  Future<Either<Failure, ShipmentEntity>> scanPickup(String trackingNumber) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 500));
      final mockShipments = _getMockShipments();
      return Right(mockShipments.first);
    }
    
    if (await _networkInfo.isConnected) {
      try {
        final result = await _remoteDataSource.scanPickup(trackingNumber);
        return Right(result);
      } catch (e) {
        return Left(ServerFailure(e.toString()));
      }
    } else {
      return const Left(NetworkFailure());
    }
  }
}
