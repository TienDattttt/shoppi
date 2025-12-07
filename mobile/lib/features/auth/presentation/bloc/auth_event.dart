import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object> get props => [];
}

class AppStarted extends AuthEvent {}

class LoginRequested extends AuthEvent {
  final String phone;
  final String otp; // or password

  const LoginRequested({required this.phone, required this.otp});

  @override
  List<Object> get props => [phone, otp];
}

class LogoutRequested extends AuthEvent {}
