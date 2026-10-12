# Пробники голоса «проклятого терминала»: обработка речи Милены на чистом Python (без numpy).
import math, random, struct, sys, wave

SR = 22050

def load(path):
    with wave.open(path) as w:
        n = w.getnframes()
        data = struct.unpack('<%dh' % n, w.readframes(n))
    return [x / 32768 for x in data]

def save(path, x):
    peak = max(1e-9, max(abs(v) for v in x))
    g = 0.89 / peak
    with wave.open(path, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(struct.pack('<%dh' % len(x), *(int(max(-1, min(1, v * g)) * 32767) for v in x)))

def speed(x, k):
    """Медленнее и ниже при k < 1 (как плёнка)."""
    n = int(len(x) / k)
    out = []
    for i in range(n):
        p = i * k; j = int(p); f = p - j
        a = x[j] if j < len(x) else 0; b = x[j + 1] if j + 1 < len(x) else 0
        out.append(a + (b - a) * f)
    return out

def biquad(x, kind, f, q=0.707):
    w0 = 2 * math.pi * f / SR; c = math.cos(w0); al = math.sin(w0) / (2 * q)
    if kind == 'lp': b0, b1, b2 = (1 - c) / 2, 1 - c, (1 - c) / 2
    elif kind == 'hp': b0, b1, b2 = (1 + c) / 2, -(1 + c), (1 + c) / 2
    else: b0, b1, b2 = al, 0, -al  # полоса
    a0, a1, a2 = 1 + al, -2 * c, 1 - al
    b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0
    y = []; x1 = x2 = y1 = y2 = 0.0
    for v in x:
        o = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, v, y1, o
        y.append(o)
    return y

def band(x, lo, hi):
    return biquad(biquad(biquad(biquad(x, 'hp', lo), 'hp', lo), 'lp', hi), 'lp', hi)

def crush(x, hold, bits):
    q = 2 ** (bits - 1); out = []; cur = 0
    for i, v in enumerate(x):
        if i % hold == 0: cur = round(v * q) / q
        out.append(cur)
    return out

def mix(*parts):
    n = max(len(p) for p, _ in parts)
    out = [0.0] * n
    for p, g in parts:
        for i, v in enumerate(p): out[i] += v * g
    return out

def pad(x, before=0.3, after=0.6):
    return [0.0] * int(before * SR) + x + [0.0] * int(after * SR)

def noise(n, rnd, lp=None):
    x = [rnd.uniform(-1, 1) for _ in range(n)]
    return biquad(x, 'lp', lp) if lp else x

def hum(n, f=50):
    return [0.6 * math.sin(2 * math.pi * f * i / SR) + 0.25 * math.sin(2 * math.pi * 3 * f * i / SR) for i in range(n)]

def crackle(n, rnd, rate=12):
    x = [0.0] * n
    for _ in range(int(rate * n / SR)):
        i = rnd.randrange(n)
        for k in range(30):
            if i + k < n: x[i + k] += rnd.uniform(-1, 1) * math.exp(-k / 6)
    return x

def second_phrase(x, gap=0.18, thr=0.02):
    """Начало второй фразы: конец первой паузы длиннее gap секунд."""
    run = 0; started = False
    for i, v in enumerate(x):
        if abs(v) > thr:
            if started and run > gap * SR: return i / SR
            started = True; run = 0
        else: run += 1
    return 1.5

def tighten(x, keep=0.32, thr=0.015):
    """Длинные паузы ИИ-голоса сжимаются до keep секунд."""
    out = []; run = []
    for v in x:
        if abs(v) < thr: run.append(v)
        else:
            out += run[:int(keep * SR)]; run = []; out.append(v)
    return out + run[:int(keep * SR)]

def stretch(x, rate):
    """Быстрее при rate > 1 без смены тона (WSOLA с грубым поиском совпадения)."""
    win = int(0.04 * SR); hop = win // 2; tol = int(0.012 * SR)
    hann = [0.5 - 0.5 * math.cos(2 * math.pi * i / win) for i in range(win)]
    n_out = int(len(x) / rate); out = [0.0] * (n_out + win)
    prev = 0; k = 0
    while True:
        o = k * hop; nominal = int(o * rate)
        if nominal + win + tol >= len(x) or o + win > len(out): break
        if k == 0: best = nominal
        else:
            target = x[prev + hop: prev + hop + win: 4]
            best, bc = nominal, -1e18
            for d in range(-tol, tol + 1, 4):
                p = nominal + d
                if p < 0: continue
                seg = x[p:p + win:4]
                c = sum(a * b for a, b in zip(target, seg))
                if c > bc: bc, best = c, p
        for i in range(win): out[o + i] += x[best + i] * hann[i]
        prev = best; k += 1
    return out[:n_out]

def stutter(x, at, length, times):
    """Заикание: кусок с позиции at (с) повторяется, как зависшая запись."""
    a = int(at * SR); L = int(length * SR)
    seg = x[a:a + L]
    return x[:a] + seg * times + x[a:]

def dropouts(x, rnd, count, dur=0.07):
    x = x[:]
    for _ in range(count):
        a = rnd.randrange(len(x)); L = int(dur * SR * rnd.uniform(.5, 1.5))
        for i in range(a, min(len(x), a + L)): x[i] *= 0.05
    return x

def echo(x, delay, fb, wet):
    d = int(delay * SR); y = x[:] + [0.0] * (d * 6)
    for i in range(d, len(y)): y[i] += y[i - d] * fb
    return [a * (1 - wet) + b * wet for a, b in zip(x + [0.0] * (d * 6), y)]

def reverb(x, wet=0.3, size=1.0):
    tail = int(1.2 * SR); src = x + [0.0] * tail
    combs = [(int(SR * t * size), g) for t, g in ((.0297, .78), (.0371, .76), (.0411, .74), (.0437, .72))]
    out = [0.0] * len(src)
    for d, g in combs:
        buf = src[:]
        for i in range(d, len(buf)): buf[i] = src[i] + buf[i - d] * g
        for i in range(len(out)): out[i] += buf[i] * 0.25
    for d, g in ((int(SR * .005), .7), (int(SR * .0017), .7)):
        y = [0.0] * len(out)
        for i in range(len(out)):
            xd = out[i - d] if i >= d else 0; yd = y[i - d] if i >= d else 0
            y[i] = -g * out[i] + xd + g * yd
        out = y
    return [a * (1 - wet) + b * wet for a, b in zip(src, out)]

def ringmod(x, f, depth):
    return [v * (1 - depth + depth * math.sin(2 * math.pi * f * i / SR)) for i, v in enumerate(x)]

def fade_am(x, f, depth):
    return [v * (1 - depth * (0.5 + 0.5 * math.sin(2 * math.pi * f * i / SR))) for i, v in enumerate(x)]

def vocoder(mod, n_bands=18, f0=72):
    n = len(mod)
    # несущая: пила на одной ноте + немного шума, как у старых синтезаторов речи
    rnd = random.Random(3)
    car = [((i * f0 / SR) % 1) * 2 - 1 + rnd.uniform(-.15, .15) for i in range(n)]
    lo, hi = 110, 6500
    edges = [lo * (hi / lo) ** (k / n_bands) for k in range(n_bands + 1)]
    out = [0.0] * n
    att, rel = math.exp(-1 / (0.004 * SR)), math.exp(-1 / (0.03 * SR))
    for k in range(n_bands):
        fc = math.sqrt(edges[k] * edges[k + 1]); q = fc / (edges[k + 1] - edges[k])
        m = biquad(biquad(mod, 'bp', fc, q), 'bp', fc, q)
        c = biquad(biquad(car, 'bp', fc, q), 'bp', fc, q)
        env = 0.0
        for i in range(n):
            a = abs(m[i]); co = att if a > env else rel
            env = co * env + (1 - co) * a
            out[i] += c[i] * env
    return out

if __name__ == '__main__':
    src, dst, kind = sys.argv[1], sys.argv[2], sys.argv[3]
    x = load(src); rnd = random.Random(41)
    if kind in ('tts', 'tts-double'):
        x = tighten(x)
        rate = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
        if rate != 1.0: x = stretch(x, rate)
        kind = 'terminal' if kind == 'tts' else 'double'
    if kind == 'terminal':
        x = speed(x, 0.9)
        x = stutter(x, second_phrase(x) - 0.01, 0.085, 3)
        x = band(x, 260, 3600)
        x = mix((x, 0.7), (crush(x, 3, 6), 0.3))
        x = echo(pad(x), 0.11, 0.25, 0.25)
        n = len(x)
        x = mix((x, 1), (hum(n), 0.02), (noise(n, rnd, 5000), 0.012))
    elif kind == 'vocoder':
        x = vocoder(speed(x, 0.95))
        x = band(x, 120, 6000)
        x = echo(pad(x), 0.09, 0.2, 0.2)
        n = len(x)
        x = mix((x, 1), (hum(n), 0.015), (noise(n, rnd, 4000), 0.01))
    elif kind == 'signal':
        x = speed(x, 0.82)
        x = band(x, 420, 2700)
        x = ringmod(x, 31, 0.35)
        x = fade_am(x, 0.55, 0.6)
        x = dropouts(x, rnd, 6)
        x = reverb(pad(x, 0.5, 0.3), 0.35, 1.3)
        n = len(x)
        x = mix((x, 1), (noise(n, rnd, 3500), 0.09), (crackle(n, rnd), 0.12), (hum(n, 60), 0.03))
    elif kind == 'double':
        low = speed(x, 0.72)
        high = [0.0] * int(0.03 * SR) + speed(x, 0.98)
        x = mix((low, 1), (high, 0.35))
        x = band(x, 90, 5000)
        x = mix((x, 0.6), (crush(x, 2, 7), 0.4))
        x = reverb(pad(x), 0.4, 1.6)
        n = len(x)
        x = mix((x, 1), (hum(n), 0.025), (noise(n, rnd, 2500), 0.015))
    save(dst, x)
