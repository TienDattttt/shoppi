import 'package:injectable/injectable.dart';
import '../../../../core/network/api_client.dart';
import '../models/dashboard_stats_model.dart';

abstract class DashboardRemoteDataSource {
  Future<DashboardStatsModel> getStats();
}

@LazySingleton(as: DashboardRemoteDataSource)
class DashboardRemoteDataSourceImpl implements DashboardRemoteDataSource {
  final ApiClient _client;

  DashboardRemoteDataSourceImpl(this._client);

  @override
  Future<DashboardStatsModel> getStats() async {
    // Fetch earnings and shipper profile to build dashboard stats
    // Backend endpoints: GET /api/shippers/earnings?period=today, GET /api/shippers/me
    try {
      final earningsResponse = await _client.get('/shippers/earnings', queryParameters: {'period': 'today'});
      final shipperResponse = await _client.get('/shippers/me');
      final activeShipmentsResponse = await _client.get('/shipments/active');
      
      return DashboardStatsModel.fromMultipleSources(
        earnings: earningsResponse,
        shipper: shipperResponse,
        activeShipments: activeShipmentsResponse,
      );
    } catch (e) {
      // Return default stats if API fails
      return const DashboardStatsModel(
        todayEarnings: 0,
        todayTrips: 0,
        currentRating: 0,
        activeShipmentsCount: 0,
      );
    }
  }
}
