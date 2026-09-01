import 'package:flutter/foundation.dart';
import '../models/driver.dart';
import 'auth_repository.dart';

class AuthState extends ChangeNotifier {
  final _repository = AuthRepository();

  DriverProfile? driver;
  bool loading = true;

  AuthState() {
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    driver = await _repository.getCurrentDriver();
    loading = false;
    notifyListeners();
  }

  Future<void> requestOtp(String phone) => _repository.requestOtp(phone);

  Future<void> verifyOtp(String phone, String code, {String? fullName}) async {
    driver = await _repository.verifyOtp(phone, code, fullName: fullName);
    notifyListeners();
  }

  Future<void> refreshDriver() async {
    driver = await _repository.getCurrentDriver();
    notifyListeners();
  }

  Future<void> logout() async {
    await _repository.logout();
    driver = null;
    notifyListeners();
  }
}
