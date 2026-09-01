import '../network/api_client.dart';
import '../storage/token_storage.dart';
import '../models/driver.dart';

class AuthRepository {
  final _api = ApiClient.instance.dio;
  final _tokenStorage = TokenStorage();

  Future<void> requestOtp(String phone) async {
    await _api.post('/auth/otp/request', data: {'phone': phone, 'purpose': 'LOGIN'});
  }

  /// Driver signup/login shares the same OTP endpoint as every other role —
  /// role: 'DRIVER' only takes effect the first time this phone number
  /// verifies (i.e. on signup); an existing user keeps their existing role.
  Future<DriverProfile> verifyOtp(String phone, String code, {String? fullName}) async {
    final response = await _api.post('/auth/otp/verify', data: {
      'phone': phone,
      'code': code,
      if (fullName != null) 'fullName': fullName,
      'role': 'DRIVER',
    });
    final data = response.data;
    await _tokenStorage.saveTokens(accessToken: data['accessToken'], refreshToken: data['refreshToken']);

    // A brand-new driver signup won't have a Driver row yet — the platform
    // admin/vendor creates it via POST /drivers once KYC intake starts. If
    // it already exists (returning driver), fetch it now.
    try {
      final driverResponse = await _api.get('/drivers/me');
      final driver = DriverProfile.fromJson(driverResponse.data);
      await _tokenStorage.saveDriverId(driver.id);
      return driver;
    } catch (_) {
      return DriverProfile(id: '', userId: data['user']['id'], kycStatus: 'NOT_SUBMITTED', status: 'PENDING', isOnline: false, rating: 5, totalTrips: 0);
    }
  }

  Future<DriverProfile?> getCurrentDriver() async {
    if (await _tokenStorage.getAccessToken() == null) return null;
    try {
      final response = await _api.get('/drivers/me');
      final driver = DriverProfile.fromJson(response.data);
      await _tokenStorage.saveDriverId(driver.id);
      return driver;
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    final refreshToken = await _tokenStorage.getRefreshToken();
    if (refreshToken != null) {
      try {
        await _api.post('/auth/logout', data: {'refreshToken': refreshToken});
      } catch (_) {}
    }
    await _tokenStorage.clear();
  }
}
