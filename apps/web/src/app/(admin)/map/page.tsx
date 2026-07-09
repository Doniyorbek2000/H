'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import 'leaflet/dist/leaflet.css';
import { api } from '@/lib/api';
import { STATUS_HEX, STATUS_LABELS_UZ, PRIORITY_LABELS_UZ } from '@/lib/labels';
import { Card, ErrorState, Select, Skeleton } from '@/components/ui';

export default function MapPage() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [mahallas, setMahallas] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [mahallaFilter, setMahallaFilter] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api('/dashboard/map')
      .then((data) => {
        setAppeals(data);
        setMahallas(Array.from(new Set(data.map((a: any) => a.mahalla).filter(Boolean))) as string[]);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapRef.current || mapInstance.current) return;
      const map = L.map(mapRef.current).setView([41.005, 71.24], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);
      mapInstance.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapInstance.current) return;
    (async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstance.current;
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      const filtered = appeals.filter(
        (a) =>
          (!statusFilter || a.status === statusFilter) &&
          (!mahallaFilter || a.mahalla === mahallaFilter),
      );
      const bounds: [number, number][] = [];
      filtered.forEach((a) => {
        const color = STATUS_HEX[a.status] ?? '#64748b';
        const marker = L.circleMarker([a.latitude, a.longitude], {
          radius: a.priority === 'URGENT' ? 11 : 8,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          fillOpacity: 0.9,
        }).addTo(map);
        marker.bindPopup(
          `<div style="min-width:180px">
            <div style="font-family:monospace;font-size:11px;color:#64748b">${a.appealNumber}</div>
            <div style="font-weight:600;margin:2px 0">${a.title}</div>
            <div style="font-size:12px">${(STATUS_LABELS_UZ as any)[a.status]} · ${(PRIORITY_LABELS_UZ as any)[a.priority]}</div>
            <div style="font-size:11px;color:#64748b">${a.mahalla ?? ''}</div>
            <a href="/appeals/${a.id}" style="font-size:12px;color:#2563eb">Batafsil →</a>
          </div>`,
        );
        markersRef.current.push(marker);
        bounds.push([a.latitude, a.longitude]);
      });
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    })();
  }, [ready, appeals, statusFilter, mahallaFilter, router]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Murojaatlar xaritasi</h1>
        <p className="text-sm text-slate-500">Koordinatali murojaatlar: {appeals.length} ta</p>
      </div>

      {error && <ErrorState message={error} />}

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Barcha holatlar</option>
            {Object.entries(STATUS_LABELS_UZ).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select value={mahallaFilter} onChange={(e) => setMahallaFilter(e.target.value)}>
            <option value="">Barcha mahallalar</option>
            {mahallas.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {Object.entries(STATUS_HEX)
            .filter(([k]) => ['NEW', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'REJECTED'].includes(k))
            .map(([k, hex]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: hex }} />
                {(STATUS_LABELS_UZ as any)[k]}
              </span>
            ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {!ready && <Skeleton className="h-[560px] w-full" />}
        <div ref={mapRef} className="z-0 h-[560px] w-full" style={{ display: ready ? 'block' : 'none' }} />
      </Card>
    </div>
  );
}
