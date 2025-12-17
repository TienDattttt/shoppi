import 'dart:io';
import 'dart:typed_data';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import '../../../../core/network/api_client.dart';
import '../../../../injection.dart';
import '../../domain/entities/shipment_entity.dart';
import '../../domain/repositories/shipment_repository.dart';
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
  final ShipmentRepository _shipmentRepository;

  ShipmentDetailCubit(
    this._markPickedUpUseCase,
    this._markDeliveredUseCase,
    this._markFailedUseCase,
    this._shipmentRepository,
  ) : super(ShipmentDetailInitial());
  
  // Get ApiClient from getIt (lazy initialization)
  ApiClient get _apiClient => getIt<ApiClient>();

  Future<void> pickUpShipment(String id) async {
    emit(ShipmentDetailLoading());
    final result = await _markPickedUpUseCase(id);
    result.fold(
      (failure) => emit(ShipmentDetailError(failure.message)),
      (shipment) => emit(ShipmentDetailUpdated(shipment)),
    );
  }

  /// Confirm delivery with multiple photos (1-3)
  /// Requirements: 7.1 - At least 1 photo required
  /// Requirements: 6.2 - COD collection confirmation required for COD orders
  Future<void> confirmDelivery(
    String shipmentId, {
    required List<File> imageFiles,
    Uint8List? signature,
    required bool codCollected,
  }) async {
    emit(ShipmentDetailLoading());
    
    try {
      // Upload all photos to Supabase Storage
      final List<String> photoUrls = [];
      
      for (int i = 0; i < imageFiles.length; i++) {
        final file = imageFiles[i];
        final bytes = await file.readAsBytes();
        
        // Upload via backend API
        final response = await _apiClient.uploadFile(
          '/shipper/upload/photo',
          bytes,
          filename: 'delivery_${i + 1}_${DateTime.now().millisecondsSinceEpoch}.jpg',
          fieldName: 'photo',
          additionalFields: {
            'shipmentId': shipmentId,
            'type': 'delivery',
          },
        );
        
        if (response is Map<String, dynamic>) {
          final url = response['url'] ?? response['data']?['url'];
          if (url != null) {
            photoUrls.add(url);
          }
        }
      }
      
      if (photoUrls.isEmpty) {
        emit(const ShipmentDetailError('Không thể upload ảnh. Vui lòng thử lại.'));
        return;
      }
      
      // Upload signature if provided
      String? signatureUrl;
      if (signature != null) {
        final signatureResponse = await _apiClient.uploadFile(
          '/shipper/upload/photo',
          signature,
          filename: 'signature_${DateTime.now().millisecondsSinceEpoch}.png',
          fieldName: 'photo',
          additionalFields: {
            'shipmentId': shipmentId,
            'type': 'signature',
          },
        );
        
        if (signatureResponse is Map<String, dynamic>) {
          signatureUrl = signatureResponse['url'] ?? signatureResponse['data']?['url'];
        }
      }
      
      // Mark as delivered with photo URLs
      final result = await _markDeliveredUseCase(MarkDeliveredParams(
        id: shipmentId,
        photoUrls: photoUrls,
        signatureUrl: signatureUrl,
        codCollected: codCollected,
      ));
      
      result.fold(
        (failure) => emit(ShipmentDetailError(failure.message)),
        (shipment) => emit(ShipmentDetailUpdated(shipment)),
      );
    } catch (e) {
      emit(ShipmentDetailError('Lỗi xác nhận giao hàng: ${e.toString()}'));
    }
  }

  Future<void> deliverShipment(String id, List<String> photoUrls, String? signaturePath) async {
    emit(ShipmentDetailLoading());
    final result = await _markDeliveredUseCase(MarkDeliveredParams(
      id: id,
      photoUrls: photoUrls,
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

  /// Scan barcode to pickup shipment
  /// Validates tracking number and marks as picked_up
  Future<void> scanPickup(String trackingNumber) async {
    emit(ShipmentDetailLoading());
    final result = await _shipmentRepository.scanPickup(trackingNumber);
    result.fold(
      (failure) {
        print('[ShipmentDetailCubit] scanPickup failed: ${failure.message}');
        emit(ShipmentDetailError(failure.message));
      },
      (shipment) {
        print('[ShipmentDetailCubit] scanPickup success: status=${shipment.status}');
        emit(ShipmentDetailUpdated(shipment));
      },
    );
  }
}
