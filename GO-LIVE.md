# Real ishga tushirish (Go-Live) cheklisti — Smart Murojaat AI

Bu hujjat platformani **haqiqiy fuqarolar ma'lumotlari bilan** davlat organida (hokimlik)
ishga tushirish uchun bosqichma-bosqich cheklistdir.

> **Muhim:** Dasturiy qism (kod) tayyor va CI'da sinovdan o'tgan. Quyidagi ishlarning
> ko'pchiligi **kod emas** — tashkiliy, huquqiy va infratuzilma ishlari. Har bir band
> **texnik (T)** yoki **tashkiliy/huquqiy (H)** deb belgilangan.

Belgilar: `[ ]` — bajarilmagan, `[x]` — bajarilgan, **(T)** texnik, **(H)** tashkiliy/huquqiy.

---

## 0. Holat — kod jihatidan tayyor ✅

- [x] Backend (NestJS + Prisma + PostgreSQL + Redis/BullMQ) — modullar to'liq
- [x] Web panel (Next.js) + fuqaro portali
- [x] Mobil ilova (Flutter) + Telegram bot
- [x] AI tahlil (Gemini + keyword fallback)
- [x] RBAC, JWT (refresh rotation), fayl kirish nazorati, OneID CSRF/exchange
- [x] Testlar: API unit (28) + API e2e (26) + web e2e (5) + mobil (10)
- [x] CI (GitHub Actions): build + barcha test qatlamlari yashil
- [x] Ops skriptlar: `DEPLOY.md`, `deploy/nginx-ssl.conf.example`, `deploy/backup.sh`, `load-test/k6-smoke.js`

---

## 1. Huquqiy va tashkiliy (birinchi navbatda) — **(H)**

Bularsiz real integratsiyalar ishlamaydi; ular odatda **eng uzoq** davom etadigan qadamlar.

- [ ] **(H)** Hokimlik/tashkilot bilan rasmiy kelishuv (ma'lumotlar egasi, mas'ul shaxs)
- [ ] **(H)** **Shaxsga doir ma'lumotlar** to'g'risidagi qonunga muvofiqlik: ma'lumotlarni
      qayta ishlash asosnomasi, roziliklar, saqlash muddati siyosati
- [ ] **(H)** Ma'lumotlar O'zbekiston hududidagi serverda saqlanishi talabini tekshirish
- [ ] **(H)** **OneID (id.egov.uz)** integratsiyasi uchun Davlat xizmatlari agentligi bilan
      shartnoma → real `ONEID_CLIENT_ID` / `ONEID_CLIENT_SECRET` / `redirect_uri` ro'yxatga olish
