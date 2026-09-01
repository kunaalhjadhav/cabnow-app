import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/app_config.dart';
import '../storage/token_storage.dart';

/// Thin wrapper over the same /tracking Socket.IO namespace the backend's
/// TrackingGateway exposes — used here to watch a trip's driver location
/// (customer app "live tracking") and to receive trip-status / route-change
/// push events without polling.
class SocketService {
  io.Socket? _socket;
  final _tokenStorage = TokenStorage();

  Future<void> connect() async {
    final token = await _tokenStorage.getAccessToken();
    _socket = io.io(
      '${AppConfig.socketUrl}/tracking',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .disableAutoConnect()
          .build(),
    );
    _socket!.connect();
  }

  void watchTrip(String tripId) {
    _socket?.emit('watch:trip', {'tripId': tripId});
  }

  void onTripLocation(void Function(Map<String, dynamic>) callback) {
    _socket?.on('trip:location', (data) => callback(Map<String, dynamic>.from(data)));
  }

  void onTripStatus(void Function(Map<String, dynamic>) callback) {
    _socket?.on('trip:status', (data) => callback(Map<String, dynamic>.from(data)));
  }

  void onRouteChange(void Function(Map<String, dynamic>) callback) {
    _socket?.on('trip:route-change', (data) => callback(Map<String, dynamic>.from(data)));
  }

  void dispose() {
    _socket?.dispose();
  }
}
