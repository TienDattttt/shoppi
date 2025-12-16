// GENERATED CODE - DO NOT MODIFY BY HAND

// **************************************************************************
// InjectableConfigGenerator
// **************************************************************************

// ignore_for_file: type=lint
// coverage:ignore-file

// ignore_for_file: no_leading_underscores_for_library_prefixes
import 'package:connectivity_plus/connectivity_plus.dart' as _i895;
import 'package:dio/dio.dart' as _i361;
import 'package:flutter_secure_storage/flutter_secure_storage.dart' as _i558;
import 'package:get_it/get_it.dart' as _i174;
import 'package:injectable/injectable.dart' as _i526;

import 'core/di/app_module.dart' as _i808;
import 'core/network/api_client.dart' as _i871;
import 'core/network/auth_interceptor.dart' as _i8;
import 'core/network/network_info.dart' as _i75;
import 'core/offline/offline_sync_service.dart' as _i811;
import 'core/services/notification_service.dart' as _i1011;
import 'core/services/photo_upload_service.dart' as _i388;
import 'features/auth/data/datasources/auth_local_data_source.dart' as _i791;
import 'features/auth/data/datasources/auth_remote_data_source.dart' as _i767;
import 'features/auth/data/repositories/auth_repository_impl.dart' as _i111;
import 'features/auth/domain/repositories/auth_repository.dart' as _i1015;
import 'features/auth/domain/usecases/get_current_shipper_usecase.dart'
    as _i250;
import 'features/auth/domain/usecases/login_usecase.dart' as _i206;
import 'features/auth/domain/usecases/register_usecase.dart' as _i693;
import 'features/auth/domain/usecases/request_otp_usecase.dart' as _i324;
import 'features/auth/presentation/bloc/auth_bloc.dart' as _i363;
import 'features/auth/presentation/cubit/register_cubit.dart' as _i622;
import 'features/earnings/data/datasources/earnings_remote_data_source.dart'
    as _i151;
import 'features/earnings/data/repositories/earnings_repository_impl.dart'
    as _i116;
import 'features/earnings/domain/repositories/earnings_repository.dart'
    as _i756;
import 'features/earnings/domain/usecases/get_earnings_stats_usecase.dart'
    as _i807;
import 'features/earnings/presentation/cubit/earnings_cubit.dart' as _i823;
import 'features/home/data/datasources/dashboard_remote_data_source.dart'
    as _i203;
import 'features/home/data/repositories/dashboard_repository_impl.dart'
    as _i125;
import 'features/home/domain/repositories/dashboard_repository.dart' as _i337;
import 'features/home/domain/usecases/get_dashboard_stats_usecase.dart'
    as _i509;
import 'features/home/presentation/cubit/dashboard_cubit.dart' as _i921;
import 'features/location/data/datasources/location_data_source.dart' as _i268;
import 'features/location/data/repositories/location_repository_impl.dart'
    as _i1061;
import 'features/location/domain/repositories/location_repository.dart' as _i55;
import 'features/location/presentation/cubit/location_cubit.dart' as _i793;
import 'features/location/presentation/cubit/online_status_cubit.dart' as _i336;
import 'features/notifications/data/datasources/notification_remote_data_source.dart'
    as _i316;
import 'features/notifications/data/repositories/notification_repository_impl.dart'
    as _i940;
import 'features/notifications/domain/repositories/notification_repository.dart'
    as _i620;
import 'features/notifications/domain/usecases/get_notifications_usecase.dart'
    as _i65;
import 'features/notifications/domain/usecases/register_device_token_usecase.dart'
    as _i645;
import 'features/notifications/presentation/cubit/notification_cubit.dart'
    as _i76;
import 'features/profile/data/datasources/profile_remote_data_source.dart'
    as _i336;
import 'features/profile/data/repositories/profile_repository_impl.dart'
    as _i277;
import 'features/profile/domain/repositories/profile_repository.dart' as _i626;
import 'features/profile/domain/usecases/update_profile_usecase.dart' as _i851;
import 'features/profile/presentation/cubit/locale_cubit.dart' as _i831;
import 'features/profile/presentation/cubit/settings_cubit.dart' as _i511;
import 'features/profile/presentation/cubit/theme_cubit.dart' as _i561;
import 'features/shipment/data/datasources/shipment_remote_data_source.dart'
    as _i828;
import 'features/shipment/data/repositories/shipment_repository_impl.dart'
    as _i868;
import 'features/shipment/domain/repositories/shipment_repository.dart'
    as _i652;
import 'features/shipment/domain/usecases/get_active_shipments_usecase.dart'
    as _i930;
