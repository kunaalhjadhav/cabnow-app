import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteEstimate {
  distanceKm: number;
  durationMinutes: number;
}

/**
 * Thin abstraction over the maps provider so the rest of the app never talks
 * to Google Maps directly (spec §7: "configurable mapping provider"). With no
 * GOOGLE_MAPS_SERVER_KEY set, falls back to a haversine great-circle estimate
 * (padded ~30% for real road distance) so the API is fully usable in dev
 * without a billing-enabled Maps account. Swap MAPS_PROVIDER / add another
 * `if` branch here to support Mapbox, HERE, etc.
 */
@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);

  constructor(private readonly config: ConfigService) {}

  private haversineKm(a: LatLng, b: LatLng): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  async estimateRoute(waypoints: LatLng[]): Promise<RouteEstimate> {
    const apiKey = this.config.get<string>('GOOGLE_MAPS_SERVER_KEY');

    if (apiKey && !apiKey.startsWith('your-') && waypoints.length >= 2) {
      try {
        return await this.estimateViaGoogleDistanceMatrix(waypoints, apiKey);
      } catch (err) {
        this.logger.warn(`Google Distance Matrix call failed, falling back to haversine estimate: ${err}`);
      }
    }

    return this.estimateViaHaversine(waypoints);
  }

  private estimateViaHaversine(waypoints: LatLng[]): RouteEstimate {
    let totalKm = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalKm += this.haversineKm(waypoints[i], waypoints[i + 1]);
    }
    const roadFactor = 1.3; // straight-line -> approximate road distance
    const distanceKm = Math.round(totalKm * roadFactor * 100) / 100;
    const avgSpeedKmh = 28; // city-traffic assumption for the dev fallback
    const durationMinutes = Math.round((distanceKm / avgSpeedKmh) * 60);
    return { distanceKm, durationMinutes };
  }

  private async estimateViaGoogleDistanceMatrix(waypoints: LatLng[], apiKey: string): Promise<RouteEstimate> {
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const waypointsParam = waypoints
      .slice(1, -1)
      .map((w) => `${w.lat},${w.lng}`)
      .join('|');

    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins', `${origin.lat},${origin.lng}`);
    url.searchParams.set('destinations', `${destination.lat},${destination.lng}`);
    if (waypointsParam) url.searchParams.set('waypoints', waypointsParam);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    const body = await response.json();
    const element = body?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
      throw new Error(`Distance Matrix returned status ${element?.status ?? 'UNKNOWN'}`);
    }

    return {
      distanceKm: Math.round((element.distance.value / 1000) * 100) / 100,
      durationMinutes: Math.round(element.duration.value / 60),
    };
  }

  /** Deviation of an actual point from the original planned route (for route-change limit checks, spec §4). */
  distanceBetween(a: LatLng, b: LatLng): number {
    return Math.round(this.haversineKm(a, b) * 100) / 100;
  }
}
