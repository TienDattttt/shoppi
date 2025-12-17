/// App configuration for different environments
class AppConfig {
  /// Set to true to use mock data instead of real API
  /// Useful for UI testing without backend
  static const bool useMockData = false;

  /// API base URL
  /// For Android emulator: use 10.0.2.2 to access host machine's localhost
  /// For iOS simulator: use localhost or 127.0.0.1
  /// For real device: use your machine's IP address (e.g., 192.168.x.x)
  static const String apiBaseUrl = 'http://192.168.1.22:3000/api';

  /// WebSocket URL for real-time updates (Socket.io uses http/https, not ws)
  static const String wsBaseUrl = 'http://192.168.1.22:3000';

  /// Enable debug logging
  static const bool enableLogging = true;

  /// Location update interval in seconds (send to backend)
  /// Requirements: 13.4 - Send GPS location every 30 seconds
  static const int locationUpdateInterval = 30;

  /// Location distance filter in meters (minimum distance to trigger local update)
  /// Lower value = more frequent updates but more battery usage
  static const double locationDistanceFilter = 20;

  // ========================================
  // MAP CONFIGURATION
  // ========================================

  /// Google Maps API Key (for geocoding, distance matrix)
  /// Get from: https://console.cloud.google.com
  static const String googleMapsApiKey =
      'AIzaSyD_6AN4CVrPSkr3iWDVzO-rtuccuq6jgaM';

  /// Mapbox Access Token (for navigation, turn-by-turn directions)
  /// Get from: https://account.mapbox.com
  /// Free tier: 50,000 map loads/month
  static const String mapboxAccessToken =
      'pk.eyJ1IjoidGRhdDIwMTIiLCJhIjoiY21pZzFhNHJyMDJoMjNkb3Npa3cwYWptZSJ9.XaL4Va77DhO5pYGBvk0joQ';

  /// Default map center (Ho Chi Minh City)
  static const double defaultLatitude = 10.8231;
  static const double defaultLongitude = 106.6297;
  static const double defaultZoom = 14.0;
}
