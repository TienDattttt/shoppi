import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/signature_pad_widget.dart';
import '../../../../shared/widgets/success_animation_widget.dart';

class DeliveryConfirmationPage extends StatefulWidget {
  final String shipmentId;

  const DeliveryConfirmationPage({super.key, required this.shipmentId});

  @override
  State<DeliveryConfirmationPage> createState() => _DeliveryConfirmationPageState();
}

class _DeliveryConfirmationPageState extends State<DeliveryConfirmationPage> {
  File? _imageFile;
  Uint8List? _signature;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.camera, imageQuality: 50);

    if (pickedFile != null) {
      setState(() {
        _imageFile = File(pickedFile.path);
      });
    }
  }

  void _onConfirm() {
    if (_imageFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng chụp ảnh xác nhận'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }
    
    showDialog(
       context: context,
       barrierDismissible: false,
       builder: (context) => Dialog(
         backgroundColor: Colors.transparent,
         elevation: 0,
         child: SuccessAnimationWidget(
           onCompleted: () {
             Navigator.of(context).pop(); 
             context.go('/home');
           },
         ),
       ),
     );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Orange Header
          Container(
            decoration: const BoxDecoration(
              gradient: AppColors.headerGradient,
            ),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                    Expanded(
                      child: Text(
                        'Xác nhận giao hàng',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(width: 48),
                  ],
                ),
              ),
            ),
          ),
          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    '1. Chụp ảnh gói hàng',
                    style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: _pickImage,
                    child: Container(
                      height: 200,
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: _imageFile != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: Image.file(_imageFile!, fit: BoxFit.cover),
                            )
                          : Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.camera_alt, size: 48, color: AppColors.primary),
                                const SizedBox(height: 8),
                                Text('Nhấn để chụp ảnh', style: TextStyle(color: AppColors.textSecondary)),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    '2. Chữ ký khách hàng (Tùy chọn)',
                    style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    height: 200,
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.border),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: SignaturePadWidget(
                      onSigned: (signature) {
                        setState(() {
                          _signature = signature;
                        });
                      },
                    ),
                  ),
                  const SizedBox(height: 32),
                  AppButton(
                    text: 'Xác nhận giao hàng',
                    onPressed: _onConfirm,
                    isExpanded: true,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

