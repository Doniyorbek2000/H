import { Injectable, Logger } from '@nestjs/common';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

/**
 * Geokodlash (manzil -> koordinata) va teskari geokodlash.
 * OpenStreetMap Nominatim (bepul) ishlatiladi; natijalar 24 soat keshlanadi.
 * GEOCODER_URL env orqali o'z Nominatim instansiga yo'naltirish mumkin.
 */
@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly cache = new Map<string, { value: GeocodeResult | null; ts: number }>();
  private readonly ttl = 24 * 3600 * 1000;

  private get base(): string {
    return process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org';
  }

  private cached(key: string): GeocodeResult | null | undefined {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.ts < this.ttl) return hit.value;
    return undefined;
  }

  /** Manzil -> koordinata (O'zbekiston doirasida) */
  async geocode(query: string): Promise<GeocodeResult | null> {
    const key = `g:${query.toLowerCase().trim()}`;
    const c = this.cached(key);
    if (c !== undefined) return c;
    try {
      const url = new URL(`${this.base}/search`);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      url.searchParams.set('countrycodes', 'uz');
      url.searchParams.set('accept-language', 'uz,ru');
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SmartMurojaatAI/1.0 (davlat murojaatlar platformasi)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return this.store(key, null);
      const data: any[] = await res.json();
      if (!data.length) return this.store(key, null);
      const r = data[0];
      return this.store(key, {
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
        displayName: r.display_name,
      });
    } catch (e) {
      this.logger.warn(`Geocode xatosi: ${(e as Error).message}`);
      return null;
    }
  }

  /** Koordinata -> manzil (teskari) */
  async reverse(lat: number, lon: number): Promise<GeocodeResult | null> {
    const key = `r:${lat.toFixed(5)},${lon.toFixed(5)}`;
    const c = this.cached(key);
    if (c !== undefined) return c;
    try {
      const url = new URL(`${this.base}/reverse`);
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lon));
      url.searchParams.set('format', 'json');
      url.searchParams.set('accept-language', 'uz,ru');
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SmartMurojaatAI/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return this.store(key, null);
      const r: any = await res.json();
      if (!r || r.error) return this.store(key, null);
      return this.store(key, {
        latitude: lat,
        longitude: lon,
        displayName: r.display_name,
      });
    } catch (e) {
      this.logger.warn(`Reverse geocode xatosi: ${(e as Error).message}`);
      return null;
    }
  }

  private store(key: string, value: GeocodeResult | null): GeocodeResult | null {
    this.cache.set(key, { value, ts: Date.now() });
    return value;
  }
}
