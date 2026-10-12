# Звук трейлера «Камеры» по расписанию (timeline.json от src/reel/trailer.ts): фон комнаты, тиканье,
# шкатулка «из приёмника», белый шум переключений, тишина, тон на зуме, голоса терминала и диктора.
# Запуск: python3 trailer_mix.py <папка трейлера>  → <папка>/audio.wav
import json, math, os, random, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fx import SR, load, save, biquad, band, noise, reverb

rnd = random.Random(1314)


def note(freq, dur=2.6, vol=0.3):
    """Нота шкатулки: негармоничные обертоны, быстрая атака, долгое затухание, щелчок молоточка."""
    n = int(dur * SR)
    f = freq * 2 ** (rnd.uniform(-12, 12) / 1200)
    parts = [(1, 1.0, 1.1), (2.0, 0.35, 0.6), (3.01, 0.18, 0.35), (4.2, 0.09, 0.2), (5.4, 0.05, 0.12)]
    x = [sum(a * math.sin(2 * math.pi * f * k * i / SR) * math.exp(-i / SR / d) for k, a, d in parts) * min(1, i / (0.003 * SR)) for i in range(n)]
    click = band(noise(int(0.01 * SR), rnd), 3000, 8000)
    for i, c in enumerate(click): x[i] += c * 0.15 * (1 - i / len(click))
    return [v * vol for v in x]


def wow(x, depth=0.004, rate=0.45):
    """Плёнка плывёт: скорость, а с ней и высота, чуть гуляют."""
    out, pos = [], 0.0
    while pos < len(x) - 1:
        j = int(pos); fr = pos - j
        out.append(x[j] + (x[j + 1] - x[j]) * fr)
        pos += 1 + depth * math.sin(2 * math.pi * rate * len(out) / SR)
    return out


def radio(x, seed):
    """Как из старого приёмника: узкая полоса, лёгкий перегруз, громкость «плывёт», редкий треск."""
    r = random.Random(seed)
    y = band(x, 320, 3200)
    peak = max(abs(v) for v in y) or 1
    y = [math.tanh(v / peak * 2.2) * peak / math.tanh(2.2) for v in y]
    y = [v * (1 - 0.18 * (0.5 + 0.5 * math.sin(2 * math.pi * 0.7 * i / SR + 1.3 * math.sin(2 * math.pi * 0.13 * i / SR)))) for i, v in enumerate(y)]
    for _ in range(int(len(y) / SR * 5)):
        k = r.randrange(len(y))
        for m in range(25):
            if k + m < len(y): y[k + m] += r.uniform(-1, 1) * 0.04 * math.exp(-m / 5)
    return y


def tv_static(dur, soft=0.2):
    """Белый шум телевизора между каналами, с мягким нарастанием и затуханием (soft, с)."""
    n = int(dur * SR)
    x = biquad(noise(n, rnd), 'lp', 9500)
    buzz = [0.15 * (1 if math.sin(2 * math.pi * 60 * i / SR) > 0 else -1) for i in range(n)]
    a = max(1, int(soft * SR))
    return [(v + b * 0.3) * min(1, i / a, (n - i) / a) for i, (v, b) in enumerate(zip(x, buzz))]


def tick(hi):
    n = int(0.03 * SR)
    x = band(noise(n, rnd), 2500 if hi else 1700, 7000)
    return [v * math.exp(-i / (0.004 * SR)) for i, v in enumerate(x)]


def blip(f=1200, dur=0.06):
    n = int(dur * SR)
    return [0.3 * (1 if math.sin(2 * math.pi * f * i / SR) > 0 else -1) * math.exp(-i / (0.02 * SR)) for i in range(n)]


def channel_click():
    """Переключатель каналов старого телевизора: глухой «клац» ручки, два щелчка контакта и хлопок."""
    n = int(0.16 * SR)
    thud = [0.8 * math.sin(2 * math.pi * 70 * i / SR) * math.exp(-i / (0.02 * SR)) for i in range(n)]
    clicks = [0.0] * n
    for at in (0.0, 0.032):
        burst = band(noise(int(0.005 * SR), rnd), 1500, 6000)
        for i, v in enumerate(burst): clicks[int(at * SR) + i] += v * 1.2
    pop = biquad(noise(int(0.02 * SR), rnd), 'lp', 2500)
    for i, v in enumerate(pop): clicks[int(0.06 * SR) + i] += v * 0.8 * (1 - i / len(pop))
    return [a + b for a, b in zip(thud, clicks)]


