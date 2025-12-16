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
  
  final List<dynamic> provinces;
  final List<dynamic> wards;
  final List<dynamic> postOffices;
  
  final bool isLoadingProvinces;
  final bool isLoadingWards;
  final bool isLoadingPostOffices;

  const RegisterStepUpdate({
    required this.currentStepIndex,
    required this.params,
    this.provinces = const [],
    this.wards = const [],
    this.postOffices = const [],
    this.isLoadingProvinces = false,
    this.isLoadingWards = false,
    this.isLoadingPostOffices = false,
  });

  @override
  List<Object> get props => [
    currentStepIndex, 
    params,
    provinces,
    wards,
    postOffices,
    isLoadingProvinces,
    isLoadingWards,
    isLoadingPostOffices,
  ];

  RegisterStepUpdate copyWith({
    int? currentStepIndex,
    RegisterParams? params,
    List<dynamic>? provinces,
    List<dynamic>? wards,
    List<dynamic>? postOffices,
    bool? isLoadingProvinces,
    bool? isLoadingWards,
    bool? isLoadingPostOffices,
  }) {
    return RegisterStepUpdate(
      currentStepIndex: currentStepIndex ?? this.currentStepIndex,
      params: params ?? this.params,
      provinces: provinces ?? this.provinces,
      wards: wards ?? this.wards,
      postOffices: postOffices ?? this.postOffices,
      isLoadingProvinces: isLoadingProvinces ?? this.isLoadingProvinces,
      isLoadingWards: isLoadingWards ?? this.isLoadingWards,
      isLoadingPostOffices: isLoadingPostOffices ?? this.isLoadingPostOffices,
    );
  }
}

class RegisterSubmitting extends RegisterState {}

class RegisterSuccess extends RegisterState {}

class RegisterFailure extends RegisterState {
  final String message;
  const RegisterFailure(this.message);
}
