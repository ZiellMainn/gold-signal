# Gold Signal · XAUUSD

Aplikasi analisa emas (XAUUSD) yang membaca grafik secara live, memberi sinyal **BUY / SELL / TUNGGU**, lengkap dengan stop loss, take profit, dan ukuran lot otomatis sesuai persen risiko kamu.

> ⚠️ **Alat bantu analisa, bukan nasihat keuangan.** Tidak ada strategi yang menjamin untung. Pakai **akun demo** dulu sampai kamu paham cara kerjanya dan hasilnya konsisten.

## Fitur

- **Harga XAUUSD otomatis**: grafik dari PAXG lalu disamakan tiap menit ke harga emas spot XAUUSD asli (xaus.com / gold-api.com), jadi tidak wajib menyamakan manual ke broker.
- **Panduan di dalam aplikasi**: cara pasang di iPhone/Android/laptop (dengan tombol pasang otomatis), cara cek broker resmi Bappebti, buka akun demo MT5, menyamakan MT5, dan memasang order dari sinyal.
- **Tampilan HP & laptop**: di layar lebar menu pindah ke samping dan konten jadi dua kolom.
- **Harga live** (WebSocket, otomatis pindah ke polling kalau gagal) + jam WIB, status pasar emas buka/tutup, dan sesi Asia/London/New York di jam HP kamu.
- **Sinyal hanya muncul kalau 8 syarat terpenuhi**: tren, konfirmasi timeframe besar, kekuatan tren, volatilitas normal, koreksi, konfirmasi candle, RSI, dan MACD. Kalau belum lengkap, aplikasi menampilkan **TUNGGU** beserta apa yang sedang ditunggu.
- **Level otomatis**: SL = 1,5× ATR, TP1 = 1R (tutup ½, SL ke entry), TP2 = 2R. Lot dihitung dari modal × % risiko, dibulatkan ke bawah supaya tidak melebihi risiko.
- **Pembacaan grafik rinci** (tab Analisa): tren di 4 timeframe, posisi harga terhadap EMA, momentum, volatilitas, candle terakhir, support/resistance, sesi pasar, rencana, dan risiko.
- **Grafik interaktif** dengan EMA, zona support/resistance, garis entry/SL/TP, dan crosshair.
- **Uji historis otomatis** dari aturan yang sama: win rate, profit factor, drawdown, kalah beruntun, dan kurva equity.
- **Jurnal demo**: setiap sinyal dicatat dan dipantau sampai kena SL/TP1/TP2.
- Bunyi + getar + notifikasi saat sinyal baru, 6 tema warna, nama panggilan, dan animasi (bisa dikurangi).

## Upload ke GitHub & online-kan (gratis)

1. Buat repository baru di GitHub, misalnya `gold-signal`.
2. Upload semua isi folder ini (cara termudah: **Add file → Upload files**, lalu drag semua file dan folder, termasuk folder `.github`).
   Atau lewat terminal:
   ```bash
   git init && git add . && git commit -m "Gold Signal v1"
   git branch -M main
   git remote add origin https://github.com/USERNAME/gold-signal.git
   git push -u origin main
   ```
3. Buka **Settings → Pages**, lalu pada *Build and deployment → Source* pilih **GitHub Actions**.
4. Tunggu workflow **Deploy ke GitHub Pages** selesai (tab *Actions*). Aplikasi akan online di `https://USERNAME.github.io/gold-signal/`.

> Kalau folder `.github` tidak ikut ter-upload lewat web (folder berawalan titik kadang tersembunyi), buat manual: **Add file → Create new file**, ketik nama `.github/workflows/pages.yml`, lalu tempel isi file tersebut.

## Pasang di HP

**Cara cepat (tanpa build, Android & iPhone):** buka link GitHub Pages di HP.
- **Android (Chrome):** menu ⋮ → *Install app* / *Tambahkan ke layar utama*.
- **iPhone (Safari):** tombol Share → *Add to Home Screen*.

Aplikasi akan terbuka layar penuh seperti aplikasi biasa.

**APK Android asli:** di GitHub buka tab **Actions → Build APK Android → Run workflow**. Setelah selesai, unduh `gold-signal-apk` di bagian *Artifacts*, ekstrak, lalu install `app-debug.apk` di HP (izinkan "install dari sumber tidak dikenal").

**Aplikasi iOS asli:** butuh Mac + Xcode.
```bash
npm install
npx cap add ios
npm run ios        # membuka Xcode, lalu Run ke iPhone kamu
```
Untuk rilis ke App Store perlu akun Apple Developer (berbayar). Untuk dipakai sendiri, cara *Add to Home Screen* di atas sudah cukup.

## Cara pakai dengan akun demo

1. Buka **Setelan**: isi modal akun demo, risiko per trade (disarankan 0,5–1%), jenis akun (Standard/Cent), dan spread broker.
2. **Sumber harga** sudah otomatis disamakan ke XAUUSD spot. Kalau mau sama persis dengan broker, pilih mode *Broker* di Setelan lalu ketik harga dari MT5.
3. Pilih timeframe (H1 paling seimbang untuk pemula).
4. Saat muncul **BUY/SELL**: pasang order di demo dengan lot, SL, dan TP yang ditampilkan. Saat TP1 kena, tutup setengah lot dan pindahkan SL ke harga entry.
5. Cocokkan hasilnya di tab **Jurnal** dengan hasil di akun demo kamu. Lanjut ke akun asli hanya kalau hasil demo selama beberapa minggu konsisten.

## Metode (ringkas)

| Komponen | Aturan |
|---|---|
| Arah tren | EMA50 vs EMA200, harga di sisi yang sama dengan EMA200 |
| Timeframe besar | M15→H1, H1→H4, H4→D1 tidak boleh berlawanan arah |
| Kekuatan | ADX(14) ≥ 20 |
| Filter berita | ATR(14) ≤ 2× rata-rata 100 candle |
| Koreksi | dalam 4 candle terakhir harga menyentuh EMA20 ± 0,3 ATR |
| Konfirmasi | candle tutup searah tren dan melewati EMA20 |
| Momentum | RSI 45–70 naik (BUY) / 30–55 turun (SELL), histogram MACD menguat |
| Risiko | SL 1,5× ATR · TP1 1R (½ posisi, SL ke entry) · TP2 2R |

Semua sinyal dihitung hanya dari candle yang **sudah tutup**, dan bias timeframe besar hanya dari candle besar yang sudah tutup, jadi tidak ada data masa depan yang terpakai.

## Tes perhitungan

```bash
npm test
```
Indikator (EMA, RSI Wilder, ATR, ADX) dicocokkan dengan perhitungan independen di pandas (`tests/make_fixture.py`), ditambah tes ukuran lot, simulasi SL/TP, dan pengecekan tidak mengintip data masa depan. Tes juga otomatis jalan sebelum setiap deploy.

## Struktur

```
www/                 aplikasi (yang di-online-kan)
  index.html, css/, icons/, manifest.webmanifest, sw.js
  js/core.js         indikator, sinyal, backtest, lot
  js/market.js       data harga, harga live, jam & sesi pasar
  js/reader.js       pembacaan grafik dalam bahasa Indonesia
  js/chart-view.js   grafik canvas
  js/app.js          tampilan & alur aplikasi
tests/               tes perhitungan
capacitor.config.json, package.json   untuk build Android/iOS
.github/workflows/   deploy GitHub Pages & build APK
```
