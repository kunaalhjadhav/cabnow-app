import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/app_config.dart';
import '../storage/token_storage.dart';

/// Streams this driver's GPS to the backend over the same /tracking
/// namespace the customer app and admin dashboard consume — one event type
/// (`driver:location`) updates the driver's row, appends a GpsLocationEvent,
/// and fans out to anyone watching this trip/driver/the ops live map.
class SocketService {
  io.Socket? _socket;
  final _tokenStorage = TokenStorage();

  Future<void> connect() async {
    final token = await _tokenStorage.getAccessToken();
    _socket = io.io(
      '${AppConfig.socketUrl}/tracking',
      io.OptionBuilder().setTransports(['websocket']).setAuth({'token': token}).disableAutoConnect().build(),
    );
    _socket!.connect();
  }

  void sendLocation({required String driverId, String? tripId, required double lat, required double lng, double? speedKmh, double? heading}) {
    _socket?.emit('driver:location', {
      'driverId': driverId,
      if (tripId != null) 'tripId': tripId,
      'lat': lat,
      'lng': lng,
      if (speedKmh != null) 'speedKmh': speedKmh,
      if (heading != null) 'heading': heading,
    });
  }

  void onTripRouteChange(void Function(Map<String, dynamic>) callback) {
    _socket?.on('trip:route-change', (data) => callback(Map<String, dynamic>.from(data)));
  }

  void dispose() => _socket?.dispose();
}
