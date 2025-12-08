import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/shipment/presentation/pages/shipment_detail_page.dart';
import '../../features/shipment/presentation/cubit/shipment_list_cubit.dart';
import '../../features/home/presentation/cubit/dashboard_cubit.dart';
import '../../features/location/presentation/cubit/online_status_cubit.dart';
import '../../features/shipment/domain/entities/shipment_entity.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/earnings/presentation/pages/earnings_page.dart';
import '../../features/notifications/presentation/pages/notification_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/profile/presentation/pages/settings_page.dart';
import '../../features/auth/presentation/pages/register_page.dart';
import '../../features/auth/presentation/pages/pending_approval_page.dart';
import '../../features/main_shell/presentation/pages/main_shell_page.dart';
import '../../features/shipment/presentation/pages/shipments_page.dart';
import '../../features/shipment/presentation/pages/delivery_confirmation_page.dart';
import '../../features/shipment/presentation/pages/failed_delivery_page.dart';
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
      path: '/register',
      builder: (context, state) => const RegisterPage(),
    ),
    GoRoute(
      path: '/pending-approval',
      builder: (context, state) => const PendingApprovalPage(),
    ),
    
    // Authenticated Shell with Bottom Bar
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) {
        return MultiBlocProvider(
          providers: [
            BlocProvider(create: (context) => getIt<ShipmentListCubit>()),
            BlocProvider(create: (context) => getIt<OnlineStatusCubit>()),
          ],
          child: MainShellPage(navigationShell: navigationShell),
        );
      },
      branches: [
        // Tab 1: Dashboard
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/home',
              builder: (context, state) => BlocProvider(
                create: (context) => getIt<DashboardCubit>(),
                child: const HomePage(),
              ),
            ),
          ],
        ),
        // Tab 2: Orders
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/orders',
              builder: (context, state) => const ShipmentsPage(),
            ),
          ],
        ),
        // Tab 3: Earnings
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/earnings',
              builder: (context, state) => const EarningsPage(),
            ),
          ],
        ),
        // Tab 4: Profile
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/profile',
              builder: (context, state) => const ProfilePage(),
            ),
            GoRoute(
              path: '/settings',
              builder: (context, state) => const SettingsPage(),
            ),
          ],
        ),
      ],
    ),

    // Other Global Routes (that might push over the shell or need to be top-level)
    GoRoute(
      path: '/notifications',
      builder: (context, state) => const NotificationPage(),
    ),
    GoRoute(
      path: '/shipment/:id',
      parentNavigatorKey: null, // Push on top of shell
      builder: (context, state) {
        final shipment = state.extra as ShipmentEntity?; 
        // Handles deep link or navigation where extra might be null - 
        // In real app we might fetch by ID if extra is null, but for now we assume extra is passed or handle null in page.
        // Assuming ShipmentDetailPage handles fetching effectively or we pass ID.
        // If ShipmentDetailPage REQUIRES entity, we might need a wrapper.
        // For now, let's keep it as is, assuming navigation passes extra.
        if (shipment == null) {
             // Fallback or loading via ID: state.pathParameters['id']
             // This requires ShipmentDetailPage to support loading by ID.
             // For safety, let's assume valid navigation for now.
             return const Scaffold(body: Center(child: Text('Shipment not found')));
        }
        return ShipmentDetailPage(shipment: shipment);
      },
    ),
    GoRoute(
      path: '/delivery-confirmation/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return DeliveryConfirmationPage(shipmentId: id);
      },
    ),
     GoRoute(
      path: '/delivery-failed/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return FailedDeliveryPage(shipmentId: id);
      },
    ),
  ],
);
