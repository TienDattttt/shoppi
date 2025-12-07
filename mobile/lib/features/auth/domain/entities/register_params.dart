import 'package:equatable/equatable.dart';

class RegisterParams extends Equatable {
  final String fullName;
  final String phone;
  final String password; // Or OTP based flow? Design says OTP, but register might need password or just profile setup
  final String vehicleType;
  final String vehiclePlate;
  final String vehicleBrand;
  final String vehicleModel;
  final String workingArea; // City/District ID

  const RegisterParams({
    required this.fullName,
    required this.phone,
    required this.password,
    required this.vehicleType,
    required this.vehiclePlate,
    required this.vehicleBrand,
    required this.vehicleModel,
    required this.workingArea,
  });

  @override
  List<Object?> get props => [fullName, phone, password, vehicleType, vehiclePlate, vehicleBrand, vehicleModel, workingArea];
}
