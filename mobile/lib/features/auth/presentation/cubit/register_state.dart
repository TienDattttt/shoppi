import 'package:equatable/equatable.dart';
import '../../domain/entities/register_params.dart';

enum RegisterStep { personalInfo, vehicleInfo, documents, workingArea }

abstract class RegisterState extends Equatable {
  const RegisterState();
  @override
  List<Object?> get props => [];
}

class RegisterInitial extends RegisterState {}

class RegisterStepUpdate extends RegisterState {
  final int currentStepIndex;
  final RegisterParams params;

  const RegisterStepUpdate({
    required this.currentStepIndex,
    required this.params,
  });

  @override
  List<Object> get props => [currentStepIndex, params];
}

class RegisterSubmitting extends RegisterState {}

class RegisterSuccess extends RegisterState {}

class RegisterFailure extends RegisterState {
  final String message;
  const RegisterFailure(this.message);
}
