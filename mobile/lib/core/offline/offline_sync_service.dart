import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:injectable/injectable.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../network/network_info.dart';
import 'offline_action.dart';
import '../../features/shipment/domain/repositories/shipment_repository.dart';
import 'package:get_it/get_it.dart';

@lazySingleton
class OfflineSyncService {
  final NetworkInfo _networkInfo;
  Box<OfflineAction>? _box;
  StreamSubscription<List<ConnectivityResult>>? _networkSubscription;

  OfflineSyncService(this._networkInfo);

  Future<void> init() async {
    _box = await Hive.openBox<OfflineAction>('offline_actions');
    
    // Listen for connectivity changes to trigger sync
    _networkSubscription = _networkInfo.onConnectivityChanged.listen((results) {
      final isConnected = !results.contains(ConnectivityResult.none);
      if (isConnected && _box != null && _box!.isNotEmpty) {
        syncPendingActions();
      }
    });
  }

  Future<void> queueAction(OfflineAction action) async {
    if (_box == null) {
      await init(); // Ensure initialized
    }
    await _box!.add(action);
    // Try to sync immediately if connected (race condition check)
    if (await _networkInfo.isConnected) {
      syncPendingActions();
    }
  }

  Future<void> syncPendingActions() async {
    if (_box == null || _box!.isEmpty) return;

    final actions = _box!.values.toList();
    // Sort by timestamp if necessary, but Hive insertion order is usually enough

    for (final action in actions) {
      try {
        final success = await _processAction(action);
        if (success) {
          await action.delete();
        }
      } catch (e) {
        // Log error, keep in queue or move to dead letter queue
        // For now, keep in queue retry later
      }
    }
  }

  Future<bool> _processAction(OfflineAction action) async {
    final shipmentRepo = GetIt.I<ShipmentRepository>(); // Lazy access to avoid circular dep if any

    switch (action.type) {
      case 'pickup':
        final result = await shipmentRepo.markPickedUp(action.payload['shipmentId']);
        return result.isRight();
      case 'deliver':
        final result = await shipmentRepo.markDelivered(
          action.payload['shipmentId'], 
          action.payload['photoPath'],
          action.payload['signaturePath'], // Ensure we store this in OfflineAction
          codCollected: action.payload['codCollected'] ?? true,
        );
        return result.isRight();
      case 'fail':
        final result = await shipmentRepo.markFailed(
          action.payload['shipmentId'],
          action.payload['reason'],
        );
        return result.isRight();
      default:
        return true; // Unknown action, discard
    }
  }

  void dispose() {
    _networkSubscription?.cancel();
  }
}
