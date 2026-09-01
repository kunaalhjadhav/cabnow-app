import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final _api = ApiClient.instance.dio;
  final _subjectCtrl = TextEditingController();
  final _descriptionCtrl = TextEditingController();
  bool _busy = false;
  String? _confirmation;

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      await _api.post('/support/tickets', data: {
        'subject': _subjectCtrl.text,
        'description': _descriptionCtrl.text,
        'category': 'DRIVER',
      });
      setState(() {
        _confirmation = 'Support ticket submitted.';
        _subjectCtrl.clear();
        _descriptionCtrl.clear();
      });
    } finally {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Help & support')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: _subjectCtrl, decoration: const InputDecoration(labelText: 'Subject')),
            const SizedBox(height: 12),
            TextField(controller: _descriptionCtrl, decoration: const InputDecoration(labelText: 'Describe the issue'), maxLines: 5),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _busy ? null : _submit, child: Text(_busy ? 'Submitting…' : 'Submit ticket')),
            if (_confirmation != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_confirmation!, style: const TextStyle(color: Colors.green))),
          ],
        ),
      ),
    );
  }
}
