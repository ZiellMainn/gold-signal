# Membuat data uji + nilai referensi indikator dengan pandas (implementasi independen)
import json, numpy as np, pandas as pd
rng = np.random.default_rng(7)
n = 1500; p = 4000.0; rows = []
for i in range(n):
    o = p; c = o + rng.normal(0.2 if (i // 300) % 2 == 0 else -0.2, 6)
    h = max(o, c) + abs(rng.normal(0, 3)); l = min(o, c) - abs(rng.normal(0, 3))
    rows.append(dict(t=1_700_000_000_000 + i * 3_600_000, o=o, h=h, l=l, c=c)); p = c
df = pd.DataFrame(rows)
def wilder(s, p):  # seed SMA lalu smoothing Wilder
    s = s.copy(); out = pd.Series(np.nan, index=s.index); v = s.dropna(); idx = v.index
    seed = v.iloc[:p].mean(); out[idx[p-1]] = seed; prev = seed
    for k in idx[p:]: prev = (prev*(p-1) + s[k]) / p; out[k] = prev
    return out
def ema(s, p):
    out = pd.Series(np.nan, index=s.index); seed = s.iloc[:p].mean(); out.iloc[p-1] = seed
    out.iloc[p-1:] = pd.concat([pd.Series([seed]), s.iloc[p:]]).ewm(span=p, adjust=False).mean().values
    return out
d = df.c.diff()
rs = wilder(d.clip(lower=0), 14) / wilder((-d).clip(lower=0), 14)
rsi = 100 - 100/(1+rs)
pc = df.c.shift(1)
tr = pd.concat([df.h-df.l, (df.h-pc).abs(), (df.l-pc).abs()], axis=1).max(axis=1); tr.iloc[0] = df.h[0]-df.l[0]
atr = wilder(tr, 14)
up = df.h.diff(); dn = -df.l.diff()
pdm = np.where((up>dn)&(up>0), up, 0.0); mdm = np.where((dn>up)&(dn>0), dn, 0.0)
pdm = pd.Series(pdm); mdm = pd.Series(mdm); pdm[0]=np.nan; mdm[0]=np.nan; tr2 = tr.copy(); tr2[0]=np.nan
pdi = 100*wilder(pdm,14)/wilder(tr2,14); mdi = 100*wilder(mdm,14)/wilder(tr2,14)
dx = 100*(pdi-mdi).abs()/(pdi+mdi); adx = wilder(dx, 14)
ref = dict(ema20=ema(df.c,20), ema200=ema(df.c,200), rsi=rsi, atr=atr, adx=adx)
json.dump(dict(bars=rows, ref={k:[None if pd.isna(x) else float(x) for x in v] for k,v in ref.items()}), open('tests/fixture.json','w'))
print('ok', n)
