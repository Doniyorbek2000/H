# Mobil ilovani chiqarish (Android Play Market + iOS) — qo'llanma

Bu qo'llanma `smart_murojaat_mobile` (Flutter) ilovasini **Google Play Market**ka
(va ixtiyoriy iOS App Store'ga) chiqarishning aniq texnik qadamlaridir.

> Ilova sozlamalari: `applicationId = uz.smartmurojaat.smart_murojaat_mobile`,
> versiya `1.0.0+1` (`pubspec.yaml`), release signing `key.properties` orqali ulangan.

---

## 0. Production API manzilini ulash

Ilova default'da dev manzilга (`http://10.0.2.2:3001`) qaraydi. Release build'da
production API'ni **build vaqtida** bering:

```bash
flutter build appbundle --release \
  --dart-define=SERVER_URL=https://murojaat.example.uz
```

> `SERVER_URL` `HTTPS` bo'lishi shart (Android release'da oddiy HTTP bloklanadi).
> Foydalanuvchi ilovada qo'lda boshqa manzil kiritsa, u ustun bo'ladi.

---

## 1. Release keystore yaratish (bir marta)

Keystore — ilovani imzolovchi maxfiy kalit. **Yo'qotmang** va **git'ga qo'ymang**
(aks holda ilovani boshqa yangilay olmaysiz).

```bash
keytool -genkey -v \
  -keystore ~/smart-murojaat-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias smart-murojaat
```

So'ralganda parol va tashkilot ma'lumotlarini kiriting va **xavfsiz saqlang**.

### `key.properties` faylini yarating

`apps/mobile/android/key.properties` (bu fayl `.gitignore`da bo'lishi kerak):

```properties
storePassword=<keystore paroli>
keyPassword=<kalit paroli>
keyAlias=smart-murojaat
storeFile=/absolute/path/smart-murojaat-release.jks
```

> `build.gradle.kts` allaqachon shu faylni o'qiydi: fayl bo'lsa — release imzosi,
> bo'lmasa — debug imzosi (ishlab chiqishda). Tekshiring:
> `apps/mobile/android/app/build.gradle.kts`.

---

## 2. Versiyani belgilash

`pubspec.yaml` → `version: 1.0.0+1`
- `1.0.0` — foydalanuvchiga ko'rinadigan versiya (versionName)
- `+1` — Play Market uchun **versionCode** (har yangi yuklamada oshirilishi shart)

Yangilashda masalan: `version: 1.0.1+2`.

---

## 3. AAB (Android App Bundle) build qilish

```bash
cd apps/mobile
flutter clean
flutter pub get
flutter build appbundle --release \
  --dart-define=SERVER_URL=https://murojaat.example.uz
```

Natija: `build/app/outputs/bundle/release/app-release.aab` — Play Console'ga shu fayl yuklanadi.

> Sinov uchun APK: `flutter build apk --release --dart-define=SERVER_URL=...`

---

## 4. Google Play Console (tashkiliy + texnik)

1. **Google Play Developer** akkaunt oching ($25 bir martalik) — davlat tashkiloti
   nomidan ochilishi tavsiya etiladi.
2. Yangi ilova yarating: nomi "Smart Murojaat AI", til: o'zbek.
3. **Store listing**: qisqa/to'liq tavsif, ilova ikonkasi (512×512),
   feature graphic (1024×500), kamida 2 skrinshot (telefon).
4. **Privacy Policy URL** (majburiy) — fuqaro ma'lumotlari yig'ilgani uchun.
5. **Data safety** formasi: qanday ma'lumot yig'ilishini deklaratsiya qiling
   (F.I.Sh, telefon, joylashuv, media).
6. **Content rating** so'rovnomasi.
7. AAB'ni **Internal testing** → **Production** treklariga yuklang.
8. Google **ko'rib chiqishi** (bir necha kundan bir haftagacha; rad etilishi mumkin).

---

## 5. iOS App Store (ixtiyoriy)

> `ios/` papka mavjud, lekin sozlanmagan. Kerak:

1. **Apple Developer** akkaunt ($99/yil).
2. Build uchun **macOS + Xcode** (Linux'da iOS build qilib bo'lmaydi).
3. Bundle ID, sertifikat/provisioning profil, imzolash.
4. `flutter build ipa --dart-define=SERVER_URL=...`.
5. App Store Connect'ga yuklash + **App Store review** (Google'dan qattiqroq).

---

## Qisqa cheklist

- [ ] Production `SERVER_URL` (HTTPS) tayyor
- [ ] Release keystore yaratildi va xavfsiz saqlandi
- [ ] `android/key.properties` yaratildi (git'da emas)
- [ ] `pubspec.yaml` versiyasi to'g'ri (versionCode oshirilgan)
- [ ] `app-release.aab` build qilindi va imzosi tekshirildi
- [ ] Play Console: listing + Privacy Policy + Data Safety + content rating
- [ ] Internal testing'da sinaldi → Production'ga chiqarildi
- [ ] (ixtiyoriy) iOS: Apple akkaunt + Mac + review

> **Diqqat:** keystore va `key.properties` hech qachon repozitoriyaga commit
> qilinmaydi — ular `.gitignore`da bo'lishi shart.
