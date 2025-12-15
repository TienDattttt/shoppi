import 'package:flutter/material.dart';
import '../../../../../l10n/app_localizations.dart';
import '../../../../../shared/widgets/app_text_field.dart';
import '../../../../../shared/widgets/app_button.dart';

class VehicleInfoStep extends StatefulWidget {
  final Function(String vehicleType, String licensePlate, String vehicleBrand, String vehicleModel) onVehicleInfoChanged;
  final VoidCallback onNext;
  final VoidCallback onPrevious;
  final String? initialVehicleType;
  final String? initialLicensePlate;
  final String? initialVehicleBrand;
  final String? initialVehicleModel;

  const VehicleInfoStep({
    super.key,
    required this.onVehicleInfoChanged,
    required this.onNext,
    required this.onPrevious,
    this.initialVehicleType,
    this.initialLicensePlate,
    this.initialVehicleBrand,
    this.initialVehicleModel,
  });

  @override
  State<VehicleInfoStep> createState() => _VehicleInfoStepState();
}

class _VehicleInfoStepState extends State<VehicleInfoStep> {
  final _formKey = GlobalKey<FormState>();
  late String _vehicleType;
  late final TextEditingController _plateController;
  late final TextEditingController _brandController;
  late final TextEditingController _modelController;

  @override
  void initState() {
    super.initState();
    // Handle both null and empty string
    _vehicleType = (widget.initialVehicleType != null && widget.initialVehicleType!.isNotEmpty) 
        ? widget.initialVehicleType! 
        : 'motorbike';
    _plateController = TextEditingController(text: widget.initialLicensePlate ?? '');
    _brandController = TextEditingController(text: widget.initialVehicleBrand ?? '');
    _modelController = TextEditingController(text: widget.initialVehicleModel ?? '');
  }

  @override
  void dispose() {
    _plateController.dispose();
    _brandController.dispose();
    _modelController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.vehicleInfo,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    // Vehicle Type Dropdown
                    Text(
                      l10n.vehicleType,
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _vehicleType,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                      items: [
                        DropdownMenuItem(value: 'motorbike', child: Text(l10n.motorcycle)),
                        DropdownMenuItem(value: 'car', child: Text(l10n.car)),
                        DropdownMenuItem(value: 'bicycle', child: Text('Xe đạp')),
                        DropdownMenuItem(value: 'truck', child: Text(l10n.truck)),
                      ],
                      onChanged: (v) {
                        setState(() => _vehicleType = v!);
                        _notifyChanges();
                      },
                    ),
                    const SizedBox(height: 16),
                    
                    // License Plate
                    AppTextField(
                      label: l10n.licensePlate,
                      controller: _plateController,
                      hint: '29A1-123.45',
                      prefixIcon: Icons.confirmation_number,
                      validator: (v) {
                        if (v == null || v.isEmpty) {
                          return 'Vui lòng nhập biển số xe';
                        }
                        return null;
                      },
                      onChanged: (_) => _notifyChanges(),
                    ),
                    const SizedBox(height: 16),
                    
                    // Vehicle Brand
                    AppTextField(
                      label: l10n.vehicleBrand,
                      controller: _brandController,
                      hint: 'Honda, Yamaha...',
                      prefixIcon: Icons.business,
                      validator: (v) {
                        if (v == null || v.isEmpty) {
                          return 'Vui lòng nhập hãng xe';
                        }
                        return null;
                      },
                      onChanged: (_) => _notifyChanges(),
                    ),
                    const SizedBox(height: 16),
                    
                    // Vehicle Model
                    AppTextField(
                      label: l10n.vehicleModel,
                      controller: _modelController,
                      hint: 'Wave Alpha, Airblade...',
                      prefixIcon: Icons.two_wheeler,
                      validator: (v) {
                        if (v == null || v.isEmpty) {
                          return 'Vui lòng nhập dòng xe';
                        }
                        return null;
                      },
                      onChanged: (_) => _notifyChanges(),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Navigation Buttons
            Row(
              children: [
                Expanded(
                  child: AppButton(
                    text: l10n.previous,
                    onPressed: widget.onPrevious,
                    type: AppButtonType.outline,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: AppButton(
                    text: l10n.next,
                    onPressed: _onNext,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _notifyChanges() {
    widget.onVehicleInfoChanged(
      _vehicleType,
      _plateController.text,
      _brandController.text,
      _modelController.text,
    );
  }

  void _onNext() {
    if (_formKey.currentState?.validate() ?? false) {
      _notifyChanges();
      widget.onNext();
    }
  }
}
