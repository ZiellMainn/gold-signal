/* Data pasar: candle, harga live, jam & sesi pasar emas */
(function (root) {
  'use strict';
  const TF = {
    '15m': { label: 'M15', bin: '15m', kr: 15, ms: 15 * 60e3, htf: '1h' },
    '1h': { label: 'H1', bin: '1h', kr: 60, ms: 60 * 60e3, htf: '4h' },
    '4h': { label: 'H4', bin: '4h', kr: 240, ms: 240 * 60e3, htf: '1d' },
    '1d': { label: 'D1', bin: '1d', kr: 1440, ms: 1440 * 60e3, htf: null },
  };
  const BIN = ['https://data-api.binance.vision', 'https://api.binance.com'];
  const WS = ['wss://data-stream.binance.vision/ws/paxgusdt@miniTicker', 'wss://stream.binance.com:9443/ws/paxgusdt@miniTicker'];

  async function getJSON(url, ms) {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), ms || 12000);
    try {
      const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(to); }
  }

  let preferred = 0; // sumber yang terakhir berhasil dipakai duluan
  async function binanceKlines(base, tf, want) {
    let out = [], end = null;
    while (out.length < want) {
      const lim = Math.min(1000, want - out.length + 1);
      const url = `${base}/api/v3/klines?symbol=PAXGUSDT&interval=${TF[tf].bin}&limit=${lim}` + (end ? `&endTime=${end}` : '');
      const rows = await getJSON(url);
      if (!Array.isArray(rows) || !rows.length) break;
      const bars = rows.map(r => ({ t: r[0], o: +r[1], h: +r[2], l: +r[3], c: +r[4], ct: r[6] }));
      out = bars.concat(out);
      end = rows[0][0] - 1;
      if (rows.length < lim) break;
    }
    return out;
  }
  async function krakenKlines(tf) {
    const j = await getJSON(`https://api.kraken.com/0/public/OHLC?pair=PAXGUSD&interval=${TF[tf].kr}`);
    if (j.error && j.error.length) throw new Error(j.error[0]);
    const key = Object.keys(j.result).find(k => k !== 'last');
    return j.result[key].map(r => ({ t: r[0] * 1000, o: +r[1], h: +r[2], l: +r[3], c: +r[4], ct: r[0] * 1000 + TF[tf].ms - 1 }));
  }
  const SOURCES = [
    { name: 'Binance Data', fn: (tf, n) => binanceKlines(BIN[0], tf, n) },
    { name: 'Binance', fn: (tf, n) => binanceKlines(BIN[1], tf, n) },
    { name: 'Kraken', fn: tf => krakenKlines(tf) },
  ];

  // Return {bars: candle tertutup, forming: candle berjalan|null, source}
  async function klines(tf, want) {
    const errs = [];
    const order = [preferred, ...SOURCES.keys()].filter((v, i, a) => a.indexOf(v) === i);
    for (const k of order) {
      try {
        const raw = await SOURCES[k].fn(tf, want);
        const now = Date.now();
        const closed = raw.filter(b => b.ct < now), forming = raw.find(b => b.ct >= now) || null;
        const bars = root.Core.clean(closed);
        if (bars.length < 260) { errs.push(SOURCES[k].name + ': data kurang'); continue; }
        preferred = k;
        return { bars, forming, source: SOURCES[k].name };
      } catch (e) { errs.push(SOURCES[k].name + ': ' + (e.name === 'AbortError' ? 'timeout' : e.message)); }
    }
    throw new Error('Gagal ambil data (' + errs.join(' · ') + ')');
  }

  // Harga live: WebSocket, kalau gagal polling tiap 5 detik
  function live(onPrice, onState) {
    let ws = null, k = 0, poll = null, stopped = false, retry = null;
    const startPoll = () => {
      onState && onState('poll');
      const tick = async () => {
        for (const base of BIN) {
          try { const j = await getJSON(`${base}/api/v3/ticker/price?symbol=PAXGUSDT`, 6000); onPrice(+j.price, Date.now()); return; } catch (e) { /* coba berikutnya */ }
        }
        try {
          const j = await getJSON('https://api.kraken.com/0/public/Ticker?pair=PAXGUSD', 6000);
          const key = Object.keys(j.result)[0]; onPrice(+j.result[key].c[0], Date.now());
        } catch (e) { onState && onState('off'); }
      };
      tick(); poll = setInterval(tick, 5000);
    };
    const open = () => {
      if (stopped) return;
      if (k >= WS.length || typeof WebSocket === 'undefined') { startPoll(); return; }
      let got = false;
      try { ws = new WebSocket(WS[k]); } catch (e) { k++; open(); return; }
      const guard = setTimeout(() => { if (!got) { try { ws.close(); } catch (e) {} } }, 8000);
      ws.onmessage = ev => {
        try { const m = JSON.parse(ev.data); if (m.c) { got = true; onState && onState('live'); onPrice(+m.c, m.E || Date.now()); } } catch (e) {}
      };
      ws.onclose = () => {
        clearTimeout(guard);
        if (stopped) return;
        if (!got) { k++; open(); } else { retry = setTimeout(open, 3000); } // putus setelah jalan → sambung lagi
      };
      ws.onerror = () => { try { ws.close(); } catch (e) {} };
    };
    open();
    return () => { stopped = true; clearInterval(poll); clearTimeout(retry); try { ws && ws.close(); } catch (e) {} };
  }

  // ---------- Harga emas spot XAUUSD asli (untuk menyamakan harga PAXG) ----------
  const SPOT = [
    { name: 'xaus.com', url: 'https://xaus.com/api/v1/spot', pick: j => +j.spot_usd_oz },
    { name: 'gold-api.com', url: 'https://api.gold-api.com/price/XAU', pick: j => +j.price },
  ];
  let spotPref = 0;
  async function spot() {
    for (const k of [spotPref, ...SPOT.keys()].filter((v, i, a) => a.indexOf(v) === i)) {
      try {
        const v = SPOT[k].pick(await getJSON(SPOT[k].url, 8000));
        if (Number.isFinite(v) && v > 500 && v < 50000) { spotPref = k; return { price: v, source: SPOT[k].name }; }
      } catch (e) { /* coba sumber berikutnya */ }
    }
    throw new Error('Harga spot XAUUSD tidak bisa diambil');
  }

  // ---------- Jam pasar ----------
  function partsIn(tz, date) {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
    const p = Object.fromEntries(f.formatToParts(date).map(x => [x.type, x.value]));
    return { wd: p.weekday, h: +p.hour % 24, m: +p.minute };
  }
  // Emas spot (XAUUSD) buka Minggu 18:00 New York s/d Jumat 17:00 NY, jeda harian 17:00–18:00 NY.
  function marketStatus(now) {
    now = now || new Date();
    const ny = partsIn('America/New_York', now);
    const weekend = (ny.wd === 'Fri' && ny.h >= 17) || ny.wd === 'Sat' || (ny.wd === 'Sun' && ny.h < 18);
    if (weekend) return { open: false, reason: 'weekend', label: 'Pasar emas tutup (akhir pekan)' };
    if (ny.h === 17) return { open: false, reason: 'break', label: 'Jeda harian pasar emas (1 jam)' };
    return { open: true, label: 'Pasar emas buka' };
  }
  const SESS = [
    { key: 'asia', name: 'Asia (Tokyo)', tz: 'Asia/Tokyo', from: 8, to: 17, note: 'biasanya pergerakan lebih kalem' },
    { key: 'london', name: 'London', tz: 'Europe/London', from: 8, to: 17, note: 'volume besar, sering awal tren harian' },
    { key: 'ny', name: 'New York', tz: 'America/New_York', from: 8, to: 17, note: 'paling volatil, ada rilis data AS' },
  ];
  function sessions(now) {
    now = now || new Date();
    return SESS.map(s => {
      const p = partsIn(s.tz, now), wd = p.wd, hr = p.h + p.m / 60;
      const weekday = wd !== 'Sat' && wd !== 'Sun';
      return Object.assign({}, s, { active: weekday && hr >= s.from && hr < s.to });
    });
  }
  // Konversi jam sesi ke jam lokal perangkat (mengikuti DST otomatis)
  function sessionLocalRange(s, now) {
    now = now || new Date();
    const p = partsIn(s.tz, now);
    const startDelta = ((s.from - p.h) * 60 - p.m) * 60e3, endDelta = ((s.to - p.h) * 60 - p.m) * 60e3;
    const f = d => new Date(now.getTime() + d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return f(startDelta) + '–' + f(endDelta);
  }
  function nextClose(tf, now) {
    const ms = TF[tf].ms, t = (now || Date.now());
    return Math.floor(t / ms) * ms + ms;
  }

  root.Market = { TF, klines, live, spot, marketStatus, sessions, sessionLocalRange, nextClose };
})(typeof self !== 'undefined' ? self : this);
