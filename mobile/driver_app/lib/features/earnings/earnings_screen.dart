import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/auth/auth_state.dart';
import '../../core/network/api_client.dart';

class EarningsScreen extends StatefulWidget {
  const EarningsScreen({super.key});

  @override
  State<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends State<EarningsScreen> {
  final _api = ApiClient.instance.dio;
  Map<String, dynamic>? _summary;
  List<dynamic> _entries = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final driverId = context.read<AuthState>().driver?.id;
    if (driverId == null || driverId.isEmpty) return;
    final summaryResponse = await _api.get('/drivers/$driverId/earnings/summary');
    final listResponse = await _api.get('/drivers/$driverId/earnings');
    setState(() {
      _summary = Map<String, dynamic>.from(summaryResponse.data);
      _entries = listResponse.data;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Earnings')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Row(
                    children: [
                      Expanded(child: _StatCard(label: 'Total earned', value: '₹${_summary?['totalEarned'] ?? 0}')),
                      const SizedBox(width: 12),
                      Expanded(child: _StatCard(label: 'Pending payout', value: '₹${_summary?['pendingPayout'] ?? 0}')),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text('Recent earnings', style: TextStyle(fontWeight: FontWeight.bold)),
                  ..._entries.map((e) {
                    final entry = Map<String, dynamic>.from(e);
                    return ListTile(
                      title: Text(entry['description'] ?? ''),
                      trailing: Text('${entry['isCredit'] == false ? '-' : '+'}₹${entry['amount']}'),
                      subtitle: Text(entry['createdAt'] ?? ''),
                    );
                  }),
                ],
              ),
            ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  const _StatCard({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: Colors.black54)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        ]),
      ),
    );
  }
}
