/// App configuration for different environments
class AppConfig {
  /// Set to true to use mock data instead of real API
  /// Useful for UI testing without backend
  static const bool useMockData = true;
  
  /// API base URL
  static const String apiBaseUrl = 'https://api.shoppi.app/v1';
  
  /// Enable debug logging
  static const bool enableLogging = true;
}
