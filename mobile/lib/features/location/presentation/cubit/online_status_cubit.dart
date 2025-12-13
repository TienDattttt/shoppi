import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import 'package:equatable/equatable.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/network/api_client.dart';
import 'location_cubit.dart';

abstract class OnlineStatusState extends Equatable {
  const OnlineStatusState();
  @override
  List<Object> get props => [];
}

class OnlineStatusInitial extends OnlineStatusState {}
class OnlineStatusLoading extends OnlineStatusState {}
class OnlineStatusOffline extends OnlineStatusState {}
class OnlineStatusOnline extends OnlineStatusState {}
class OnlineStatusError extends OnlineStatusState {
  final String message;
  const OnlineStatusError(this.message);
  @override
  List<Object> get props => [message];
}

@injectable
class OnlineStatusCubit extends Cubit<OnlineStatusState> {
  final ApiClient _client;
  final LocationCubit _locationCubit;
  String? _shipperId;

  OnlineStatusCubit(this._client, this._locationCubit) : super(OnlineStatusOffline());

  /// Set shipper ID for API calls
  void setShipperId(String shipperId) {
    _shipperId = shipperId;
  }

  Future<void> toggleOnlineStatus(bool isOnline) async {
    // Mock mode for UI testing
    if (AppConfig.useMockData) {
      emit(OnlineStatusLoading());
      await Future.delayed(const Duration(milliseconds: 300));
      if (isOnline) {
        emit(OnlineStatusOnline());
      } else {
        emit(OnlineStatusOffline());
      }
      return;
    }

    if (_shipperId == null) {
      emit(const OnlineStatusError('Shipper ID not set'));
      return;
    }

    if (isOnline) {
      emit(OnlineStatusLoading());
      // 1. Check GPS Service
      await _locationCubit.checkPermission().then(
        (enabled) async {
           if (!enabled) {
             emit(const OnlineStatusError('GPS/Permission is disabled'));
             emit(OnlineStatusOffline());
             return;
           }

           // 2. Get current location first
           final location = await _locationCubit.getCurrentLocation();
           if (location == null) {
             emit(const OnlineStatusError('Could not get current location'));
             emit(OnlineStatusOffline());
             return;
           }

           // 3. Mark Online with current location
           // Backend endpoint: POST /api/shippers/:id/online
           try {
             await _client.post('/shippers/$_shipperId/online', data: {
               'lat': location.lat,
               'lng': location.lng,
             });
             
             // 4. Start continuous tracking
             await _locationCubit.startTracking();
             emit(OnlineStatusOnline());
           } catch (e) {
             emit(OnlineStatusError("Failed to go online: $e"));
             emit(OnlineStatusOffline());
           }
        }
      );

    } else {
      // Go Offline
      // Backend endpoint: POST /api/shippers/:id/offline
      try {
        await _client.post('/shippers/$_shipperId/offline');
      } catch (e) {
        // Ignore error when going offline
      }
      _locationCubit.stopTracking();
      emit(OnlineStatusOffline());
    }
  }
}
