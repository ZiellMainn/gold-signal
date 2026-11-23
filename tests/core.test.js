// Jalankan: npm test  (atau: node tests/core.test.js)
const assert = require('assert');
const path = require('path');
const C = require(path.join(__dirname, '..', 'www', 'js', 'core.js'));
const fx = require('./fixture.json');

let pass = 0;
function test(name, fn) { try { fn(); pass++; console.log('  ✓', name); } catch (e) { console.error('  ✗', name, '\n   ', e.message); process.exitCode = 1; } }
function close(a, b, tol, label) {
  for (let i = 0; i < b.length; i++) {
    if (b[i] === null) { assert.ok(!Number.isFinite(a[i]), `${label}[${i}] harus kosong, dapat ${a[i]}`); continue; }
    assert.ok(Math.abs(a[i] - b[i]) <= tol, `${label}[${i}] = ${a[i]} vs referensi ${b[i]}`);
  }
}

const d = C.clean(fx.bars);
const I = C.indicators(d);
console.log('Indikator vs referensi pandas:');
test('EMA20 sama', () => close(I.e20, fx.ref.ema20, 1e-6, 'EMA20'));
test('EMA200 sama', () => close(I.e200, fx.ref.ema200, 1e-6, 'EMA200'));
test('RSI14 (Wilder) sama', () => close(I.rsi, fx.ref.rsi, 1e-6, 'RSI'));
test('ATR14 (Wilder) sama', () => close(I.atr, fx.ref.atr, 1e-6, 'ATR'));
test('ADX14 sama', () => close(I.adx, fx.ref.adx, 1e-6, 'ADX'));

console.log('Validasi data:');
test('buang candle rusak, duplikat, dan urutkan', () => {
  const r = C.clean([{ t: 3, o: 1, h: 2, l: 0.5, c: 1.5 }, { t: 1, o: 1, h: 2, l: 0.5, c: 1 }, { t: 1, o: 9, h: 9, l: 9, c: 9 }, { t: 2, o: NaN, h: 1, l: 1, c: 1 }, { t: 4, o: 1, h: 0.9, l: 1.2, c: 1 }]);
  assert.deepStrictEqual(r.map(b => b.t), [1, 3, 4]);
  assert.ok(r[2].h >= r[2].l);
});

console.log('Level & lot:');
test('level BUY: SL di bawah, TP di atas, rasio 1R/2R', () => {
  const L = C.levels('BUY', 4000, 10);
  assert.strictEqual(L.sl, 3985); assert.strictEqual(L.tp1, 4015); assert.strictEqual(L.tp2, 4030);
});
test('level SELL kebalikannya', () => {
  const L = C.levels('SELL', 4000, 10);
  assert.strictEqual(L.sl, 4015); assert.strictEqual(L.tp1, 3985); assert.strictEqual(L.tp2, 3970);
});
test('lot: modal 1000, risiko 1%, SL $15, akun standard → 0.00 dibulatkan, ditandai terlalu kecil', () => {
  const r = C.lotSize(1000, 1, 15, 100); // $10 / ($15*100) = 0.0066
  assert.strictEqual(r.tooSmall, true); assert.strictEqual(r.lot, 0.01);
});
test('lot: modal 10000, risiko 1%, SL $15 → 0.06 lot, rugi ≤ $100', () => {
  const r = C.lotSize(10000, 1, 15, 100);
  assert.strictEqual(r.lot, 0.06); assert.ok(r.loss <= 100 + 1e-9);
});
test('lot tidak pernah melebihi risiko (acak 2000x)', () => {
  for (let k = 0; k < 2000; k++) {
    const m = 100 + Math.random() * 50000, rp = 0.1 + Math.random() * 3, sl = 1 + Math.random() * 60;
    const r = C.lotSize(m, rp, sl, 100);
    if (!r.tooSmall) assert.ok(r.loss <= m * rp / 100 + 1e-6, `rugi ${r.loss} > ${m * rp / 100}`);
  }
});

console.log('Simulasi posisi:');
const bar = (o, h, l, c) => ({ t: 0, o, h, l, c });
test('kena SL → -1R', () => assert.strictEqual(C.simulate([bar(100, 101, 80, 85)], C.levels('BUY', 100, 10), 0).R, -1));
test('TP1 lalu balik ke entry → +0.5R', () => {
  const r = C.simulate([bar(100, 116, 99, 110), bar(110, 111, 99, 99)], C.levels('BUY', 100, 10), 0);
  assert.strictEqual(r.R, 0.5);
});
test('TP1 lalu TP2 → +1.5R', () => {
  const r = C.simulate([bar(100, 116, 99, 110), bar(110, 131, 109, 130)], C.levels('BUY', 100, 10), 0);
  assert.strictEqual(r.R, 1.5);
});
test('SL dan TP di candle sama → dihitung rugi (konservatif)', () => {
  assert.strictEqual(C.simulate([bar(100, 140, 80, 100)], C.levels('BUY', 100, 10), 0).R, -1);
});
test('SELL kena TP2 → +1.5R', () => {
  const r = C.simulate([bar(100, 101, 84, 90), bar(90, 91, 69, 70)], C.levels('SELL', 100, 10), 0);
  assert.strictEqual(r.R, 1.5);
});

console.log('Tidak mengintip masa depan:');
test('sinyal di candle i tidak berubah walau candle setelahnya ditambah', () => {
  for (const i of [400, 700, 1000, 1300]) {
    const a = C.evalAt(d, I, i), sub = d.slice(0, i + 1), b = C.evalAt(sub, C.indicators(sub), i);
    assert.strictEqual(a && a.dir, b && b.dir);
    assert.ok(Math.abs(a.rsi - b.rsi) < 1e-9);
  }
});
test('bias timeframe besar hanya dari candle yang sudah tutup', () => {
  const base = [{ t: 0 }, { t: 3600e3 }, { t: 7200e3 }, { t: 10800e3 }, { t: 14400e3 }];
  const htf = [{ t: 0 }, { t: 14400e3 }];
  const m = C.mapHTF(base, 3600e3, htf, 14400e3, [1, -1]);
  assert.deepStrictEqual(m, [0, 0, 0, 1, 1]);
});

console.log('Mode cepat:');
test('mode cepat membaca tren dari EMA20 vs EMA50', () => {
  for (let i = 300; i < d.length; i += 37) {
    const e = C.evalAt(d, I, i, Object.assign({}, C.DEF, { trend: 'fast' }));
    if (!e) continue;
    assert.strictEqual(e.up.trend, I.e20[i] > I.e50[i] && d[i].c > I.e50[i]);
    assert.strictEqual(e.dn.trend, I.e20[i] < I.e50[i] && d[i].c < I.e50[i]);
    assert.strictEqual(e.fast, true);
  }
});
test('mode normal tidak berubah', () => {
  const e = C.evalAt(d, I, 900);
  assert.strictEqual(e.up.trend, I.e50[900] > I.e200[900] && d[900].c > I.e200[900]);
});

console.log('Backtest:');
test('trade tidak tumpang tindih & R valid', () => {
  const tr = C.backtest(d, I, C.DEF, 0.3);
  for (let k = 1; k < tr.length; k++) assert.ok(tr[k].i > tr[k - 1].exit);
  for (const t of tr) assert.ok(t.R <= 1.5 && t.R >= -1.5);
});

console.log(`\n${pass} tes lulus` + (process.exitCode ? ' — ADA YANG GAGAL' : ''));
