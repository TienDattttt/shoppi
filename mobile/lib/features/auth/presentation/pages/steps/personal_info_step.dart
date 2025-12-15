import 'package:flutter/material.dart';
import '../../../../../shared/widgets/app_text_field.dart';
import '../../../../../shared/widgets/app_button.dart';

class PersonalInfoStep extends StatefulWidget {
  final Function(String fullName, String phone, String email, String password, String idCardNumber) onInfoChanged;
  final VoidCallback onNext;
  final String? initialFullName;
  final String? initialPhone;
  final String? initialEmail;
  final String? initialPassword;
  final String? initialIdCardNumber;

  const PersonalInfoStep({
    super.key,
    required this.onInfoChanged,
    required this.onNext,
    this.initialFullName,
    this.initialPhone,
    this.initialEmail,
    this.initialPassword,
    this.initialIdCardNumber,
  });

  @override
  State<PersonalInfoStep> createState() => _PersonalInfoStepState();
}

class _PersonalInfoStepState extends State<PersonalInfoStep> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _fullNameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;
  late final TextEditingController _passwordController;
  late final TextEditingController _idCardNumberController;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _fullNameController = TextEditingController(text: widget.initialFullName ?? '');
    _phoneController = TextEditingController(text: widget.initialPhone ?? '');
    _emailController = TextEditingController(text: widget.initialEmail ?? '');
    _passwordController = TextEditingController(text: widget.initialPassword ?? '');
    _idCardNumberController = TextEditingController(text: widget.initialIdCardNumber ?? '');
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _idCardNumberController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
                      'Thông tin cá nhân',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Vui lòng nhập thông tin cá nhân của bạn',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 24),
                    
                    // Full Name
                    AppTextField(
                      controller: _fullNameController,
                      label: 'Họ và tên',
                      hint: 'Nhập họ và tên đầy đủ',
                      prefixIcon: Icons.person,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Vui lòng nhập họ và tên';
                        }
                        if (value.length < 2) {
                          return 'Họ và tên phải có ít nhất 2 ký tự';
                        }
                        return null;
                      },
                      onChanged: (_) => _notifyChanges(),
                    ),
                    const SizedBox(height: 16),
                    
                    // Phone
                    AppTextField(
                      controller: _phoneController,
                      label: 'Số điện thoại',
                      hint: 'Nhập số điện thoại',
                      prefixIcon: Icons.phone,
                      keyboardType: TextInputType.phone,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Vui lòng nhập số điện thoại';
                        }
                        // Vietnamese phone number validation
                        final phoneRegex = RegExp(r'^(0|\+84)[0-9]{9}$');
                        if (!phoneRegex.hasMatch(value.replaceAll(' ', ''))) {
                          return 'Số điện thoại không hợp lệ';
                        }
                        return null;
                      },
                      onChanged: (_) => _notifyChanges(),
                    ),
                    const SizedBox(height: 16),
                    
                    // Email
                    AppTextField(
                      controller: _emailController,
                      label: 'Email',
                      hint: 'Nhập địa chỉ email',
                      prefixIcon: Icons.email,
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Vui lòng nhập email';
                        }
                        final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
                        if (!emailRegex.hasMatch(value)) {
                          return 'Email không hợp lệ';
                        }
                        return null;
                      },
                      onChanged: (_) => _notifyChanges(),
                    ),
                    const SizedBox(height: 16),
                    
                    // Password
                    AppTextField(
                      controller: _passwordController,
                      label: 'Mật khẩu',
                      hint: 'Nhập mật khẩu (ít nhất 6 ký tự)',
                      prefixIcon: Icons.lock,
                      obscureText: _obscurePassword,
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Vui lòng nhập mật khẩu';
                        }
                        if (value.length < 6) {
                          return 'Mật khẩu phải có ít nhất 6 ký tự';
                        }
                        return null;
                      },
                      onChanged: (_) => _notifyChanges(),
                    ),
                    const SizedBox(height: 16),
                    
                    // ID Card Number (CCCD/CMND)
                    AppTextField(
                      controller: _idCardNumberController,
                      label: 'Số CCCD/CMND',
                      hint: 'Nhập số căn cước công dân',
                      prefixIcon: Icons.badge,
                      keyboardType: TextInputType.number,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Vui lòng nhập số CCCD/CMND';
                        }
                        // CCCD: 12 digits, CMND: 9 or 12 digits
                        if (value.length != 9 && value.length != 12) {
                          return 'Số CCCD/CMND phải có 9 hoặc 12 số';
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
            
            // Next Button
            SizedBox(
              width: double.infinity,
              child: AppButton(
                text: 'Tiếp tục',
                onPressed: _onNext,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _notifyChanges() {
    widget.onInfoChanged(
      _fullNameController.text,
      _phoneController.text,
      _emailController.text,
      _passwordController.text,
      _idCardNumberController.text,
    );
  }

  void _onNext() {
    if (_formKey.currentState?.validate() ?? false) {
      _notifyChanges();
      widget.onNext();
    }
  }
}

