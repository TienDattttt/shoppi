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

  OnlineStatusCubit(this._client, this._locationCubit) : super(OnlineStatusOffline());

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

           // 2. Start Tracking in LocationCubit
           await _locationCubit.startTracking();
           
           if (_locationCubit.state is LocationError) {
              emit(OnlineStatusError((_locationCubit.state as LocationError).message));
              emit(OnlineStatusOffline());
           } else {
              // 3. Mark Online (Call API to update status to 'online')
              try {
                await _client.post('/shippers/status', data: {'status': 'online'});
                emit(OnlineStatusOnline());
              } catch (e) {
                emit(OnlineStatusError("Failed to go online: $e"));
                emit(OnlineStatusOffline());
                _locationCubit.stopTracking();
              }
           }
        }
      );

    } else {
      // Go Offline
      try {
        await _client.post('/shippers/status', data: {'status': 'offline'});
      } catch (e) {
        // Ignore error when going offline? Or show warning
      }
      _locationCubit.stopTracking();
      emit(OnlineStatusOffline());
    }
  }
}
