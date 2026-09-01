import 'package:flutter/material.dart';
import 'package:pin_code_fields/pin_code_fields.dart';
import 'package:provider/provider.dart';
import '../../core/auth/auth_state.dart';
import '../home/home_screen.dart';

class OtpLoginScreen extends StatefulWidget {
  const OtpLoginScreen({super.key});

  @override
  State<OtpLoginScreen> createState() => _OtpLoginScreenState();
}

class _OtpLoginScreenState extends State<OtpLoginScreen> {
  final _phoneController = TextEditingController();
  String _code = '';
  bool _otpSent = false;
  bool _busy = false;
  String? _error;

  Future<void> _sendOtp() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<AuthState>().requestOtp(_phoneController.text.trim());
      setState(() => _otpSent = true);
    } catch (e) {
      setState(() => _error = 'Could not send OTP. Check the number and try again.');
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _verifyOtp() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<AuthState>().verifyOtp(_phoneController.text.trim(), _code);
      if (mounted) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
      }
    } catch (e) {
      setState(() => _error = 'Incorrect OTP. Please try again.');
    } finally {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Welcome', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(_otpSent ? 'Enter the OTP sent to ${_phoneController.text}' : 'Sign in with your phone number',
                  style: const TextStyle(color: Colors.black54)),
              const SizedBox(height: 24),
              if (!_otpSent)
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Phone number', hintText: '+919876543210', border: OutlineInputBorder()),
                )
              else
                PinCodeTextField(
                  appContext: context,
                  length: 6,
                  onChanged: (value) => _code = value,
                  onCompleted: (value) => _code = value,
                  pinTheme: PinTheme(shape: PinCodeFieldShape.box, borderRadius: BorderRadius.circular(8)),
                ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: Colors.red)),
              ],
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _busy ? null : (_otpSent ? _verifyOtp : _sendOtp),
                child: Text(_busy ? 'Please wait…' : (_otpSent ? 'Verify & continue' : 'Send OTP')),
              ),
              if (_otpSent)
                TextButton(
                  onPressed: () => setState(() => _otpSent = false),
                  child: const Text('Use a different number'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