import 'features/shipment/domain/usecases/mark_delivered_usecase.dart' as _i823;
import 'features/shipment/domain/usecases/mark_failed_usecase.dart' as _i527;
import 'features/shipment/domain/usecases/mark_picked_up_usecase.dart' as _i298;
import 'features/shipment/presentation/cubit/shipment_detail_cubit.dart'
    as _i980;
import 'features/shipment/presentation/cubit/shipment_list_cubit.dart' as _i980;

extension GetItInjectableX on _i174.GetIt {
// initializes the registration of main-scope dependencies inside of GetIt
  _i174.GetIt init({
    String? environment,
    _i526.EnvironmentFilter? environmentFilter,
  }) {
    final gh = _i526.GetItHelper(
      this,
      environment,
      environmentFilter,
    );
    final appModule = _$AppModule();
    gh.lazySingleton<_i361.Dio>(() => appModule.dio);
    gh.lazySingleton<_i895.Connectivity>(() => appModule.connectivity);
    gh.lazySingleton<_i558.FlutterSecureStorage>(() => appModule.secureStorage);
    gh.lazySingleton<_i831.LocaleCubit>(() => _i831.LocaleCubit());
    gh.lazySingleton<_i511.SettingsCubit>(() => _i511.SettingsCubit());
    gh.lazySingleton<_i561.ThemeCubit>(() => _i561.ThemeCubit());
    gh.lazySingleton<_i388.PhotoUploadService>(
        () => _i388.PhotoUploadServiceImpl(gh<_i361.Dio>()));
    gh.factory<_i8.AuthInterceptor>(
        () => _i8.AuthInterceptor(gh<_i558.FlutterSecureStorage>()));
    gh.lazySingleton<_i791.AuthLocalDataSource>(
        () => _i791.AuthLocalDataSourceImpl(gh<_i558.FlutterSecureStorage>()));
    gh.lazySingleton<_i75.NetworkInfo>(
        () => _i75.NetworkInfoImpl(gh<_i895.Connectivity>()));
    gh.lazySingleton<_i871.ApiClient>(() => _i871.ApiClient(
          gh<_i361.Dio>(),
          gh<_i8.AuthInterceptor>(),
        ));
    gh.lazySingleton<_i811.OfflineSyncService>(
        () => _i811.OfflineSyncService(gh<_i75.NetworkInfo>()));
    gh.lazySingleton<_i203.DashboardRemoteDataSource>(
        () => _i203.DashboardRemoteDataSourceImpl(gh<_i871.ApiClient>()));
    gh.lazySingleton<_i268.LocationDataSource>(
        () => _i268.LocationDataSourceImpl(gh<_i871.ApiClient>()));
    gh.lazySingleton<_i151.EarningsRemoteDataSource>(
        () => _i151.EarningsRemoteDataSourceImpl(gh<_i871.ApiClient>()));
    gh.lazySingleton<_i767.AuthRemoteDataSource>(
        () => _i767.AuthRemoteDataSourceImpl(gh<_i871.ApiClient>()));
    gh.lazySingleton<_i316.NotificationRemoteDataSource>(
        () => _i316.NotificationRemoteDataSourceImpl(gh<_i871.ApiClient>()));
    gh.lazySingleton<_i1011.NotificationService>(
        () => _i1011.NotificationServiceImpl(gh<_i871.ApiClient>()));
    gh.lazySingleton<_i828.ShipmentRemoteDataSource>(
        () => _i828.ShipmentRemoteDataSourceImpl(gh<_i871.ApiClient>()));
    gh.lazySingleton<_i337.DashboardRepository>(
        () => _i125.DashboardRepositoryImpl(
              gh<_i203.DashboardRemoteDataSource>(),
              gh<_i75.NetworkInfo>(),
            ));
    gh.lazySingleton<_i509.GetDashboardStatsUseCase>(
        () => _i509.GetDashboardStatsUseCase(gh<_i337.DashboardRepository>()));
    gh.lazySingleton<_i336.ProfileRemoteDataSource>(
        () => _i336.ProfileRemoteDataSourceImpl(gh<_i871.ApiClient>()));
    gh.lazySingleton<_i55.LocationRepository>(
        () => _i1061.LocationRepositoryImpl(gh<_i268.LocationDataSource>()));
    gh.lazySingleton<_i620.NotificationRepository>(
        () => _i940.NotificationRepositoryImpl(
              gh<_i316.NotificationRemoteDataSource>(),
              gh<_i75.NetworkInfo>(),
              gh<_i1011.NotificationService>(),
            ));
    gh.lazySingleton<_i756.EarningsRepository>(
        () => _i116.EarningsRepositoryImpl(
              gh<_i151.EarningsRemoteDataSource>(),
              gh<_i75.NetworkInfo>(),
            ));
    gh.lazySingleton<_i1015.AuthRepository>(() => _i111.AuthRepositoryImpl(
          gh<_i767.AuthRemoteDataSource>(),
          gh<_i791.AuthLocalDataSource>(),
          gh<_i75.NetworkInfo>(),
        ));
    gh.lazySingleton<_i652.ShipmentRepository>(
        () => _i868.ShipmentRepositoryImpl(
              gh<_i828.ShipmentRemoteDataSource>(),
              gh<_i75.NetworkInfo>(),
              gh<_i811.OfflineSyncService>(),
            ));
    gh.factory<_i921.DashboardCubit>(
        () => _i921.DashboardCubit(gh<_i509.GetDashboardStatsUseCase>()));
    gh.lazySingleton<_i930.GetActiveShipmentsUseCase>(
        () => _i930.GetActiveShipmentsUseCase(gh<_i652.ShipmentRepository>()));
    gh.lazySingleton<_i823.MarkDeliveredUseCase>(
        () => _i823.MarkDeliveredUseCase(gh<_i652.ShipmentRepository>()));
    gh.lazySingleton<_i527.MarkFailedUseCase>(
        () => _i527.MarkFailedUseCase(gh<_i652.ShipmentRepository>()));
    gh.lazySingleton<_i298.MarkPickedUpUseCase>(
        () => _i298.MarkPickedUpUseCase(gh<_i652.ShipmentRepository>()));
    gh.factory<_i980.ShipmentDetailCubit>(() => _i980.ShipmentDetailCubit(
          gh<_i298.MarkPickedUpUseCase>(),
          gh<_i823.MarkDeliveredUseCase>(),
          gh<_i527.MarkFailedUseCase>(),
        ));
    gh.factory<_i980.ShipmentListCubit>(
        () => _i980.ShipmentListCubit(gh<_i930.GetActiveShipmentsUseCase>()));
    gh.lazySingleton<_i626.ProfileRepository>(() => _i277.ProfileRepositoryImpl(
          gh<_i336.ProfileRemoteDataSource>(),
          gh<_i75.NetworkInfo>(),
        ));
    gh.factory<_i793.LocationCubit>(
        () => _i793.LocationCubit(gh<_i55.LocationRepository>()));
    gh.lazySingleton<_i65.GetNotificationsUseCase>(
        () => _i65.GetNotificationsUseCase(gh<_i620.NotificationRepository>()));
    gh.lazySingleton<_i645.RegisterDeviceTokenUseCase>(() =>
        _i645.RegisterDeviceTokenUseCase(gh<_i620.NotificationRepository>()));
    gh.lazySingleton<_i851.UpdateProfileUseCase>(
        () => _i851.UpdateProfileUseCase(gh<_i626.ProfileRepository>()));
    gh.lazySingleton<_i807.GetEarningsStatsUseCase>(
        () => _i807.GetEarningsStatsUseCase(gh<_i756.EarningsRepository>()));
    gh.lazySingleton<_i250.GetCurrentShipperUseCase>(
        () => _i250.GetCurrentShipperUseCase(gh<_i1015.AuthRepository>()));
    gh.lazySingleton<_i206.LoginUseCase>(
        () => _i206.LoginUseCase(gh<_i1015.AuthRepository>()));
    gh.lazySingleton<_i693.RegisterUseCase>(
        () => _i693.RegisterUseCase(gh<_i1015.AuthRepository>()));
    gh.lazySingleton<_i324.RequestOtpUseCase>(
        () => _i324.RequestOtpUseCase(gh<_i1015.AuthRepository>()));
    gh.factory<_i76.NotificationCubit>(() => _i76.NotificationCubit(
          gh<_i65.GetNotificationsUseCase>(),
          gh<_i645.RegisterDeviceTokenUseCase>(),
        ));
    gh.factory<_i823.EarningsCubit>(
        () => _i823.EarningsCubit(gh<_i807.GetEarningsStatsUseCase>()));
    gh.factory<_i336.OnlineStatusCubit>(() => _i336.OnlineStatusCubit(
          gh<_i871.ApiClient>(),
          gh<_i793.LocationCubit>(),
        ));
    gh.factory<_i363.AuthBloc>(() => _i363.AuthBloc(
          gh<_i206.LoginUseCase>(),
          gh<_i250.GetCurrentShipperUseCase>(),
        ));
    gh.factory<_i622.RegisterCubit>(() => _i622.RegisterCubit(
          gh<_i693.RegisterUseCase>(),
          gh<_i1015.AuthRepository>(),
        ));
    return this;
  }
}

class _$AppModule extends _i808.AppModule {}
