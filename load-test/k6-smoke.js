// Smart Murojaat AI — k6 load test.
// Ishga tushirish:
//   k6 run -e BASE_URL=http://localhost:3001 load-test/k6-smoke.js
// yoki og'irroq: k6 run --vus 50 --duration 2m ...
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // sekin ko'tarilish
    { duration: '1m', target: 20 }, // barqaror yuk
    { duration: '30s', target: 0 }, // pasayish
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% so'rov < 800ms
    errors: ['rate<0.05'], // xatolar < 5%
  },
};

export function setup() {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ identifier: 'leader@example.com', password: 'Admin123!' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  return { token: res.json('accessToken') };
}

export default function (data) {
  const authHeaders = { headers: { Authorization: `Bearer ${data.token}` } };

  // 1) Dashboard overview (og'ir agregatsiya)
  const overview = http.get(`${BASE}/dashboard/overview`, authHeaders);
  check(overview, { 'overview 200': (r) => r.status === 200 }) || errorRate.add(1);

  // 2) Murojaatlar ro'yxati (pagination + filter)
  const list = http.get(`${BASE}/appeals?limit=20&page=1`, authHeaders);
  check(list, { 'appeals 200': (r) => r.status === 200 }) || errorRate.add(1);

  // 3) KPI (eng og'ir endpoint — N+1 tuzatilgan)
  const kpi = http.get(`${BASE}/dashboard/kpi`, authHeaders);
  check(kpi, { 'kpi 200': (r) => r.status === 200 }) || errorRate.add(1);

  // 4) Public murojaat yaratish (throttle chegarasida)
  const created = http.post(
    `${BASE}/appeals/public`,
    JSON.stringify({
      title: 'Load test murojaati',
      description: 'k6 yuklama testi uchun avtomatik yaratilgan murojaat matni.',
      citizenName: 'Load Test',
      citizenPhone: '+998900000000',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  // 201 yoki 429 (throttle) — ikkalasi ham kutilgan
  check(created, { 'public create ok/throttled': (r) => r.status === 201 || r.status === 429 });

  sleep(1);
}
