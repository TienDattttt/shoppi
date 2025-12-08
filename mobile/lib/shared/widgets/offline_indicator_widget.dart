import 'package:flutter/material.dart';

class OfflineIndicatorWidget extends StatelessWidget {
  final bool isOffline;

  const OfflineIndicatorWidget({super.key, required this.isOffline});

  @override
  Widget build(BuildContext context) {
    if (!isOffline) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      color: Colors.red,
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: const Text(
        "No Internet Connection",
        style: TextStyle(color: Colors.white, fontSize: 12),
        textAlign: TextAlign.center,
      ),
    );
  }
}
