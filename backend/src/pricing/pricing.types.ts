export interface FareCalculationInput {
  categoryId: string;
  companyId?: string | null;
  city?: string | null;
  zone?: string | null;
  packageType?: string | null;

  distanceKm: number;
  durationMinutes: number;
  waitingMinutes?: number;
  extraStops?: number;
  tollAmount?: number;
  parkingAmount?: number;
  isAirportPickupOrDrop?: boolean;
  pickupAt?: Date;

  /** Corporate package flat-fare short-circuit, when this booking is against a Package. */
  packageFlatFare?: number | null;

  /** Manual surge override (e.g. dispatch engine detected high demand); falls back to SURGE rules otherwise. */
  surgeMultiplier?: number;

  discountCode?: string | null;
}

export interface FareLine {
  lineType:
    | 'BASE_FARE'
    | 'DISTANCE'
    | 'TIME'
    | 'WAITING'
    | 'EXTRA_STOP'
    | 'TOLL'
    | 'PARKING'
    | 'AIRPORT_SURCHARGE'
    | 'NIGHT_SURCHARGE'
    | 'SURGE'
    | 'TAX'
    | 'DISCOUNT'
    | 'ROUTE_CHANGE_ADJUSTMENT'
    | 'CANCELLATION_FEE'
    | 'ROUNDING'
    | 'PACKAGE_FARE';
  label: string;
  amount: number;
  meta?: Record<string, unknown>;
}

export interface FareCalculationResult {
  lines: FareLine[];
  total: number;
}