def zoom_servo(dur=0.32):
    """Зум камеры: жужжит моторчик объектива, щёлкает фиксация, короткий цифровой писк."""
    n = int(dur * SR); ph = 0.0; x = []
    for i in range(n):
        p = i / n
        f = 180 + 160 * p; ph += f / SR
        saw = 2 * (ph % 1) - 1
        gear = 0.7 + 0.3 * math.sin(2 * math.pi * 42 * i / SR)
        x.append(saw * gear * min(1, p * 6) * 0.5)
    x = band(x, 250, 2600)
    tail = relay()
    beep = [0.25 * math.sin(2 * math.pi * 2400 * i / SR) * math.exp(-i / (0.02 * SR)) for i in range(int(0.06 * SR))]
    return x + [a + (beep[i] if i < len(beep) else 0) for i, a in enumerate(tail)]


def key():
    n = int(0.02 * SR)
    x = band(noise(n, rnd), 2500, 8000)
    return [v * math.exp(-i / (0.005 * SR)) for i, v in enumerate(x)]


def relay():
    n = int(0.09 * SR)
    c = [(rnd.uniform(-1, 1) if i < 0.004 * SR or 0.03 * SR < i < 0.034 * SR else 0) for i in range(n)]
    th = [0.6 * math.sin(2 * math.pi * 80 * i / SR) * math.exp(-i / (0.015 * SR)) for i in range(n)]
    return [a * 0.7 + b for a, b in zip(biquad(c, 'hp', 1500), th)]


def crt_off():
    n = int(0.55 * SR); ph = 0.0; out = []
    for i in range(n):
        f = 3000 * (60 / 3000) ** (i / n); ph += 2 * math.pi * f / SR
        out.append(0.3 * math.sin(ph) * (1 - i / n))
    return out + relay()


def glitch():
    """Короткий цифровой сбой: несколько писков и треск — на мелькнувшей карте."""
    out = []
    for k in range(5):
        f = rnd.uniform(500, 3500); n = int(0.018 * SR)
        out += [0.35 * (1 if math.sin(2 * math.pi * f * i / SR) > 0 else -1) for i in range(n)]
    return [v * (1 - i / len(out)) for i, v in enumerate(out)]


