'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useApiSwr } from '@/lib/useApiSwr';

interface LiveUpdate {
  driverId: string;
  lat: number;
  lng: number;
  recordedAt: string;
}

export default function TripsPage() {
  const { data: bookings } = useApiSwr<any[]>('/bookings?status=DRIVER_ASSIGNED');
  const [liveUpdates, setLiveUpdates] = useState<Record<string, LiveUpdate>>({});

  useEffect(() => {
    const token = window.localStorage.getItem('accessToken');
    if (!token) return;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';
    const socket: Socket = io(`${socketUrl}/tracking`, { auth: { token } });
    socket.emit('watch:live-map');
    socket.on('live-map:update', (payload: LiveUpdate) => {
      setLiveUpdates((prev) => ({ ...prev, [payload.driverId]: payload }));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Live trips &amp; operational map</h1>
        <p className="text-sm text-slate-500">
          Driver positions stream over the <code>/tracking</code> Socket.IO namespace. Wire this table into a Google Maps{' '}
          <code>&lt;Map&gt;</code> component (see <code>NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY</code>) for a full live map view.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Live driver positions ({Object.keys(liveUpdates).length})</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Lat</th>
              <th>Lng</th>
              <th>Last update</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(liveUpdates).map((u) => (
              <tr key={u.driverId}>
                <td>{u.driverId}</td>
                <td>{u.lat.toFixed(5)}</td>
                <td>{u.lng.toFixed(5)}</td>
                <td>{new Date(u.recordedAt).toLocaleTimeString()}</td>
              </tr>
            ))}
            {Object.keys(liveUpdates).length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">
                  Waiting for driver GPS updates…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Bookings awaiting/with an assigned driver</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Pickup</th>
              <th>Drop</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(bookings ?? []).map((b) => (
              <tr key={b.id}>
                <td>{b.pickupLabel}</td>
                <td>{b.dropLabel}</td>
                <td>{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
