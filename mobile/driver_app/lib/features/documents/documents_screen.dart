import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/auth/auth_state.dart';
import '../../core/network/api_client.dart';

const _documentTypes = ['DRIVING_LICENSE', 'AADHAAR', 'POLICE_VERIFICATION', 'VEHICLE_RC', 'INSURANCE'];

/// KYC document upload — spec: "Driver registration / KYC / document
/// verification". This scaffold picks an image and POSTs its path as
/// `fileUrl`; wire in your object-storage upload (S3/GCS/Cloudinary) before
/// this call in production so `fileUrl` is a real, durable URL rather than a
/// local file path.
class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  final _api = ApiClient.instance.dio;
  final _picker = ImagePicker();
  String _selectedType = _documentTypes.first;
  bool _busy = false;
  String? _message;

  Future<void> _pickAndUpload() async {
    final driver = context.read<AuthState>().driver;
    if (driver == null || driver.id.isEmpty) return;

    final photo = await _picker.pickImage(source: ImageSource.camera);
    if (photo == null) return;

    setState(() => _busy = true);
    try {
      // TODO: upload `photo.path` to your object storage and use the returned
      // public/pre-signed URL here instead of the local path.
      await _api.post('/drivers/${driver.id}/documents', data: {'type': _selectedType, 'fileUrl': photo.path});
      setState(() => _message = 'Uploaded — pending admin review.');
    } finally {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('KYC documents')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButtonFormField<String>(
              value: _selectedType,
              items: _documentTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
              onChanged: (v) => setState(() => _selectedType = v ?? _selectedType),
              decoration: const InputDecoration(labelText: 'Document type'),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              icon: const Icon(Icons.camera_alt),
              label: Text(_busy ? 'Uploading…' : 'Take photo & upload'),
              onPressed: _busy ? null : _pickAndUpload,
            ),
            if (_message != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_message!, style: const TextStyle(color: Colors.green))),
          ],
        ),
      ),
    );
  }
}
