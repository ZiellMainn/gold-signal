/* Pembacaan grafik: mengubah angka indikator jadi penjelasan bahasa Indonesia */
(function (root) {
  'use strict';
  const f2 = v => Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const f1 = v => Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : '—';
  const dir = b => b === 'up' ? '<b class="up">naik</b>' : b === 'down' ? '<b class="dn">turun</b>' : '<b class="mid">datar / belum jelas</b>';

  function adxWord(a) {
    if (a < 20) return 'lemah (pasar cenderung sideways)';
    if (a < 25) return 'mulai terbentuk';
    if (a < 40) return 'kuat';
    return 'sangat kuat (hati-hati, tren bisa sudah jenuh)';
  }
  function rsiWord(r) {
    if (r >= 70) return 'jenuh beli (overbought)';
    if (r >= 55) return 'momentum naik sehat';
    if (r > 45) return 'netral';
    if (r > 30) return 'momentum turun sehat';
    return 'jenuh jual (oversold)';
  }
  function candleRead(b, A) {
    const range = b.h - b.l || 1e-9, body = Math.abs(b.c - b.o);
    const upW = b.h - Math.max(b.o, b.c), loW = Math.min(b.o, b.c) - b.l;
    const bull = b.c >= b.o, rel = range / A;
    let t = `Candle terakhir ${bull ? '<b class="up">hijau</b>' : '<b class="dn">merah</b>'}, panjang $${f2(range)} (${f1(rel)}× ATR). `;
    if (body / range < 0.25) t += 'Badannya kecil (doji/ragu-ragu): pembeli dan penjual seimbang. ';
    else if (body / range > 0.7) t += `Badannya besar dan hampir tanpa ekor: dorongan ${bull ? 'beli' : 'jual'} dominan sampai candle tutup. `;
    if (loW / range > 0.45) t += 'Ekor bawah panjang: harga sempat ditolak dari bawah (ada pembeli yang masuk). ';
    if (upW / range > 0.45) t += 'Ekor atas panjang: harga sempat ditolak dari atas (ada tekanan jual). ';
    return t;
  }

  // ctx: { tf, tfLabel, mtf:[{label, ev}], ev, last, price, sr, status, sessions, sessRanges, closeIn, sig, stats, edgeOK }
  function read(ctx) {
    const { ev, last, sr, price } = ctx, A = ev.atr, out = [];
    const P = Number.isFinite(price) ? price : last.c;
    const biasTxt = ev.bias === 'up' ? 'naik' : ev.bias === 'down' ? 'turun' : 'datar';

    // 1. Ringkasan
    let head;
    if (!ctx.status.open) head = `${ctx.status.label}. Analisa di bawah memakai candle terakhir sebelum pasar tutup; tidak ada sinyal baru sampai pasar buka lagi.`;
    else if (ctx.sig) head = `Ada setup <b class="${ctx.sig.dir === 'BUY' ? 'up' : 'dn'}">${ctx.sig.dir}</b> di ${ctx.tfLabel}: tren ${biasTxt}, koreksi sudah terjadi, dan momentum kembali searah tren.`;
    else if (ev.dir) head = `Setup ${ev.dir} sempat lengkap di ${ctx.tfLabel}, tapi harga sudah lari terlalu jauh atau sudah kena target. Terlambat untuk entry; tunggu setup berikutnya.`;
    else head = `Tren ${ctx.tfLabel} ${biasTxt}, skor setup ${ev.score}/8. Belum ada sinyal lengkap, jadi posisi terbaik sekarang adalah menunggu.`;
    out.push({ icon: '◎', title: 'Ringkasan', html: head });

    // 2. Multi-timeframe
    const rows = ctx.mtf.filter(m => m.ev).map(m =>
      `<li><b>${m.label}</b>: tren ${dir(m.ev.bias)}, kekuatan ${adxWord(m.ev.adx)} (ADX ${f1(m.ev.adx)}), RSI ${f1(m.ev.rsi)}.</li>`).join('');
    const biases = ctx.mtf.filter(m => m.ev).map(m => m.ev.bias);
    const ups = biases.filter(b => b === 'up').length, dns = biases.filter(b => b === 'down').length;
    let align = ups === biases.length ? 'Semua timeframe searah naik: kondisi paling ideal untuk mencari BUY.'
      : dns === biases.length ? 'Semua timeframe searah turun: kondisi paling ideal untuk mencari SELL.'
        : ups > dns ? 'Mayoritas timeframe naik, tapi ada yang belum searah. BUY lebih masuk akal daripada SELL, dengan ukuran risiko normal.'
          : dns > ups ? 'Mayoritas timeframe turun, tapi ada yang belum searah. SELL lebih masuk akal daripada BUY.'
            : 'Timeframe saling bertentangan. Ini kondisi yang sering bikin sinyal palsu.';
    out.push({ icon: '⧉', title: 'Tren di semua timeframe', html: `<ul>${rows}</ul>${align}` });

    // 3. Posisi harga terhadap EMA
    const dist = (e, name) => `$${f2(Math.abs(P - e))} ${P >= e ? 'di atas' : 'di bawah'} ${name} (${f1(Math.abs(P - e) / A)}× ATR)`;
    let emaTxt = `Harga ${f2(P)} berada ${dist(ev.e20, 'EMA20')}, ${dist(ev.e50, 'EMA50')}, dan ${dist(ev.e200, 'EMA200')}. `;
    const ext = Math.abs(P - ev.e20) / A;
    if (ext > 2) emaTxt += 'Harga sudah cukup jauh dari EMA20: masuk sekarang berarti mengejar harga. Biasanya lebih aman menunggu koreksi dulu.';
    else if (ext < 0.5) emaTxt += 'Harga dekat EMA20, area yang biasa jadi titik pantul dalam tren.';
    out.push({ icon: '〰', title: `Posisi harga (${ctx.tfLabel})`, html: emaTxt });

    // 4. Momentum
    const rsiDir = ev.rsi > ev.rsiPrev ? 'naik' : 'turun';
    const macdTxt = ev.hist > 0 ? (ev.hist > ev.histPrev ? 'positif dan membesar (dorongan naik menguat)' : 'positif tapi mengecil (dorongan naik melemah)')
      : (ev.hist < ev.histPrev ? 'negatif dan membesar (dorongan turun menguat)' : 'negatif tapi mengecil (dorongan turun melemah)');
    const di = Number.isFinite(ev.pdi) ? ` DI+ ${f1(ev.pdi)} vs DI− ${f1(ev.mdi)}: ${ev.pdi > ev.mdi ? 'pembeli' : 'penjual'} lebih dominan.` : '';
    out.push({ icon: '⚡', title: 'Momentum', html: `RSI ${f1(ev.rsi)} (${rsiWord(ev.rsi)}), sedang ${rsiDir}. Histogram MACD ${macdTxt}.${di}` });

    // 5. Volatilitas
    const ratio = ev.atr / ev.atrAvg;
    let vol = `ATR sekarang $${f2(A)} per candle ${ctx.tfLabel}, ${f1(ratio)}× rata-ratanya. `;
    vol += ratio > 2 ? 'Volatilitas ekstrem, biasanya karena berita besar. Spread melebar dan SL gampang kena: jangan entry dulu.'
      : ratio > 1.3 ? 'Pasar lebih liar dari biasanya. Stop loss otomatis ikut lebih lebar, jadi lot otomatis lebih kecil.'
        : ratio < 0.7 ? 'Pasar sedang sepi. Pergerakan lambat, target bisa butuh waktu lebih lama.'
          : 'Volatilitas normal.';
    vol += ` Dengan stop loss 1,5× ATR, jarak SL sekitar $${f2(1.5 * A)}.`;
    out.push({ icon: '≋', title: 'Volatilitas', html: vol });

    // 6. Candle terakhir
    out.push({ icon: '▮', title: 'Candle terakhir yang tutup', html: candleRead(last, A) });

    // 7. Support & resistance
    const lv = (z, kind) => `<li><b>${kind} ${f2(z.mid)}</b>: ${f2(Math.abs(z.mid - P))} dolar dari harga (${f1(Math.abs(z.mid - P) / A)}× ATR), disentuh ${z.touches}×.</li>`;
    let srHtml = '<ul>' + sr.res.slice(0, 2).map(z => lv(z, 'Resistance')).join('') + sr.sup.slice(0, 2).map(z => lv(z, 'Support')).join('') + '</ul>';
    if (!sr.res.length && !sr.sup.length) srHtml = 'Belum ada level swing yang jelas di data terbaru.';
    const nr = sr.res[0], ns = sr.sup[0];
    if (nr && (nr.mid - P) / A < 1) srHtml += 'Harga sudah mepet resistance: ruang naik terbatas sebelum level itu tembus.';
    else if (ns && (P - ns.mid) / A < 1) srHtml += 'Harga dekat support: ruang turun terbatas sebelum level itu tembus.';
    out.push({ icon: '☰', title: 'Support & resistance terdekat', html: srHtml });

    // 8. Waktu & sesi
    const act = ctx.sessions.filter(s => s.active);
    let ses = act.length ? `Sesi aktif: <b>${act.map(s => s.name).join(' + ')}</b> (${act.map(s => s.note).join('; ')}). `
      : 'Tidak ada sesi besar yang aktif sekarang; likuiditas biasanya tipis. ';
    if (act.some(s => s.key === 'london') && act.some(s => s.key === 'ny')) ses += 'Overlap London–New York adalah jam paling ramai, pergerakan besar sering terjadi di sini. ';
    ses += `Jadwal di jam HP kamu: ${ctx.sessions.map(s => `${s.name} ${ctx.sessRanges[s.key]}`).join(' · ')}. `;
    ses += `Candle ${ctx.tfLabel} berikutnya tutup dalam ${ctx.closeIn}; sinyal hanya dihitung dari candle yang sudah tutup.`;
    out.push({ icon: '◷', title: 'Waktu & sesi pasar', html: ses });

    // 9. Rencana
    let plan;
    if (ctx.sig) {
      plan = `Entry ${ctx.sig.dir} di sekitar harga sekarang, stop loss dan target ada di kartu sinyal. Setelah TP1 kena, tutup setengah lot dan pindahkan SL ke harga entry supaya sisa posisi tidak bisa rugi.`;
      if (!ctx.edgeOK) plan += ' <b class="warn">Tapi uji historis di timeframe ini sedang tidak bagus, jadi lebih aman dilewati atau pakai lot lebih kecil.</b>';
    } else if (!ctx.status.open) plan = 'Tunggu pasar buka. Hindari 30–60 menit pertama setelah buka karena spread biasanya lebar dan harga sering gap.';
    else if (!ev.calm) plan = 'Tunggu volatilitas turun (ATR kembali di bawah 2× rata-rata). Jangan entry saat berita besar.';
    else if (ev.bias === 'up') {
      const z = ev.e20 + 0.3 * A;
      plan = `Skenario BUY: tunggu harga koreksi ke area ${f2(ev.e20)}–${f2(z)} (EMA20), lalu ada candle ${ctx.tfLabel} hijau yang tutup di atas EMA20 dengan RSI naik di 45–70.` +
        (ev.strong ? '' : ' ADX juga harus naik ke atas 20 dulu.') + (ev.htfBias === -1 ? ' Timeframe besar masih turun, jadi BUY belum diizinkan.' : '');
    } else if (ev.bias === 'down') {
      const z = ev.e20 - 0.3 * A;
      plan = `Skenario SELL: tunggu harga naik ke area ${f2(z)}–${f2(ev.e20)} (EMA20), lalu ada candle ${ctx.tfLabel} merah yang tutup di bawah EMA20 dengan RSI turun di 30–55.` +
        (ev.strong ? '' : ' ADX juga harus naik ke atas 20 dulu.') + (ev.htfBias === 1 ? ' Timeframe besar masih naik, jadi SELL belum diizinkan.' : '');
    } else plan = ev.fast ? `Belum ada arah. BUY baru dicari kalau EMA20 naik melewati EMA50 (${f2(ev.e50)}) dan harga di atasnya; SELL kalau kebalikannya.`
      : `Belum ada arah. BUY baru dicari kalau EMA50 naik melewati EMA200 (${f2(ev.e200)}) dan harga di atasnya; SELL kalau kebalikannya.`;
    out.push({ icon: '➜', title: 'Yang ditunggu / rencana', html: plan });

    // 10. Risiko
    const risks = [];
    if (ev.rsi >= 70 && ev.bias === 'up') risks.push('RSI sudah jenuh beli: rawan koreksi mendadak.');
    if (ev.rsi <= 30 && ev.bias === 'down') risks.push('RSI sudah jenuh jual: rawan pantulan mendadak.');
    if (ev.adx >= 40) risks.push('ADX sangat tinggi: tren sudah panjang, risiko pembalikan naik.');
    if (ctx.sig && ctx.sig.dir === 'BUY' && nr && nr.mid < ctx.sig.tp1) risks.push(`Ada resistance ${f2(nr.mid)} sebelum TP1: target bisa tertahan di sana.`);
    if (ctx.sig && ctx.sig.dir === 'SELL' && ns && ns.mid > ctx.sig.tp1) risks.push(`Ada support ${f2(ns.mid)} sebelum TP1: target bisa tertahan di sana.`);
    if (ctx.stale) risks.push('Data terakhir sudah lama (lebih dari 2 candle), mungkin koneksi bermasalah.');
    risks.push('Harga diambil dari PAXG (token emas) dan bisa beda beberapa dolar dari broker. Isi harga broker di Setelan supaya level digeser.');
    risks.push('Rilis berita AS (NFP, CPI, FOMC) bisa menggerakkan emas puluhan dolar dalam hitungan menit. Cek kalender ekonomi sebelum entry.');
    out.push({ icon: '⚠', title: 'Risiko yang perlu diwaspadai', html: '<ul>' + risks.map(r => `<li>${r}</li>`).join('') + '</ul>' });
    return out;
  }
  root.Reader = { read };
})(typeof self !== 'undefined' ? self : this);
