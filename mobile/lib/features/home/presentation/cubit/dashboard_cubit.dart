import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/dashboard_stats.dart';
import '../../domain/usecases/get_dashboard_stats_usecase.dart';

// State
abstract class DashboardState extends Equatable {
  const DashboardState();
  @override
  List<Object> get props => [];
}

class DashboardInitial extends DashboardState {}
class DashboardLoading extends DashboardState {}
class DashboardLoaded extends DashboardState {
  final DashboardStatsEntity stats;
  const DashboardLoaded(this.stats);
  @override
  List<Object> get props => [stats];
}
class DashboardError extends DashboardState {
  final String message;
  const DashboardError(this.message);
  @override
  List<Object> get props => [message];
}

// Cubit
@injectable
class DashboardCubit extends Cubit<DashboardState> {
  final GetDashboardStatsUseCase _getDashboardStatsUseCase;

  DashboardCubit(this._getDashboardStatsUseCase) : super(DashboardInitial());

  Future<void> fetchStats() async {
    emit(DashboardLoading());
    final result = await _getDashboardStatsUseCase(NoParams());
    result.fold(
      (failure) => emit(DashboardError(failure.message)),
      (stats) => emit(DashboardLoaded(stats)),
    );
  }
}
