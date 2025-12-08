import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/constants/app_colors.dart';
import 'package:mobile/shared/widgets/app_button.dart';

class PendingApprovalPage extends StatelessWidget {
  const PendingApprovalPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.hourglass_empty, size: 80, color: Colors.orange),
            const SizedBox(height: 24),
            const Text(
              "Account Pending Approval",
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            const Text(
              "Your registration has been received. Our team will verify your documents within 24-48 hours.",
              style: TextStyle(fontSize: 16, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            Card(
              child: ListTile(
                leading: const Icon(Icons.support_agent, color: AppColors.primary),
                title: const Text("Need Help?"),
                subtitle: const Text("Contact Support"),
                onTap: () {
                  // Open help
                },
              ),
            ),
            const SizedBox(height: 32),
            AppButton(
              text: "Check Status",
              onPressed: () {
                // Mock check logic
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Still pending..."))
                );
              },
              type: AppButtonType.outline,
            ),
             const SizedBox(height: 16),
            TextButton(
              onPressed: () => context.go('/login'),
              child: const Text("Back to Login"),
            ),
          ],
        ),
      ),
    );
  }
}
