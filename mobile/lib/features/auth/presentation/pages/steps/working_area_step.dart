import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../l10n/app_localizations.dart';
import '../../../../../shared/widgets/app_button.dart';

class WorkingAreaStep extends StatefulWidget {
  final List<dynamic> provinces;
  final List<dynamic> wards;
  final List<dynamic> postOffices;
  final Function(String? provinceCode) onProvinceChanged;
  final Function(String? wardCode) onWardChanged;
  
  final Function(
    String city, 
    List<String> districts, 
    int maxDistance,
    String? postOfficeId,
    String? provinceCode,
    String? wardCode,
  ) onWorkingAreaChanged;
  
  final VoidCallback onSubmit;
  final VoidCallback onPrevious;
  final String? initialCity;
  final List<String>? initialDistricts;
  final int? initialMaxDistance;
  final String? initialPostOfficeId;
  final String? initialProvinceCode;
  final String? initialWardCode;
  final bool isLoadingProvinces;
  final bool isLoadingWards;
  final bool isLoadingPostOffices;
  final VoidCallback? onRetryProvinces;

  const WorkingAreaStep({
    super.key,
    required this.provinces,
    required this.wards,
    required this.postOffices,
    required this.onProvinceChanged,
    required this.onWardChanged,
    required this.onWorkingAreaChanged,
    required this.onSubmit,
    required this.onPrevious,
    this.initialCity,
    this.initialDistricts,
    this.initialMaxDistance,
    this.initialPostOfficeId,
    this.initialProvinceCode,
    this.initialWardCode,
    this.onRetryProvinces,
    this.isLoadingProvinces = false,
    this.isLoadingWards = false,
    this.isLoadingPostOffices = false,
  });

  @override
  State<WorkingAreaStep> createState() => _WorkingAreaStepState();
}

class _WorkingAreaStepState extends State<WorkingAreaStep> {
  String? _selectedProvinceCode;
  String? _selectedWardCode;
  String? _selectedPostOfficeId;
  double _maxDistance = 10;
  
  @override
  void initState() {
    super.initState();
    _selectedProvinceCode = widget.initialProvinceCode;
    _selectedWardCode = widget.initialWardCode;
    _selectedPostOfficeId = widget.initialPostOfficeId;
    _maxDistance = (widget.initialMaxDistance ?? 10).toDouble();
  }

  @override
  void didUpdateWidget(WorkingAreaStep oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Reset selections if lists are cleared/reloaded (optional logic)
    // If provinces changed and current selection not in list, reset?
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.workingArea,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Chọn bưu cục bạn sẽ làm việc',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 24),
                  
                  // Province Dropdown
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(l10n.city, style: const TextStyle(fontWeight: FontWeight.w500)),
                      if (widget.provinces.isEmpty && !widget.isLoadingProvinces)
                        InkWell(
                          onTap: widget.onRetryProvinces,
                          child: Padding(
                            padding: const EdgeInsets.all(4.0),
                            child: Row(
                              children: [
                                Icon(Icons.refresh, size: 16, color: AppColors.primary),
                                const SizedBox(width: 4),
                                Text('Tải lại', style: TextStyle(color: AppColors.primary, fontSize: 12)),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _selectedProvinceCode,
                    hint: widget.isLoadingProvinces 
                        ? const Text('Đang tải...') 
                        : const Text('Chọn Tỉnh/Thành phố'),
                    icon: widget.isLoadingProvinces 
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.arrow_drop_down),
                    decoration: InputDecoration(
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                    isExpanded: true,
                    items: widget.isLoadingProvinces ? [] : widget.provinces.map((province) {
                      return DropdownMenuItem<String>(
                        value: province.code,
                        child: Text(province.name),
                      );
                    }).toList(),
                    onChanged: widget.isLoadingProvinces ? null : (v) {
                      if (v != _selectedProvinceCode) {
                        setState(() {
                          _selectedProvinceCode = v;
                          _selectedWardCode = null;
                          _selectedPostOfficeId = null;
                        });
                        widget.onProvinceChanged(v);
                        _notifyChanges();
                      }
                    },
                  ),
                  const SizedBox(height: 16),

                  // Ward Dropdown
                  const Text('Phường/Xã', style: TextStyle(fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _selectedWardCode,
                    hint: widget.isLoadingWards 
                        ? const Text('Đang tải...') 
                        : const Text('Chọn Phường/Xã'),
                    icon: widget.isLoadingWards
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.arrow_drop_down),
                    decoration: InputDecoration(
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                    isExpanded: true,
                    items: widget.isLoadingWards ? [] : widget.wards.map((ward) {
                      return DropdownMenuItem<String>(
                        value: ward.code,
                        child: Text(ward.name),
                      );
                    }).toList(),
                    onChanged: (widget.isLoadingWards || _selectedProvinceCode == null) ? null : (v) {
                       if (v != _selectedWardCode) {
                        setState(() {
                          _selectedWardCode = v;
                          _selectedPostOfficeId = null;
                        });
                        widget.onWardChanged(v);
                        _notifyChanges();
                      }
                    },
                  ),
                  const SizedBox(height: 16),

                  // Post Office Dropdown
                  const Text('Bưu cục', style: TextStyle(fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _selectedPostOfficeId,
                    hint: widget.isLoadingPostOffices 
                        ? const Text('Đang tải...') 
                        : const Text('Chọn Bưu cục'),
                    icon: widget.isLoadingPostOffices
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.arrow_drop_down),
                    decoration: InputDecoration(
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                    isExpanded: true,
                    items: widget.isLoadingPostOffices ? [] : widget.postOffices.map((office) {
                      return DropdownMenuItem<String>(
                        value: office.id,
                        child: Text(office.nameVi.isNotEmpty ? office.nameVi : (office.name ?? '')),
                      );
                    }).toList(),
                    onChanged: (widget.isLoadingPostOffices || _selectedWardCode == null) ? null : (v) {
                      setState(() {
                        _selectedPostOfficeId = v;
                      });
                      _notifyChanges();
                    },
                  ),
                  const SizedBox(height: 24),
                  
                  // Max Distance Slider
                  Text(
                    '${l10n.maxDistance}: ${_maxDistance.toInt()} km',
                    style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 16),
                  ),
                  Row(
                    children: [
                      const Text('5 km', style: TextStyle(fontSize: 12)),
                      Expanded(
                        child: Slider(
                          value: _maxDistance,
                          min: 5,
                          max: 50,
                          divisions: 9,
                          activeColor: AppColors.primary,
                          label: '${_maxDistance.toInt()} km',
                          onChanged: (value) {
                            setState(() => _maxDistance = value);
                            _notifyChanges();
                          },
                        ),
                      ),
                      const Text('50 km', style: TextStyle(fontSize: 12)),
                    ],
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
                  text: l10n.submit,
                  onPressed: _selectedPostOfficeId == null ? null : widget.onSubmit,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _notifyChanges() {
    // Find selected names for backward compatibility if needed, 
    // but RegisterCubit uses codes now mostly.
    
    // For city name, find in provinces list
    String cityName = '';
    try {
      final province = widget.provinces.firstWhere((p) => p.code == _selectedProvinceCode);
      cityName = province.name;
    } catch (_) {}

    widget.onWorkingAreaChanged(
      cityName,
      [], // districts list - deprecated or not used in revamped flow
      _maxDistance.toInt(),
      _selectedPostOfficeId,
      _selectedProvinceCode,
      _selectedWardCode,
    );
  }
}

