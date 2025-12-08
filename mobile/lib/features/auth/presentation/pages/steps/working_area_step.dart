import 'package:flutter/material.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../l10n/app_localizations.dart';
import '../../../../../shared/widgets/app_button.dart';

class WorkingAreaStep extends StatefulWidget {
  final Function(String city, List<String> districts, int maxDistance) onWorkingAreaChanged;
  final VoidCallback onSubmit;
  final VoidCallback onPrevious;
  final String? initialCity;
  final List<String>? initialDistricts;
  final int? initialMaxDistance;

  const WorkingAreaStep({
    super.key,
    required this.onWorkingAreaChanged,
    required this.onSubmit,
    required this.onPrevious,
    this.initialCity,
    this.initialDistricts,
    this.initialMaxDistance,
  });

  @override
  State<WorkingAreaStep> createState() => _WorkingAreaStepState();
}

class _WorkingAreaStepState extends State<WorkingAreaStep> {
  late String _selectedCity;
  late List<String> _selectedDistricts;
  late double _maxDistance;
  
  final Map<String, List<String>> _cityDistricts = {
    'Hà Nội': ['Ba Đình', 'Hoàn Kiếm', 'Đống Đa', 'Hai Bà Trưng', 'Cầu Giấy', 'Thanh Xuân', 'Hoàng Mai', 'Long Biên'],
    'TP. Hồ Chí Minh': ['Quận 1', 'Quận 3', 'Quận 5', 'Quận 7', 'Quận 10', 'Bình Thạnh', 'Phú Nhuận', 'Tân Bình'],
    'Đà Nẵng': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ'],
  };

  @override
  void initState() {
    super.initState();
    _selectedCity = widget.initialCity ?? 'Hà Nội';
    _selectedDistricts = widget.initialDistricts ?? [];
    _maxDistance = (widget.initialMaxDistance ?? 10).toDouble();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final availableDistricts = _cityDistricts[_selectedCity] ?? [];
    
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.workingArea,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 24),
          
          // City Dropdown
          Text(
            l10n.city,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _selectedCity,
            decoration: InputDecoration(
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
            items: _cityDistricts.keys.map((city) {
              return DropdownMenuItem(value: city, child: Text(city));
            }).toList(),
            onChanged: (v) {
              setState(() {
                _selectedCity = v!;
                _selectedDistricts = []; // Reset districts when city changes
              });
              _notifyChanges();
            },
          ),
          const SizedBox(height: 16),
          
          // Districts Selection
          Text(
            l10n.districts,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: availableDistricts.map((district) {
              final isSelected = _selectedDistricts.contains(district);
              return FilterChip(
                label: Text(district),
                selected: isSelected,
                selectedColor: AppColors.primary.withValues(alpha: 0.2),
                checkmarkColor: AppColors.primary,
                onSelected: (selected) {
                  setState(() {
                    if (selected) {
                      _selectedDistricts.add(district);
                    } else {
                      _selectedDistricts.remove(district);
                    }
                  });
                  _notifyChanges();
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          
          // Max Distance Slider
          Text(
            '${l10n.maxDistance}: ${_maxDistance.toInt()} km',
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          Slider(
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
          
          const Spacer(),
          
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
                  onPressed: _canSubmit() ? widget.onSubmit : null,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _notifyChanges() {
    widget.onWorkingAreaChanged(
      _selectedCity,
      _selectedDistricts,
      _maxDistance.toInt(),
    );
  }

  bool _canSubmit() {
    return _selectedCity.isNotEmpty && _selectedDistricts.isNotEmpty;
  }
}
