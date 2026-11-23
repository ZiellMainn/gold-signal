/* Gold Signal — mesin hitung (tanpa DOM, bisa dites di Node) */
(function (root) {
  'use strict';

  // ---------- Validasi data ----------
  function clean(bars) {
    const seen = new Set(), out = [];
    for (const b of bars) {
      if (!b || ![b.t, b.o, b.h, b.l, b.c].every(Number.isFinite)) continue;
      if (b.o <= 0 || b.c <= 0 || b.h <= 0 || b.l <= 0) continue;
      if (seen.has(b.t)) continue;
      seen.add(b.t);
      const h = Math.max(b.h, b.o, b.c, b.l), l = Math.min(b.l, b.o, b.c, b.h);
      out.push({ t: b.t, o: b.o, h, l, c: b.c });
    }
    out.sort((a, b) => a.t - b.t);
    return out;
  }

  // ---------- Indikator ----------
  function ema(a, p) {
    const k = 2 / (p + 1), o = new Array(a.length).fill(NaN);
    let s = 0, n = 0;
    for (let i = 0; i < a.length; i++) {
      if (n < p) { s += a[i]; n++; if (n === p) o[i] = s / p; continue; }
      o[i] = a[i] * k + o[i - 1] * (1 - k);
    }
    return o;
  }
  function sma(a, p) {
    const o = new Array(a.length).fill(NaN); let s = 0, c = 0;
    for (let i = 0; i < a.length; i++) {
      if (Number.isFinite(a[i])) { s += a[i]; c++; }
      if (i >= p && Number.isFinite(a[i - p])) { s -= a[i - p]; c--; }
      if (c >= p) o[i] = s / p;
    }
    return o;
  }
  function rma(a, p) { // Wilder
    const o = new Array(a.length).fill(NaN); let s = 0, n = 0;
    for (let i = 0; i < a.length; i++) {
      if (!Number.isFinite(a[i])) continue;
      if (n < p) { s += a[i]; n++; if (n === p) o[i] = s / p; continue; }
      o[i] = (o[i - 1] * (p - 1) + a[i]) / p;
    }
    return o;
  }
  function rsi(c, p = 14) {
    const up = [NaN], dn = [NaN];
    for (let i = 1; i < c.length; i++) { const d = c[i] - c[i - 1]; up.push(Math.max(d, 0)); dn.push(Math.max(-d, 0)); }
    const ru = rma(up, p), rd = rma(dn, p);
    return ru.map((u, i) => !Number.isFinite(u) ? NaN : rd[i] === 0 ? 100 : 100 - 100 / (1 + u / rd[i]));
  }
  function trueRange(h, l, c) {
    return h.map((_, i) => i === 0 ? h[0] - l[0] : Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])));
  }
  function atr(h, l, c, p = 14) { return rma(trueRange(h, l, c), p); }
  function adx(h, l, c, p = 14) {
    const pdm = [NaN], mdm = [NaN], tr = trueRange(h, l, c); tr[0] = NaN;
    for (let i = 1; i < h.length; i++) {
      const u = h[i] - h[i - 1], d = l[i - 1] - l[i];
      pdm.push(u > d && u > 0 ? u : 0); mdm.push(d > u && d > 0 ? d : 0);
    }
    const sp = rma(pdm, p), sm = rma(mdm, p), st = rma(tr, p);
    const pdi = [], mdi = [];
    const dx = sp.map((_, i) => {
      if (!Number.isFinite(st[i]) || st[i] === 0) { pdi.push(NaN); mdi.push(NaN); return NaN; }
      const a = 100 * sp[i] / st[i], b = 100 * sm[i] / st[i];
      pdi.push(a); mdi.push(b);
      return a + b === 0 ? 0 : 100 * Math.abs(a - b) / (a + b);
    });
    return { adx: rma(dx, p), pdi, mdi };
  }
  function macd(c) {
    const e12 = ema(c, 12), e26 = ema(c, 26);
    const line = e12.map((v, i) => v - e26[i]);
    const first = line.findIndex(Number.isFinite);
    const sig = new Array(c.length).fill(NaN);
    if (first >= 0) { const s = ema(line.slice(first), 9); for (let i = 0; i < s.length; i++) sig[first + i] = s[i]; }
    return { line, sig, hist: line.map((v, i) => v - sig[i]) };
  }

  function indicators(d) {
    const c = d.map(x => x.c), h = d.map(x => x.h), l = d.map(x => x.l);
    const a = atr(h, l, c, 14), m = macd(c), x = adx(h, l, c, 14);
    return {
      e20: ema(c, 20), e50: ema(c, 50), e200: ema(c, 200), rsi: rsi(c, 14),
      atr: a, atrAvg: sma(a, 100), adx: x.adx, pdi: x.pdi, mdi: x.mdi,
      macd: m.line, macdSig: m.sig, hist: m.hist,
    };
  }

  // Bias tren per candle: 1 naik, -1 turun, 0 netral
  function biasSeries(d, I) {
    return d.map((b, i) => {
      if (!Number.isFinite(I.e200[i])) return 0;
      if (I.e50[i] > I.e200[i] && b.c > I.e200[i]) return 1;
      if (I.e50[i] < I.e200[i] && b.c < I.e200[i]) return -1;
      return 0;
    });
  }
  // Petakan bias timeframe besar ke tiap candle timeframe kecil, hanya pakai candle besar yang SUDAH tutup
  function mapHTF(base, baseMs, htf, htfMs, htfBias) {
    const out = new Array(base.length).fill(0); let k = -1;
    for (let i = 0; i < base.length; i++) {
      const closeT = base[i].t + baseMs;
      while (k + 1 < htf.length && htf[k + 1].t + htfMs <= closeT) k++;
      out[i] = k >= 0 ? htfBias[k] : 0;
    }
    return out;
  }

  const DEF = { adxMin: 20, slAtr: 1.5, tp1R: 1, tp2R: 2, volMax: 2.0, trend: 'normal' };

  function evalAt(d, I, i, P, htf) {
    P = P || DEF;
    const x = d[i];
    if (!x || i < 3) return null;
    const need = [I.e20[i], I.e50[i], I.e200[i], I.rsi[i], I.rsi[i - 1], I.atr[i], I.atrAvg[i], I.adx[i], I.hist[i], I.hist[i - 1]];
    if (need.some(v => !Number.isFinite(v))) return null;
    const A = I.atr[i];
    let lo = Infinity, hi = -Infinity;
    for (let k = i - 3; k <= i; k++) { lo = Math.min(lo, d[k].l); hi = Math.max(hi, d[k].h); }
    const hb = htf ? htf[i] : 0;
    const fast = P.trend === 'fast'; // mode cepat: tren dari EMA20 vs EMA50
    const up = {
      trend: fast ? I.e20[i] > I.e50[i] && x.c > I.e50[i] : I.e50[i] > I.e200[i] && x.c > I.e200[i],
      htf: !htf || hb !== -1,
      pull: lo <= I.e20[i] + 0.3 * A,
      reclaim: x.c > I.e20[i] && x.c > x.o,
      rsi: I.rsi[i] >= 45 && I.rsi[i] <= 70 && I.rsi[i] > I.rsi[i - 1],
      macd: I.hist[i] > I.hist[i - 1],
    };
    const dn = {
      trend: fast ? I.e20[i] < I.e50[i] && x.c < I.e50[i] : I.e50[i] < I.e200[i] && x.c < I.e200[i],
      htf: !htf || hb !== 1,
      pull: hi >= I.e20[i] - 0.3 * A,
      reclaim: x.c < I.e20[i] && x.c < x.o,
      rsi: I.rsi[i] <= 55 && I.rsi[i] >= 30 && I.rsi[i] < I.rsi[i - 1],
      macd: I.hist[i] < I.hist[i - 1],
    };
    const strong = I.adx[i] >= P.adxMin;
    const calm = A <= P.volMax * I.atrAvg[i];
    const all = o => o.trend && o.htf && o.pull && o.reclaim && o.rsi && o.macd;
    let dir = null;
    if (strong && calm && all(up)) dir = 'BUY';
    else if (strong && calm && all(dn)) dir = 'SELL';
    const bias = up.trend ? 'up' : dn.trend ? 'down' : 'flat';
    const side = bias === 'down' ? dn : up;
    const score = [side.trend, side.htf, strong, calm, side.pull, side.reclaim, side.rsi, side.macd].filter(Boolean).length;
    return { dir, up, dn, strong, calm, bias, score, fast, htfBias: hb, atr: A, atrAvg: I.atrAvg[i], adx: I.adx[i], pdi: I.pdi[i], mdi: I.mdi[i], rsi: I.rsi[i], rsiPrev: I.rsi[i - 1], hist: I.hist[i], histPrev: I.hist[i - 1], e20: I.e20[i], e50: I.e50[i], e200: I.e200[i], close: x.c };
  }

  function levels(dir, entry, A, P) {
    P = P || DEF;
    const s = dir === 'BUY' ? 1 : -1, risk = P.slAtr * A;
    return { dir, entry, sl: entry - s * risk, tp1: entry + s * risk * P.tp1R, tp2: entry + s * risk * P.tp2R, risk };
  }

  // Simulasi satu posisi dari candle `from`: setengah tutup di TP1 + SL ke entry, sisa di TP2.
  // SL & TP di candle sama → dianggap SL (konservatif). Return {R, exit, stage} atau {open:true,...}
  function simulate(d, L, from, P) {
    P = P || DEF;
    const s = L.dir === 'BUY' ? 1 : -1;
    let stage = 0;
    for (let j = from; j < d.length; j++) {
      const b = d[j], stop = stage ? L.entry : L.sl;
      const hitSL = s > 0 ? b.l <= stop : b.h >= stop;
      const hitT1 = s > 0 ? b.h >= L.tp1 : b.l <= L.tp1;
      const hitT2 = s > 0 ? b.h >= L.tp2 : b.l <= L.tp2;
      if (stage === 0) {
        if (hitSL) return { R: -1, exit: j, stage: 'SL' };
        if (hitT1) { stage = 1; if (hitT2) return { R: 0.5 * P.tp1R + 0.5 * P.tp2R, exit: j, stage: 'TP2' }; }
      } else {
        if (hitSL) return { R: 0.5 * P.tp1R, exit: j, stage: 'TP1+BE' };
        if (hitT2) return { R: 0.5 * P.tp1R + 0.5 * P.tp2R, exit: j, stage: 'TP2' };
      }
    }
    return { open: true, stage: stage ? 'TP1' : 'RUN' };
  }

  function backtest(d, I, P, spread, htf, start) {
    P = P || DEF; spread = spread || 0;
    const trades = []; let i = Math.max(start || 0, 205);
    while (i < d.length - 2) {
      const ev = evalAt(d, I, i, P, htf);
      if (!ev || !ev.dir) { i++; continue; }
      const L = levels(ev.dir, d[i + 1].o, ev.atr, P);
      const r = simulate(d, L, i + 1, P);
      if (r.open) break;
      trades.push({ dir: ev.dir, sig: i, i: i + 1, exit: r.exit, entry: L.entry, sl: L.sl, tp2: L.tp2, R: r.R - spread / L.risk, how: r.stage });
      i = r.exit + 1;
    }
    return trades;
  }

  function stats(trades, riskPct) {
    const n = trades.length;
    if (!n) return { n: 0 };
    const wins = trades.filter(t => t.R > 0), loss = trades.filter(t => t.R <= 0);
    const gp = wins.reduce((s, t) => s + t.R, 0), gl = -loss.reduce((s, t) => s + t.R, 0);
    let eq = 1, peak = 1, mdd = 0, streak = 0, maxStreak = 0;
    const curve = [1];
    for (const t of trades) {
      eq *= 1 + (riskPct / 100) * t.R; peak = Math.max(peak, eq); mdd = Math.max(mdd, 1 - eq / peak);
      streak = t.R <= 0 ? streak + 1 : 0; maxStreak = Math.max(maxStreak, streak);
      curve.push(eq);
    }
    return { n, wins: wins.length, win: wins.length / n, pf: gl ? gp / gl : Infinity, avgR: (gp - gl) / n, ret: eq - 1, mdd, maxStreak, curve };
  }

  // ---------- Support / Resistance dari swing high/low ----------
  function pivots(d, left, right, from) {
    left = left || 5; right = right || 5;
    const out = [];
    for (let i = Math.max(left, from || 0); i < d.length - right; i++) {
      let isH = true, isL = true;
      for (let k = i - left; k <= i + right; k++) {
        if (k === i) continue;
        if (d[k].h >= d[i].h) isH = false;
        if (d[k].l <= d[i].l) isL = false;
      }
      if (isH) out.push({ p: d[i].h, i, type: 'R' });
      if (isL) out.push({ p: d[i].l, i, type: 'S' });
    }
    return out;
  }
  function srLevels(d, A, lookback) {
    lookback = lookback || 300;
    const from = Math.max(0, d.length - lookback);
    const pv = pivots(d, 5, 5, from).sort((a, b) => a.p - b.p);
    const tol = 0.5 * A, zones = [];
    for (const p of pv) {
      const z = zones[zones.length - 1];
      if (z && p.p - z.hi <= tol) { z.hi = Math.max(z.hi, p.p); z.lo = Math.min(z.lo, p.p); z.n++; z.sum += p.p; z.last = Math.max(z.last, p.i); }
      else zones.push({ lo: p.p, hi: p.p, n: 1, sum: p.p, last: p.i });
    }
    const price = d[d.length - 1].c;
    const zs = zones.map(z => ({ mid: z.sum / z.n, lo: z.lo, hi: z.hi, touches: z.n, age: d.length - 1 - z.last }));
    return {
      res: zs.filter(z => z.mid > price).sort((a, b) => a.mid - b.mid).slice(0, 3),
      sup: zs.filter(z => z.mid < price).sort((a, b) => b.mid - a.mid).slice(0, 3),
    };
  }

  // Ukuran lot dari risiko (dibulatkan ke bawah ke 0.01)
  function lotSize(modal, riskPct, slDist, contract) {
    if (!(modal > 0 && riskPct > 0 && slDist > 0 && contract > 0)) return { lot: 0, loss: 0, tooSmall: true };
    const riskUSD = modal * riskPct / 100;
    const raw = riskUSD / (slDist * contract);
    let lot = Math.floor(raw * 100 + 1e-9) / 100;
    const tooSmall = lot < 0.01;
    if (tooSmall) lot = 0.01;
    return { lot, riskUSD, loss: lot * slDist * contract, tooSmall };
  }

  const api = { clean, ema, sma, rma, rsi, atr, adx, macd, indicators, biasSeries, mapHTF, evalAt, levels, simulate, backtest, stats, pivots, srLevels, lotSize, DEF };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Core = api;
})(typeof self !== 'undefined' ? self : this);
