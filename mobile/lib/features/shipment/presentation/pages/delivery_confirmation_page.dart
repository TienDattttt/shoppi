import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
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
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Photo proof is required")));
      return;
    }
    // Signature can be optional or required depending on logic. Assuming optional for now if not strictly enforced.
    
    // Trigger BloC event
    // context.read<ShipmentDetailCubit>().confirmDelivery(widget.shipmentId, _imageFile!.path, _signature);
    // For now mocking success or using the cubit if available.
    // If not available, we can mock:
    
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
      appBar: AppBar(
        title: const Text("Confirm Delivery"),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text("1. Take a Photo of Package", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: _pickImage,
              child: Container(
                height: 200,
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey),
                ),
                child: _imageFile != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(_imageFile!, fit: BoxFit.cover),
                      )
                    : const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.camera_alt, size: 40, color: Colors.grey),
                          Text("Tap to take photo"),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 24),
            const Text("2. Customer Signature (Optional)", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Container(
              height: 200,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey),
                borderRadius: BorderRadius.circular(12),
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
              text: "Confirm Delivery",
              onPressed: _onConfirm,
              isExpanded: true,
            ),
          ],
        ),
      ),
    );
  }
}
