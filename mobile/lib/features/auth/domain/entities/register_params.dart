import 'package:equatable/equatable.dart';

class RegisterParams extends Equatable {
  final String fullName;
  final String phone;
  final String email;
  final String password;
  final String vehicleType;
  final String vehiclePlate;
  final String vehicleBrand;
  final String vehicleModel;
  final String idCardFront;
  final String idCardBack;
  final String licenseFront;
  final String city;
  final List<String> districts;
  final double maxDistance;
  final String workingArea;

  const RegisterParams({
    this.fullName = '',
    this.phone = '',
    this.email = '',
    this.password = '',
    this.vehicleType = 'motorbike',
    this.vehiclePlate = '',
    this.vehicleBrand = '',
    this.vehicleModel = '',
    this.idCardFront = '',
    this.idCardBack = '',
    this.licenseFront = '',
    this.city = '',
    this.districts = const [],
    this.maxDistance = 10.0,
    this.workingArea = '',
  });

  RegisterParams copyWith({
    String? fullName,
    String? phone,
    String? email,
    String? password,
    String? vehicleType,
    String? vehiclePlate,
    String? vehicleBrand,
    String? vehicleModel,
    String? idCardFront,
    String? idCardBack,
    String? licenseFront,
    String? city,
    List<String>? districts,
    double? maxDistance,
    String? workingArea,
  }) {
    return RegisterParams(
      fullName: fullName ?? this.fullName,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      password: password ?? this.password,
      vehicleType: vehicleType ?? this.vehicleType,
      vehiclePlate: vehiclePlate ?? this.vehiclePlate,
      vehicleBrand: vehicleBrand ?? this.vehicleBrand,
      vehicleModel: vehicleModel ?? this.vehicleModel,
      idCardFront: idCardFront ?? this.idCardFront,
      idCardBack: idCardBack ?? this.idCardBack,
      licenseFront: licenseFront ?? this.licenseFront,
      city: city ?? this.city,
      districts: districts ?? this.districts,
      maxDistance: maxDistance ?? this.maxDistance,
      workingArea: workingArea ?? this.workingArea,
    );
  }

  @override
  List<Object?> get props => [
        fullName,
        phone,
        email,
        password,
        vehicleType,
        vehiclePlate,
        vehicleBrand,
        vehicleModel,
        idCardFront,
        idCardBack,
        licenseFront,
        city,
        districts,
        maxDistance,
        workingArea,
      ];
}
