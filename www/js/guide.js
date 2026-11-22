/* Panduan di dalam aplikasi: pasang di HP/laptop, broker resmi, akun demo, MT5 */
(function (root) {
  'use strict';
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; refreshInstall(); });
  window.addEventListener('appinstalled', () => { deferred = null; refreshInstall(); });

  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const inApp = /Instagram|FBAN|FBAV|TikTok|musical_ly|Line\//i.test(ua);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';

  const steps = list => '<ol class="steps">' + list.map(s => `<li>${s}</li>`).join('') + '</ol>';
  const shareIcon = '<span class="kbd"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

  const INSTALL = {
    ios: steps([
      'Buka link aplikasi ini di <b>Safari</b>. Kalau kamu membukanya dari Instagram/TikTok/WhatsApp, ketuk menu ⋯ lalu pilih <i>Buka di Safari</i> dulu.',
      `Ketuk tombol <b>Bagikan</b> ${shareIcon} (kotak dengan panah ke atas) di bar bawah Safari.`,
      'Gulir ke bawah, pilih <b>Tambahkan ke Layar Utama</b> (<i>Add to Home Screen</i>).',
      'Ketuk <b>Tambah</b> di pojok kanan atas.',
      'Tutup Safari, lalu buka <b>Gold Signal</b> dari ikon di layar utama. Aplikasi akan tampil layar penuh.',
      'Mau notifikasi sinyal? Setelah dibuka dari ikon, buka <b>Setelan → Notifikasi</b> lalu izinkan (butuh iOS 16.4 ke atas).',
    ]),
    android: steps([
      'Buka link aplikasi ini di <b>Chrome</b>. Kalau terbuka di dalam Instagram/TikTok/WhatsApp, ketuk ⋮ lalu <i>Buka di Chrome</i>.',
      'Ketuk tombol <b>Pasang aplikasi</b> di atas (kalau muncul). Kalau tidak muncul, ketuk menu <b>⋮</b> di kanan atas Chrome.',
      'Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>, lalu <b>Instal</b>.',
      'Buka <b>Gold Signal</b> dari layar utama atau laci aplikasi.',
      'Di Samsung Internet: menu <b>≡</b> → <b>Tambahkan halaman ke</b> → <b>Layar beranda</b>.',
      'Mau file APK? Lihat README di GitHub: tab Actions → <i>Build APK Android</i>.',
    ]),
    desktop: steps([
      'Buka di <b>Chrome</b> atau <b>Edge</b>.',
      'Klik tombol <b>Pasang aplikasi</b> di atas, atau ikon pasang <span class="kbd">⊕</span> di ujung kanan kolom alamat.',
      'Klik <b>Instal</b>. Gold Signal akan punya jendela sendiri dan bisa dibuka dari Start Menu / Dock.',
      'Untuk pindah ke HP: klik <b>Salin link</b>, kirim ke HP kamu (misalnya lewat WhatsApp ke diri sendiri), lalu ikuti langkah iPhone/Android.',
    ]),
  };

  const SECTIONS = [
    {
      id: 'install', icon: '📲', title: 'Pasang aplikasi di HP & laptop',
      html: () => `
        <div id="installState"></div>
        <div class="seg seg-wide" id="platSeg"><button data-p="ios">iPhone</button><button data-p="android">Android</button><button data-p="desktop">Laptop</button></div>
        <div id="platSteps"></div>
        ${inApp ? '<div class="alert warn">Kamu sedang membuka dari browser bawaan aplikasi sosial media. Pasang aplikasi hanya bisa dari Safari (iPhone) atau Chrome (Android).</div>' : ''}`,
    },
    {
      id: 'broker', icon: '🏦', title: 'Cara cari broker forex resmi',
      html: () => `
        <p>Di Indonesia, broker forex resmi disebut <b>pialang berjangka</b> dan wajib punya izin dari <b>Bappebti</b> (Kementerian Perdagangan). Broker tanpa izin tidak diawasi pemerintah, jadi kalau dana kamu bermasalah, sulit dikejar.</p>
        <h5>Langkah cek legalitas</h5>
        ${steps([
          'Catat <b>nama PT</b> broker yang mau kamu pakai (bukan cuma nama merek/aplikasinya).',
          'Buka situs resmi <a href="https://bappebti.go.id" target="_blank" rel="noopener">bappebti.go.id</a> dan cari menu daftar <b>pialang berjangka</b> atau cek legalitas.',
          'Cocokkan nama PT, <b>nomor izin</b>, alamat kantor, dan <b>rekening terpisah</b> (segregated account) yang terdaftar.',
          'Pastikan deposit nanti dikirim ke rekening atas nama PT itu, <b>bukan rekening pribadi</b> siapa pun.',
          'Cek juga daftar entitas ilegal yang rutin diumumkan Bappebti, untuk memastikan namanya tidak ada di sana.',
        ])}
        <h5>Checklist broker yang layak</h5>
        <ul class="ticks">
          <li>Terdaftar di Bappebti dan jadi anggota bursa berjangka (misalnya JFX atau ICDX).</li>
          <li>Menyediakan <b>akun demo gratis</b> dengan platform MetaTrader 5.</li>
          <li>Spread XAUUSD, komisi, dan biaya inap (swap) ditulis jelas.</li>
          <li>Ada wakil pialang berjangka yang bersertifikat, dan kontak resmi yang bisa dihubungi.</li>
        </ul>
        <h5>Tanda bahaya, langsung tinggalkan</h5>
        <ul class="crosses">
          <li>Menjanjikan profit pasti / harian / "anti rugi".</li>
          <li>Jualan robot trading, sinyal berbayar, atau kelas lewat ajakan "DM / ketik kata kunci".</li>
          <li>Minta dana dititipkan untuk "dikelola" orang lain.</li>
          <li>Bonus deposit yang tidak masuk akal, atau skema ajak teman yang mirip piramida.</li>
          <li>Transfer ke rekening pribadi atau dompet kripto.</li>
        </ul>`,
    },
    {
      id: 'demo', icon: '🧪', title: 'Buka akun demo (gratis, tanpa deposit)',
      html: () => `
        <h5>Pilihan A · paling cepat, langsung di MetaTrader 5</h5>
        ${steps([
          'Install <b>MetaTrader 5</b> dari App Store / Play Store (pengembang: MetaQuotes).',
          'Buka aplikasinya. Biasanya langsung ditawari membuka akun demo; kalau tidak, buka <b>Pengaturan → Akun baru</b> (atau <i>Manage accounts → +</i>).',
          'Pilih server demo (misalnya <b>MetaQuotes-Demo</b>), lalu <b>Buka akun demo</b>.',
          'Isi nama dan email, lalu atur <b>saldo</b> sama dengan modal di aplikasi ini (misalnya $1.000) dan leverage.',
          'Selesai. Simpan login dan password yang muncul.',
        ])}
        <h5>Pilihan B · lebih mirip kondisi asli, dari broker resmi</h5>
        ${steps([
          'Pilih broker yang sudah lolos cek di bagian <i>Cara cari broker forex resmi</i>.',
          'Daftar <b>akun demo</b> di situs/aplikasi broker itu (tidak perlu deposit).',
          'Kamu akan dapat <b>login, password, dan nama server</b>. Di MT5: Pengaturan → Akun baru → cari nama broker → masuk dengan data tadi.',
        ])}
        <p class="note">Spread, ukuran kontrak, dan jam pasar di akun demo broker sama dengan akun aslinya, jadi hasil latihanmu lebih jujur.</p>`,
    },
    {
      id: 'connect', icon: '⚙️', title: 'Samakan MT5 dengan aplikasi ini',
      html: () => `
        ${steps([
          'Di MT5 buka <b>Kuotasi</b> → <b>+</b> → cari emas. Namanya bisa <b>XAUUSD</b>, <b>GOLD</b>, atau ada akhiran seperti <b>XAUUSD.m</b>.',
          'Tahan / klik kanan simbol itu → <b>Spesifikasi</b>. Lihat <b>Contract size</b>: kalau <b>100</b>, pilih <i>Standard</i> di Setelan; kalau akunnya akun cent, pilih <i>Cent</i>.',
          'Lihat selisih harga <b>Bid</b> dan <b>Ask</b>. Itu spread; isi di <b>Setelan → Spread broker</b> (misalnya 0.30).',
          'Isi <b>Modal akun</b> sesuai saldo demo dan <b>Risiko per trade</b> 0,5–1%.',
          'Harga di aplikasi sudah otomatis disamakan ke XAUUSD spot. Kalau mau sama persis dengan broker, pakai mode <b>Broker</b> di Setelan → Sumber harga.',
        ])}`,
    },
    {
      id: 'order', icon: '🎯', title: 'Pasang order dari sinyal di MT5',
      html: () => `
        <p>Saat aplikasi menampilkan <b>BUY</b> atau <b>SELL</b>:</p>
        ${steps([
          'Di MT5 ketuk simbol emas → <b>Trade / Order baru</b>, jenis <b>Market Execution</b>.',
          'Cara paling gampang untuk TP1/TP2: buka <b>2 posisi</b>, masing-masing <b>setengah lot</b> dari aplikasi. Contoh lot 0.04 → dua posisi 0.02.',
          'Posisi 1: isi <b>Stop Loss</b> = SL aplikasi, <b>Take Profit</b> = TP1. Posisi 2: SL sama, Take Profit = TP2.',
          'Ketuk <b>Buy by Market</b> atau <b>Sell by Market</b> sesuai sinyal.',
          'Saat TP1 kena (aplikasi akan bunyi), ubah SL posisi 2 ke <b>harga entry</b>: tahan posisinya → <b>Modifikasi</b>. Sisa posisi jadi tidak bisa rugi.',
          'Kalau lot cuma 0.01 (tidak bisa dibagi dua): buka satu posisi dengan TP = TP2, lalu geser SL ke entry saat harga menyentuh TP1.',
        ])}
        <div class="alert warn">Kalau harga di MT5 sudah lari jauh dari entry di aplikasi (lebih dari setengah jarak ke TP1), lewati saja. Mengejar harga merusak perbandingan untung-ruginya.</div>`,
    },
    {
      id: 'price', icon: '💱', title: 'Kenapa harga bisa beda sedikit dengan MT5?',
      html: () => `
        <p>Tidak ada pusat harga tunggal untuk emas spot. Setiap broker punya penyedia harga sendiri, ditambah spread. Aplikasi ini:</p>
        <ul class="ticks">
          <li>Mengambil <b>grafik</b> dari PAXG (token emas 1:1 dengan 1 troy ons emas) karena datanya gratis, live, dan bisa diakses langsung dari HP.</li>
          <li>Setiap menit mengambil <b>harga XAUUSD spot</b> asli, lalu menggeser semua angka (grafik, entry, SL, TP) supaya sama dengan harga spot.</li>
          <li>Indikator (EMA, RSI, ATR, ADX) tidak terpengaruh pergeseran ini, jadi sinyalnya tetap sama.</li>
        </ul>
        <p>Selisih yang tersisa biasanya kurang dari $1. Yang paling penting adalah <b>jarak</b> SL dan TP dari entry, dan jarak itu sudah tepat.</p>`,
    },
    {
      id: 'rules', icon: '🛡️', title: 'Aturan main yang aman',
      html: () => `<ul class="ticks">
          <li>Latihan di <b>akun demo minimal 1–2 bulan</b> atau 30+ sinyal sebelum pakai uang asli.</li>
          <li>Risiko per trade 0,5–1%. Kalah 5× berturut-turut itu normal di strategi ini.</li>
          <li>Selalu pasang <b>stop loss</b>. Jangan dipindah menjauh.</li>
          <li>Hindari entry 15 menit sebelum dan sesudah berita besar AS (NFP, CPI, FOMC).</li>
          <li>Kalau uang asli: pakai dana yang siap hilang, bukan uang kuliah atau pinjaman.</li>
        </ul>`,
    },
  ];

  function refreshInstall() {
    const st = document.getElementById('installState'); if (!st) return;
    if (standalone()) { st.innerHTML = '<div class="alert info">✅ Gold Signal sudah terpasang dan sedang dibuka sebagai aplikasi.</div>'; return; }
    st.innerHTML = (deferred ? '<button class="btn wide" id="bInstall">📲 Pasang aplikasi sekarang</button>' : '') +
      '<button class="btn ghost wide" id="bCopy">🔗 Salin link aplikasi</button>';
    const bi = document.getElementById('bInstall');
    if (bi) bi.onclick = async () => { deferred.prompt(); try { await deferred.userChoice; } catch (e) { } deferred = null; refreshInstall(); };
    document.getElementById('bCopy').onclick = async () => {
      try { await navigator.clipboard.writeText(location.href.split('#')[0]); root.toast && root.toast('Link disalin. Kirim ke HP kamu lalu buka di Safari/Chrome.'); }
      catch (e) { root.toast && root.toast(location.href.split('#')[0]); }
    };
  }
  function showPlat(p) {
    document.querySelectorAll('#platSeg button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
    document.getElementById('platSteps').innerHTML = INSTALL[p];
  }

  function render(el) {
    el.innerHTML = `<div class="glass guide-head"><h3>Panduan</h3><p class="note">Ketuk judul untuk membuka. Mulai dari atas kalau baru pertama kali.</p></div>` +
      SECTIONS.map(s => `<details class="glass acc" id="g-${s.id}"><summary><span class="ic">${s.icon}</span>${s.title}<i class="chev">›</i></summary><div class="acc-body">${s.html()}</div></details>`).join('');
    document.getElementById('platSeg').onclick = e => { const p = e.target.dataset.p; if (p) showPlat(p); };
    showPlat(platform); refreshInstall();
  }
  function open(id) {
    const d = document.getElementById('g-' + id); if (!d) return;
    d.open = true; setTimeout(() => d.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }
  root.Guide = { render, open, standalone, platform };
})(this);
