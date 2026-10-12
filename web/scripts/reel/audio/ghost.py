# Женский «потусторонний» голос для толкований: мягкое металлическое двоение (как GLaDOS, но живее),
# большой зал, обратное эхо перед словами, призрачный слой на октаву выше. Без «битости».
import os, sys, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fx import *
from dark import dark_reverb, bed, term, drone
from demon import shift

def chorus(x, base=0.012, depth=0.004, rate=0.35, wet=0.35):
    """Двойник голоса с плавающей задержкой: даёт металлический отлив."""
    out = []
    for i, v in enumerate(x):
        d = (base + depth * math.sin(2 * math.pi * rate * i / SR)) * SR
        j = i - d; k = int(j); f = j - k
        a = x[k] if 0 <= k < len(x) else 0; b = x[k + 1] if 0 <= k + 1 < len(x) else 0
        out.append(v * (1 - wet) + (a + (b - a) * f) * wet)
    return out

def swell(x, size, gain):
    """Обратное эхо: хвост реверба, развёрнутый назад, нарастает перед каждым словом."""
    tail = int(1.2 * SR)
    sw = reverb(x[::-1], 1.0, size)[::-1]
    sw = biquad(biquad(sw, 'lp', 3500), 'hp', 200)
    return mix(([0.0] * tail + x, 1.0), (sw, gain)), tail

def ghost(src, level):
    x = band(src, 110, 8000)
    x = chorus(x, wet=0.3 if level == 1 else 0.38)
    if level >= 2:  # призрачный слой на октаву выше — едва слышно
        air = band(shift(src, 2.0), 1800, 8000)
        x = mix((x, 1.0), (air, 0.07 if level == 2 else 0.1))
    if level == 3:  # чуть ниже и медленнее — «из глубины»
        x = shift(x, 2 ** (-1 / 12))
    if level >= 2:
        x, _ = swell(x, 1.8, 0.22 if level == 2 else 0.3)
    wet, size, tone, pre = {1: (0.3, 1.5, 6000, 0.03), 2: (0.42, 2.0, 5200, 0.06), 3: (0.52, 2.4, 4200, 0.08)}[level]
    x = dark_reverb(pad(x, 0.2, 1.2), wet, size, tone, pre)
    if level == 3: x = echo(x, 0.36, 0.28, 0.18)
    rnd = random.Random(7); n = len(x)
    return mix((x, 1), (noise(n, rnd, 6000), 0.004))

def terminal6(src):
    """Голос терминала — вариант 6: тёмный зал + низкий гул."""
    rnd = random.Random(41)
    y = bed(dark_reverb(pad(term(src, 0.88)), 0.4, 1.7, 2200, 0.05), rnd, 0.01)
    return y

if __name__ == '__main__':
    d = sys.argv[1]; out = sys.argv[2]
    jobs = []
    for ver in ('v4', 'v5'):
        for sp in ('baya', 'kseniya', 'xenia'):
            jobs.append((f'{out}/голос — {sp} {ver}.wav', f'{d}/r_int_{ver}_ru_{sp}.wav', 2))
    for lvl, nm in ((1, 'эфир'), (2, 'потусторонний'), (3, 'из глубины')):
        jobs.append((f'{out}/степень {lvl} — {nm} (baya v5).wav', f'{d}/r_int_v5_ru_baya.wav', lvl))
    for path, srcp, lvl in jobs:
        save(path, ghost(load(srcp), lvl)); print('ok', os.path.basename(path))
    # связка: терминал объявляет карту, через паузу — толкование
    t = terminal6(load(f'{d}/r_eug_card1.wav'))
    g = ghost(load(f'{d}/r_int_v5_ru_baya.wav'), 2)
    at = len(t) - int(1.0 * SR)  # толкование входит на хвосте эха терминала
    both = [0.0] * (at + len(g))
    for i, v in enumerate(t): both[i] += v * 0.9
    for i, v in enumerate(g): both[at + i] += v
    m = drone(len(both))
    save(f'{out}/связка — терминал + толкование.wav', mix((both, 1), (m, 0.02))); print('ok связка')
