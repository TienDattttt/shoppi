import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import '../../domain/usecases/login_usecase.dart';
import '../../domain/usecases/get_current_shipper_usecase.dart';
import '../../../../core/usecases/usecase.dart';
import 'auth_event.dart';
import 'auth_state.dart';

@injectable
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final LoginUseCase _loginUseCase;
  final GetCurrentShipperUseCase _getCurrentShipperUseCase;

  AuthBloc(
    this._loginUseCase,
    this._getCurrentShipperUseCase,
  ) : super(AuthInitial()) {
    on<AppStarted>(_onAppStarted);
    on<LoginRequested>(_onLoginRequested);
    on<LogoutRequested>(_onLogoutRequested);
  }

  Future<void> _onAppStarted(AppStarted event, Emitter<AuthState> emit) async {
    // Check if user is logged in by trying to get current shipper profile
    // This assumes network is available or token is valid locally
    final result = await _getCurrentShipperUseCase(NoParams());
    
    result.fold(
      (failure) => emit(Unauthenticated()),
      (shipper) => emit(Authenticated(shipper)),
    );
  }

  Future<void> _onLoginRequested(LoginRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    final result = await _loginUseCase(LoginParams(phone: event.phone, otp: event.otp));

    result.fold(
      (failure) => emit(AuthFailure(failure.message)),
      (shipper) => emit(Authenticated(shipper)),
    );
  }

  Future<void> _onLogoutRequested(LogoutRequested event, Emitter<AuthState> emit) async {
    // Call logout usecase if needed
    emit(Unauthenticated());
  }
}
