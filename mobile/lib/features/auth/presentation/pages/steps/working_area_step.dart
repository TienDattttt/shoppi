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
  late String _selectedProvince;
  late List<String> _selectedWards;
  late double _maxDistance;
  
  // 34 tỉnh/thành phố theo Công văn số 2896/BNV-CQĐP của Bộ Nội Vụ
  // Phân theo 3 miền
  final Map<String, List<Map<String, String>>> _provincesData = {
    'Miền Bắc': [
      {'code': '01', 'name': 'Hà Nội'},
      {'code': '04', 'name': 'Cao Bằng'},
      {'code': '08', 'name': 'Tuyên Quang'},
      {'code': '10', 'name': 'Lào Cai'},
      {'code': '14', 'name': 'Sơn La'},
      {'code': '19', 'name': 'Thái Nguyên'},
      {'code': '22', 'name': 'Quảng Ninh'},
      {'code': '24', 'name': 'Bắc Giang'},
      {'code': '27', 'name': 'Bắc Ninh'},
      {'code': '31', 'name': 'Hải Phòng'},
      {'code': '33', 'name': 'Hưng Yên'},
      {'code': '34', 'name': 'Thái Bình'},
      {'code': '35', 'name': 'Hà Nam'},
      {'code': '36', 'name': 'Nam Định'},
      {'code': '37', 'name': 'Ninh Bình'},
    ],
    'Miền Trung': [
      {'code': '38', 'name': 'Thanh Hóa'},
      {'code': '40', 'name': 'Nghệ An'},
      {'code': '42', 'name': 'Hà Tĩnh'},
      {'code': '44', 'name': 'Quảng Bình'},
      {'code': '45', 'name': 'Quảng Trị'},
      {'code': '46', 'name': 'Thừa Thiên Huế'},
      {'code': '48', 'name': 'Đà Nẵng'},
      {'code': '49', 'name': 'Quảng Nam'},
      {'code': '51', 'name': 'Quảng Ngãi'},
      {'code': '52', 'name': 'Bình Định'},
      {'code': '54', 'name': 'Phú Yên'},
      {'code': '56', 'name': 'Khánh Hòa'},
      {'code': '58', 'name': 'Ninh Thuận'},
      {'code': '60', 'name': 'Bình Thuận'},
      {'code': '62', 'name': 'Kon Tum'},
      {'code': '64', 'name': 'Gia Lai'},
      {'code': '66', 'name': 'Đắk Lắk'},
      {'code': '67', 'name': 'Đắk Nông'},
      {'code': '68', 'name': 'Lâm Đồng'},
    ],
    'Miền Nam': [
      {'code': '70', 'name': 'Bình Phước'},
      {'code': '72', 'name': 'Tây Ninh'},
      {'code': '74', 'name': 'Bình Dương'},
      {'code': '75', 'name': 'Đồng Nai'},
      {'code': '77', 'name': 'Bà Rịa - Vũng Tàu'},
      {'code': '79', 'name': 'TP. Hồ Chí Minh'},
      {'code': '80', 'name': 'Long An'},
      {'code': '82', 'name': 'Tiền Giang'},
      {'code': '83', 'name': 'Bến Tre'},
      {'code': '84', 'name': 'Trà Vinh'},
      {'code': '86', 'name': 'Vĩnh Long'},
      {'code': '87', 'name': 'Đồng Tháp'},
      {'code': '89', 'name': 'An Giang'},
      {'code': '91', 'name': 'Kiên Giang'},
      {'code': '92', 'name': 'Cần Thơ'},
      {'code': '93', 'name': 'Hậu Giang'},
      {'code': '94', 'name': 'Sóc Trăng'},
      {'code': '95', 'name': 'Bạc Liêu'},
      {'code': '96', 'name': 'Cà Mau'},
    ],
  };

  // Danh sách đơn giản các tỉnh/thành phố
  List<String> get _allProvinces {
    final list = <String>[];
    for (final region in _provincesData.values) {
      for (final province in region) {
        list.add(province['name']!);
      }
    }
    return list;
  }

  @override
  void initState() {
    super.initState();
    // Handle both null and empty string
    _selectedProvince = (widget.initialCity != null && widget.initialCity!.isNotEmpty) 
        ? widget.initialCity! 
        : 'Hà Nội';
    _selectedWards = widget.initialDistricts ?? [];
    _maxDistance = (widget.initialMaxDistance ?? 10).toDouble();
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
                    'Chọn khu vực bạn muốn hoạt động giao hàng',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 24),
                  
                  // Province Dropdown
                  Text(
                    l10n.city,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _selectedProvince,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                    isExpanded: true,
                    items: _allProvinces.map((province) {
                      return DropdownMenuItem(value: province, child: Text(province));
                    }).toList(),
                    onChanged: (v) {
                      setState(() {
                        _selectedProvince = v!;
                        _selectedWards = []; // Reset wards when province changes
                      });
                      _notifyChanges();
                    },
                  ),
                  const SizedBox(height: 24),
                  
                  // Max Distance Slider with explanation
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.info_outline, color: AppColors.primary, size: 20),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Text(
                                'Bán kính hoạt động',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Đây là khoảng cách tối đa từ vị trí của bạn để nhận đơn hàng. '
                          'Hệ thống sẽ chỉ giao việc trong phạm vi này.',
                          style: TextStyle(fontSize: 13, color: Colors.black87),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  Text(
                    '${l10n.maxDistance}: ${_maxDistance.toInt()} km',
                    style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 16),
                  ),
                  const SizedBox(height: 8),
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
                  
                  // Distance descriptions
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildDistanceChip('5-10 km', 'Nội thành'),
                      _buildDistanceChip('15-25 km', 'Ngoại thành'),
                      _buildDistanceChip('30-50 km', 'Liên quận/huyện'),
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
                  onPressed: widget.onSubmit,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  Widget _buildDistanceChip(String range, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        '$range: $label',
        style: const TextStyle(fontSize: 12),
      ),
    );
  }

  void _notifyChanges() {
    widget.onWorkingAreaChanged(
      _selectedProvince,
      _selectedWards,
      _maxDistance.toInt(),
    );
  }
}

