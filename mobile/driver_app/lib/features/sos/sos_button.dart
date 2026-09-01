import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class SosButton extends StatelessWidget {
  final String emergencyNumber;
  const SosButton({super.key, this.emergencyNumber = '112'});

  Future<void> _trigger(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Emergency SOS'),
        content: Text('This will call $emergencyNumber and alert platform support with your live location.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), style: FilledButton.styleFrom(backgroundColor: Colors.red), child: const Text('Call now')),
        ],
      ),
    );
    if (confirmed == true) {
      final uri = Uri(scheme: 'tel', path: emergencyNumber);
      if (await canLaunchUrl(uri)) await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton.extended(
      backgroundColor: Colors.red,
      onPressed: () => _trigger(context),
      icon: const Icon(Icons.sos),
      label: const Text('SOS'),
    );
  }
}
