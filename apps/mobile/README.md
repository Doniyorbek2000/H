# 📱 Smart Murojaat AI — Mobil ilova (Flutter)

Rahbarlar va xodimlar uchun mobil ilova: biriktirilgan murojaatlar, dashboard, AI tavsiyalari, foto/GPS/elektron imzo biriktirish, QR skaner va offline rejim.

## Imkoniyatlar

- 🔐 **Login** — JWT (access/refresh rotation), tokenlar xavfsiz saqlanadi (`flutter_secure_storage`)
- 📊 **Dashboard** — statistik kartalar + AI ko'rigini kutayotgan murojaatlar
- 📋 **Murojaatlar** — rol bo'yicha (EXECUTOR faqat o'ziga biriktirilganlarni ko'radi), status filtri, pagination
- 📄 **Murojaat detali** — to'liq ma'lumot, AI tahlil bloki, holat o'zgartirish, izohlar, holatlar tarixi
- 📷 **Foto yuklash** — kamera yoki galereyadan, murojaatga biriktiriladi
- 📍 **GPS** — joriy joylashuvni murojaatga biriktirish (`geolocator`)
- ✍️ **Elektron imzo** — imzo chizib PNG sifatida biriktiriladi + ichki izoh
- 🎤 **Ovozli izoh** — mikrofon orqali yozib (m4a/AAC) murojaatga biriktiriladi (`record`)
- 🔲 **QR skaner** — murojaat QR kodini o'qib holatini ko'rsatadi (`mobile_scanner`)
- 🔔 **Bildirishnomalar** — ro'yxat, o'qilgan belgisi, bosganda murojaatga o'tish (30s polling; FCM push pastda)
- 📴 **Offline rejim** — GET javoblari keshlanadi (banner bilan); holat o'zgartirish/izoh oflaynda **navbatga saqlanadi** (outbox) va aloqa tiklanganda avtomatik yuboriladi
- 🔔 **FCM push** — Firebase orqali qabul qilinadi, push bosilganda kerakli murojaat sahifasi ochiladi (Firebase sozlanmagan bo'lsa jimgina polling'ga tushadi)
- ⚙️ **Server sozlamasi** — login ekranida API manzilini o'zgartirish mumkin

## Ishga tushirish

Talab: [Flutter SDK](https://docs.flutter.dev/get-started/install) 3.24+ (stable).

```bash
cd apps/mobile
flutter pub get
flutter run              # ulangan qurilma yoki emulatorda
```

**Server manzili**: Android emulatorda default `http://10.0.2.2:3001` (host mashinadagi API).
Haqiqiy qurilmada login ekranidagi "⚙️ Server sozlamasi" orqali API manzilini kiriting
(masalan `https://api.murojaat.uz` yoki lokal tarmoqdagi `http://192.168.x.x:3001`).

Demo login: `executor@example.com` / `Admin123!` (yoki boshqa seed akkauntlar).

## Build (release)

```bash
flutter build apk --release          # Android APK
flutter build appbundle --release    # Google Play uchun AAB
flutter build ios --release          # iOS (macOS + Xcode kerak)
```

## Ruxsatlar

Android: `INTERNET`, `CAMERA`, `ACCESS_FINE_LOCATION` manifest'ga qo'shilgan;
dev rejimda HTTP API uchun `usesCleartextTraffic=true` yoqilgan (production'da HTTPS ishlating).

iOS (`ios/Runner/Info.plist` ga qo'shing):

```xml
<key>NSCameraUsageDescription</key>
<string>Murojaatga foto biriktirish va QR skanerlash uchun</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Murojaatga GPS joylashuvni biriktirish uchun</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Galereyadan foto tanlash uchun</string>
```

## Push bildirishnomalar (FCM)

Ilova va backend **to'liq tayyor**: `firebase_core`/`firebase_messaging` ulangan,
`PushService` tokenni backendga yuboradi, push bosilganda murojaat sahifasi ochiladi,
logoutda token o'chiriladi. Backend `PushService` (FCM HTTP v1) qurilmaga yuboradi.

Ishga tushirish uchun **Firebase konfiguratsiyasi** kerak (aks holda push jimgina o'chadi,
polling ishlaydi):

1. Firebase loyihasi yarating
2. `google-services.json` ni `android/app/` ga, `GoogleService-Info.plist` ni `ios/Runner/` ga qo'shing
3. Android: `android/app/build.gradle.kts` da `com.google.gms.google-services` plaginini yoqing (izohdan oching)
4. Server `.env` da `FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY` (service account) to'ldiring

## Release imzo (Android)

Play Market uchun signing sozlangan (`android/app/build.gradle.kts`):

1. Keystore yarating:
   ```bash
   keytool -genkey -v -keystore ~/sm-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias sm-release
   ```
2. `android/key.properties.example` ni `android/key.properties` deb nusxalab to'ldiring
   (bu fayl `.gitignore` da — git'ga kirmaydi)
3. `flutter build appbundle --release` — endi release kaliti bilan imzolanadi (minify+shrink yoqilgan)

`key.properties` bo'lmasa debug kaliti ishlatiladi (lokal `flutter run --release` uchun).

## Tekshirilgan

- `flutter analyze` — 0 muammo
- `flutter test` — o'tdi
