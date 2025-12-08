import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import '../../domain/entities/shipment_entity.dart';
import '../../domain/usecases/mark_delivered_usecase.dart';
import '../../domain/usecases/mark_failed_usecase.dart';
import '../../domain/usecases/mark_picked_up_usecase.dart';

// State
abstract class ShipmentDetailState extends Equatable {
  const ShipmentDetailState();
  @override
  List<Object?> get props => [];
}

class ShipmentDetailInitial extends ShipmentDetailState {}
class ShipmentDetailLoading extends ShipmentDetailState {}
class ShipmentDetailUpdated extends ShipmentDetailState {
  final ShipmentEntity shipment;
  const ShipmentDetailUpdated(this.shipment);
  @override
  List<Object?> get props => [shipment];
}
class ShipmentDetailError extends ShipmentDetailState {
  final String message;
  const ShipmentDetailError(this.message);
  @override
  List<Object?> get props => [message];
}

// Cubit
@injectable
class ShipmentDetailCubit extends Cubit<ShipmentDetailState> {
  final MarkPickedUpUseCase _markPickedUpUseCase;
  final MarkDeliveredUseCase _markDeliveredUseCase;
  final MarkFailedUseCase _markFailedUseCase;

  ShipmentDetailCubit(
    this._markPickedUpUseCase,
    this._markDeliveredUseCase,
    this._markFailedUseCase,
  ) : super(ShipmentDetailInitial());

  // Usually we'd start with getting details, but here we assumme shipment is passed in or fetched via separate usecase.
  // For simplicity, we just handle actions here.

  Future<void> pickUpShipment(String id) async {
    emit(ShipmentDetailLoading());
    final result = await _markPickedUpUseCase(id);
    result.fold(
      (failure) => emit(ShipmentDetailError(failure.message)),
      (shipment) => emit(ShipmentDetailUpdated(shipment)),
    );
  }

  Future<void> deliverShipment(String id, String photoPath, String? signaturePath) async {
    emit(ShipmentDetailLoading());
    final result = await _markDeliveredUseCase(MarkDeliveredParams(
      id: id,
      photoUrl: photoPath,
      signatureUrl: signaturePath,
    ));
    result.fold(
      (failure) => emit(ShipmentDetailError(failure.message)),
      (shipment) => emit(ShipmentDetailUpdated(shipment)),
    );
  }

  Future<void> markFailed(String id, String reason) async {
    emit(ShipmentDetailLoading());
    final result = await _markFailedUseCase(MarkFailedParams(id: id, reason: reason));
    result.fold(
      (failure) => emit(ShipmentDetailError(failure.message)),
      (shipment) => emit(ShipmentDetailUpdated(shipment)),
    );
  }
}