def main(reel):
    tl = json.load(open(os.path.join(reel, 'timeline.json')))
    s = lambda ms: ms / 1000
    T = s(tl['total']); N = int(T * SR)
    out = [0.0] * N

    def put(x, at, g=1.0):
        a = int(at * SR)
        for i, v in enumerate(x):
            if 0 <= a + i < N: out[a + i] += v * g

    sil = [s(tl['black']['from']), s(tl['black']['to'])]
    off0 = s(tl['off']['from'])
    lost0 = s(tl['lost']['from'])

    # фон комнаты: гул сети, шипение плёнки, низкий гул; разгорается с кинескопом, пропадает в тишине
    hum = [0.5 * math.sin(2 * math.pi * 50 * i / SR) + 0.25 * math.sin(2 * math.pi * 100 * i / SR) for i in range(N)]
    hiss = biquad(band(noise(N, rnd), 2000, 9000), 'lp', 7000)
    room = band(noise(N, rnd), 60, 300)
    for i in range(N):
        t = i / SR
        g = 0.0 if sil[0] <= t < sil[1] else min(1, t / 1.2) * (1 if t < off0 else max(0, 1 - (t - off0) / 0.6))
        if sil[1] <= t < sil[1] + 0.8: g *= (t - sil[1]) / 0.8
        out[i] += (hum[i] * 0.022 + hiss[i] * 0.03 + room[i] * 0.05) * g
    put(relay(), 0.0, 0.7)

    # тиканье: ускоряется к монтажу, обрывается на тишине
    for k, at in enumerate(tl['ticks']):
        put(tick(k % 2 == 0), s(at), 0.22)

    # переключения каналов: щелчок переключателя, затем мягкий белый шум
    level = {'roll': 0.3, 'tear': 0.38, 'dissolve': 0.22, 'vroll': 0.28}
    for w in tl['switches']:
        put(channel_click(), s(w['from']), 0.7)
        put(tv_static(s(w['to'] - w['from']) - 0.06, soft=0.25), s(w['from']) + 0.06, level[w['style']])

    # монтаж: на каждой смене кадра — щелчок и пара кадров шума; на мелькнувших картах — сбой
    shots = tl['montage']['shots']
    for k, sh in enumerate(shots):
        at = s(sh['at'])
        nxt = s(shots[k + 1]['at']) if k + 1 < len(shots) else lost0
        put(channel_click(), at, 0.5)
        put(tv_static(min(0.09, nxt - at), soft=0.01), at + 0.02, 0.3)
        if sh['kind'] == 'snow': put(tv_static(nxt - at, soft=0.03), at, 0.32)
        if sh['kind'] in ('tower', 'death'): put(glitch(), at + 0.03, 0.35)

    # эмблемы гаснут на нотах — короткий писк; зумы — моторчик со щелчком ровно в момент рывка
    for k, at in enumerate(tl['dimNotes']):
        put(blip(1600 + 80 * k, 0.04), s(at), 0.3)
    servo = zoom_servo()
    for at in tl['ringZoom']['snaps'] + tl['devil']['snaps']:
        put(servo, s(at) - 0.32, 0.6)

    # шкатулка из приёмника по нотам расписания: спокойно → на эмблемах быстрее → на монтаже всё чаще
    motif = [440, 523.25, 659.25, 622.25, 493.9]
    box = [0.0] * N
    for at, k in tl['boxNotes']:
        x = note(motif[k], dur=2.2, vol=0.24)
        a = int(s(at) * SR)
        for i, v in enumerate(x):
            if a + i < N: box[a + i] += v
    box = radio(reverb(wow(box)[:N], 0.42, 1.6)[:N], 7)
    m_end = s(shots[-1]['at'])
    for i in range(N):
        t = i / SR
        out[i] += box[i] * (1.0 if t < m_end else max(0.0, 1 - (t - m_end) / (lost0 - m_end)))

    # нет сигнала: густой снег до самой тишины
    snow = tv_static(sil[0] - lost0, soft=0.05)
    put([v * (0.22 + 0.15 * i / len(snow)) for i, v in enumerate(snow)], lost0)

    # Дьявол: из тишины медленно поднимается низкий тон
    d0, d1 = s(tl['devil']['from']), s(tl['switches'][1]['from'])
    n = int((d1 - d0) * SR); tone = []
    for i in range(n):
        p = i / n; f = 55 + 55 * p
        tone.append((0.6 * math.sin(2 * math.pi * f * i / SR) + 0.25 * math.sin(2 * math.pi * 2 * f * i / SR)) * p ** 1.5 * min(1, (n - i) / (0.4 * SR)))
    put(band(tone, 40, 900), d0, 0.35)

    # шкатулка возвращается на октаву ниже, паузы растут, последняя нота чуть ниже — завод кончается
    low = [0.0] * N
    notes = tl['lowNotes']
    for j, (at, k) in enumerate(notes):
        f = motif[k] / 2 * (0.985 if j == len(notes) - 1 else 1)
        x = note(f, dur=3.0, vol=0.26)
        a = int(s(at) * SR)
        for i, v in enumerate(x):
            if a + i < N: low[a + i] += v
    low = radio(reverb(wow(low, depth=0.008, rate=0.3)[:N], 0.5, 2.0)[:N], 8)
    lo0 = s(notes[0][0]) if notes else T
    for i in range(N):
        t = i / SR
        out[i] += low[i] * (0 if t < lo0 - 0.05 else 1 if t < off0 else max(0, 1 - (t - off0) / 0.5))

    # терминал печатает сам: клавиша на каждую букву
    t0 = s(tl['term']['from']) + 0.3
    for k in range(len('> следующий запрос: ')):
        put(key(), t0 + k / 14, 0.3)

    put(crt_off(), off0, 0.5)

    # под голосом диктора всё остальное приглушается примерно вчетверо, чтобы слова не тонули в шуме и музыке
    voices = [(load(os.path.join(reel, 'voice', v['file'])), s(v['at'])) for v in tl['voice']]
    duck = [1.0] * N
    for x, at in voices:
        loud = [i for i in range(0, len(x), 441) if max(abs(u) for u in x[i:i + 441]) > 0.08]
        if not loud: continue
        a, b = int(at * SR) + loud[0] - int(0.15 * SR), int(at * SR) + loud[-1] + int(0.3 * SR)
        r = int(0.12 * SR)
        for i in range(max(0, a - r), min(N, b + r)):
            g = 0.28 if a <= i < b else 0.28 + 0.72 * (min(abs(i - a), abs(i - b)) / r)
            duck[i] = min(duck[i], g)
    out = [v * d for v, d in zip(out, duck)]
    for x, at in voices:
        put(x, at, 1.0)

    save(os.path.join(reel, 'audio.wav'), out)
    print('дорожка трейлера', round(T, 1), 'с; голосов:', len(tl['voice']))


if __name__ == '__main__':
    main(sys.argv[1])
