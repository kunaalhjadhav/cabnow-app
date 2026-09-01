import 'package:flutter/foundation.dart';
import '../models/user.dart';
import 'auth_repository.dart';

class AuthState extends ChangeNotifier {
  final _repository = AuthRepository();

  AppUser? user;
  bool loading = true;

  AuthState() {
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    // Restores a previous session (if a valid token is still in secure
    // storage) so the app doesn't force a fresh OTP login every launch.
    user = await _repository.getCurrentUser();
    loading = false;
    notifyListeners();
  }

  Future<void> requestOtp(String phone) => _repository.requestOtp(phone);

  Future<void> verifyOtp(String phone, String code, {String? fullName}) async {
    user = await _repository.verifyOtp(phone, code, fullName: fullName);
    notifyListeners();
  }

  Future<void> logout() async {
    await _repository.logout();
    user = null;
    notifyListeners();
  }
}