- [ ] **(H)** **Eskiz.uz** SMS shartnomasi + tasdiqlangan jo'natuvchi nomi (`ESKIZ_FROM`)
- [ ] **(H)** Maxfiylik siyosati (Privacy Policy) va foydalanish shartlari (mobil ilova
      do'konlariga chiqarish uchun ham zarur)

---

## 2. Integratsiya kalitlari va real sinov — **(T)** + **(H)**

Har bir integratsiya **real hisob bilan uchidan-uchiga** sinalishi kerak (kod tayyor).

- [ ] **OneID** — real login oqimi: fuqaro `id.egov.uz` orqali kiradi → callback → sessiya
- [ ] **Eskiz SMS/OTP** — real telefon raqamiga kod yuborilishini tasdiqlash
- [ ] **Gemini AI** — `GEMINI_API_KEY` + to'lov; real murojaatlarda tahlil sifatini baholash
- [ ] **Firebase FCM** — real qurilmaga push yetkazilishi (`FIREBASE_*`)
- [ ] **S3/MinIO** — real bucket'ga fayl yuklash/yuklab olish (`S3_*`)
- [ ] **ClamAV** — antivirus servisi ishga tushirilgan va zararli fayl bloklanishini sinash
- [ ] **Nominatim/GEOCODER** — o'z instansi yoki litsenziyalangan xizmat (`GEOCODER_URL`)
- [ ] **Telegram bot** — production token + webhook rejimi (`BOT_WEBHOOK_URL`)

> Barcha kalitlar `.env` (yoki secret manager) orqali beriladi — repozitoriyaga
> **hech qachon** commit qilinmaydi.

---

## 3. Infratuzilma — **(T)**

Batafsil texnik qadamlar: `DEPLOY.md`.

- [ ] Production server (O'zbekistonda joylashgan, resurs rejasi: CPU/RAM/disk)
- [ ] Domen ro'yxatga olish (masalan `murojaat.<tuman>.uz`)
- [ ] **SSL sertifikat** (Let's Encrypt yoki rasmiy) — `deploy/nginx-ssl.conf.example`
- [ ] Production **PostgreSQL** (alohida, boshqariladigan yoki maxsus server)
- [ ] Production **Redis** (BullMQ navbati uchun)
- [ ] `docker compose` yoki orkestratsiya bilan deploy (`prisma migrate deploy`)
- [ ] **Zaxira nusxa (backup)**: `deploy/backup.sh` cron'ga qo'yilgan + tiklash sinovi
- [ ] Fayl saqlash: S3/MinIO (lokal diskdan ko'ra afzal, `UPLOAD_DIR` emas)
- [ ] **Monitoring**: Sentry (`SENTRY_DSN`) + server metrikalar + log yig'ish
- [ ] Sog'liq tekshiruvi (`/health`) va avtomatik qayta ishga tushirish

### Production `.env` majburiy o'zgartirishlar
- [ ] `NODE_ENV=production`
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — kuchli, tasodifiy, yangi qiymatlar
- [ ] `BOT_API_SECRET` — yangi maxfiy kalit
- [ ] `WEB_URL` / `API_URL` / `NEXT_PUBLIC_API_URL` — real domenlar
- [ ] `SWAGGER_ENABLED=false` (yoki himoyalangan) — production'da API hujjati ochiq bo'lmasin
- [ ] Demo seed **ishlatilmaydi** (`SEED_DEMO` qo'yilmaydi) — demo akkauntlar yaratilmaydi

---

## 4. Xavfsizlik (davlat organi uchun majburiy) — **(T)** + **(H)**

- [ ] **(H)** Mustaqil **penetration test** / xavfsizlik auditi
- [ ] **(T)** Barcha default parollar/secretlar almashtirilgan
- [ ] **(T)** Rate-limit va throttling production yuklamasiga moslangan
- [ ] **(T)** HTTPS majburiy (HTTP → HTTPS redirect), xavfsiz cookie/headerlar (helmet yoqilgan)
- [ ] **(T)** Ma'lumotlar bazasi tarmoq darajasida yopiq (faqat API kirishi mumkin)
- [ ] **(T)** Audit jurnal (audit modul) yoqilgan va saqlanadi
- [ ] **(H)** Rol/ruxsatlar matritsasi tashkilot tomonidan tasdiqlangan
- [ ] **(H)** Ma'lumotlarni tiklash va incident (buzilish) rejasi

---

## 5. Ma'lumot va migratsiya — **(T)** + **(H)**

- [ ] **(H)** Boshlang'ich ma'lumotlar: real tashkilot, bo'limlar, kategoriyalar, xodimlar
- [ ] **(T)** Real xodim akkauntlarini yaratish (kuchli parol siyosati bilan)
- [ ] **(H)** Mavjud (eski) murojaatlarni ko'chirish kerakmi — reja
- [ ] **(T)** Kategoriya bo'yicha muddat (SLA soatlar) qiymatlarini tashkilot bilan sozlash

---

## 6. Pilot va o'qitish — **(H)**

- [ ] **(H)** Cheklangan **pilot** (bitta bo'lim yoki mahalla) bilan sinov ishga tushirish
- [ ] **(H)** Operator/ijrochi/rahbarlar uchun **o'quv** (qo'llanma + amaliy sessiya)
- [ ] **(H)** Fuqarolar uchun yo'riqnoma (portal/bot/mobil qanday ishlaydi)
- [ ] **(H)** Fikr-mulohaza yig'ish va tuzatish sikli

---

## 7. Ishga tushirilgandan keyin — **(T)** + **(H)**

- [ ] **(T)** Monitoring/alert (xatolik, kechikish, navbat to'lib qolishi)
- [ ] **(T)** Muntazam backup tekshiruvi (tiklanish real sinovi)
- [ ] **(H)** Qo'llab-quvvatlash (support) tartibi va mas'ul jamoa
- [ ] **(H)** SLA monitoring: kechikkan/eskalatsiya qilingan murojaatlar hisoboti
- [ ] **(T)** Real yuklamada `load-test/k6-smoke.js` bilan bardoshlilik sinovi

---

## Qisqa xulosa

| Bosqich | Kim bajaradi | Taxminiy og'irlik |
|---|---|---|
| 1. Huquqiy/tashkiliy | Hokimlik + huquqshunos | Eng uzoq (shartnomalar) |
| 2. Integratsiya kalitlari | Texnik + tashkilot | O'rta |
| 3. Infratuzilma | Texnik (DevOps) | O'rta |
| 4. Xavfsizlik auditi | Mustaqil auditor | O'rta |
| 5. Ma'lumot/migratsiya | Texnik + tashkilot | Past–o'rta |
| 6. Pilot/o'qitish | Tashkilot | O'rta |
| 7. Keyingi qo'llab-quvvatlash | Texnik + tashkilot | Doimiy |

**Dasturiy qism tayyor.** Real ishga tushirish uchun asosiy to'siq — bu **huquqiy
kelishuvlar (ayniqsa OneID va SMS)**, **infratuzilma** va **xavfsizlik auditi**.
