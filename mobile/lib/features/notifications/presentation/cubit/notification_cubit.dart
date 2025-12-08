import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/notification_entity.dart';
import '../../domain/usecases/get_notifications_usecase.dart';
import '../../domain/usecases/register_device_token_usecase.dart';

// State
abstract class NotificationState extends Equatable {
  const NotificationState();
  @override
  List<Object> get props => [];
}

class NotificationInitial extends NotificationState {}
class NotificationLoading extends NotificationState {}
class NotificationLoaded extends NotificationState {
  final List<NotificationEntity> notifications;
  const NotificationLoaded(this.notifications);
  @override
  List<Object> get props => [notifications];
}
class NotificationError extends NotificationState {
  final String message;
  const NotificationError(this.message);
  @override
  List<Object> get props => [message];
}

// Cubit
@injectable
class NotificationCubit extends Cubit<NotificationState> {
  final GetNotificationsUseCase _getNotificationsUseCase;
  final RegisterDeviceTokenUseCase _registerDeviceTokenUseCase;

  NotificationCubit(
    this._getNotificationsUseCase,
    this._registerDeviceTokenUseCase,
  ) : super(NotificationInitial());

  Future<void> fetchNotifications() async {
    emit(NotificationLoading());
    final result = await _getNotificationsUseCase(NoParams());
    result.fold(
      (failure) => emit(NotificationError(failure.message)),
      (notifications) => emit(NotificationLoaded(notifications)),
    );
  }

  Future<void> initializePushNotifications() async {
    // Fire and forget registration
    await _registerDeviceTokenUseCase(NoParams());
  }
}
