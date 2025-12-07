import 'package:flutter/material.dart';

class AppColors {
  // Primary - Orange (SPX style)
  static const Color primary = Color(0xFFFF6B00);
  static const Color primaryLight = Color(0xFFFF8A3D);
  static const Color primaryDark = Color(0xFFE55A00);
  
  // Secondary - Blue
  static const Color secondary = Color(0xFF2196F3);
  static const Color secondaryLight = Color(0xFF64B5F6);
  
  // Status Colors
  static const Color success = Color(0xFF4CAF50);
  static const Color warning = Color(0xFFFFC107);
  static const Color error = Color(0xFFF44336);
  static const Color info = Color(0xFF2196F3);
  
  // Shipment Status Colors
  static const Color statusCreated = Color(0xFF9E9E9E);
  static const Color statusAssigned = Color(0xFF2196F3);
  static const Color statusPickedUp = Color(0xFFFF9800);
  static const Color statusDelivering = Color(0xFF9C27B0);
  static const Color statusDelivered = Color(0xFF4CAF50);
  static const Color statusFailed = Color(0xFFF44336);
  
  // Background
  static const Color background = Color(0xFFF5F5F5);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color cardBackground = Color(0xFFFFFFFF);
  
  // Text
  static const Color textPrimary = Color(0xFF212121);
  static const Color textSecondary = Color(0xFF757575);
  static const Color textHint = Color(0xFFBDBDBD);
  static const Color textWhite = Color(0xFFFFFFFF);
  
  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFFF6B00), Color(0xFFFF8A3D)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient headerGradient = LinearGradient(
    colors: [Color(0xFFFF6B00), Color(0xFFFF5722)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
