import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:signature/signature.dart';
import 'package:mobile/core/constants/app_colors.dart';

class SignaturePadWidget extends StatefulWidget {
  final Function(Uint8List?) onSigned;

  const SignaturePadWidget({super.key, required this.onSigned});

  @override
  State<SignaturePadWidget> createState() => _SignaturePadWidgetState();
}

class _SignaturePadWidgetState extends State<SignaturePadWidget> {
  final SignatureController _controller = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Signature", style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Container(
          height: 200,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey),
            borderRadius: BorderRadius.circular(8),
            color: Colors.white,
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Signature(
              controller: _controller,
              backgroundColor: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            TextButton.icon(
              onPressed: () {
                _controller.clear();
                widget.onSigned(null);
              },
              icon: const Icon(Icons.clear, size: 16),
              label: const Text("Clear"),
              style: TextButton.styleFrom(foregroundColor: AppColors.error),
            ),
            const SizedBox(width: 8),
            TextButton.icon(
              onPressed: () async {
                if (_controller.isNotEmpty) {
                  final data = await _controller.toPngBytes();
                  widget.onSigned(data);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Signature saved!')),
                  );
                }
              },
              icon: const Icon(Icons.check, size: 16),
              label: const Text("Save"),
              style: TextButton.styleFrom(foregroundColor: AppColors.primary),
            ),
          ],
        ),
      ],
    );
  }
}
