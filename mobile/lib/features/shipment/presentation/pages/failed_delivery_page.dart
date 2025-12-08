import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
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
    "Customer not available",
    "Wrong address",
    "Customer refused delivery",
    "Package damaged",
    "Other"
  ];
  String? _selectedReason;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Report Failed Delivery"),
        backgroundColor: AppColors.error,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              "Select Reason",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ..._commonReasons.map((reason) => RadioListTile<String>(
              title: Text(reason),
              value: reason,
              groupValue: _selectedReason,
              onChanged: (value) {
                setState(() {
                  _selectedReason = value;
                  if (value != "Other") {
                    _reasonController.text = value!;
                  } else {
                    _reasonController.clear();
                  }
                });
              },
            )),
            if (_selectedReason == "Other")
              TextField(
                controller: _reasonController,
                decoration: const InputDecoration(
                  labelText: "Specify reason",
                  border: OutlineInputBorder(),
                ),
              ),
            const Spacer(),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: () {
                if (_reasonController.text.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Please provide a reason")),
                  );
                  return;
                }
                context.read<ShipmentDetailCubit>().markFailed(
                  widget.shipmentId,
                  _reasonController.text,
                );
                context.pop();
              },
              child: const Text("Submit Failure Report"),
            ),
          ],
        ),
      ),
    );
  }
}
