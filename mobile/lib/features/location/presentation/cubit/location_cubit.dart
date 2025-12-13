import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import '../../domain/entities/location_entity.dart';
import '../../domain/repositories/location_repository.dart';

abstract class LocationState {}
class LocationInitial extends LocationState {}
class LocationTracking extends LocationState {
  final LocationEntity location;
  LocationTracking(this.location);
}
class LocationError extends LocationState {
  final String message;
  LocationError(this.message);
}

@injectable
class LocationCubit extends Cubit<LocationState> {
  final LocationRepository _repository;
  StreamSubscription? _locationSubscription;

  LocationCubit(this._repository) : super(LocationInitial());

  Future<bool> checkPermission() async {
    final result = await _repository.checkPermission();
    return result.fold((_) => false, (isGranted) => isGranted);
  }

  /// Get current location once
  Future<LocationEntity?> getCurrentLocation() async {
    final result = await _repository.getCurrentLocation();
    return result.fold(
      (failure) => null,
      (location) => location,
    );
  }

  Future<void> startTracking() async {
    try {
      final hasPermission = await _repository.checkPermission();
      hasPermission.fold(
        (failure) => emit(LocationError(failure.message)),
        (permissionGranted) async {
          if (!permissionGranted) {
            emit(LocationError('Location permission denied'));
            return;
          }

          // Initial position
          final result = await _repository.getCurrentLocation();
          result.fold(
            (failure) => emit(LocationError(failure.message)),
            (location) async {
              emit(LocationTracking(location));
              
              // Start Background Tracking
              _repository.startTracking();
              
              // Start stream
              _locationSubscription?.cancel();
              _locationSubscription = _repository.getLocationStream().listen(
                (location) {
                  emit(LocationTracking(location));
                  // Optionally sync to server here or in OnlineStatusCubit listening to this
                  _repository.updateLocationToServer(location);
                },
                onError: (error) => emit(LocationError(error.toString())),
              );
            },
          );
        },
      );
    } catch (e) {
      emit(LocationError(e.toString()));
    }
  }

  void stopTracking() {
    _locationSubscription?.cancel();
    _repository.stopTracking();
    emit(LocationInitial());
  }

  @override
  Future<void> close() {
    _locationSubscription?.cancel();
    return super.close();
  }
}
