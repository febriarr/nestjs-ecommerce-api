import {
  OutletCandidateInfo,
  ShippingPoint,
  haversineKm,
  rankOutlets,
} from './outlet-selection.util';

function outlet(
  id: number,
  overrides: Partial<OutletCandidateInfo> = {}
): OutletCandidateInfo {
  return {
    id,
    name: `Outlet ${id}`,
    code: `OUT-${id}`,
    city: null,
    province: null,
    latitude: null,
    longitude: null,
    isOnlineDefault: false,
    ...overrides,
  };
}

const shipping: ShippingPoint = {
  city: 'Bandung',
  province: 'Jawa Barat',
  latitude: '-6.9175000',
  longitude: '107.6191000',
};

describe('haversineKm', () => {
  it('jarak titik yang sama = 0', () => {
    expect(haversineKm(-6.9175, 107.6191, -6.9175, 107.6191)).toBe(0);
  });

  it('Jakarta–Bandung kira-kira 115-130 km', () => {
    const distance = haversineKm(-6.2088, 106.8456, -6.9175, 107.6191);
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(135);
  });
});

describe('rankOutlets', () => {
  it('prioritas 1: kota sama menang walau outlet lain default', () => {
    const ranked = rankOutlets(
      [
        outlet(1, { city: 'Jakarta', isOnlineDefault: true }),
        outlet(2, { city: 'bandung' }), // match case-insensitive
      ],
      shipping
    );
    expect(ranked.map((r) => r.outlet.id)).toEqual([2, 1]);
    expect(ranked[0].matchesCity).toBe(true);
  });

  it('prioritas 2: provinsi sama mengalahkan jarak & default', () => {
    const ranked = rankOutlets(
      [
        outlet(1, { city: 'Jakarta', isOnlineDefault: true }),
        outlet(2, { city: 'Bekasi', province: 'Jawa Barat' }),
      ],
      shipping
    );
    expect(ranked[0].outlet.id).toBe(2);
    expect(ranked[0].matchesProvince).toBe(true);
  });

  it('prioritas 3: jarak terdekat bila kota/provinsi tidak match', () => {
    const ranked = rankOutlets(
      [
        // Surabaya (jauh)
        outlet(1, { latitude: '-7.2575000', longitude: '112.7521000' }),
        // Jakarta (lebih dekat ke Bandung)
        outlet(2, { latitude: '-6.2088000', longitude: '106.8456000' }),
      ],
      shipping
    );
    expect(ranked[0].outlet.id).toBe(2);
    expect(ranked[0].distanceKm).not.toBeNull();
  });

  it('prioritas 4: fallback isOnlineDefault tanpa sinyal lokasi apa pun', () => {
    const ranked = rankOutlets(
      [outlet(1), outlet(2, { isOnlineDefault: true })],
      { city: null, province: null, latitude: null, longitude: null }
    );
    expect(ranked[0].outlet.id).toBe(2);
  });

  it('deterministik: id terkecil saat seluruh kriteria seri', () => {
    const ranked = rankOutlets([outlet(7), outlet(3)], shipping);
    expect(ranked.map((r) => r.outlet.id)).toEqual([3, 7]);
  });

  it('outlet tanpa koordinat dianggap terjauh (Infinity → kalah)', () => {
    const ranked = rankOutlets(
      [
        outlet(1), // tanpa koordinat
        outlet(2, { latitude: '-7.2575000', longitude: '112.7521000' }),
      ],
      shipping
    );
    expect(ranked[0].outlet.id).toBe(2);
    expect(ranked[1].distanceKm).toBeNull();
  });
});
