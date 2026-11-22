/* Materi belajar untuk pemula + kamus istilah */
(function (root) {
  'use strict';
  const ex = t => `<div class="ex"><b>Contoh</b>${t}</div>`;
  const tip = t => `<div class="tipbox">💡 ${t}</div>`;

  const LESSONS = [
    {
      icon: '🛒', title: '1. Trading itu apa sih?',
      html: `<p>Trading itu <b>jual-beli untuk cari selisih harga</b>. Sama kayak jualan: beli barang waktu murah, jual lagi waktu mahal. Selisihnya itu untungmu.</p>
        ${ex('Kamu beli 1 gram emas Rp1.000.000. Seminggu kemudian harganya Rp1.100.000, lalu kamu jual. Untungmu Rp100.000.')}
        <p>Bedanya, di trading forex kamu <b>tidak pegang emasnya</b>. Kamu cuma "bertaruh" arah harganya naik atau turun, dan untung/ruginya dihitung dari selisih harga itu.</p>
        ${tip('Kalau tebakanmu salah, kamu rugi. Karena itu trading butuh aturan, bukan perasaan.')}`,
    },
    {
      icon: '🪙', title: '2. XAUUSD itu apa?',
      html: `<p><b>XAU</b> = kode emas. <b>USD</b> = dolar Amerika. Jadi <b>XAUUSD</b> artinya <b>harga 1 ons emas dalam dolar</b>.</p>
        <p>1 ons (troy ounce) itu kira-kira <b>31,1 gram</b>. Kalau di layar tertulis 3.500, artinya 1 ons emas harganya $3.500.</p>
        ${tip('Emas suka bergerak cepat dan jauh. Itu bikin untung bisa besar, tapi rugi juga bisa besar. Makanya stop loss wajib.')}`,
    },
    {
      icon: '↕️', title: '3. BUY dan SELL',
      html: `<div class="two"><div class="cardlet up"><b>BUY</b><p>Kamu tebak harga <b>naik</b>. Harga naik = untung. Harga turun = rugi.</p></div>
        <div class="cardlet dn"><b>SELL</b><p>Kamu tebak harga <b>turun</b>. Harga turun = untung. Harga naik = rugi.</p></div></div>
        <p>Di forex, kamu boleh SELL dulu walaupun belum "punya" emasnya. Anggap saja kamu pinjam emas, jual sekarang di harga mahal, lalu nanti beli balik di harga murah buat mengembalikannya.</p>`,
    },
    {
      icon: '🧮', title: '4. Untung & rugi dihitungnya gimana?',
      html: `<p>Ukuran posisi disebut <b>lot</b>. Di akun standar, <b>1 lot = 100 ons emas</b>.</p>
        <table class="mini"><tr><th>Lot</th><th>Harga gerak $1</th><th>Harga gerak $10</th></tr>
        <tr><td>0,01</td><td>untung/rugi $1</td><td>$10</td></tr>
        <tr><td>0,10</td><td>$10</td><td>$100</td></tr>
        <tr><td>1,00</td><td>$100</td><td>$1.000</td></tr></table>
        ${ex('Kamu BUY 0,02 lot di 3.500. Harga naik ke 3.515 (naik $15). Untungmu = 15 × 2 = <b>$30</b>. Kalau malah turun $15, ruginya juga $30.')}
        ${tip('Lot di aplikasi ini sudah dihitung otomatis supaya rugimu kalau kena stop loss tidak lebih dari persen yang kamu pilih.')}`,
    },
    {
      icon: '🦺', title: '5. Stop loss & take profit',
      html: `<p><b>Stop loss (SL)</b> = batas rugi. Kalau harga menyentuh angka ini, posisimu ditutup otomatis supaya rugi tidak membesar. Ibaratnya <b>sabuk pengaman</b>.</p>
        <p><b>Take profit (TP)</b> = target untung. Kalau harga sampai sini, posisi ditutup otomatis dan untungnya kamu kantongi.</p>
        <div class="two"><div class="cardlet up"><b>Kalau BUY</b><p>SL di <b>bawah</b> harga masuk, TP di <b>atas</b>.</p></div>
        <div class="cardlet dn"><b>Kalau SELL</b><p>SL di <b>atas</b> harga masuk, TP di <b>bawah</b>.</p></div></div>
        ${tip('Jangan pernah memindahkan SL menjauh supaya "tidak kena". Itu cara tercepat menghabiskan modal.')}`,
    },
    {
      icon: '🕯️', title: '6. Membaca candle di grafik',
      html: `<p>Grafik emas terdiri dari batang-batang kecil yang namanya <b>candle</b> (lilin). Satu candle = rangkuman harga dalam satu waktu, misalnya 1 jam.</p>
        <ul><li><b class="up">Hijau</b>: harga waktu tutup <b>lebih tinggi</b> dari waktu buka (naik).</li>
        <li><b class="dn">Merah</b>: harga waktu tutup <b>lebih rendah</b> dari waktu buka (turun).</li>
        <li><b>Badan</b>: jarak harga buka ke harga tutup.</li>
        <li><b>Ekor</b> (garis tipis): harga paling tinggi dan paling rendah yang sempat disentuh.</li></ul>
        <p><b>Timeframe</b> = satu candle mewakili berapa lama. M15 = 15 menit, H1 = 1 jam, H4 = 4 jam, D1 = 1 hari.</p>
        ${tip('Ekor bawah yang panjang artinya harga sempat turun tapi didorong naik lagi oleh pembeli.')}`,
    },
    {
      icon: '🌊', title: '7. Tren & garis EMA',
      html: `<p><b>Tren</b> = arah besar harga. Bayangkan <b>arus sungai</b>: lebih gampang berenang searah arus daripada melawan.</p>
        <p><b>EMA</b> adalah garis <b>rata-rata harga</b> yang menempel di grafik. Angkanya bilang berapa candle yang dirata-rata:</p>
        <ul><li><b style="color:#ffd166">EMA20</b>: rata-rata pendek, arah jangka dekat.</li>
        <li><b style="color:#6aa9ff">EMA50</b>: rata-rata menengah.</li>
        <li><b style="color:#c084fc">EMA200</b>: rata-rata panjang, arah besar.</li></ul>
        <p>Kalau EMA50 di atas EMA200 dan harga di atas EMA200, tren <b class="up">naik</b>. Kebalikannya, tren <b class="dn">turun</b>.</p>`,
    },
    {
      icon: '🔍', title: '8. Indikator lain: RSI, ADX, ATR, MACD',
      html: `<dl class="defs">
        <dt>RSI</dt><dd>Pengukur "tenaga" harga, angkanya 0–100. Di atas 70 = harga sudah naik kebanyakan (<i>overbought</i>), di bawah 30 = turun kebanyakan (<i>oversold</i>). Di sekitar 50 = netral.</dd>
        <dt>ADX</dt><dd>Pengukur <b>seberapa kuat tren</b>. Di bawah 20 = pasar loyo / mondar-mandir. Di atas 25 = tren kuat.</dd>
        <dt>ATR</dt><dd>Rata-rata <b>seberapa jauh harga bergerak</b> per candle, dalam dolar. ATR $10 artinya biasanya harga gerak sekitar $10 per candle. Dipakai untuk menentukan jarak stop loss.</dd>
        <dt>MACD</dt><dd>Pendeteksi dorongan. Kalau batang histogramnya membesar, dorongan ke arah itu sedang menguat.</dd></dl>`,
    },
    {
      icon: '🤖', title: '9. Cara aplikasi ini memilih BUY / SELL',
      html: `<p>Aplikasi ini cuma kasih sinyal kalau <b>8 syarat</b> terpenuhi semua. Dalam bahasa sehari-hari:</p>
        <ol><li>Arus sungainya jelas (tren naik atau turun).</li>
        <li>Timeframe yang lebih besar tidak berlawanan arah.</li>
        <li>Arusnya cukup kencang (ADX ≥ 20).</li>
        <li>Pasar tidak sedang heboh berita (ATR normal).</li>
        <li>Harga sempat "istirahat" mundur ke garis EMA20.</li>
        <li>Lalu candle tutup lagi searah tren.</li>
        <li>Tenaganya (RSI) sehat dan ikut searah.</li>
        <li>Dorongannya (MACD) menguat.</li></ol>
        <p>Intinya: <b>ikut arus, tapi masuknya waktu harga lagi diskon</b>, bukan waktu harga sudah lari jauh.</p>`,
    },
    {
      icon: '🛡️', title: '10. Aturan 1% (paling penting!)',
      html: `<p>Setiap trade, rugi maksimalnya cukup <b>1% dari modal</b>. Kenapa? Karena kalah beruntun itu pasti terjadi, dan aturan ini bikin kamu tetap bertahan.</p>
        <table class="mini"><tr><th>Kalah beruntun</th><th>Risiko 1%</th><th>Risiko 10%</th></tr>
        <tr><td>5×</td><td>modal sisa 95%</td><td>modal sisa 59%</td></tr>
        <tr><td>10×</td><td>modal sisa 90%</td><td>modal sisa 35%</td></tr></table>
        ${ex('Modal $1.000, risiko 1% = maksimal rugi $10 per trade. Kalau stop loss berjarak $15, lot-nya 10 ÷ (15 × 100) = 0,0067, dibulatkan ke bawah jadi 0,01 lot terkecil. Itu berarti risikonya sebenarnya $15 (1,5%); aplikasi akan memberi tahu kalau begini.')}
        ${tip('Modal kecil + akun standar sering tidak bisa pas 1%. Akun cent membantu, atau pilih timeframe yang stop loss-nya lebih pendek.')}`,
    },
    {
      icon: '🧪', title: '11. Akun demo dulu, baru uang asli',
      html: `<p><b>Akun demo</b> = akun latihan pakai uang mainan, tapi harganya asli. Kamu bisa belajar tanpa risiko.</p>
        <ul><li>Latihan minimal 1–2 bulan atau 30 sinyal.</li>
        <li>Catat hasilnya (tab Jurnal mencatat otomatis).</li>
        <li>Baru pindah ke uang asli kalau hasil demo konsisten, dan pakai uang yang siap hilang.</li></ul>`,
    },
  ];

  const GLOSSARY = [
    ['Akun cent', 'Akun yang saldonya dihitung dalam sen. Cocok untuk modal kecil karena ukuran posisinya jadi sangat kecil.'],
    ['Akun demo', 'Akun latihan dengan uang mainan dan harga asli. Tidak bisa untung atau rugi beneran.'],
    ['Ask', 'Harga untuk BUY (harga jual broker ke kamu). Selalu sedikit lebih tinggi dari Bid.'],
    ['ATR (Average True Range)', 'Rata-rata jarak gerak harga per candle, dalam dolar. Ukuran seberapa "liar" pasar.'],
    ['ADX (Average Directional Index)', 'Angka kekuatan tren. Di bawah 20 lemah, di atas 25 kuat. Tidak bilang arah, cuma kekuatan.'],
    ['Backtest', 'Menguji aturan trading ke data masa lalu untuk lihat hasilnya kalau dulu dipakai.'],
    ['Balance', 'Saldo akun, tidak termasuk untung/rugi posisi yang masih terbuka.'],
    ['Bappebti', 'Lembaga pemerintah (Kemendag) yang mengawasi broker forex/pialang berjangka di Indonesia.'],
    ['Bearish', 'Kondisi harga cenderung turun. Lawannya bullish.'],
    ['Bid', 'Harga untuk SELL (harga broker membeli dari kamu). Selalu sedikit lebih rendah dari Ask.'],
    ['Break even (BE / impas)', 'Menggeser stop loss ke harga masuk, jadi kalau harga balik, kamu tidak rugi.'],
    ['Breakout', 'Harga menembus level penting (support/resistance) lalu lanjut bergerak.'],
    ['Broker / pialang', 'Perusahaan perantara yang menyediakan akun trading dan menghubungkan kamu ke pasar.'],
    ['Bullish', 'Kondisi harga cenderung naik. Lawannya bearish.'],
    ['BUY / Long', 'Posisi yang untung kalau harga naik.'],
    ['Candle (candlestick)', 'Batang di grafik yang menunjukkan harga buka, tutup, tertinggi, dan terendah dalam satu periode.'],
    ['Contract size', 'Ukuran 1 lot. Untuk emas biasanya 100 ons. Cek di MT5: Spesifikasi.'],
    ['CPI', 'Data inflasi Amerika. Sering bikin harga emas bergerak kencang saat rilis.'],
    ['Drawdown', 'Penurunan modal dari titik tertinggi ke titik terendah. Ukuran "sakitnya" periode rugi.'],
    ['EMA (Exponential Moving Average)', 'Garis rata-rata harga yang lebih memberatkan harga terbaru. EMA20 = rata-rata 20 candle.'],
    ['Entry', 'Harga saat kamu masuk posisi (BUY atau SELL).'],
    ['Equity', 'Saldo + untung/rugi posisi yang masih terbuka. Nilai akunmu "saat ini".'],
    ['Floating', 'Untung/rugi yang belum direalisasikan karena posisi masih terbuka.'],
    ['FOMC', 'Rapat bank sentral Amerika (The Fed) soal suku bunga. Salah satu berita paling berpengaruh ke emas.'],
    ['Gap', 'Lompatan harga, biasanya saat pasar baru buka Senin, karena ada berita selama libur.'],
    ['Histogram MACD', 'Batang-batang MACD. Makin besar, makin kuat dorongan ke arah itu.'],
    ['Lot', 'Ukuran posisi. 1 lot emas = 100 ons, 0,01 lot = 1 ons.'],
    ['Leverage', 'Pinjaman tenaga dari broker supaya posisi besar bisa dibuka dengan modal kecil. Untung dan rugi ikut membesar.'],
    ['MACD', 'Indikator dorongan (momentum) dari selisih dua EMA.'],
    ['Margin', 'Uang jaminan yang "dikunci" broker selama posisi terbuka.'],
    ['Margin call', 'Peringatan dari broker kalau equity hampir tidak cukup menjamin posisi.'],
    ['Market execution', 'Order langsung masuk di harga pasar saat itu juga.'],
    ['MT5 (MetaTrader 5)', 'Aplikasi trading yang paling banyak dipakai broker. Tempat kamu buka dan tutup posisi.'],
    ['NFP (Non-Farm Payrolls)', 'Data lapangan kerja Amerika, rilis Jumat pertama tiap bulan. Bikin emas bisa melonjak puluhan dolar.'],
    ['Overbought', 'Harga sudah naik terlalu banyak dalam waktu singkat (RSI di atas 70). Rawan koreksi.'],
    ['Oversold', 'Harga sudah turun terlalu banyak (RSI di bawah 30). Rawan memantul.'],
    ['PAXG', 'Token kripto yang nilainya 1:1 dengan 1 ons emas. Dipakai aplikasi ini sebagai sumber grafik live.'],
    ['Pending order', 'Order yang menunggu harga tertentu dulu baru masuk.'],
    ['Pip / poin', 'Satuan terkecil gerak harga. Di emas, lebih gampang hitung pakai dolar: gerak $1.'],
    ['Profit factor', 'Total untung dibagi total rugi. Di atas 1 = untung bersih, di bawah 1 = rugi bersih.'],
    ['R (unit risiko)', 'Besar risiko per trade. +2R = untung 2× risiko, −1R = rugi sebesar risiko.'],
    ['Resistance', 'Area harga yang sering menahan kenaikan, seperti "atap".'],
    ['RSI (Relative Strength Index)', 'Indikator tenaga harga 0–100. Di atas 70 jenuh beli, di bawah 30 jenuh jual.'],
    ['SELL / Short', 'Posisi yang untung kalau harga turun.'],
    ['Sesi pasar', 'Jam ramai pasar: Asia, London, New York. Paling ramai saat London dan New York tumpang tindih.'],
    ['Sideways', 'Harga mondar-mandir tanpa arah jelas. Sinyal tren sering gagal di kondisi ini.'],
    ['Slippage', 'Order masuk di harga yang sedikit berbeda dari yang kamu klik, biasanya saat pasar cepat.'],
    ['Spread', 'Selisih Ask dan Bid. Ini "ongkos" setiap kali buka posisi.'],
    ['Stop loss (SL)', 'Batas rugi. Posisi otomatis ditutup kalau harga sampai sini.'],
    ['Stop out', 'Broker menutup paksa posisimu karena equity tidak cukup lagi.'],
    ['Support', 'Area harga yang sering menahan penurunan, seperti "lantai".'],
    ['Swap', 'Biaya (atau bonus) menginap kalau posisi dibiarkan terbuka melewati tengah malam broker.'],
    ['Take profit (TP)', 'Target untung. Posisi otomatis ditutup kalau harga sampai sini.'],
    ['Timeframe', 'Satu candle mewakili berapa lama: M15 = 15 menit, H1 = 1 jam, H4 = 4 jam, D1 = 1 hari.'],
    ['Tren', 'Arah besar harga: naik, turun, atau datar.'],
    ['Volatilitas', 'Seberapa besar dan cepat harga bergerak.'],
    ['Win rate', 'Persentase trade yang untung. Tinggi belum tentu bagus kalau sekali rugi sangat besar.'],
    ['XAUUSD', 'Harga 1 ons emas dalam dolar Amerika.'],
  ];

  function render(lessonEl, glossEl) {
    lessonEl.innerHTML = LESSONS.map((l, i) => `<details class="glass acc lesson" ${i === 0 ? 'open' : ''}><summary><span class="ic">${l.icon}</span>${l.title}<i class="chev">›</i></summary><div class="acc-body">${l.html}</div></details>`).join('');
    glossEl.innerHTML = `<div class="glass"><h3>Kamus istilah</h3><input id="gq" class="search" placeholder="Cari istilah… (mis. spread, lot, RSI)"><div id="glist" class="glist"></div></div>`;
    const draw = q => {
      q = (q || '').toLowerCase().trim();
      const items = GLOSSARY.filter(([t, d]) => !q || t.toLowerCase().includes(q) || d.toLowerCase().includes(q));
      glossEl.querySelector('#glist').innerHTML = items.length
        ? items.map(([t, d]) => `<div class="gi"><b>${t}</b><span>${d}</span></div>`).join('')
        : '<div class="empty">Istilah tidak ditemukan.</div>';
    };
    glossEl.querySelector('#gq').addEventListener('input', e => draw(e.target.value));
    draw('');
  }
  root.Learn = { render };
})(this);
