import 'package:injectable/injectable.dart';
import '../../../../core/network/api_client.dart';
import '../models/earnings_model.dart';

abstract class EarningsRemoteDataSource {
  Future<EarningsModel> getEarnings(String period);
}

@LazySingleton(as: EarningsRemoteDataSource)
class EarningsRemoteDataSourceImpl implements EarningsRemoteDataSource {
  final ApiClient _client;

  EarningsRemoteDataSourceImpl(this._client);

  @override
  Future<EarningsModel> getEarnings(String period) async {
    final response = await _client.get('/shippers/earnings', queryParameters: {'period': period});
    return EarningsModel.fromJson(response);
  }
}
