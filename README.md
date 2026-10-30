# Weatherly 🌤️

> **Your day, forecasted beautifully.**

Aplikasi cuaca mobile untuk tugas kelompok kelas XI, dibangun dengan **Expo (React Native) + TypeScript**.
Data cuaca diambil dari **Open-Meteo** (gratis, tanpa API key), dengan cadangan data offline agar
aplikasi tetap bisa didemokan ketika jaringan tidak tersedia.

---

## Daftar layar

| # | Layar | Rute | Fitur |
|---|-------|------|--------|
| 01 | Splash | `/` | Animasi logo, lalu otomatis ke beranda |
| 02 | Home | `/(tabs)/home` | Cuaca saat ini, ringkasan (_feels like_, _sunrise_, _wind_), prakiraan per jam & 7 hari |
| 03 | Hourly forecast | `/hourly` | 24 jam ke depan + grafik/list per jam |
| 04 | 7-day forecast | `/daily` | Ringkasan mingguan (tertinggi/terendah) + detail tiap hari |
| 05 | Search city | `/(tabs)/search` | Pencarian kota (geocoding) + kota populer |
| 06 | Weather details | `/details` | UV index, kelembapan, angin, visibilitas, curah hujan, tekanan + grafik suhu |
| 07 | My cities | `/(tabs)/cities` | Daftar kota tersimpan (maks. 8) dengan cuaca terkini |
| 08 | Settings | `/(tabs)/settings` | Satuan °C/°F, notifikasi, bahasa, tampilan, tentang aplikasi |
| 09 | Weather map | `/(tabs)/map` | Peta interaktif (geser & zoom) dengan lapisan suhu, hujan, awan, dan angin |

### Tanpa login

- Aplikasi **tidak butuh login**: layar splash langsung membuka ke beranda
  (`/(tabs)/home`) tanpa meminta email atau kata sandi.
- Tidak ada layar login maupun menu **Sign out** — semua fitur tersedia
  langsung setelah aplikasi dibuka.
- Data lokal (kota tersimpan & pengaturan) tetap disimpan di AsyncStorage.

---

## Menjalankan aplikasi

```bash
# 1. install dependensi
npm install

# 2. jalankan development server
npx expo start
```

Pindai QR code dengan aplikasi **Expo Go** (Android/iOS), atau tekan `w` untuk membuka di browser.

Perintah lain:

```bash
npx expo start --android   # buka di emulator Android
npx expo start --ios       # buka di simulator iOS
npx expo start --web       # pratinjau di browser

npm run lint               # eslint (src/ + scripts/)
npm run typecheck          # tsc --noEmit
npm run icons              # buat ulang icon aplikasi dari SVG
npm run screenshots        # tangkap layar semua halaman (butuh Chrome)
node scripts/test-api.js   # uji parsing data Open-Meteo (butuh dev server)
```

> Semua pustaka sudah memakai paket yang kompatibel dengan **Expo SDK 58**. Jika menambah
> dependensi baru, selalu gunakan `npx expo install <paket>`.

---

## Struktur folder

```
src/
├── app/                  # routing Expo Router
│   ├── _layout.tsx       # root layout, provider, font
│   ├── index.tsx         # (01) splash
│   ├── hourly.tsx        # (03) hourly forecast
│   ├── daily.tsx         # (04) 7-day forecast
│   ├── details.tsx       # (06) weather details
│   └── (tabs)/           # bottom tab navigation
│       ├── _layout.tsx
│       ├── home.tsx      # (02)
│       ├── search.tsx    # (05)
│       ├── map.tsx       # (09)
│       ├── cities.tsx    # (07)
│       └── settings.tsx  # (08)
├── components/           # komponen UI (ikon cuaca SVG, tab bar, chart, dll)
├── constants/            # design token (warna, tipografi, spacing)
├── hooks/                # pemuatan font
├── lib/                  # model data, API Open-Meteo, format & helper
└── providers/            # settings, kota tersimpan, data cuaca
```

---

## API yang dipakai

| Endpoint | Kegunaan |
|----------|----------|
| `https://api.open-meteo.com/v1/forecast` | Cuaca saat ini, per jam, dan 7 hari |
| `https://api.open-meteo.com/v1/forecast` (banyak koordinat) | Grid cuaca untuk lapisan peta |
| `https://{a-d}.basemaps.cartocdn.com/{light_all\|dark_all}/{z}/{x}/{y}@2x.png` | Basemap peta (CARTO + OpenStreetMap) |
| `https://geocoding-api.open-meteo.com/v1/search` | Pencarian nama kota |

Dokumentasi: [Open-Meteo](https://open-meteo.com/en/docs).

Jika request gagal (tidak ada internet / DNS diblokir), `src/lib/mock.ts` akan membuat data
cuaca yang masuk akal dari koordinat kota sehingga seluruh halaman tetap tampil.

---

## Catatan untuk kelompok

- Semua ikon cuaca digambar dengan **SVG** (`src/components/WeatherIcon.tsx`) supaya tajam di
  semua ukuran layar dan tidak perlu file gambar tambahan.
- Warna aplikasi diambil dari aset desain di `assets/weatherly/` (lihat `src/constants/theme.ts`).
- Icon aplikasi dibuat dari `scripts/assets/weatherly-mark.svg` melalui `npm run icons`.
- State disimpan di **AsyncStorage**: daftar kota tersimpan dan pengaturan pengguna.
- Peta cuaca memakai tile **CARTO** di atas data **OpenStreetMap**, jadi atribusi
  “© OpenStreetMap contributors © CARTO” harus tetap terlihat di layar peta.

---

## Verifikasi (opsional)

Sudah diuji otomatis dengan Chrome headless (butuh `npx expo start --web` aktif):

- `npm run screenshots` → menyimpan tangkapan layar ke `.screenshots/`
- `node scripts/test-api.js` → memalsukan respons Open-Meteo dan memastikan angka yang
  tampil di layar benar (suhu, kondisi, sunrise/sunset, kelembapan, tekanan).
