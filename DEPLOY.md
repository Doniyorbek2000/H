# 🚀 Smart Murojaat AI — Production Deploy qo'llanmasi

Bu hujjat platformani real serverga (VPS/bulut) xavfsiz o'rnatishni bosqichma-bosqich tushuntiradi.

## 0. Talablar

- Ubuntu 22.04+ server (kamida 2 vCPU, 4 GB RAM, 40 GB SSD)
- Domen nomi (masalan `murojaat.example.uz`), A-yozuvi server IP'ga yo'naltirilgan
- Docker + Docker Compose, Nginx, Certbot

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
```

## 1. Kodni olish va sozlash

```bash
sudo git clone https://github.com/Doniyorbek2000/H.git /opt/smart-murojaat
cd /opt/smart-murojaat
cp .env.example .env
```

## 2. Maxfiy kalitlarni yaratish (MAJBURIY)

`.env` ni tahrirlab, quyidagilarni **kuchli tasodifiy** qiymatlar bilan to'ldiring:

```bash
# Har biri uchun alohida ishga tushiring:
openssl rand -hex 32   # JWT_ACCESS_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
openssl rand -hex 32   # BOT_API_SECRET
openssl rand -hex 24   # POSTGRES_PASSWORD
```

`.env` da to'ldiriladigan majburiy maydonlar:

| O'zgaruvchi | Izoh |
|---|---|
| `POSTGRES_PASSWORD` | Bazaning kuchli paroli |
| `DATABASE_URL` | `postgresql://postgres:<parol>@postgres:5432/smart_murojaat?schema=public` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `BOT_API_SECRET` | Yuqoridagi tasodifiy qiymatlar |
| `WEB_URL` | `https://murojaat.example.uz` |
| `NEXT_PUBLIC_API_URL` | `https://murojaat.example.uz/api` |
| `SWAGGER_ENABLED` | **`false`** (production'da Swagger yopiq) |

Ixtiyoriy integratsiyalar (bo'lmasa fallback ishlaydi):

| O'zgaruvchi | Xizmat |
|---|---|
| `GEMINI_API_KEY` | Haqiqiy AI tahlil (aistudio.google.com/apikey) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot (@BotFather) |
| `FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY` | Mobil push (FCM) |
| `S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY` | MinIO/S3 fayl saqlash |

## 3. Konteynerlarni ishga tushirish

```bash
docker compose up -d --build
# api konteyneri avtomatik migratsiya + seed qiladi
docker compose ps          # hammasi "healthy" bo'lishi kerak
docker compose logs -f api  # loglarni kuzatish
```

> ⚠️ Birinchi ishga tushirishdan so'ng **demo seed akkauntlar** yaratiladi
> (`superadmin@example.com` / `Admin123!`). Production'da darhol yangi
> SUPER_ADMIN yarating va demo akkauntlar parolini o'zgartiring yoki o'chiring.

## 4. Nginx + HTTPS

```bash
sudo cp deploy/nginx-ssl.conf.example /etc/nginx/sites-available/smart-murojaat
sudo ln -s /etc/nginx/sites-available/smart-murojaat /etc/nginx/sites-enabled/
# konfiguratsiyada server_name ni o'z domeningizga o'zgartiring
sudo certbot --nginx -d murojaat.example.uz   # SSL sertifikat + avto-yangilanish
sudo nginx -t && sudo systemctl reload nginx
```

Certbot sertifikatni har 90 kunda avtomatik yangilaydi (`systemctl status certbot.timer`).

## 5. Zaxira nusxa (backup) — MAJBURIY

```bash
sudo cp deploy/backup.sh /opt/smart-murojaat/deploy/
sudo chmod +x /opt/smart-murojaat/deploy/backup.sh
# Cron: har kuni 02:00 da DB + fayllar zaxirasi
echo "0 2 * * * root /opt/smart-murojaat/deploy/backup.sh >> /var/log/sm-backup.log 2>&1" | sudo tee /etc/cron.d/sm-backup
```

Tiklash: `docker exec -i <pg-container> pg_restore -U postgres -d smart_murojaat --clean < db_YYYYMMDD.dump`

## 6. Ishga tushgandan keyingi tekshiruv

```bash
curl https://murojaat.example.uz/api/health          # {"status":"ok"}
# Fayl kirish himoyasi (tokensiz 401 qaytishi kerak):
curl -o /dev/null -w "%{http_code}\n" https://murojaat.example.uz/api/files/<biror-id>/raw
```

## 7. Xavfsizlik yakuniy ro'yxati

- [ ] `.env` dagi barcha sekretlar tasodifiy (default emas)
- [ ] `SWAGGER_ENABLED=false`
- [ ] HTTPS ishlaydi, HTTP → HTTPS yo'naltiradi
- [ ] Demo akkauntlar o'chirildi yoki paroli o'zgartirildi
- [ ] `backup.sh` cron o'rnatildi va bir marta qo'lda sinaldi
- [ ] Server ufw/firewall: faqat 80, 443, 22 ochiq (5432/6379/3001/3000 tashqaridan yopiq)
- [ ] Fayl kirish endpointi tokensiz 401 qaytaradi (yuqoridagi curl)

## 8. Mavjud cheklovlar (audit natijasi — ishlab chiqishda davom etadi)

Quyidagilar hozircha YO'Q va production ehtiyojiga qarab qo'shilishi kerak
(batafsil: loyihaning production readiness auditi):

- Fuqaro identifikatsiyasi: SMS/OTP, OneID/MyID integratsiyasi
- Monitoring/alerting (Sentry, Prometheus), markazlashtirilgan log
- (Endi mavjud — yoqish ixtiyoriy) Fayllarni virusdan tekshirish: `docker compose --profile av up -d` + `.env` da `CLAMAV_HOST=clamav`
- (Endi mavjud — yoqish ixtiyoriy) Xato monitoring: `.env` da `SENTRY_DSN` to'ldiring
- (Endi mavjud) Load test: `k6 run -e BASE_URL=https://murojaat.example.uz/api load-test/k6-smoke.js`
- Mobil ilovada push qabul qilish (firebase_messaging) va offline yozish navbati
- GIS: geocoding va mahalla chegaralari (hozir faqat nuqta + heatmap)
