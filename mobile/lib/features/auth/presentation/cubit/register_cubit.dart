import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import '../../domain/entities/register_params.dart';
import '../../domain/usecases/register_usecase.dart';
import 'register_state.dart';

@injectable
class RegisterCubit extends Cubit<RegisterState> {
  final RegisterUseCase _registerUseCase;

  RegisterCubit(this._registerUseCase) : super(RegisterInitial());

  int _currentStep = 0;
  RegisterParams _params = const RegisterParams(
    fullName: '',
    phone: '',
    email: '',
    password: '',
    vehicleType: 'motorcycle',
    vehiclePlate: '',
    vehicleBrand: '',
    vehicleModel: '',
    idCardFront: '',
    idCardBack: '',
    licenseFront: '',
    city: '',
    districts: [],
    maxDistance: 10.0,
    workingArea: '',
  );

  void updatePersonalInfo({
    required String fullName,
    required String phone,
    required String password,
    required String email,
  }) {
    _params = _params.copyWith(
      fullName: fullName,
      phone: phone,
      password: password,
      email: email,
    );
  }

  void updateVehicleInfo({
    required String vehicleType,
    required String vehiclePlate,
    required String vehicleBrand,
    required String vehicleModel,
  }) {
    _params = _params.copyWith(
      vehicleType: vehicleType,
      vehiclePlate: vehiclePlate,
      vehicleBrand: vehicleBrand,
      vehicleModel: vehicleModel,
    );
  }

  void updateWorkingArea({required String city, required List<String> districts, required String workingArea}) {
    _params = _params.copyWith(
      city: city,
      districts: districts,
      workingArea: workingArea,
    );
  }
  
  void updateDocuments({required String idCardFront, required String idCardBack, required String licenseFront}) {
    _params = _params.copyWith(
      idCardFront: idCardFront,
      idCardBack: idCardBack,
      licenseFront: licenseFront,
    );
  }

  void nextStep() {
    if (_currentStep < 3) {
      _currentStep++;
      emit(RegisterStepUpdate(currentStepIndex: _currentStep, params: _params));
    } else {
      submitRegistration();
    }
  }

  void previousStep() {
    if (_currentStep > 0) {
      _currentStep--;
      emit(RegisterStepUpdate(currentStepIndex: _currentStep, params: _params));
    }
  }

  /// New method to register with all parameters at once
  Future<void> register({
    required String fullName,
    required String phone,
    required String email,
    required String vehicleType,
    required String licensePlate,
    required String vehicleBrand,
    required String vehicleModel,
    String? idCardFrontPath,
    String? idCardBackPath,
    String? driverLicensePath,
    required String city,
    required List<String> districts,
    required int maxDistance,
  }) async {
    emit(RegisterSubmitting());
    
    final params = RegisterParams(
      fullName: fullName,
      phone: phone,
      email: email,
      password: '', // Password will be set via OTP verification
      vehicleType: vehicleType,
      vehiclePlate: licensePlate,
      vehicleBrand: vehicleBrand,
      vehicleModel: vehicleModel,
      idCardFront: idCardFrontPath ?? '',
      idCardBack: idCardBackPath ?? '',
      licenseFront: driverLicensePath ?? '',
      city: city,
      districts: districts,
      maxDistance: maxDistance.toDouble(),
      workingArea: city,
    );
    
    final result = await _registerUseCase(params);
    result.fold(
      (failure) => emit(RegisterFailure(failure.message)),
      (success) => emit(RegisterSuccess()),
    );
  }

  Future<void> submitRegistration() async {
    emit(RegisterSubmitting());
    final result = await _registerUseCase(_params);
    result.fold(
      (failure) => emit(RegisterFailure(failure.message)),
      (success) => emit(RegisterSuccess()),
    );
  }
}
