import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../cubit/theme_cubit.dart';
import '../cubit/locale_cubit.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Cài đặt"),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Theme Setting
            ListTile(
              leading: const Icon(Icons.dark_mode),
              title: const Text("Chế độ tối"),
              trailing: BlocBuilder<ThemeCubit, ThemeState>(
                builder: (context, state) {
                  return Switch(
                    value: state is DarkTheme,
                    onChanged: (value) {
                      context.read<ThemeCubit>().toggleTheme();
                    },
                    activeTrackColor: AppColors.primary,
                  );
                },
              ),
            ),
            const Divider(),
            
            // Language Setting
            BlocBuilder<LocaleCubit, LocaleState>(
              builder: (context, state) {
                return ListTile(
                  leading: const Icon(Icons.language),
                  title: const Text("Ngôn ngữ"),
                  subtitle: Text(
                    state is VietnameseLocale ? 'Tiếng Việt' : 'English',
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                  onTap: () {
                    _showLanguageDialog(context);
                  },
                );
              },
            ),
            const Divider(),
            
            // Version Info
            const ListTile(
              leading: Icon(Icons.info_outline),
              title: Text("Phiên bản"),
              subtitle: Text("1.0.0"),
            ),
          ],
        ),
      ),
    );
  }

  void _showLanguageDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Chọn ngôn ngữ'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Tiếng Việt'),
              leading: const Text('🇻🇳', style: TextStyle(fontSize: 24)),
              onTap: () {
                context.read<LocaleCubit>().setVietnamese();
                Navigator.pop(context);
              },
            ),
            ListTile(
              title: const Text('English'),
              leading: const Text('🇺🇸', style: TextStyle(fontSize: 24)),
              onTap: () {
                context.read<LocaleCubit>().setEnglish();
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }
}
