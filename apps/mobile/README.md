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
- 🔲 **QR skaner** — murojaat QR kodini o'qib holatini ko'rsatadi (`mobile_scanner`)
- 🔔 **Bildirishnomalar** — ro'yxat, o'qilgan belgisi, bosganda murojaatga o'tish (30s polling; FCM push pastda)
- 📴 **Offline rejim** — GET javoblari keshlanadi, internet yo'qolsa keshdan ko'rsatiladi (banner bilan)
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

## Push bildirishnomalar (FCM) — keyingi qadam

Hozir bildirishnomalar 30 soniyalik polling bilan ishlaydi. Haqiqiy push uchun:

1. Firebase loyihasi yarating, `google-services.json` (Android) / `GoogleService-Info.plist` (iOS) qo'shing
2. `firebase_messaging` paketini ulang, FCM tokenni backendga yuboring
   (User modeliga `fcmToken` maydoni qo'shib, `NotificationsService.notifyUser` da FCM'ga ham yuborish kifoya)

## Tekshirilgan

- `flutter analyze` — 0 muammo
- `flutter test` — o'tdi
