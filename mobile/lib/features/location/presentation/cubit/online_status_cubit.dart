import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import '../../domain/repositories/location_repository.dart';
import 'location_cubit.dart';

abstract class OnlineStatusState {}
class OnlineStatusOffline extends OnlineStatusState {}
class OnlineStatusOnline extends OnlineStatusState {}
class OnlineStatusLoading extends OnlineStatusState {}
class OnlineStatusError extends OnlineStatusState {
  final String message;
  OnlineStatusError(this.message);
}

@injectable
class OnlineStatusCubit extends Cubit<OnlineStatusState> {
  final LocationRepository _locationRepository;
  final LocationCubit _locationCubit; // Injected to coordinate tracking

  OnlineStatusCubit(this._locationRepository, this._locationCubit) : super(OnlineStatusOffline());

  Future<void> toggleOnlineStatus(bool isGoingOnline) async {
    if (isGoingOnline) {
      emit(OnlineStatusLoading());
      // 1. Check Location Permission & Service
      final serviceEnabledResult = await _locationRepository.isLocationServiceEnabled();
      
      await serviceEnabledResult.fold(
        (failure) async {
             emit(OnlineStatusError(failure.message));
             emit(OnlineStatusOffline());
        },
        (enabled) async {
           if (!enabled) {
             emit(OnlineStatusError('GPS is disabled'));
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
              // For now simpler simulation
              emit(OnlineStatusOnline());
           }
        }
      );

    } else {
      // Go Offline
      // Validate Property 7: Check if active shipments exist (Task for future integration)
      // For now allow offline
      _locationCubit.stopTracking();
      emit(OnlineStatusOffline());
    }
  }
}
