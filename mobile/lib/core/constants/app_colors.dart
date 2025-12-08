import 'package:flutter/material.dart';

class AppColors {
  // Primary - Deep Purple/Blue (Premium Modern Look)
  static const Color primary = Color(0xFF4838D1); // Deep Indigo
  static const Color primaryLight = Color(0xFF7367F0);
  static const Color primaryDark = Color(0xFF342899);
  
  // Secondary - Accent Yellow/Amber
  static const Color secondary = Color(0xFFFFC107);
  static const Color secondaryLight = Color(0xFFFFD54F);
  
  // Status Colors
  static const Color success = Color(0xFF2ECC71);
  static const Color warning = Color(0xFFF1C40F);
  static const Color error = Color(0xFFE74C3C);
  static const Color info = Color(0xFF3498DB);
  
  // Shipment Status Colors
  static const Color statusNew = Color(0xFF95A5A6); // Grey
  static const Color statusPending = Color(0xFFF39C12); // Orange
  static const Color statusInTransit = Color(0xFF3498DB); // Blue
  static const Color statusDelivered = Color(0xFF27AE60); // Green
  static const Color statusCancelled = Color(0xFFC0392B); // Red
  
  // Shipment Status Colors (for ShipmentStatus enum)
  static const Color statusCreated = Color(0xFF95A5A6); // Grey
  static const Color statusAssigned = Color(0xFF3498DB); // Blue
  static const Color statusPickedUp = Color(0xFFF39C12); // Orange
  static const Color statusDelivering = Color(0xFF9B59B6); // Purple
  static const Color statusFailed = Color(0xFFE74C3C); // Red
  
  // Backgrounds
  static const Color background = Color(0xFFF8F9FA); // Very light grey/white
  static const Color surface = Color(0xFFFFFFFF);
  static const Color cardBackground = Color(0xFFFFFFFF);
  
  // Text
  static const Color textPrimary = Color(0xFF2D3436); // Almost Black
  static const Color textSecondary = Color(0xFF636E72); // Grey
  static const Color textHint = Color(0xFFAAB7B8);
  static const Color textWhite = Color(0xFFFFFFFF);

  // Borders
  static const Color border = Color(0xFFE0E0E0);
  
  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF4838D1), Color(0xFF7367F0)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFFFFFFFF), Color(0xFFF8F9FA)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
