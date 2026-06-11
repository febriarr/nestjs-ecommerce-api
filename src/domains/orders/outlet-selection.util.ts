/**
 * Util murni pemilihan outlet untuk order ONLINE.
 *
 * Hanya outlet yang SANGGUP memenuhi semua item yang masuk ke ranking
 * (disaring caller). Urutan prioritas:
 *  1. kota alamat kirim sama,
 *  2. provinsi sama,
 *  3. jarak haversine terdekat (bila kedua koordinat tersedia),
 *  4. fallback `isOnlineDefault`,
 *  5. id terkecil (deterministik).
 */

export interface OutletCandidateInfo {
  id: number;
  name: string;
  code: string;
  city: string | null;
  province: string | null;
  /** Koordinat string desimal (mengikuti kolom decimal). */
  latitude: string | null;
  longitude: string | null;
  isOnlineDefault: boolean;
}

export interface ShippingPoint {
  city: string | null;
  province: string | null;
  latitude: string | null;
  longitude: string | null;
}

export interface RankedOutlet {
  outlet: OutletCandidateInfo;
  matchesCity: boolean;
  matchesProvince: boolean;
  /** Null bila salah satu sisi tidak punya koordinat. */
  distanceKm: number | null;
}

const EARTH_RADIUS_KM = 6371;

/** Jarak great-circle antara dua koordinat (km). */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function normalize(value: string | null): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function parseCoordinate(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function distanceBetween(
  outlet: OutletCandidateInfo,
  shipping: ShippingPoint
): number | null {
  const lat1 = parseCoordinate(outlet.latitude);
  const lon1 = parseCoordinate(outlet.longitude);
  const lat2 = parseCoordinate(shipping.latitude);
  const lon2 = parseCoordinate(shipping.longitude);
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return null;
  }
  return haversineKm(lat1, lon1, lat2, lon2);
}

/** Ranking outlet kandidat terhadap alamat kirim; terbaik di urutan pertama. */
export function rankOutlets(
  candidates: OutletCandidateInfo[],
  shipping: ShippingPoint
): RankedOutlet[] {
  const shippingCity = normalize(shipping.city);
  const shippingProvince = normalize(shipping.province);

  const ranked: RankedOutlet[] = candidates.map((outlet) => ({
    outlet,
    matchesCity:
      shippingCity !== null && normalize(outlet.city) === shippingCity,
    matchesProvince:
      shippingProvince !== null &&
      normalize(outlet.province) === shippingProvince,
    distanceKm: distanceBetween(outlet, shipping),
  }));

  return ranked.sort((a, b) => {
    if (a.matchesCity !== b.matchesCity) return a.matchesCity ? -1 : 1;
    if (a.matchesProvince !== b.matchesProvince)
      return a.matchesProvince ? -1 : 1;
    const distA = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const distB = b.distanceKm ?? Number.POSITIVE_INFINITY;
    if (distA !== distB) return distA - distB;
    if (a.outlet.isOnlineDefault !== b.outlet.isOnlineDefault)
      return a.outlet.isOnlineDefault ? -1 : 1;
    return a.outlet.id - b.outlet.id;
  });
}
