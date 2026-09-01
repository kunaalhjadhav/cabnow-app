import 'package:flutter/material.dart';
import '../trip/trip_repository.dart';
import '../home/home_screen.dart';

class RateTripScreen extends StatefulWidget {
  final String tripId;
  final String driverUserId;
  const RateTripScreen({super.key, required this.tripId, required this.driverUserId});

  @override
  State<RateTripScreen> createState() => _RateTripScreenState();
}

class _RateTripScreenState extends State<RateTripScreen> {
  final _repository = TripRepository();
  int _score = 5;
  final _commentCtrl = TextEditingController();
  bool _busy = false;

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      await _repository.rateTrip(widget.tripId, ratedUserId: widget.driverUserId, score: _score, comment: _commentCtrl.text);
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const HomeScreen()), (route) => false);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rate your trip')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('How was your driver?', style: TextStyle(fontSize: 18)),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (i) {
                final star = i + 1;
                return IconButton(
                  iconSize: 36,
                  icon: Icon(star <= _score ? Icons.star : Icons.star_border, color: Colors.amber),
                  onPressed: () => setState(() => _score = star),
                );
              }),
            ),
            TextField(controller: _commentCtrl, decoration: const InputDecoration(labelText: 'Comment (optional)'), maxLines: 3),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _busy ? null : _submit, child: Text(_busy ? 'Submitting…' : 'Submit rating')),
          ],
        ),
      ),
    );
  }
}
