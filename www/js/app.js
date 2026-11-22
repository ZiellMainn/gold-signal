/* Gold Signal — logika aplikasi & tampilan */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const TFK = ['15m', '1h', '4h', '1d'];
  const WANT = { '15m': 6000, '1h': 4000, '4h': 3000, '1d': 3000 };
  const THEMES = [['gold', '#f5c451'], ['violet', '#b48cff'], ['mint', '#38f5c8'], ['sakura', '#ff86bd'], ['ocean', '#5ab8ff'], ['crimson', '#ff5e5e']];
  const f2 = v => Number.isFinite(v) ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const usd = v => (v < 0 ? '−$' : '$') + f2(Math.abs(v));

  // ---------- Penyimpanan ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('gs.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('gs.' + k, JSON.stringify(v)); } catch (e) { } },
  };
  const S = Object.assign({ name: '', theme: 'gold', modal: 1000, risk: 1, contract: 100, spread: 0.3, tf: '1h', offset: 0, syncMode: 'auto', autoOffset: null, autoAt: 0, sound: true, notif: false, reduce: false, guideSeen: false }, store.get('settings', {}));
  // selisih harga yang dipakai: otomatis ke XAUUSD spot, manual ke broker, atau tanpa penyesuaian
  const off = () => S.syncMode === 'manual' ? S.offset : S.syncMode === 'auto' && Number.isFinite(S.autoOffset) ? S.autoOffset : 0;
  let journal = store.get('journal', []);
  const save = () => store.set('settings', S);
  const saveJ = () => store.set('journal', journal.slice(0, 200));

  // ---------- Status ----------
  const DATA = {};
  let A = null, liveRaw = NaN, lastShown = NaN, loading = false, nextTimer = null, chart = null;

  // ---------- Util animasi ----------
  function countUp(el, to, dec, prefix, suffix) {
    prefix = prefix || ''; suffix = suffix || '';
    const fmt = v => prefix + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
    if (!Number.isFinite(to)) { el.textContent = '—'; return; }
    if (S.reduce) { el.textContent = fmt(to); return; }
    const from = parseFloat(el.dataset.v || '0') || 0, t0 = performance.now(), dur = 900;
    el.dataset.v = to;
    const step = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function toast(msg, ms) {
    const t = $('toast'); t.innerHTML = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms || 3200);
  }
  function stagger(el) {
    el.classList.add('stagger');
    [...el.children].forEach((c, i) => { c.style.animationDelay = (i * 60) + 'ms'; });
  }

  // ---------- Partikel latar ----------
  (function particles() {
    const c = $('particles'), g = c.getContext('2d'); let P = [];
    const size = () => { c.width = innerWidth; c.height = innerHeight; P = Array.from({ length: Math.min(50, Math.round(innerWidth / 18)) }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, r: .5 + Math.random() * 1.8, v: .15 + Math.random() * .4, a: Math.random() * 6 })); };
    size(); addEventListener('resize', size);
    const col = () => getComputedStyle(document.body).getPropertyValue('--acc').trim();
    (function loop() {
      if (!S.reduce && !document.hidden) {
        g.clearRect(0, 0, c.width, c.height); g.fillStyle = col();
        for (const p of P) { p.y -= p.v; p.a += .02; if (p.y < -5) { p.y = c.height + 5; p.x = Math.random() * c.width; } g.globalAlpha = .25 + .35 * Math.abs(Math.sin(p.a)); g.beginPath(); g.arc(p.x + Math.sin(p.a) * 6, p.y, p.r, 0, 7); g.fill(); }
      }
      requestAnimationFrame(loop);
    })();
  })();

  // ---------- Suara & notifikasi ----------
  let actx = null;
  document.addEventListener('pointerdown', () => { if (!actx) try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }, { once: true });
  function chime(up) {
    if (!S.sound) return;
    try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch (e) { }
    if (!actx) return;
    const notes = up ? [523, 659, 784] : [784, 659, 523];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * .12;
      o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.2, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .35);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + .4);
    });
  }
  async function notify(title, body) {
    if (!S.notif || !('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'signal' });
      else new Notification(title, { body });
    } catch (e) { }
  }

  // ---------- Data ----------
  const shift = b => { const o = off(); return { t: b.t, o: b.o + o, h: b.h + o, l: b.l + o, c: b.c + o }; };
  const live = () => Number.isFinite(liveRaw) ? liveRaw + off() : NaN;

  async function load() {
    if (loading) return; loading = true;
    clearTimeout(nextTimer);
    const tf = S.tf, htf = Market.TF[tf].htf;
    const want = {};
    TFK.forEach(k => { want[k] = 600; });
    want[tf] = WANT[tf];
    if (htf) want[htf] = Math.max(600, Math.ceil(WANT[tf] * Market.TF[tf].ms / Market.TF[htf].ms) + 260);
    try {
      const res = await Promise.allSettled(TFK.map(k => Market.klines(k, want[k])));
      let err = null;
      res.forEach((r, i) => { if (r.status === 'fulfilled') DATA[TFK[i]] = r.value; else if (TFK[i] === tf) err = r.reason; });
      if (!DATA[tf] || err) throw err || new Error('Data kosong');
      analyse(true);
      hideSplash();
    } catch (e) {
      showError(e.message);
      nextTimer = setTimeout(load, 30000);
      loading = false; return;
    }
    loading = false;
    // jadwal: 4 detik setelah candle tutup, maksimal 5 menit sekali untuk timeframe lain
    const now = Date.now(), wait = Math.min(Market.nextClose(tf, now) - now + 4000, 5 * 60e3);
    nextTimer = setTimeout(load, Math.max(3000, wait));
  }
  function showError(msg) {
    hideSplash();
    const b = $('badge'); b.className = 'badge wait'; b.textContent = 'OFFLINE';
    $('radar').classList.add('on');
    $('heroText').innerHTML = 'Belum bisa ambil data harga. Cek koneksi internet; aplikasi akan mencoba lagi otomatis dalam 30 detik.<small>' + msg + '</small>';
  }
  let splashGone = false;
  function hideSplash() { if (splashGone) return; splashGone = true; setTimeout(() => $('splash').classList.add('hide'), 300); }

  // ---------- Analisa ----------
  function analyse(fresh) {
    const tf = S.tf, T = Market.TF[tf], raw = DATA[tf].bars, d = raw.map(shift), I = Core.indicators(d), L = d.length - 1;
    let htf = null;
    const hk = T.htf;
    if (hk && DATA[hk]) { const hd = DATA[hk].bars.map(shift), hI = Core.indicators(hd); htf = Core.mapHTF(d, T.ms, hd, Market.TF[hk].ms, Core.biasSeries(hd, hI)); }
    const ev = Core.evalAt(d, I, L, Core.DEF, htf);
    const status = Market.marketStatus(new Date());
    const stale = status.open && Date.now() - (d[L].t + T.ms) > 2 * T.ms;
    const trades = Core.backtest(d, I, Core.DEF, S.spread, htf);
    const st = Core.stats(trades, S.risk);
    const edgeOK = st.n >= 20 && st.pf >= 1.1;
    const sr = ev ? Core.srLevels(d, ev.atr) : { res: [], sup: [] };
    const price = Number.isFinite(live()) ? live() : d[L].c;

    // cari sinyal valid di 3 candle terakhir
    let sig = null;
    if (status.open && !stale) for (let k = 0; k < 3; k++) {
      const i = L - k, e = Core.evalAt(d, I, i, Core.DEF, htf);
      if (!e || !e.dir) continue;
      const lv = Core.levels(e.dir, d[i].c, e.atr), s = e.dir === 'BUY' ? 1 : -1;
      let dead = Math.abs(price - lv.entry) > 0.5 * e.atr;
      for (let j = i + 1; j <= L && !dead; j++) if ((s > 0 && (d[j].l <= lv.sl || d[j].h >= lv.tp1)) || (s < 0 && (d[j].h >= lv.sl || d[j].l <= lv.tp1))) dead = true;
      if (!dead) { sig = { dir: e.dir, i, ev: e, age: k }; break; }
    }

    // kunci level di jurnal saat sinyal pertama kali terlihat
    let entry = null;
    if (sig) {
      const key = tf + '|' + d[sig.i].t + '|' + sig.dir;
      entry = journal.find(j => j.key === key);
      if (!entry) {
        const lv = Core.levels(sig.dir, price, sig.ev.atr);
        const lot = Core.lotSize(S.modal, S.risk, lv.risk, S.contract);
        entry = { key, tf, dir: sig.dir, at: Date.now(), bar: d[sig.i].t, entry: lv.entry, sl: lv.sl, tp1: lv.tp1, tp2: lv.tp2, risk: lv.risk, lot: lot.lot, contract: S.contract, stage: 'RUN', R: null };
        journal.unshift(entry); saveJ();
        toast(`🔔 Sinyal <b>${sig.dir}</b> XAUUSD ${T.label} di ${f2(lv.entry)}`, 5000);
        chime(sig.dir === 'BUY');
        notify(`Sinyal ${sig.dir} XAUUSD (${T.label})`, `Entry ${f2(lv.entry)} · SL ${f2(lv.sl)} · TP ${f2(lv.tp2)}`);
      }
    }
    // perbarui jurnal dari candle yang sudah tutup
    updateJournalFromBars(price);
    // posisi yang masih terbuka di timeframe ini selalu ditampilkan sampai selesai
    const active = journal.find(j => j.tf === tf && (j.stage === 'RUN' || j.stage === 'TP1'));
    if (active) { entry = active; if (!sig || sig.dir !== active.dir || entry.key !== active.key) sig = { dir: active.dir, i: L, ev, age: null, running: true }; }
    else { entry = null; sig = null; }

    const mtf = TFK.filter(k => DATA[k]).map(k => {
      const hd = DATA[k].bars.map(shift), hI = Core.indicators(hd);
      return { k, label: Market.TF[k].label, ev: Core.evalAt(hd, hI, hd.length - 1) };
    });

    A = { tf, T, d, I, L, ev, htf, status, stale, trades, st, edgeOK, sr, sig, entry, mtf };
    usedOff = off();
    render(fresh);
  }

  function stepEntry(e, hi, lo) {
    if (!['RUN', 'TP1'].includes(e.stage)) return false;
    const s = e.dir === 'BUY' ? 1 : -1, stop = e.stage === 'TP1' ? e.entry : e.sl;
    const hitSL = s > 0 ? lo <= stop : hi >= stop, hitT1 = s > 0 ? hi >= e.tp1 : lo <= e.tp1, hitT2 = s > 0 ? hi >= e.tp2 : lo <= e.tp2;
    const before = e.stage;
    if (e.stage === 'RUN') {
      if (hitSL) { e.stage = 'SL'; e.R = -1; }
      else if (hitT1) { e.stage = 'TP1'; if (hitT2) { e.stage = 'TP2'; e.R = 1.5; } }
    } else if (e.stage === 'TP1') {
      if (hitSL) { e.stage = 'TP1+BE'; e.R = 0.5; } else if (hitT2) { e.stage = 'TP2'; e.R = 1.5; }
    }
    if (e.stage !== before) { e.done = Date.now(); return true; }
    return false;
  }
  const STAGE_TXT = { EXP: 'kedaluwarsa, tutup di harga pasar', RUN: 'berjalan', TP1: 'TP1 kena · SL di entry', SL: 'kena SL', 'TP1+BE': 'TP1 lalu impas', TP2: 'TP2 kena' };
  const MAX_BARS = 48; // posisi yang menggantung lebih dari 48 candle dianggap selesai di harga terakhir
  function updateJournalFromBars(price) {
    let ch = false;
    for (const e of journal) {
      if (!['RUN', 'TP1'].includes(e.stage) || !DATA[e.tf]) continue;
      const ms = Market.TF[e.tf].ms; let n = 0;
      for (const b of DATA[e.tf].bars) if (b.t > e.at && b.t + ms <= Date.now()) { n++; const x = shift(b); if (stepEntry(e, x.h, x.l)) ch = true; }
      if (['RUN', 'TP1'].includes(e.stage) && n >= MAX_BARS && Number.isFinite(price)) {
        const s = e.dir === 'BUY' ? 1 : -1, rest = (price - e.entry) * s / e.risk;
        e.R = +(e.stage === 'TP1' ? 0.5 + 0.5 * Math.max(0, rest) : rest).toFixed(2);
        e.stage = 'EXP'; e.done = Date.now(); ch = true;
      }
    }
    if (ch) saveJ();
  }
  function onTickJournal(p) {
    let ch = false;
    for (const e of journal) if (['RUN', 'TP1'].includes(e.stage)) {
      const before = e.stage;
      if (stepEntry(e, p, p)) {
        ch = true;
        const good = e.stage !== 'SL';
        toast(`${good ? '✅' : '🛑'} ${e.dir} ${f2(e.entry)}: ${STAGE_TXT[e.stage]}`, 5000);
        chime(good);
        if (before === 'RUN' && e.stage === 'TP1') toast(`🎯 TP1 kena! Di MT5, ubah stop loss posisi yang masih terbuka ke harga entry ${f2(e.entry)}.`, 8000);
      }
    }
    if (ch) { saveJ(); renderJournal(); if (A && A.entry && A.entry.stage !== 'RUN') analyse(false); }
  }

  // ---------- Render ----------
  function render(fresh) {
    renderHero(fresh); renderLevels(); renderChecks(); renderMTF(); renderChart(fresh); renderStats(); renderReading(); renderJournal();
    $('srcInfo').textContent = `Sumber: ${DATA[A.tf].source} (PAXG/USD) · ${A.d.length} candle ${A.T.label} · candle terakhir tutup ${new Date(A.d[A.L].t + A.T.ms).toLocaleString('id-ID')}`;
  }

  let lastBadge = '';
  function renderHero(fresh) {
    const { ev, sig, status, stale, T } = A, b = $('badge');
    let cls = 'wait', txt = 'TUNGGU', hero;
    if (!status.open) { txt = 'TUTUP'; hero = status.label + '. Sinyal baru muncul lagi setelah pasar buka.'; }
    else if (stale) { txt = 'TUNGGU'; hero = 'Data candle terlambat masuk. Coba tarik ulang atau cek koneksi.'; }
    else if (sig && A.entry && A.entry.stage === 'TP1') {
      cls = sig.dir.toLowerCase(); txt = sig.dir;
      hero = `🎯 TP1 sudah kena. Setengah lot ditutup, stop loss sisa posisi dipindah ke harga entry (${f2(A.entry.entry)}). Biarkan sisanya jalan ke TP2.<small>Jangan buka posisi baru di sinyal yang sama.</small>`;
    } else if (sig && sig.running) {
      cls = sig.dir.toLowerCase(); txt = sig.dir;
      hero = `Posisi ${sig.dir} dari sinyal ${new Date(A.entry.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} masih berjalan. Biarkan SL dan TP bekerja.<small>Kalau kamu belum masuk dan harga sudah jauh dari entry, jangan dikejar.</small>`;
    } else if (sig) {
      cls = sig.dir.toLowerCase(); txt = sig.dir;
      hero = `${sig.dir === 'BUY' ? 'Tren naik' : 'Tren turun'}, koreksi selesai, momentum kembali searah. Waktunya entry ${sig.dir}.` +
        `<small>${sig.age ? `Sinyal dari ${sig.age} candle lalu, masih valid.` : 'Sinyal dari candle yang baru saja tutup.'} Timeframe ${T.label}.</small>`;
    } else if (ev && ev.dir) {
      hero = `Setup ${ev.dir} sempat lengkap, tapi harga sudah bergerak terlalu jauh atau sudah menyentuh target. Terlambat untuk entry, tunggu setup berikutnya.<small>Mengejar harga = risiko lebih besar dari potensi untungnya.</small>`;
    } else if (ev) {
      hero = !ev.calm ? 'Volatilitas ekstrem, kemungkinan ada berita besar. Tunggu pasar tenang.'
        : !ev.strong ? `Tren lemah / sideways (ADX ${ev.adx.toFixed(1)}). Tunggu tren jelas.`
          : ev.bias === 'up' ? 'Tren naik, tapi belum ada koreksi dan konfirmasi yang pas.'
            : ev.bias === 'down' ? 'Tren turun, tapi belum ada koreksi dan konfirmasi yang pas.'
              : 'Arah tren belum jelas.';
      hero += '<small>BUY/SELL cuma muncul kalau semua syarat terpenuhi. Lihat tab Analisa untuk detail yang ditunggu.</small>';
    }
    b.className = 'badge ' + cls; b.textContent = txt;
    if (txt !== lastBadge) { b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 750); lastBadge = txt; }
    $('radar').classList.toggle('on', cls === 'wait');
    $('heroText').innerHTML = hero;
    const sc = ev ? ev.score : 0;
    $('gFg').style.strokeDashoffset = 251.3 * (1 - sc / 8);
    $('needle').style.transform = `rotate(${-90 + 180 * sc / 8}deg)`;
    countUp($('score'), sc, 0);
    $('tfchips').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.tf === A.tf));
  }

  function renderLevels() {
    const { sig, entry, edgeOK, st, T } = A, al = [];
    if (sig && entry) {
      const lotI = Core.lotSize(S.modal, S.risk, entry.risk, S.contract), lot = lotI.lot;
      const per = entry.risk * S.contract, loss = lot * per;
      // lot minimal 0,01 per posisi: kalau tidak bisa dibagi dua, pakai 1 posisi saja
      const lot1 = Math.floor(lot / 2 * 100 + 1e-9) / 100, lot2 = +(lot - lot1).toFixed(2), split = lot1 >= 0.01;
      const p1 = split ? lot1 * per : 0, p2 = split ? lot2 * per * 2 : lot * per * 2;
      const lotNote = split ? `MT5: 2 posisi · ${lot1.toFixed(2)} (TP1) + ${lot2.toFixed(2)} (TP2)` : 'MT5: 1 posisi saja, TP = TP2';
      const t1 = entry.stage === 'TP1' ? 'sudah kena ✓' : split ? `posisi 1 tutup ≈ +${usd(p1)}` : 'jangan tutup, geser SL ke entry';
      $('levels').innerHTML = `<div class="levels">
        <div class="lv en"><span>Entry ${entry.dir}</span><b id="lvE">${f2(entry.entry)}</b><em id="pl">P/L berjalan —</em></div>
        <div class="lv lot"><span>Ukuran lot (total)</span><b id="lvLot">0.00</b><em>${lotNote}</em></div>
        <div class="lv sl"><span>Stop loss · batas rugi</span><b id="lvSL">${f2(entry.stage === 'TP1' ? entry.entry : entry.sl)}</b><em>${entry.stage === 'TP1' ? 'sudah dipindah ke entry (impas)' : `maks rugi ≈ ${usd(-loss)} (${(loss / S.modal * 100).toFixed(2)}%)`}</em></div>
        <div class="lv tp"><span>TP1</span><b id="lvT1">${f2(entry.tp1)}</b><em>${t1}</em></div>
        <div class="lv tp" style="grid-column:1/-1"><span>TP2 · target akhir</span><b id="lvT2">${f2(entry.tp2)}</b><em>${split ? `posisi 2 tutup ≈ +${usd(p2)} · total kalau sampai TP2 ≈ +${usd(p1 + p2)}` : `≈ +${usd(p2)} kalau sampai TP2`}</em></div></div>`;
      stagger($('levels').firstElementChild);
      countUp($('lvLot'), lot, 2);
      if (lotI.tooSmall) al.push(['bad', `Modal terlalu kecil untuk risiko ${S.risk}% di ${T.label}: lot minimum 0.01 sudah berisiko ${usd(loss)} (${(loss / S.modal * 100).toFixed(1)}% modal). Pilih akun Cent, timeframe lebih kecil, atau lewati sinyal ini.`]);
      if (!edgeOK) al.push(['bad', `Uji historis ${T.label}: ${st.n < 20 ? 'trade masih terlalu sedikit (' + st.n + ')' : 'profit factor ' + st.pf.toFixed(2) + ' (belum untung)'}. Sinyal ini lebih berisiko dari biasanya.`]);
      if (S.syncMode === 'off') al.push(['info', 'Penyesuaian harga dimatikan: angka di sini harga PAXG, bisa beda beberapa dolar dari MT5. Nyalakan sinkron otomatis di Setelan.']);
      else if (S.syncMode === 'auto' && !Number.isFinite(S.autoOffset)) al.push(['warn', 'Harga XAUUSD spot belum tersinkron. Level di atas masih pakai harga PAXG.']);
      else al.push(['info', 'Broker bisa beda sedikit (biasanya < $1) dari harga spot. Kalau mau persis, pasang SL/TP dengan jarak yang sama dari harga entry di MT5 kamu.']);
      updatePL();
    } else $('levels').innerHTML = '';
    if (A.stale) al.push(['warn', 'Candle terbaru belum masuk. Mungkin koneksi lambat.']);
    $('alerts').innerHTML = al.map(([k, t]) => `<div class="alert ${k}">${t}</div>`).join('');
  }
  function updatePL() {
    const el = $('pl'); if (!el || !A || !A.entry) return;
    const p = live(); if (!Number.isFinite(p)) return;
    const e = A.entry, s = e.dir === 'BUY' ? 1 : -1, lot = Core.lotSize(S.modal, S.risk, e.risk, S.contract).lot;
    const v = (p - e.entry) * s * lot * S.contract;
    el.innerHTML = `P/L berjalan <b class="${v >= 0 ? 'up' : 'dn'}">${v >= 0 ? '+' : ''}${usd(v)}</b>`;
  }

  function renderChecks() {
    const ev = A.ev; if (!ev) { $('checks').innerHTML = '<div class="empty">Data belum cukup.</div>'; return; }
    const down = ev.bias === 'down', side = down ? ev.dn : ev.up, lbl = down ? 'SELL' : 'BUY', T = A.T;
    const hk = T.htf ? Market.TF[T.htf].label : null;
    const items = [
      [side.trend, `Tren ${down ? 'turun' : 'naik'}: EMA50 ${down ? 'di bawah' : 'di atas'} EMA200, harga ${down ? 'di bawah' : 'di atas'} EMA200`],
      [side.htf, hk ? `Timeframe ${hk} tidak berlawanan arah` : 'Timeframe besar (D1 adalah yang terbesar)'],
      [ev.strong, `Tren cukup kuat: ADX ${ev.adx.toFixed(1)} (minimal 20)`],
      [ev.calm, `Volatilitas normal: ATR $${f2(ev.atr)} (${(ev.atr / ev.atrAvg).toFixed(1)}× rata-rata)`],
      [side.pull, `Sudah koreksi ke dekat EMA20 (${f2(ev.e20)})`],
      [side.reclaim, `Candle tutup ${down ? 'merah di bawah' : 'hijau di atas'} EMA20`],
      [side.rsi, `RSI ${ev.rsi.toFixed(1)} di zona sehat dan ${down ? 'turun' : 'naik'}`],
      [side.macd, `Histogram MACD menguat ke arah ${lbl}`],
    ];
    $('ckFor').textContent = `· dicek untuk ${lbl}${ev.bias === 'flat' ? ' (tren belum jelas)' : ''}`;
    $('checks').innerHTML = items.map(([ok, t]) => `<div class="ck ${ok ? 'ok' : 'no'}"><i>${ok ? '✓' : '✕'}</i><span>${t}</span></div>`).join('');
    stagger($('checks'));
  }

  function renderMTF() {
    $('mtf').innerHTML = A.mtf.map(m => {
      const e = m.ev; if (!e) return `<div class="mt"><b>${m.label}</b><span class="arr">·</span><small>data kurang</small></div>`;
      const a = e.bias === 'up' ? '<span class="arr up">▲</span>' : e.bias === 'down' ? '<span class="arr dn">▼</span>' : '<span class="arr" style="color:var(--warn)">◆</span>';
      return `<div class="mt" ${m.k === A.tf ? 'style="border-color:var(--acc)"' : ''}><b>${m.label}</b>${a}<small>ADX ${e.adx.toFixed(0)} · RSI ${e.rsi.toFixed(0)}</small></div>`;
    }).join('');
    stagger($('mtf'));
  }

  function chartLevels() { if (!A.sig || !A.entry) return null; return A.entry.stage === 'TP1' ? Object.assign({}, A.entry, { sl: A.entry.entry }) : A.entry; }
  function renderChart(fresh) {
    if (!chart) chart = ChartView($('chart'), $('tip'));
    const f = DATA[A.tf].forming;
    $('chartTf').textContent = A.T.label;
    chart.set({ d: A.d, I: A.I, trades: A.trades, sr: A.sr, atr: A.ev ? A.ev.atr : 1, tfMs: A.T.ms, live: live(), forming: f ? shift(f) : null, levels: chartLevels() }, fresh);
  }

  function renderStats() {
    const s = A.st, from = A.d[205] ? A.d[205].t : A.d[0].t;
    $('btInfo').textContent = `· ${A.T.label}, ${Math.round((A.d[A.L].t - from) / 864e5)} hari terakhir`;
    if (!s.n) { $('stats').innerHTML = '<div class="empty" style="grid-column:1/-1">Belum ada trade di periode ini.</div>'; $('btNote').textContent = ''; return; }
    const cells = [['Jumlah trade', s.n, 0, '', ''], ['Win rate', s.win * 100, 1, '', '%'], ['Profit factor', isFinite(s.pf) ? s.pf : 99, 2, '', ''], ['Rata-rata/trade', s.avgR, 2, s.avgR >= 0 ? '+' : '', 'R'],
      [`Hasil (risiko ${S.risk}%)`, s.ret * 100, 1, s.ret >= 0 ? '+' : '', '%'], ['Drawdown terdalam', -s.mdd * 100, 1, '', '%'], ['Kalah beruntun', s.maxStreak, 0, '', '×'], ['Menang', s.wins, 0, '', ` / ${s.n}`]];
    $('stats').innerHTML = cells.map((c, i) => `<div class="st"><span>${c[0]}</span><b data-i="${i}">0</b></div>`).join('');
    $('stats').querySelectorAll('b').forEach((el, i) => countUp(el, cells[i][1], cells[i][2], cells[i][3], cells[i][4]));
    requestAnimationFrame(() => sparkline($('equity'), s.curve, s.ret >= 0 ? '#2fe39b' : '#ff5d73'));
    $('btNote').innerHTML = `Aturan yang sama persis diuji ke data lampau: entry di pembukaan candle berikutnya, spread $${f2(S.spread)} dihitung, kalau SL dan TP kena di candle yang sama dianggap rugi. 1R = besar risiko per trade. ` +
      (A.edgeOK ? 'Di periode ini strategi untung bersih, tapi tetap ada rugi beruntun: siapkan mental untuk itu.' : '<b class="warn">Di periode ini strategi belum terbukti untung di timeframe ini.</b>') + ' Hasil masa lalu tidak menjamin hasil ke depan.';
  }

  function renderReading() {
    if (!A.ev) { $('reading').innerHTML = '<div class="glass empty">Data belum cukup untuk dibaca.</div>'; return; }
    const now = new Date(), ms = Market.nextClose(A.tf) - Date.now();
    const sess = Market.sessions(now), ranges = {};
    sess.forEach(s => { ranges[s.key] = Market.sessionLocalRange(s, now); });
    const parts = Reader.read({
      tfLabel: A.T.label, mtf: A.mtf, ev: A.ev, last: A.d[A.L], price: live(), sr: A.sr, status: A.status, sessions: sess, sessRanges: ranges,
      closeIn: fmtDur(ms), sig: A.sig && A.entry ? A.entry : null, edgeOK: A.edgeOK, stale: A.stale,
    });
    $('reading').innerHTML = `<p class="note" style="margin:0 4px 10px">Dibaca ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })} dari candle ${A.T.label} terakhir yang sudah tutup.</p>` +
      parts.map(p => `<div class="glass rd"><div class="ic">${p.icon}</div><div><h4>${p.title}</h4><div>${p.html}</div></div></div>`).join('');
    if (document.querySelector('#tab-read.active')) stagger($('reading'));
  }

  function renderJournal() {
    const done = journal.filter(e => e.R != null), R = done.reduce((s, e) => s + e.R, 0), w = done.filter(e => e.R > 0).length;
    const cells = [['Sinyal tercatat', journal.length], ['Selesai', done.length], ['Win rate', done.length ? (w / done.length * 100).toFixed(0) + '%' : '—'], ['Total', (R >= 0 ? '+' : '') + R.toFixed(1) + 'R']];
    $('jStats').innerHTML = cells.map(c => `<div class="st"><span>${c[0]}</span><b>${c[1]}</b></div>`).join('');
    if (!journal.length) { $('journal').innerHTML = '<div class="glass empty">Belum ada sinyal. Aplikasi akan mencatat otomatis saat BUY/SELL muncul.</div>'; return; }
    $('journal').innerHTML = journal.slice(0, 60).map(e => {
      const res = e.R == null ? `<span style="color:var(--acc)">●</span>` : `<span class="${e.R > 0 ? 'up' : e.R < 0 ? 'dn' : ''}">${e.R > 0 ? '+' : ''}${e.R}R</span>`;
      return `<div class="glass je"><span class="tag ${e.dir}">${e.dir}</span>
        <div><div class="meta">${Market.TF[e.tf].label} · ${new Date(e.at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${e.lot} lot</div>
        <div class="lvls">E ${f2(e.entry)} · SL ${f2(e.sl)} · TP ${f2(e.tp1)} / ${f2(e.tp2)}</div></div>
        <div class="res">${res}<small>${STAGE_TXT[e.stage]}</small></div></div>`;
    }).join('');
  }

  // ---------- Harga live ----------
  let dayRef = NaN;
  let firstSync = true;
  function onPrice(p) {
    liveRaw = p;
    if (firstSync) { firstSync = false; syncSpot(); }
    const v = live(), el = $('price');
    if (Number.isFinite(lastShown) && v !== lastShown) {
      el.classList.remove('flash-up', 'flash-dn'); void el.offsetWidth;
      el.classList.add(v > lastShown ? 'flash-up' : 'flash-dn');
      clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('flash-up', 'flash-dn'), 700);
    }
    lastShown = v; el.textContent = f2(v);
    const d1 = DATA['1d'];
    dayRef = d1 && d1.bars.length ? d1.bars[d1.bars.length - 1].c + off() : NaN;
    if (Number.isFinite(dayRef)) {
      const ch = v - dayRef, pc = ch / dayRef * 100;
      $('chg').innerHTML = `<span class="${ch >= 0 ? 'up' : 'dn'}">${ch >= 0 ? '▲' : '▼'} ${f2(Math.abs(ch))} (${pc >= 0 ? '+' : ''}${pc.toFixed(2)}%)</span><span class="hide-sm"> hari ini</span>`;
    }
    if (chart && A) { chart.set(Object.assign({}, chartState(), { live: v }), false); }
    updatePL(); onTickJournal(v);
  }
  function chartState() { const f = DATA[A.tf].forming; return { d: A.d, I: A.I, trades: A.trades, sr: A.sr, atr: A.ev ? A.ev.atr : 1, tfMs: A.T.ms, forming: f ? shift(f) : null, levels: chartLevels() }; }

  // ---------- Sinkron otomatis PAXG → XAUUSD spot ----------
  const samples = [];
  let usedOff = null;
  async function syncSpot() {
    if (S.syncMode !== 'auto' || !Number.isFinite(liveRaw)) return;
    // saat pasar emas tutup harga spot berhenti tapi PAXG tetap jalan, jadi selisih lama yang dipakai
    if (!Market.marketStatus().open && Number.isFinite(S.autoOffset)) return;
    try {
      const paxg = liveRaw, r = await Market.spot();
      samples.push(r.price - paxg); if (samples.length > 5) samples.shift();
      const med = samples.slice().sort((a, b) => a - b)[Math.floor(samples.length / 2)];
      S.autoOffset = +med.toFixed(2); S.autoAt = Date.now(); S.autoSrc = r.source; save(); applySettings();
      if (A && (usedOff === null || Math.abs(off() - usedOff) >= 0.3)) analyse(false);
    } catch (e) { /* tetap pakai selisih terakhir */ }
  }

  // ---------- Jam, sesi, hitung mundur ----------
  function fmtDur(ms) {
    ms = Math.max(0, ms); const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
    return h ? `${h}j ${String(m).padStart(2, '0')}m` : `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  function tick() {
    const now = new Date();
    $('clock').textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
    const ms = Market.TF[S.tf].ms, left = Market.nextClose(S.tf, now.getTime()) - now.getTime();
    $('countdown').textContent = fmtDur(left);
    $('ringFg').style.strokeDashoffset = 106.8 * (1 - left / ms);
    const st = Market.marketStatus(now), mk = $('mkt');
    mk.textContent = st.open ? 'Pasar buka' : (st.reason === 'break' ? 'Jeda harian' : 'Pasar tutup'); mk.className = 'mkt ' + (st.open ? 'open' : 'closed');
    if (now.getSeconds() === 0 || !$('sessions').children.length) {
      $('sessions').innerHTML = Market.sessions(now).map(s => `<span class="chip ${s.active ? 'on' : ''}">${s.name} · ${Market.sessionLocalRange(s, now)}</span>`).join('');
    }
  }

  // ---------- Setelan ----------
  function applySettings() {
    document.body.dataset.theme = S.theme;
    document.body.classList.toggle('reduce', !!S.reduce);
    const h = new Date().getHours(), greet = h < 11 ? 'Pagi' : h < 15 ? 'Siang' : h < 19 ? 'Sore' : 'Malam';
    $('hello').textContent = `${greet}${S.name ? ', ' + S.name : ''} 👋`;
    const o = off();
    $('offInfo').innerHTML = S.syncMode === 'auto' ? (Number.isFinite(S.autoOffset) ? `Tersinkron otomatis ke XAUUSD spot (${S.autoSrc || ''}). Selisih PAXG→XAUUSD: ${o >= 0 ? '+' : ''}${f2(o)}, diperbarui ${new Date(S.autoAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.` : 'Menunggu harga XAUUSD spot…')
      : S.syncMode === 'manual' ? `Disamakan manual ke broker. Selisih: ${o >= 0 ? '+' : ''}${f2(o)}.` : 'Tanpa penyesuaian: memakai harga PAXG apa adanya.';
    document.querySelectorAll('#syncSeg button').forEach(x => x.classList.toggle('on', x.dataset.m === S.syncMode));
    $('manualBox').style.display = S.syncMode === 'manual' ? '' : 'none';
    $('themes').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === S.theme));
  }
  function bindSettings() {
    $('themes').innerHTML = THEMES.map(([t, c]) => `<button data-t="${t}" aria-label="Tema ${t}" style="background:radial-gradient(circle at 30% 30%,#fff8,${c} 45%,${c})"></button>`).join('');
    $('themes').onclick = e => { const t = e.target.dataset.t; if (!t) return; S.theme = t; save(); applySettings(); if (chart) chart.draw(); };
    const map = { sName: 'name', sModal: 'modal', sRisk: 'risk', sAcct: 'contract', sSpread: 'spread' };
    for (const [id, k] of Object.entries(map)) {
      const el = $(id); el.value = S[k];
      el.addEventListener('change', () => {
        let v = k === 'name' ? el.value.trim() : parseFloat(el.value);
        if (k === 'risk') v = Math.min(5, Math.max(0.1, v || 1));
        if (k === 'modal') v = Math.max(1, v || 1000);
        if (k === 'spread') v = Math.max(0, v || 0);
        S[k] = v; el.value = v; save(); applySettings();
        if (A && k !== 'name') analyse(false);
        if (k === 'risk' && v > 2) toast('⚠️ Risiko di atas 2% per trade bikin modal cepat habis saat kalah beruntun.', 5000);
      });
    }
    $('sSound').checked = S.sound; $('sNotif').checked = S.notif; $('sMotion').checked = S.reduce;
    $('sSound').onchange = e => { S.sound = e.target.checked; save(); if (S.sound) chime(true); };
    $('sMotion').onchange = e => { S.reduce = e.target.checked; save(); applySettings(); };
    $('sNotif').onchange = async e => {
      if (e.target.checked && 'Notification' in window) {
        const r = await Notification.requestPermission();
        if (r !== 'granted') { e.target.checked = false; toast('Izin notifikasi ditolak perangkat.'); }
      } else if (e.target.checked) { e.target.checked = false; toast('Perangkat ini tidak mendukung notifikasi web.'); }
      S.notif = e.target.checked; save();
    };
    $('bSync').onclick = () => {
      const b = parseFloat($('sBroker').value);
      const base = Number.isFinite(liveRaw) ? liveRaw : (DATA[S.tf] ? DATA[S.tf].bars[DATA[S.tf].bars.length - 1].c : NaN);
      if (!Number.isFinite(b) || !Number.isFinite(base)) { toast('Isi harga broker dulu, dan tunggu data harga masuk.'); return; }
      if (Math.abs(b - base) > 100) { toast('Selisihnya lebih dari $100. Cek lagi angka yang kamu ketik.'); return; }
      S.offset = +(b - base).toFixed(2); S.syncMode = 'manual'; save(); applySettings(); $('sBroker').value = '';
      toast(`Harga disamakan. Selisih ${S.offset >= 0 ? '+' : ''}${f2(S.offset)}`); if (A) analyse(false);
    };
    $('bReset').onclick = () => { S.offset = 0; S.syncMode = 'auto'; save(); applySettings(); syncSpot(); if (A) analyse(false); toast('Kembali ke sinkron otomatis.'); };
    $('syncSeg').onclick = e => {
      const m = e.target.dataset.m; if (!m) return;
      S.syncMode = m; save(); applySettings(); if (m === 'auto') syncSpot(); if (A) analyse(false);
    };
    $('bClear').onclick = () => {
      const b = $('bClear');
      if (b.dataset.c) { journal = []; saveJ(); renderJournal(); b.textContent = 'Hapus jurnal'; delete b.dataset.c; toast('Jurnal dihapus.'); return; }
      b.dataset.c = 1; b.textContent = 'Tekan sekali lagi untuk hapus'; setTimeout(() => { b.textContent = 'Hapus jurnal'; delete b.dataset.c; }, 3000);
    };
  }

  // ---------- Navigasi ----------
  function bindNav() {
    $('nav').onclick = e => {
      const btn = e.target.closest('button'); if (!btn) return;
      document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b === btn));
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + btn.dataset.tab));
      if (btn.dataset.tab === 'chart' && chart) { chart.set(Object.assign({}, chartState(), { live: live() }), true); requestAnimationFrame(() => A && A.st.n && sparkline($('equity'), A.st.curve, A.st.ret >= 0 ? '#2fe39b' : '#ff5d73')); }
      if (btn.dataset.tab === 'read' && A) renderReading();
      scrollTo({ top: 0, behavior: S.reduce ? 'auto' : 'smooth' });
    };
    $('tfchips').innerHTML = TFK.map(k => `<button data-tf="${k}">${Market.TF[k].label}</button>`).join('');
    $('tfchips').onclick = e => {
      const k = e.target.dataset.tf; if (!k || k === S.tf) return;
      S.tf = k; save(); $('tfchips').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.tf === k));
      $('badge').className = 'badge wait'; $('badge').textContent = 'MEMUAT'; $('heroText').textContent = 'Mengambil data ' + Market.TF[k].label + '…';
      if (DATA[k] && DATA[k].bars.length >= WANT[k] * 0.8) analyse(true);
      load();
    };
    $('zoom').onclick = e => {
      const n = +e.target.dataset.n; if (!n) return;
      $('zoom').querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.target));
      chart && chart.setCount(n);
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden && A && Date.now() - A.d[A.L].t > 2 * A.T.ms) load(); });
  }

  // ---------- Panduan & banner pasang ----------
  window.toast = toast;
  function goTab(name) { const b = document.querySelector(`#nav button[data-tab="${name}"]`); if (b) b.click(); }
  function showLearn(v) {
    document.querySelectorAll('#learnSeg button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    document.querySelectorAll('.lview').forEach(x => { x.hidden = x.id !== v; if (!x.hidden) { x.classList.remove('stagger'); stagger(x); } });
  }
  function bindGuide() {
    Guide.render($('guide'));
    Learn.render($('lesson'), $('gloss'));
    $('learnSeg').onclick = e => { const v = e.target.closest('button') && e.target.closest('button').dataset.v; if (v) showLearn(v); };
    const ban = $('installBanner');
    ban.hidden = Guide.standalone() || S.guideSeen;
    $('bBannerGo').onclick = () => { goTab('guide'); showLearn('guide'); Guide.open('install'); };
    $('bBannerX').onclick = () => { ban.hidden = true; S.guideSeen = true; save(); };
  }

  // ---------- Mulai ----------
  bindSettings(); bindNav(); bindGuide(); applySettings(); tick(); setInterval(tick, 1000);
  setInterval(() => { if (A && document.querySelector('#tab-read.active')) renderReading(); }, 60000);
  setTimeout(hideSplash, 6000);
  setTimeout(syncSpot, 4000); setInterval(syncSpot, 60000);
  Market.live(onPrice, st => { $('liveDot').className = 'dot ' + (st === 'live' ? 'live' : st === 'poll' ? 'poll' : ''); });
  load();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
  window.GS = { _data: DATA, analyse: () => analyse(true), state: () => A, settings: S, _inject(tf, bars) { DATA[tf] = { bars: Core.clean(bars), forming: null, source: 'uji' }; } };
})();
