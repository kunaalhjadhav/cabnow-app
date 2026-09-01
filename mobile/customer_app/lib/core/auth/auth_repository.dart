import '../network/api_client.dart';
import '../storage/token_storage.dart';
import '../models/user.dart';

class AuthRepository {
  final _api = ApiClient.instance.dio;
  final _tokenStorage = TokenStorage();

  Future<void> requestOtp(String phone) async {
    await _api.post('/auth/otp/request', data: {'phone': phone, 'purpose': 'LOGIN'});
  }

  Future<AppUser> verifyOtp(String phone, String code, {String? fullName}) async {
    final response = await _api.post('/auth/otp/verify', data: {
      'phone': phone,
      'code': code,
      if (fullName != null) 'fullName': fullName,
      'role': 'CUSTOMER',
    });
    final data = response.data;
    await _tokenStorage.saveTokens(accessToken: data['accessToken'], refreshToken: data['refreshToken']);
    return AppUser.fromJson(data['user']);
  }

  Future<void> logout() async {
    final refreshToken = await _tokenStorage.getRefreshToken();
    if (refreshToken != null) {
      try {
        await _api.post('/auth/logout', data: {'refreshToken': refreshToken});
      } catch (_) {
        // best-effort — clear local tokens regardless
      }
    }
    await _tokenStorage.clear();
  }

  Future<bool> isLoggedIn() async => (await _tokenStorage.getAccessToken()) != null;

  /// Restores the session on app start when a token is already stored — GET
  /// /users/me both validates the token is still good and gives us the
  /// current user record without asking for the OTP again.
  Future<AppUser?> getCurrentUser() async {
    if (!await isLoggedIn()) return null;
    try {
      final response = await _api.get('/users/me');
      return AppUser.fromJson(response.data);
    } catch (_) {
      await _tokenStorage.clear();
      return null;
    }
  }
}
