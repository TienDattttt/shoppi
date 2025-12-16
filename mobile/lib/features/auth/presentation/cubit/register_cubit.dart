import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import '../../domain/entities/register_params.dart';
import '../../domain/usecases/register_usecase.dart';
import 'register_state.dart';
import '../../domain/repositories/auth_repository.dart';

@injectable
class RegisterCubit extends Cubit<RegisterState> {
  final RegisterUseCase _registerUseCase;
  final AuthRepository _authRepository;

  RegisterCubit(this._registerUseCase, this._authRepository) : super(RegisterInitial());

  // ... existing code ...

  Future<void> fetchProvinces() async {
     RegisterStepUpdate currentState;
     if (state is RegisterInitial) {
       currentState = RegisterStepUpdate(currentStepIndex: _currentStep, params: _params);
       emit(currentState);
     } else if (state is RegisterStepUpdate) {
       currentState = state as RegisterStepUpdate;
     } else {
       return;
     }
     
     emit(currentState.copyWith(isLoadingProvinces: true));
     
     final result = await _authRepository.getProvinces();
     
     if (state is! RegisterStepUpdate) return;
     
     result.fold(
       (failure) => emit((state as RegisterStepUpdate).copyWith(isLoadingProvinces: false)),
       (provinces) => emit((state as RegisterStepUpdate).copyWith(
         isLoadingProvinces: false, 
         provinces: provinces,
       )),
     );
  }

  Future<void> fetchWards(String provinceCode) async {
     RegisterStepUpdate currentState;
     if (state is RegisterInitial) {
       currentState = RegisterStepUpdate(currentStepIndex: _currentStep, params: _params);
       emit(currentState);
     } else if (state is RegisterStepUpdate) {
       currentState = state as RegisterStepUpdate;
     } else {
       return;
     }
     
     emit(currentState.copyWith(isLoadingWards: true, wards: [], postOffices: [])); 
     
     final result = await _authRepository.getWards(provinceCode);
     
     if (state is! RegisterStepUpdate) return;
     
     result.fold(
       (failure) => emit((state as RegisterStepUpdate).copyWith(isLoadingWards: false)),
       (wards) => emit((state as RegisterStepUpdate).copyWith(
         isLoadingWards: false, 
         wards: wards,
       )),
     );
  }

  Future<void> fetchPostOffices(String wardCode) async {
     RegisterStepUpdate currentState;
     if (state is RegisterInitial) {
       currentState = RegisterStepUpdate(currentStepIndex: _currentStep, params: _params);
       emit(currentState);
     } else if (state is RegisterStepUpdate) {
       currentState = state as RegisterStepUpdate;
     } else {
       return;
     }
     
     emit(currentState.copyWith(isLoadingPostOffices: true, postOffices: []));
     
     final result = await _authRepository.getPostOffices(wardCode);
     
     if (state is! RegisterStepUpdate) return;
     
     result.fold(
       (failure) => emit((state as RegisterStepUpdate).copyWith(isLoadingPostOffices: false)),
       (postOffices) => emit((state as RegisterStepUpdate).copyWith(
         isLoadingPostOffices: false, 
         postOffices: postOffices,
       )),
     );
  }

  int _currentStep = 0;
  RegisterParams _params = const RegisterParams(
    fullName: '',
    phone: '',
    email: '',
    password: '',
    vehicleType: 'motorbike',
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
    required String password,
    required String idCardNumber,
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
    String? postOfficeId,
    String? provinceCode,
    String? wardCode,
  }) async {
    emit(RegisterSubmitting());
    
    final params = RegisterParams(
      fullName: fullName,
      phone: phone,
      email: email,
      password: password,
      idCardNumber: idCardNumber,
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
      postOfficeId: postOfficeId,
      provinceCode: provinceCode,
      wardCode: wardCode,
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
