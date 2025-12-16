import 'package:equatable/equatable.dart';

class RegisterParams extends Equatable {
  final String fullName;
  final String phone;
  final String email;
  final String password;
  final String idCardNumber;
  final String vehicleType;
  final String vehiclePlate;
  final String vehicleBrand;
  final String vehicleModel;
  // Local file paths (for picking images)
  final String idCardFront;
  final String idCardBack;
  final String licenseFront;
  // Uploaded URLs (from Supabase Storage)
  final String? idCardFrontUrl;
  final String? idCardBackUrl;
  final String? driverLicenseUrl;
  // Working area
  final String city;
  final List<String> districts;
  final double maxDistance;
  final String workingArea;
  // Post office assignment
  final String? postOfficeId;
  final String? provinceCode;
  final String? wardCode;

  const RegisterParams({
    this.fullName = '',
    this.phone = '',
    this.email = '',
    this.password = '',
    this.idCardNumber = '',
    this.vehicleType = 'motorbike',
    this.vehiclePlate = '',
    this.vehicleBrand = '',
    this.vehicleModel = '',
    this.idCardFront = '',
    this.idCardBack = '',
    this.licenseFront = '',
    this.idCardFrontUrl,
    this.idCardBackUrl,
    this.driverLicenseUrl,
    this.city = '',
    this.districts = const [],
    this.maxDistance = 10.0,
    this.workingArea = '',
    this.postOfficeId,
    this.provinceCode,
    this.wardCode,
  });

  RegisterParams copyWith({
    String? fullName,
    String? phone,
    String? email,
    String? password,
    String? idCardNumber,
    String? vehicleType,
    String? vehiclePlate,
    String? vehicleBrand,
    String? vehicleModel,
    String? idCardFront,
    String? idCardBack,
    String? licenseFront,
    String? idCardFrontUrl,
    String? idCardBackUrl,
    String? driverLicenseUrl,
    String? city,
    List<String>? districts,
    double? maxDistance,
    String? workingArea,
    String? postOfficeId,
    String? provinceCode,
    String? wardCode,
  }) {
    return RegisterParams(
      fullName: fullName ?? this.fullName,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      password: password ?? this.password,
      idCardNumber: idCardNumber ?? this.idCardNumber,
      vehicleType: vehicleType ?? this.vehicleType,
      vehiclePlate: vehiclePlate ?? this.vehiclePlate,
      vehicleBrand: vehicleBrand ?? this.vehicleBrand,
      vehicleModel: vehicleModel ?? this.vehicleModel,
      idCardFront: idCardFront ?? this.idCardFront,
      idCardBack: idCardBack ?? this.idCardBack,
      licenseFront: licenseFront ?? this.licenseFront,
      idCardFrontUrl: idCardFrontUrl ?? this.idCardFrontUrl,
      idCardBackUrl: idCardBackUrl ?? this.idCardBackUrl,
      driverLicenseUrl: driverLicenseUrl ?? this.driverLicenseUrl,
      city: city ?? this.city,
      districts: districts ?? this.districts,
      maxDistance: maxDistance ?? this.maxDistance,
      workingArea: workingArea ?? this.workingArea,
      postOfficeId: postOfficeId ?? this.postOfficeId,
      provinceCode: provinceCode ?? this.provinceCode,
      wardCode: wardCode ?? this.wardCode,
    );
  }

  @override
  List<Object?> get props => [
        fullName,
        phone,
        email,
        password,
        idCardNumber,
        vehicleType,
        vehiclePlate,
        vehicleBrand,
        vehicleModel,
        idCardFront,
        idCardBack,
        licenseFront,
        idCardFrontUrl,
        idCardBackUrl,
        driverLicenseUrl,
        city,
        districts,
        maxDistance,
        workingArea,
        postOfficeId,
        provinceCode,
        wardCode,
      ];
}
