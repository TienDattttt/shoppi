import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/constants/app_colors.dart';
import '../cubit/shipment_detail_cubit.dart';

class FailedDeliveryPage extends StatefulWidget {
  final String shipmentId;

  const FailedDeliveryPage({super.key, required this.shipmentId});

  @override
  State<FailedDeliveryPage> createState() => _FailedDeliveryPageState();
}

class _FailedDeliveryPageState extends State<FailedDeliveryPage> {
  final _reasonController = TextEditingController();
  final List<String> _commonReasons = [
    'Khách hàng không có mặt',
    'Sai địa chỉ',
    'Khách hàng từ chối nhận',
    'Gói hàng bị hư hỏng',
    'Lý do khác'
  ];
  String? _selectedReason;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Red Header for failed
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.error, AppColors.error.withValues(alpha: 0.8)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
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
                        'Báo cáo giao hàng thất bại',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 18,
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
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Chọn lý do',
                            style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 16),
                          ..._commonReasons.map((reason) => Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            decoration: BoxDecoration(
                              color: _selectedReason == reason ? AppColors.primarySoft : Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _selectedReason == reason ? AppColors.primary : AppColors.border,
                              ),
                            ),
                            child: RadioListTile<String>(
                              title: Text(reason),
                              value: reason,
                              groupValue: _selectedReason,
                              activeColor: AppColors.primary,
                              onChanged: (value) {
                                setState(() {
                                  _selectedReason = value;
                                  if (value != 'Lý do khác') {
                                    _reasonController.text = value!;
                                  } else {
                                    _reasonController.clear();
                                  }
                                });
                              },
                            ),
                          )),
                          if (_selectedReason == 'Lý do khác')
                            TextField(
                              controller: _reasonController,
                              decoration: InputDecoration(
                                labelText: 'Nhập lý do cụ thể',
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.error,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () {
                      if (_reasonController.text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Vui lòng chọn hoặc nhập lý do'),
                            backgroundColor: AppColors.warning,
                          ),
                        );
                        return;
                      }
                      context.read<ShipmentDetailCubit>().markFailed(
                        widget.shipmentId,
                        _reasonController.text,
                      );
                      context.pop();
                    },
                    child: Text(
                      'Gửi báo cáo',
                      style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
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

