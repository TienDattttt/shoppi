import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_colors.dart';

class SuccessAnimationWidget extends StatefulWidget {
  final VoidCallback? onCompleted;
  final String message;

  const SuccessAnimationWidget({
    super.key, 
    this.onCompleted, 
    this.message = "Success!"
  });

  @override
  State<SuccessAnimationWidget> createState() => _SuccessAnimationWidgetState();
}

class _SuccessAnimationWidgetState extends State<SuccessAnimationWidget> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _checkAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000), // Total duration
    );

    _scaleAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.5, curve: Curves.elasticOut)),
    );

    _checkAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.5, 1.0, curve: Curves.easeOut)),
    );

    _controller.forward().then((_) {
      if (widget.onCompleted != null) {
        Future.delayed(const Duration(milliseconds: 500), widget.onCompleted);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ScaleTransition(
            scale: _scaleAnimation,
            child: Container(
              width: 100,
              height: 100,
              decoration: const BoxDecoration(
                color: AppColors.success,
                shape: BoxShape.circle,
              ),
              child: AnimatedBuilder(
                animation: _checkAnimation,
                builder: (context, child) {
                  return Stack(
                    alignment: Alignment.center,
                    children: [
                      // Draw checkmark path partially key? Or simplified icon reveal
                       Icon(
                          Icons.check,
                          color: Colors.white,
                          size: 60 * _checkAnimation.value,
                        ),
                    ],
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 24),
          FadeTransition(
            opacity: _checkAnimation,
            child: Text(
              widget.message, 
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.success)
            ),
          ),
        ],
      ),
    );
  }
}
