import 'package:equatable/equatable.dart';
import '../../domain/entities/shipper.dart';

abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class Authenticated extends AuthState {
  final ShipperEntity shipper;

  const Authenticated(this.shipper);

  @override
  List<Object> get props => [shipper];
}

class Unauthenticated extends AuthState {}

class AuthFailure extends AuthState {
  final String message;

  const AuthFailure(this.message);

  @override
  List<Object> get props => [message];
}
