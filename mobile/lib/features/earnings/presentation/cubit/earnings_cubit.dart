import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import '../../domain/entities/earnings_entity.dart';
import '../../domain/usecases/get_earnings_stats_usecase.dart';

// State
abstract class EarningsState extends Equatable {
  const EarningsState();
  @override
  List<Object> get props => [];
}

class EarningsInitial extends EarningsState {}
class EarningsLoading extends EarningsState {}
class EarningsLoaded extends EarningsState {
  final EarningsEntity earnings;
  final String period;
  const EarningsLoaded(this.earnings, this.period);
  @override
  List<Object> get props => [earnings, period];
}
class EarningsError extends EarningsState {
  final String message;
  const EarningsError(this.message);
  @override
  List<Object> get props => [message];
}

// Cubit
@injectable
class EarningsCubit extends Cubit<EarningsState> {
  final GetEarningsStatsUseCase _getEarningsStatsUseCase;

  EarningsCubit(this._getEarningsStatsUseCase) : super(EarningsInitial());

  Future<void> fetchEarnings({String period = 'weekly'}) async {
    emit(EarningsLoading());
    final result = await _getEarningsStatsUseCase(period);
    result.fold(
      (failure) => emit(EarningsError(failure.message)),
      (earnings) => emit(EarningsLoaded(earnings, period)),
    );
  }
}
