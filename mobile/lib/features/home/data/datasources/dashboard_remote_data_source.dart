import 'package:injectable/injectable.dart';
import '../../../../core/network/api_client.dart';
import 'dashboard_stats_model.dart';

abstract class DashboardRemoteDataSource {
  Future<DashboardStatsModel> getStats();
}

@LazySingleton(as: DashboardRemoteDataSource)
class DashboardRemoteDataSourceImpl implements DashboardRemoteDataSource {
  final ApiClient _client;

  DashboardRemoteDataSourceImpl(this._client);

  @override
  Future<DashboardStatsModel> getStats() async {
    final response = await _client.get('/shipper/dashboard/stats');
    return DashboardStatsModel.fromJson(response);
  }
}
