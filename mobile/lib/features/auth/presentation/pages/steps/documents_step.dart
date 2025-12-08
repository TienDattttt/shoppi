import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../../core/constants/app_colors.dart';
import '../../../../../l10n/app_localizations.dart';
import '../../../../../shared/widgets/app_button.dart';
import '../../../../../shared/widgets/app_card.dart';

class DocumentsStep extends StatefulWidget {
  final Function(String? idCardFront, String? idCardBack, String? driverLicense) onDocumentsChanged;
  final VoidCallback onNext;
  final VoidCallback onPrevious;
  final String? initialIdCardFront;
  final String? initialIdCardBack;
  final String? initialDriverLicense;

  const DocumentsStep({
    super.key,
    required this.onDocumentsChanged,
    required this.onNext,
    required this.onPrevious,
    this.initialIdCardFront,
    this.initialIdCardBack,
    this.initialDriverLicense,
  });

  @override
  State<DocumentsStep> createState() => _DocumentsStepState();
}

class _DocumentsStepState extends State<DocumentsStep> {
  final ImagePicker _picker = ImagePicker();
  
  String? _idCardFrontPath;
  String? _idCardBackPath;
  String? _driverLicensePath;
  
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    _idCardFrontPath = widget.initialIdCardFront;
    _idCardBackPath = widget.initialIdCardBack;
    _driverLicensePath = widget.initialDriverLicense;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.uploadDocuments,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            l10n.uploadDocumentsDescription,
            style: TextStyle(color: Colors.grey[600]),
          ),
          const SizedBox(height: 24),
          
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  // ID Card Front
                  _buildDocumentCard(
                    title: l10n.idCardFront,
                    subtitle: l10n.idCardFrontDescription,
                    imagePath: _idCardFrontPath,
                    onTap: () => _pickImage(_DocumentType.idCardFront),
                    onRemove: () => _removeImage(_DocumentType.idCardFront),
                  ),
                  const SizedBox(height: 16),
                  
                  // ID Card Back
                  _buildDocumentCard(
                    title: l10n.idCardBack,
                    subtitle: l10n.idCardBackDescription,
                    imagePath: _idCardBackPath,
                    onTap: () => _pickImage(_DocumentType.idCardBack),
                    onRemove: () => _removeImage(_DocumentType.idCardBack),
                  ),
                  const SizedBox(height: 16),
                  
                  // Driver License
                  _buildDocumentCard(
                    title: l10n.driverLicense,
                    subtitle: l10n.driverLicenseDescription,
                    imagePath: _driverLicensePath,
                    onTap: () => _pickImage(_DocumentType.driverLicense),
                    onRemove: () => _removeImage(_DocumentType.driverLicense),
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
                  onPressed: _canProceed() ? widget.onNext : null,
                  isLoading: _isUploading,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  Widget _buildDocumentCard({
    required String title,
    required String subtitle,
    required String? imagePath,
    required VoidCallback onTap,
    required VoidCallback onRemove,
  }) {
    final hasImage = imagePath != null;
    final l10n = AppLocalizations.of(context)!;
    
    return AppCard(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                if (hasImage)
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.red),
                    onPressed: onRemove,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            
            if (hasImage)
              Container(
                height: 120,
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.file(
                    File(imagePath),
                    fit: BoxFit.cover,
                  ),
                ),
              )
            else
              Container(
                height: 120,
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: Colors.grey[300]!,
                    style: BorderStyle.solid,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.camera_alt,
                      size: 32,
                      color: AppColors.primary,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l10n.tapToUpload,
                      style: TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
  
  Future<void> _pickImage(_DocumentType type) async {
    try {
      setState(() {
        _isUploading = true;
      });
      
      // Show image source selection
      final ImageSource? source = await _showImageSourceDialog();
      if (source == null) {
        setState(() {
          _isUploading = false;
        });
        return;
      }
      
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );
      
      if (image != null) {
        // Validate file size (max 5MB)
        final file = File(image.path);
        final fileSizeInBytes = await file.length();
        final fileSizeInMB = fileSizeInBytes / (1024 * 1024);
        
        if (fileSizeInMB > 5) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(AppLocalizations.of(context)!.fileSizeTooLarge),
                backgroundColor: Colors.red,
              ),
            );
          }
          return;
        }
        
        setState(() {
          switch (type) {
            case _DocumentType.idCardFront:
              _idCardFrontPath = image.path;
              break;
            case _DocumentType.idCardBack:
              _idCardBackPath = image.path;
              break;
            case _DocumentType.driverLicense:
              _driverLicensePath = image.path;
              break;
          }
        });
        
        _notifyChanges();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error picking image: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() {
        _isUploading = false;
      });
    }
  }
  
  Future<ImageSource?> _showImageSourceDialog() async {
    final l10n = AppLocalizations.of(context)!;
    return showDialog<ImageSource>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.selectImageSource),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: Text(l10n.camera),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: Text(l10n.gallery),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
  }
  
  void _removeImage(_DocumentType type) {
    setState(() {
      switch (type) {
        case _DocumentType.idCardFront:
          _idCardFrontPath = null;
          break;
        case _DocumentType.idCardBack:
          _idCardBackPath = null;
          break;
        case _DocumentType.driverLicense:
          _driverLicensePath = null;
          break;
      }
    });
    
    _notifyChanges();
  }
  
  void _notifyChanges() {
    widget.onDocumentsChanged(
      _idCardFrontPath,
      _idCardBackPath,
      _driverLicensePath,
    );
  }
  
  bool _canProceed() {
    // All documents are required
    return _idCardFrontPath != null && 
           _idCardBackPath != null && 
           _driverLicensePath != null;
  }
}

enum _DocumentType {
  idCardFront,
  idCardBack,
  driverLicense,
}
