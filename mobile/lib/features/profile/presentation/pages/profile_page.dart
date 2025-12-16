import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:mobile/features/auth/presentation/bloc/auth_state.dart';
import 'package:mobile/features/auth/presentation/bloc/auth_event.dart';
import 'package:go_router/go_router.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is Unauthenticated) {
            context.go('/login');
          }
        },
        builder: (context, state) {
          if (state is Authenticated) {
            final shipper = state.shipper;
            return SingleChildScrollView(
              child: Column(
                children: [
                  // Orange Gradient Header
                  Container(
                    width: double.infinity,
                    decoration: const BoxDecoration(
                      gradient: AppColors.headerGradient,
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: Column(
                        children: [
                          // Top Bar
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            child: Row(
                              children: [
                                Text(
                                  'Hồ sơ của tôi',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                const Spacer(),
                                IconButton(
                                  icon: const Icon(Icons.settings_outlined, color: Colors.white),
                                  onPressed: () => context.push('/settings'),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),
                          // Avatar
                          Stack(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 3),
                                ),
                                child: const CircleAvatar(
                                  radius: 50,
                                  backgroundColor: Colors.white,
                                  child: Icon(Icons.person, size: 50, color: AppColors.primary),
                                ),
                              ),
                              Positioned(
                                bottom: 4,
                                right: 4,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    color: AppColors.success,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white, width: 2),
                                  ),
                                  child: const Icon(Icons.check, size: 14, color: Colors.white),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            shipper.fullName,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            shipper.phone,
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.9),
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],
                      ),
                    ),
                  ),
                  
                  // Content
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Stats Row
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.05),
                                blurRadius: 10,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: _buildStatItem(
                                  icon: Icons.local_shipping,
                                  value: '${shipper.totalDeliveries}',
                                  label: 'Đơn giao',
                                ),
                              ),
                              Container(width: 1, height: 40, color: AppColors.border),
                              Expanded(
                                child: _buildStatItem(
                                  icon: Icons.star,
                                  value: '${shipper.avgRating}',
                                  label: 'Đánh giá',
                                ),
                              ),
                              Container(width: 1, height: 40, color: AppColors.border),
                              Expanded(
                                child: _buildStatItem(
                                  icon: Icons.check_circle,
                                  value: '98%',
                                  label: 'Thành công',
                                ),
                              ),
                            ],
                          ),
                        ),
                        
                        const SizedBox(height: 24),
                        _buildSectionTitle('Phương tiện'),
                        const SizedBox(height: 12),
                        _buildCard([
                          _buildMenuItem(
                            icon: Icons.two_wheeler,
                            title: 'Loại xe',
                            subtitle: shipper.vehicleType,
                            iconColor: AppColors.primary,
                          ),
                          _buildMenuItem(
                            icon: Icons.credit_card,
                            title: 'Biển số',
                            subtitle: shipper.vehiclePlate,
                            iconColor: AppColors.info,
                          ),
                        ]),
                        
                        const SizedBox(height: 24),
                        _buildSectionTitle('Cài đặt'),
                        const SizedBox(height: 12),
                        _buildCard([
                          _buildMenuAction(
                            icon: Icons.notifications_outlined,
                            title: 'Thông báo',
                            iconColor: AppColors.warning,
                            onTap: () {},
                          ),
                          _buildMenuAction(
                            icon: Icons.lock_outline,
                            title: 'Đổi mật khẩu',
                            iconColor: AppColors.info,
                            onTap: () {},
                          ),
                          _buildMenuAction(
                            icon: Icons.help_outline,
                            title: 'Hỗ trợ',
                            iconColor: AppColors.success,
                            onTap: () {},
                          ),
                        ]),
                        
                        const SizedBox(height: 24),
                        // Logout Button
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () {
                              context.read<AuthBloc>().add(LogoutRequested());
                            },
                            icon: const Icon(Icons.logout, color: AppColors.error),
                            label: const Text(
                              'Đăng xuất',
                              style: TextStyle(color: AppColors.error, fontWeight: FontWeight.w600),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: AppColors.error),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 40),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }
          return const Center(child: Text('Chưa đăng nhập'));
        },
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: GoogleFonts.plusJakartaSans(
        fontSize: 16,
        fontWeight: FontWeight.bold,
        color: AppColors.textPrimary,
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String value,
    required String label,
  }) {
    return Column(
      children: [
        Icon(icon, color: AppColors.primary, size: 24),
        const SizedBox(height: 8),
        Text(
          value,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
      ],
    );
  }

  Widget _buildCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color iconColor,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Text(title, style: const TextStyle(fontSize: 14, color: AppColors.textSecondary)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
    );
  }

  Widget _buildMenuAction({
    required IconData icon,
    required String title,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
      trailing: const Icon(Icons.chevron_right, color: AppColors.textSecondary),
      onTap: onTap,
    );
  }
}

