import 'dart:io';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';
import 'package:image_picker/image_picker.dart';
import '../config/app_config.dart';

/// Photo upload service for delivery proof
/// Requirements: 13.6 - Capture photo, upload to Supabase Storage, attach URL to status update
abstract class PhotoUploadService {
  /// Capture photo from camera
  Future<File?> capturePhoto();
  
  /// Pick photo from gallery
  Future<File?> pickFromGallery();
  
  /// Upload photo to storage and return URL
  /// [file] - Photo file to upload
  /// [shipmentId] - Shipment ID for organizing storage
  /// [type] - Type of photo ('delivery', 'signature', 'pickup')
  Future<String> uploadPhoto(File file, String shipmentId, {String type = 'delivery'});
  
  /// Capture and upload photo in one step
  Future<String?> captureAndUpload(String shipmentId, {String type = 'delivery'});
}

@LazySingleton(as: PhotoUploadService)
class PhotoUploadServiceImpl implements PhotoUploadService {
  final Dio _dio;
  final ImagePicker _imagePicker = ImagePicker();

  PhotoUploadServiceImpl(this._dio);

  @override
  Future<File?> capturePhoto() async {
    try {
      final XFile? photo = await _imagePicker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );
      
      if (photo == null) return null;
      return File(photo.path);
    } catch (e) {
      return null;
    }
  }

  @override
  Future<File?> pickFromGallery() async {
    try {
      final XFile? photo = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );
      
      if (photo == null) return null;
      return File(photo.path);
    } catch (e) {
      return null;
    }
  }

  @override
  Future<String> uploadPhoto(File file, String shipmentId, {String type = 'delivery'}) async {
    // Mock mode for UI testing
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: 500));
      return 'https://example.com/mock-photo-${DateTime.now().millisecondsSinceEpoch}.jpg';
    }

    try {
      final filename = '${type}_${DateTime.now().millisecondsSinceEpoch}.jpg';
      
      // Create multipart form data
      final formData = FormData.fromMap({
        'photo': await MultipartFile.fromFile(
          file.path,
          filename: filename,
        ),
        'shipmentId': shipmentId,
        'type': type,
      });
      
      // Upload to backend which handles Supabase Storage
      // Backend endpoint: POST /api/shipper/upload/photo
      final response = await _dio.post(
        '${AppConfig.apiBaseUrl}/shipper/upload/photo',
        data: formData,
        options: Options(
          contentType: 'multipart/form-data',
        ),
      );
      
      // Response format: { success: true, data: { url: string } }
      final data = response.data;
      if (data is Map<String, dynamic>) {
        final responseData = data['data'] ?? data;
        if (responseData is Map<String, dynamic> && responseData.containsKey('url')) {
          return responseData['url'] as String;
        }
      }
      
      throw Exception('Invalid upload response');
    } on DioException catch (e) {
      final message = e.response?.data?['message'] ?? e.message ?? 'Upload failed';
      throw Exception('Failed to upload photo: $message');
    } catch (e) {
      throw Exception('Failed to upload photo: $e');
    }
  }

  @override
  Future<String?> captureAndUpload(String shipmentId, {String type = 'delivery'}) async {
    final file = await capturePhoto();
    if (file == null) return null;
    
    return uploadPhoto(file, shipmentId, type: type);
  }
}
