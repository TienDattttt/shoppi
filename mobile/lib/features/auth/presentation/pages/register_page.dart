import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../l10n/app_localizations.dart';
import '../cubit/register_cubit.dart';
import '../cubit/register_state.dart';
import 'steps/personal_info_step.dart';
import 'steps/vehicle_info_step.dart';
import 'steps/documents_step.dart';
import 'steps/working_area_step.dart';
import '../../../../injection.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  int _currentStep = 0;
  
  // Personal Info
  String _fullName = '';
  String _phone = '';
  String _email = '';
  String _password = '';
  String _idCardNumber = '';
  
  // Vehicle Info
  String _vehicleType = 'motorbike';
  String _licensePlate = '';
  String _vehicleBrand = '';
  String _vehicleModel = '';
  
  // Documents
  String? _idCardFrontPath;
  String? _idCardBackPath;
  String? _driverLicensePath;
  
  // Working Area
  String _city = '';
  List<String> _districts = [];
  int _maxDistance = 10;
  String? _postOfficeId;
  String? _provinceCode;
  String? _wardCode;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    return BlocProvider(
      create: (context) => getIt<RegisterCubit>(),
      child: Scaffold(
        appBar: AppBar(
          title: Text(l10n.register),
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
        ),
        body: BlocConsumer<RegisterCubit, RegisterState>(
          listener: (context, state) {
            if (state is RegisterSuccess) {
              context.go('/pending-approval');
            } else if (state is RegisterFailure) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: Colors.red,
                ),
              );
            }
          },
          builder: (context, state) {
            return Column(
              children: [
                // Step Indicator
                _buildStepIndicator(),
                
                // Step Content
                Expanded(
                  child: _buildCurrentStep(context, state),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildStepIndicator() {
    final l10n = AppLocalizations.of(context)!;
    final steps = [
      l10n.fullName,
      l10n.vehicleInfo,
      l10n.uploadDocuments,
      l10n.workingArea,
    ];
    
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(steps.length, (index) {
          final isActive = index == _currentStep;
          final isCompleted = index < _currentStep;
          
          return Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isCompleted
                      ? Colors.green
                      : isActive
                          ? AppColors.primary
                          : Colors.grey[300],
                ),
                child: Center(
                  child: isCompleted
                      ? const Icon(Icons.check, color: Colors.white, size: 18)
                      : Text(
                          '${index + 1}',
                          style: TextStyle(
                            color: isActive ? Colors.white : Colors.grey[600],
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
              if (index < steps.length - 1)
                Container(
                  width: 40,
                  height: 2,
                  color: isCompleted ? Colors.green : Colors.grey[300],
                ),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildCurrentStep(BuildContext context, RegisterState state) {
    switch (_currentStep) {
      case 0:
        return PersonalInfoStep(
          initialFullName: _fullName,
          initialPhone: _phone,
          initialEmail: _email,
          initialPassword: _password,
          initialIdCardNumber: _idCardNumber,
          onInfoChanged: (fullName, phone, email, password, idCardNumber) {
            _fullName = fullName;
            _phone = phone;
            _email = email;
            _password = password;
            _idCardNumber = idCardNumber;
          },
          onNext: () => setState(() => _currentStep = 1),
        );
      case 1:
        return VehicleInfoStep(
          initialVehicleType: _vehicleType,
          initialLicensePlate: _licensePlate,
          initialVehicleBrand: _vehicleBrand,
          initialVehicleModel: _vehicleModel,
          onVehicleInfoChanged: (type, plate, brand, model) {
            _vehicleType = type;
            _licensePlate = plate;
            _vehicleBrand = brand;
            _vehicleModel = model;
          },
          onNext: () => setState(() => _currentStep = 2),
          onPrevious: () => setState(() => _currentStep = 0),
        );
      case 2:
        return DocumentsStep(
          initialIdCardFront: _idCardFrontPath,
          initialIdCardBack: _idCardBackPath,
          initialDriverLicense: _driverLicensePath,
          onDocumentsChanged: (front, back, license) {
            _idCardFrontPath = front;
            _idCardBackPath = back;
            _driverLicensePath = license;
          },
          onNext: () {
             setState(() => _currentStep = 3);
             context.read<RegisterCubit>().fetchProvinces();
          },
          onPrevious: () => setState(() => _currentStep = 1),
        );
      case 3:
        final provinces = (state is RegisterStepUpdate) ? state.provinces : [];
        final wards = (state is RegisterStepUpdate) ? state.wards : [];
        final postOffices = (state is RegisterStepUpdate) ? state.postOffices : [];
        
        final isLoadingProvinces = (state is RegisterStepUpdate) ? state.isLoadingProvinces : false;
        final isLoadingWards = (state is RegisterStepUpdate) ? state.isLoadingWards : false;
        final isLoadingPostOffices = (state is RegisterStepUpdate) ? state.isLoadingPostOffices : false;

        return WorkingAreaStep(
          initialCity: _city,
          initialDistricts: _districts,
          initialMaxDistance: _maxDistance,
          initialPostOfficeId: _postOfficeId,
          initialProvinceCode: _provinceCode,
          initialWardCode: _wardCode,
          provinces: provinces,
          wards: wards,
          postOffices: postOffices,
          isLoadingProvinces: isLoadingProvinces,
          isLoadingWards: isLoadingWards,
          isLoadingPostOffices: isLoadingPostOffices,
          onRetryProvinces: () => context.read<RegisterCubit>().fetchProvinces(),
          onProvinceChanged: (code) {
             if (code != null) context.read<RegisterCubit>().fetchWards(code);
          },
          onWardChanged: (code) {
             if (code != null) context.read<RegisterCubit>().fetchPostOffices(code);
          },
          onWorkingAreaChanged: (city, districts, maxDistance, postOfficeId, provinceCode, wardCode) {
            _city = city;
            _districts = districts;
            _maxDistance = maxDistance;
            _postOfficeId = postOfficeId;
            _provinceCode = provinceCode;
            _wardCode = wardCode;
          },
          onSubmit: () => _submitRegistration(context),
          onPrevious: () => setState(() => _currentStep = 2),
        );
      default:
        return const SizedBox.shrink();
    }
  }

  void _submitRegistration(BuildContext context) {
    context.read<RegisterCubit>().register(
      fullName: _fullName,
      phone: _phone,
      email: _email,
      password: _password,
      idCardNumber: _idCardNumber,
      vehicleType: _vehicleType,
      licensePlate: _licensePlate,
      vehicleBrand: _vehicleBrand,
      vehicleModel: _vehicleModel,
      idCardFrontPath: _idCardFrontPath,
      idCardBackPath: _idCardBackPath,
      driverLicensePath: _driverLicensePath,
      city: _city,
      districts: _districts,
      maxDistance: _maxDistance,
      postOfficeId: _postOfficeId,
      provinceCode: _provinceCode,
      wardCode: _wardCode,
    );
  }
}
