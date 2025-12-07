import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/shipment_entity.dart';
import '../../domain/usecases/get_active_shipments_usecase.dart';

// State
abstract class ShipmentListState extends Equatable {
  const ShipmentListState();
  @override
  List<Object> get props => [];
}

class ShipmentListInitial extends ShipmentListState {}
class ShipmentListLoading extends ShipmentListState {}
class ShipmentListLoaded extends ShipmentListState {
  final List<ShipmentEntity> shipments;
  const ShipmentListLoaded(this.shipments);
  @override
  List<Object> get props => [shipments];
}
class ShipmentListError extends ShipmentListState {
  final String message;
  const ShipmentListError(this.message);
  @override
  List<Object> get props => [message];
}

// Cubit
@injectable
class ShipmentListCubit extends Cubit<ShipmentListState> {
  final GetActiveShipmentsUseCase _getActiveShipmentsUseCase;

  ShipmentListCubit(this._getActiveShipmentsUseCase) : super(ShipmentListInitial());

  Future<void> fetchShipments() async {
    emit(ShipmentListLoading());
    final result = await _getActiveShipmentsUseCase(NoParams());
    result.fold(
      (failure) => emit(ShipmentListError(failure.message)),
      (shipments) => emit(ShipmentListLoaded(shipments)),
    );
  }
}
