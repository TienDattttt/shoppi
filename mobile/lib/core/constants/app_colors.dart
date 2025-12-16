import 'package:flutter/material.dart';

class AppColors {
  // ========================================
  // SHOPEE EXPRESS ORANGE THEME
  // ========================================
  
  // Primary - Shopee Orange
  static const Color primary = Color(0xFFEE4D2D);      // Shopee Orange
  static const Color primaryLight = Color(0xFFFF6742);
  static const Color primaryDark = Color(0xFFD73211);
  static const Color primarySoft = Color(0xFFFFF0ED); // Light orange bg
  
  // Secondary - White/Light
  static const Color secondary = Color(0xFFFFFFFF);
  static const Color secondaryLight = Color(0xFFF5F5F5);
  
  // Accent Colors
  static const Color accent = Color(0xFFFFA726);       // Amber
  static const Color accentGreen = Color(0xFF00BFA5); // Teal for success
  
  // Status Colors
  static const Color success = Color(0xFF00BFA5);      // Teal Green
  static const Color warning = Color(0xFFFFB300);      // Amber
  static const Color error = Color(0xFFE53935);        // Red
  static const Color info = Color(0xFF2196F3);         // Blue
  
  // Shipment Status Colors - Shopee Style
  static const Color statusNew = Color(0xFF9E9E9E);        // Grey
  static const Color statusPending = Color(0xFFFF9800);    // Orange
  static const Color statusAssigned = Color(0xFF2196F3);   // Blue
  static const Color statusPickedUp = Color(0xFF00BCD4);   // Cyan
  static const Color statusInTransit = Color(0xFFEE4D2D);  // Shopee Orange
  static const Color statusDelivering = Color(0xFFEE4D2D); // Shopee Orange
  static const Color statusDelivered = Color(0xFF00BFA5);  // Teal Green
  static const Color statusFailed = Color(0xFFE53935);     // Red
  static const Color statusCancelled = Color(0xFF757575);  // Dark Grey
  static const Color statusReturning = Color(0xFF9C27B0);  // Purple
  static const Color statusReturned = Color(0xFF607D8B);   // Blue Grey
  
  // For ShipmentStatus enum compatibility
  static const Color statusCreated = statusNew;
  
  // Backgrounds
  static const Color background = Color(0xFFF5F5F5);       // Light Grey
  static const Color surface = Color(0xFFFFFFFF);
  static const Color cardBackground = Color(0xFFFFFFFF);
  static const Color scaffoldBackground = Color(0xFFF5F5F5);
  
  // Text
  static const Color textPrimary = Color(0xFF222222);       // Almost Black
  static const Color textSecondary = Color(0xFF757575);     // Grey
  static const Color textHint = Color(0xFFBDBDBD);          // Light Grey
  static const Color textWhite = Color(0xFFFFFFFF);
  static const Color textOnPrimary = Color(0xFFFFFFFF);     // White on orange
  
  // Borders
  static const Color border = Color(0xFFE0E0E0);
  static const Color borderLight = Color(0xFFF0F0F0);
  static const Color divider = Color(0xFFEEEEEE);
  
  // Online/Offline Status
  static const Color online = Color(0xFF00BFA5);           // Teal
  static const Color offline = Color(0xFF9E9E9E);          // Grey
  static const Color busy = Color(0xFFFF9800);             // Orange
  
  // ========================================
  // GRADIENTS - Shopee Style
  // ========================================
  
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFEE4D2D), Color(0xFFFF6742)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient headerGradient = LinearGradient(
    colors: [Color(0xFFEE4D2D), Color(0xFFD73211)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
  
  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFFFFFFFF), Color(0xFFFAFAFA)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
  
  static const LinearGradient orangeGradient = LinearGradient(
    colors: [Color(0xFFFF6B3D), Color(0xFFEE4D2D)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

