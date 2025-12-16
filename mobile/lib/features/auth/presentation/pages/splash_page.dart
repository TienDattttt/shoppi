import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';
import '../../../../core/constants/app_colors.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    // Trigger auth check
    context.read<AuthBloc>().add(AppStarted());
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is Authenticated) {
          // Check shipper approval status
          final shipper = state.shipper;
          if (shipper.status == 'pending') {
            // Account not yet approved by admin
            context.go('/pending-approval');
          } else if (shipper.status == 'suspended') {
            // Account suspended - show message and go to login
              ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Tài khoản của bạn đã bị tạm ngưng. Vui lòng liên hệ hỗ trợ.'),
                backgroundColor: Colors.red,
              ),
            );
            context.go('/login');
          } else {
            // Active shipper - proceed to home
            context.go('/home');
          }
        } else if (state is Unauthenticated) {
           context.go('/login');
        }
      },
      child: Scaffold(
        body: Container(
          decoration: const BoxDecoration(
            gradient: AppColors.primaryGradient,
          ),
          child: const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.local_shipping, size: 80, color: Colors.white),
                SizedBox(height: 20),
                Text(
                  "SPX SHIPPER",
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 2,
                  ),
                ),
                SizedBox(height: 40),
                CircularProgressIndicator(color: Colors.white),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
