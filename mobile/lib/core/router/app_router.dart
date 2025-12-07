import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/shipment/presentation/pages/shipment_list_page.dart';
import '../../features/shipment/presentation/pages/shipment_detail_page.dart';
import '../../features/shipment/presentation/cubit/shipment_list_cubit.dart';
import '../../features/home/presentation/cubit/dashboard_cubit.dart';
import '../../features/shipment/domain/entities/shipment_entity.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../injection.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const SplashPage(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginPage(),
    ),
    GoRoute(
      path: '/home',
      builder: (context, state) => MultiBlocProvider(
        providers: [
          BlocProvider(create: (context) => getIt<ShipmentListCubit>()),
          BlocProvider(create: (context) => getIt<DashboardCubit>()),
        ],
        child: const HomePage(),
      ),
    ),
    GoRoute(
      path: '/shipment/:id',
      builder: (context, state) {
        final shipment = state.extra as ShipmentEntity;
        return ShipmentDetailPage(shipment: shipment);
      },
    ),
