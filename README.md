# 🏛 Smart Murojaat AI

Hokimliklar, davlat tashkilotlari va kommunal xizmatlar uchun **AI asosidagi murojaatlar bilan ishlash platformasi**. Fuqarolardan keladigan murojaatlarni web portal, admin panel va Telegram bot orqali qabul qiladi, **Gemini AI** yordamida avtomatik tahlil qilib mas'ul bo'limga yo'naltiradi, ijro muddatlarini nazorat qiladi, rahbarlar uchun dashboard va AI hisobotlar tayyorlaydi.

## ✨ Imkoniyatlar

- 📥 **Ko'p kanalli qabul** — web portal, admin panel (operator), Telegram bot, QR
- 🤖 **AI tahlil (Gemini)** — kategoriya, ustuvorlik, mas'ul bo'lim tavsiyasi, qisqa mazmun, sentiment, yetishmayotgan ma'lumotlar, fuqaroga javob loyihasi. API key bo'lmasa **fallback** (kalit so'z tasniflagichi) ishlaydi — tizim to'xtamaydi
- 🔁 **To'liq ijro oqimi** — NEW → AI_ANALYZING → OPERATOR_REVIEW → ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED → CLOSED (+ OVERDUE, REOPENED, REJECTED, WAITING_*)
- ⏰ **Muddat nazorati** — kategoriya bo'yicha standart muddatlar, 24/6 soat eslatmalar, muddat o'tsa avtomatik OVERDUE + ogohlantirish
- 📊 **Rahbar dashboardi** — statistik kartalar, 30 kunlik trend, kategoriya/mahalla kesimi, kechikayotganlar
- 🗺 **Xarita** — murojaatlar OpenStreetMap ustida status bo'yicha ranglangan, **heatmap rejimi** (ustuvorlik og'irligi bilan)
- 🏆 **KPI** — xodimlar samaradorlik ball (formula asosida) va bo'limlar reytingi
- 🌙 **Dark mode** — navbar'dagi tugma bilan almashinadi, tanlov saqlanadi, tizim temasiga mos default
- 📄 **Hisobotlar** — kunlik/haftalik/oylik, AI xulosa, **PDF va Excel** eksport
- 🔔 **Bildirishnomalar** — in-app + Telegram (xodimga vazifa, muddat eslatmasi, fuqaroga holat o'zgarishi)
- 🤝 **Takroriy murojaatlar** — yaratishda semantik o'xshashlik bo'yicha avto-aniqlash, operator tomonidan birlashtirish (`POST /appeals/:id/merge`), fuqaroga xabar
- 🔐 **Xavfsizlik** — JWT access/refresh (rotation), rol asosidagi ruxsatlar, tashkilot doirasi (org scope), rate limit, helmet, fayl validatsiyasi, audit log
- 📱 **Telegram bot** — to'liq **o'zbek/rus** tillarida; fuqaro: murojaat yuborish/kuzatish/baholash; xodim: /hisobot, /bugun, /kechikkanlar
- 🗄 **Storage abstraksiyasi** — default lokal disk; `S3_*` env berilsa **MinIO/S3** ga yuklaydi (presigned URL), `docker compose --profile s3` bilan lokal MinIO

## 🧱 Texnologiyalar

| Qatlam | Texnologiya |
|---|---|
| Monorepo | pnpm workspaces |
| Backend | NestJS 10 + TypeScript, Prisma ORM, PostgreSQL 16 |
| Queue/Cache | Redis + BullMQ (Redis bo'lmasa inline fallback) |
| Frontend | Next.js 14 (App Router) + TailwindCSS + Recharts + Leaflet |
| AI | Google Gemini API (`gemini-1.5-flash`) |
| Bot | grammY |
| Export | pdfkit (PDF), exceljs (Excel) |
| Docs | Swagger (`/docs`) |
| Deploy | Docker, docker-compose, Nginx namunasi |

## 📁 Tuzilma

```
smart-murojaat-ai/
├─ apps/
│  ├─ api/        # NestJS backend (auth, appeals, AI, dashboard, reports, ...)
│  ├─ web/        # Next.js admin panel + fuqaro portali
│  └─ bot/        # Telegram bot (grammY)
├─ packages/
│  └─ shared/     # Umumiy enums, types, konstantalar (uz labellar)
├─ deploy/nginx.conf.example
├─ docker-compose.yml
└─ .env.example
```

## 🚀 O'rnatish (lokal)

**Talablar:** Node.js 22+, pnpm 9+, PostgreSQL 16, Redis 7 (ixtiyoriy, lekin tavsiya).

```bash
# 1. Klonlash va o'rnatish
pnpm install

# 2. Env sozlash
cp .env.example .env
# .env ichida DATABASE_URL, JWT_*, GEMINI_API_KEY, TELEGRAM_BOT_TOKEN ni to'ldiring

# 3. Bazani yaratish
createdb smart_murojaat   # yoki: psql -c "CREATE DATABASE smart_murojaat;"

# 4. Shared paketni build qilish
pnpm --filter @smart/shared build

# 5. Prisma: client + migratsiya + seed
pnpm prisma:generate
pnpm prisma:migrate        # dev migratsiya (apps/api ichida ishlaydi)
pnpm seed                  # demo ma'lumotlar

# 6. Ishga tushirish (alohida terminallar)
pnpm dev:api    # http://localhost:3001  (Swagger: /docs)
pnpm dev:web    # http://localhost:3000
pnpm dev:bot    # Telegram bot (TELEGRAM_BOT_TOKEN kerak)
```

## 🐳 Docker bilan ishga tushirish

```bash
cp .env.example .env       # kerakli qiymatlarni to'ldiring
docker compose up -d --build
```

Konteynerlar: `postgres`, `redis`, `api` (migratsiya+seed avtomatik), `web`, `bot`.
- Admin panel: http://localhost:3000
- API + Swagger: http://localhost:3001/docs

## 👤 Demo akkauntlar (seed)

Parol hammasi uchun: **Admin123!**

| Rol | Email |
|---|---|
| SUPER_ADMIN | superadmin@example.com |
| ADMIN | admin@example.com |
| OPERATOR | operator@example.com |
| EXECUTOR | executor@example.com |
| MANAGER | manager@example.com |
| LEADER | leader@example.com |

Seed shuningdek: "Chust tumani hokimligi" tashkiloti, 5 ta bo'lim, 12 ta kategoriya, 20 ta demo murojaat yaratadi.

## 🤖 Gemini AI ulash

1. https://aistudio.google.com/apikey dan API key oling
2. `.env` da: `GEMINI_API_KEY=...` va `GEMINI_MODEL=gemini-1.5-flash`
3. API ni qayta ishga tushiring

Key bo'lmasa tizim **fallback** rejimda ishlaydi: kalit so'z asosida kategoriya/ustuvorlik aniqlanadi, standart javob loyihalari ishlatiladi. AI natijalari audit logga yoziladi.

## 📱 Telegram bot sozlash

1. [@BotFather](https://t.me/BotFather) dan bot yarating → tokenni oling
2. `.env` da: `TELEGRAM_BOT_TOKEN=...` va `BOT_API_SECRET` (bot↔API ichki kaliti) ni kiriting
3. `pnpm dev:bot` (yoki docker) — bot polling rejimida ishlaydi

**Fuqaro:** /start → til → telefon → 📝 murojaat (kategoriya, matn, mahalla, lokatsiya, **rasm/video/hujjat** — 5 tagacha) → raqam oladi → holat o'zgarishida xabar oladi → yakunda baholaydi.
**Xodim:** /login (email+parol, chatId bog'lanadi) → yangi vazifa/muddat xabarlari keladi → /hisobot, /bugun, /kechikkanlar.

## 📚 API hujjati

Swagger UI: `http://localhost:3001/docs` (production'da `SWAGGER_ENABLED=false` qiling).

Asosiy guruhlar: `/auth`, `/users`, `/organizations`, `/departments`, `/categories`, `/appeals` (+ `/appeals/public`, `/appeals/track/:number`), `/dashboard/*`, `/reports/*`, `/notifications`, `/files`, `/audit-logs`, `/settings`, `/telegram/*` (bot uchun, X-Bot-Secret bilan).

Barcha ro'yxat endpointlarida: `page`, `limit`, `search`, `sortBy`, `sortOrder` + kontekstga mos filtrlar.

## 🔐 Rol ruxsatlari

| Rol | Doira |
|---|---|
| SUPER_ADMIN | Butun tizim, tashkilotlar yaratish |
| ADMIN | O'z tashkiloti: xodimlar, bo'limlar, murojaatlar nazorati |
| OPERATOR | O'z tashkiloti murojaatlari: AI tekshiruv, yo'naltirish |
| MANAGER | O'z bo'limi murojaatlari, KPI, qayta taqsimlash |
| EXECUTOR | Faqat o'ziga biriktirilgan murojaatlar |
| LEADER | O'z tashkiloti statistikasi, hisobotlar |
| CITIZEN | Faqat o'z murojaatlari |

## 🏭 Production tavsiyalari

- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `BOT_API_SECRET` — kuchli tasodifiy qiymatlar (`openssl rand -hex 32`)
- `SWAGGER_ENABLED=false`
- Nginx reverse-proxy + HTTPS (namuna: `deploy/nginx.conf.example`, certbot)
- PostgreSQL backup (pg_dump cron), `uploads` volume backup
- Fayllar uchun MinIO/S3: `.env` da `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` to'ldiring — yangi fayllar S3 ga tushadi, eski lokal fayllar ishlashda davom etadi (`/files/:id/raw` ikkalasini ham biladi). Lokal MinIO: `docker compose --profile s3 up -d` (konsol: http://localhost:9001)
- Telegram botni webhook rejimiga o'tkazish (yuqori yuklamada)

## 🧪 Tekshirilgan buyruqlar

```bash
pnpm install                      # ✅
pnpm --filter @smart/shared build # ✅
pnpm prisma:generate              # ✅
pnpm prisma:migrate               # ✅ (init migratsiya)
pnpm seed                         # ✅ 20 demo murojaat
pnpm --filter @smart/api build    # ✅
pnpm --filter @smart/web build    # ✅ 14 sahifa
pnpm --filter @smart/bot build    # ✅
```
