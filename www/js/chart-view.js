/* Grafik candlestick ringan berbasis canvas: animasi muncul, crosshair, garis level */
(function (root) {
  'use strict';
  const fmt = v => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function ChartView(canvas, tip) {
    let S = null, N = 120, prog = 1, raf = 0, hover = null;
    const css = n => getComputedStyle(document.body).getPropertyValue(n).trim();

    function animateIn() {
      if (document.body.classList.contains('reduce')) { prog = 1; draw(); return; }
      cancelAnimationFrame(raf); const t0 = performance.now();
      const step = t => { prog = Math.min(1, (t - t0) / 700); draw(); if (prog < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }
    function set(state, animate) { S = state; animate ? animateIn() : draw(); }
    function setCount(n) { N = n; animateIn(); }

    function draw() {
      if (!S || !S.d || !S.d.length) return;
      const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H) return;
      if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      const d = S.forming ? S.d.concat([S.forming]) : S.d, I = S.I;
      const n = Math.min(N, d.length), s0 = d.length - n, view = d.slice(s0);
      const L0 = S.levels, be = L0 && L0.sl === L0.entry;
      const lines = L0 ? [[L0.entry, css('--acc'), be ? 'SL=ENTRY' : 'ENTRY']].concat(be ? [] : [[L0.sl, css('--dn'), 'SL']], [[L0.tp1, css('--up'), 'TP1'], [L0.tp2, css('--up'), 'TP2']]) : [];
      let lo = Infinity, hi = -Infinity;
      for (const b of view) { lo = Math.min(lo, b.l); hi = Math.max(hi, b.h); }
      for (const l of lines) { lo = Math.min(lo, l[0]); hi = Math.max(hi, l[0]); }
      if (Number.isFinite(S.live)) { lo = Math.min(lo, S.live); hi = Math.max(hi, S.live); }
      const pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
      const R = 92, B = 18, cw = (W - R) / n;
      const y = v => (hi - v) / (hi - lo) * (H - B), x = i => (i - s0 + 0.5) * cw;

      // grid
      g.font = '500 10px ' + css('--mono'); g.lineWidth = 1;
      for (let k = 0; k <= 5; k++) {
        const v = lo + (hi - lo) * k / 5, yy = Math.round(y(v)) + .5;
        g.strokeStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.moveTo(0, yy); g.lineTo(W - R, yy); g.stroke();
        g.fillStyle = '#8a90a3'; g.fillText(fmt(v), W - R + 6, yy + 3);
      }
      // waktu
      const cnt = Math.max(2, Math.floor((W - R) / 95)), p2 = v => String(v).padStart(2, '0');
      g.textAlign = 'center'; g.fillStyle = '#5d6375';
      for (let k = 0; k < cnt; k++) {
        const i = Math.min(d.length - 1, s0 + Math.floor((k + 0.5) * n / cnt)), dt = new Date(d[i].t);
        const lab = S.tfMs >= 864e5 ? `${p2(dt.getDate())}/${p2(dt.getMonth() + 1)}/${String(dt.getFullYear()).slice(2)}` : `${p2(dt.getDate())}/${p2(dt.getMonth() + 1)} ${p2(dt.getHours())}:${p2(dt.getMinutes())}`;
        g.fillText(lab, x(i), H - 4);
      }
      g.textAlign = 'left';
      // zona support/resistance
      if (S.sr) for (const z of S.sr.res.concat(S.sr.sup)) {
        const top = y(z.hi + 0.15 * S.atr), bot = y(z.lo - 0.15 * S.atr);
        g.fillStyle = z.mid > (S.live || d[d.length - 1].c) ? 'rgba(255,93,115,.07)' : 'rgba(47,227,155,.07)';
        g.fillRect(0, top, W - R, Math.max(2, bot - top));
      }
      const shown = Math.max(1, Math.ceil(n * prog));
      // candle
      for (let k = 0; k < shown; k++) {
        const i = s0 + k, b = d[i], up = b.c >= b.o, isForm = S.forming && i === d.length - 1;
        const col = up ? css('--up') : css('--dn');
        g.globalAlpha = isForm ? .55 : 1; g.strokeStyle = g.fillStyle = col;
        g.beginPath(); g.moveTo(x(i), y(b.h)); g.lineTo(x(i), y(b.l)); g.stroke();
        const top = y(Math.max(b.o, b.c)), h = Math.max(1, Math.abs(y(b.o) - y(b.c)));
        g.fillRect(x(i) - cw * .34, top, Math.max(1, cw * .68), h);
      }
      g.globalAlpha = 1;
      // EMA
      const emas = [['e20', '#ffd166'], ['e50', '#6aa9ff'], ['e200', '#c084fc']];
      for (const [k, col] of emas) {
        g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath(); let st = false;
        for (let i = s0; i < Math.min(S.d.length, s0 + shown); i++) { const v = I[k][i]; if (!Number.isFinite(v)) continue; st ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)); st = true; }
        g.stroke();
      }
      // marker uji historis
      if (S.trades) for (const t of S.trades) if (t.i >= s0 && t.i < s0 + shown) {
        const px = x(t.i), buy = t.dir === 'BUY', py = buy ? y(d[t.i].l) + 12 : y(d[t.i].h) - 12;
        g.fillStyle = t.R > 0 ? css('--up') : css('--dn'); g.beginPath();
        if (buy) { g.moveTo(px, py - 6); g.lineTo(px - 5, py + 3); g.lineTo(px + 5, py + 3); } else { g.moveTo(px, py + 6); g.lineTo(px - 5, py - 3); g.lineTo(px + 5, py - 3); }
        g.fill();
      }
      // level sinyal
      if (prog === 1) {
        g.setLineDash([6, 5]); g.lineWidth = 1.2;
        for (const [v, col, name] of lines) {
          const yy = y(v); g.strokeStyle = col; g.beginPath(); g.moveTo(0, yy); g.lineTo(W - R, yy); g.stroke();
          g.fillStyle = col; g.fillRect(W - R, yy - 8, R, 16); g.fillStyle = '#0b0c12'; g.fillText(name + ' ' + fmt(v), W - R + 3, yy + 3);
        }
        g.setLineDash([]);
        // harga live
        if (Number.isFinite(S.live)) {
          const yy = y(S.live), col = css('--acc');
          g.strokeStyle = col; g.globalAlpha = .6; g.beginPath(); g.moveTo(0, yy); g.lineTo(W - R, yy); g.stroke(); g.globalAlpha = 1;
          const pulse = 3 + 2 * Math.abs(Math.sin(performance.now() / 300));
          g.fillStyle = col; g.beginPath(); g.arc(x(d.length - 1), yy, pulse, 0, 7); g.fill();
          g.fillRect(W - R, yy - 9, R, 18); g.fillStyle = '#0b0c12'; g.font = '700 10px ' + css('--mono'); g.fillText(fmt(S.live), W - R + 4, yy + 4);
        }
      }
      // crosshair
      if (hover && prog === 1) {
        const i = Math.max(s0, Math.min(d.length - 1, s0 + Math.floor(hover.x / cw)));
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(x(i), 0); g.lineTo(x(i), H - B); g.moveTo(0, hover.y); g.lineTo(W - R, hover.y); g.stroke(); g.setLineDash([]);
        const b = d[i], dt = new Date(b.t).toLocaleString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        const vy = hi - hover.y / (H - B) * (hi - lo);
        tip.innerHTML = `${dt}<br>O ${fmt(b.o)} H ${fmt(b.h)}<br>L ${fmt(b.l)} C <b style="color:${b.c >= b.o ? css('--up') : css('--dn')}">${fmt(b.c)}</b>` +
          (i < S.d.length && Number.isFinite(I.rsi[i]) ? `<br>RSI ${I.rsi[i].toFixed(1)} · ATR ${I.atr[i].toFixed(2)}` : '') + `<br>Kursor ${fmt(vy)}`;
        tip.style.opacity = 1;
        const tx = Math.min(W - R - 160, Math.max(4, x(i) + 10)), ty = Math.max(4, Math.min(H - 110, hover.y - 50));
        tip.style.left = tx + 'px'; tip.style.top = ty + 'px';
      } else tip.style.opacity = 0;
    }
    const pos = e => { const r = canvas.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; return { x: p.clientX - r.left, y: p.clientY - r.top }; };
    canvas.addEventListener('pointermove', e => { hover = pos(e); draw(); });
    canvas.addEventListener('pointerleave', () => { hover = null; draw(); });
    canvas.addEventListener('pointerdown', e => { hover = pos(e); draw(); });
    window.addEventListener('resize', () => draw());
    // denyut titik harga live
    setInterval(() => { if (S && Number.isFinite(S.live) && canvas.offsetParent && !hover) draw(); }, 120);
    return { set, setCount, draw };
  }

  function sparkline(canvas, curve, color) {
    const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W) return;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const g = canvas.getContext('2d'); g.scale(dpr, dpr);
    if (!curve || curve.length < 2) return;
    const lo = Math.min(...curve), hi = Math.max(...curve), y = v => H - 6 - (v - lo) / (hi - lo || 1) * (H - 12), x = i => i / (curve.length - 1) * W;
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, color + '66'); grd.addColorStop(1, color + '00');
    g.beginPath(); curve.forEach((v, i) => i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)));
    g.strokeStyle = color; g.lineWidth = 2; g.stroke();
    g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fillStyle = grd; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.15)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(0, y(1)); g.lineTo(W, y(1)); g.stroke();
  }
  root.ChartView = ChartView; root.sparkline = sparkline;
})(this);
