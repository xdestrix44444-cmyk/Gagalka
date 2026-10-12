# Звуковая дорожка ролика по расписанию (timeline.json): голоса, эффекты и общий гул.
# Запуск: python3 mix.py <папка ролика> <путь к modem.mp3>  → <папка>/audio.wav
import json, math, os, random, subprocess, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fx import SR, load, save, biquad, band, crush, noise, hum

rnd = random.Random(2026)


def env(n, attack, release):
    a = max(1, int(attack * SR)); r = max(1, int(release * SR))
    return [min(1.0, i / a) * (1.0 if i < n - r else max(0.0, (n - i) / r)) for i in range(n)]


def relay():
    n = int(0.09 * SR)
    click = [(rnd.uniform(-1, 1) if i < 0.004 * SR or 0.03 * SR < i < 0.034 * SR else 0) for i in range(n)]
    thump = [0.6 * math.sin(2 * math.pi * 80 * i / SR) * math.exp(-i / (0.015 * SR)) for i in range(n)]
    return [a * 0.7 + b for a, b in zip(biquad(click, 'hp', 1500), thump)]


def zap():
    n = int(0.14 * SR); ph = 0.0; out = []
    for i in range(n):
        f = 6000 * (200 / 6000) ** (i / n); ph += 2 * math.pi * f / SR
        out.append(0.3 * math.sin(ph) * (1 - i / n))
    return out


_modem = None


def modem(path, length=0.25):
    """Обрывок записи модема нужной длины (с), обрывается резко — как при установке соединения."""
    global _modem
    if _modem is None:
        wav = tempfile.mktemp(suffix='.wav')
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@22050', '-c', '1', path, wav], check=True)
        _modem = load(wav)
    seg = _modem[int(1.6 * SR):int((1.6 + length) * SR)]
    return [v * e for v, e in zip(seg, env(len(seg), 0.01, 0.02))]


def tick():
    n = int(0.018 * SR)
    x = band(noise(n, rnd), 2500, 8000)
    return [v * math.exp(-i / (0.004 * SR)) * 0.8 for i, v in enumerate(x)]


def hit():
    """Низкий удар: глухой бас и короткая атака."""
    n = int(0.9 * SR)
    body = [math.sin(2 * math.pi * (52 + 30 * math.exp(-i / (0.04 * SR))) * i / SR) * math.exp(-i / (0.25 * SR)) for i in range(n)]
    att = biquad(noise(n, rnd), 'lp', 900)
    return [b * 0.9 + a * 0.5 * math.exp(-i / (0.02 * SR)) for i, (b, a) in enumerate(zip(body, att))]


def fail():
    """Сорвавшийся переворот: скрежет и щелчок назад."""
    n = int(0.5 * SR)
    x = crush(band(noise(n, rnd), 400, 3000), 6, 4)
    return [v * (0.6 if i < 0.38 * SR else 0) * math.sin(math.pi * min(1, i / (0.38 * SR))) for i, v in enumerate(x)] + flip()


def crt_off():
    """Кинескоп гаснет: нисходящий писк и щелчок."""
    n = int(0.55 * SR); ph = 0.0; out = []
    for i in range(n):
        f = 3000 * (60 / 3000) ** (i / n); ph += 2 * math.pi * f / SR
        out.append(0.3 * math.sin(ph) * (1 - i / n))
    return out + relay()


def whoosh():
    n = int(0.45 * SR)
    x = band(noise(n, rnd), 300, 2500)
    return [v * 0.5 * math.sin(math.pi * i / n) ** 2 for i, v in enumerate(x)]


def flip():
    n = int(0.06 * SR)
    x = band(noise(n, rnd), 1800, 6000)
    th = [0.4 * math.sin(2 * math.pi * 120 * i / SR) * math.exp(-i / (0.01 * SR)) for i in range(n)]
    return [v * math.exp(-i / (0.012 * SR)) + t for i, (v, t) in enumerate(zip(x, th))]


def corrupt():
    n = int(0.42 * SR)
    x = crush(noise(n, rnd), 9, 3)
    sq = [0.5 * (1 if math.sin(2 * math.pi * 58 * i / SR) > 0 else -1) * (1 if (i // int(0.035 * SR)) % 2 else 0.2) for i in range(n)]
    return [(a * 0.5 + b * 0.5) * e for a, b, e in zip(x, sq, env(n, 0.005, 0.12))]


def static():
    n = int(0.28 * SR)
    x = band(noise(n, rnd), 2000, 7000)
    return [v * e * 0.6 for v, e in zip(x, env(n, 0.01, 0.15))]


def clear():
    n = int(0.9 * SR)
    return [0.35 * (math.sin(2 * math.pi * 660 * i / SR) + 0.5 * math.sin(2 * math.pi * 990 * i / SR)) * math.exp(-i / (0.25 * SR)) for i in range(n)]


def online():
    out = []
    for f in (1200, 1800):
        n = int(0.13 * SR)
        out += [0.25 * math.sin(2 * math.pi * f * i / SR) * e for i, e in enumerate(env(n, 0.005, 0.03))]
    return out


LEVEL = {'relay': 0.8, 'zap': 0.5, 'tick': 0.35, 'modem': 0.4, 'hit': 0.75, 'whoosh': 0.35, 'flip': 0.7, 'fail': 0.55,
         'corrupt': 0.45, 'static': 0.35, 'clear': 0.3, 'off': 0.6}


def main(reel, modem_path):
    tl = json.load(open(os.path.join(reel, 'timeline.json')))
    n = int(tl['total'] / 1000 * SR) + SR
    out = [0.0] * n

    def put(x, at_ms, g):
        a = int(at_ms / 1000 * SR)
        for i, v in enumerate(x):
            if 0 <= a + i < n: out[a + i] += v * g

    sounds = {'relay': relay(), 'zap': zap(), 'tick': tick(), 'hit': hit(), 'whoosh': whoosh(), 'flip': flip(), 'fail': fail(),
              'corrupt': corrupt(), 'static': static(), 'clear': clear(), 'off': crt_off()}
    for s in tl['sfx']:
        x = modem(modem_path, s.get('len', 250) / 1000) if s['kind'] == 'modem' else sounds[s['kind']]
        put(x, s['at'], LEVEL[s['kind']])
    for v in tl['voice']:
        put(load(os.path.join(reel, 'voice', v['file'])), v['at'], 1.0)

    # общий гул: низкие ноты и сеть, тихо; появляется с включением и гаснет к концу
    total = int(tl['total'] / 1000 * SR)
    off = tl['off']['end'] - tl['off']['start']
    fade = env(total, 0.3, off / 1000)
    # тишина перед переворотами: гул проваливается и возвращается вместе с ударом
    for a, b in tl['silence']:
        a, b = int(a / 1000 * SR), int(b / 1000 * SR); r = int(0.08 * SR)
        for i in range(max(0, a - r), min(total, b)):
            fade[i] *= max(0.0, (a - i) / r) if i < a else 0.0
    hm = hum(total)
    room = band(noise(total, rnd), 150, 1500)
    for i in range(total):
        d = 0.5 * math.sin(2 * math.pi * 46 * i / SR) + 0.3 * math.sin(2 * math.pi * 69 * i / SR + 1)
        out[i] += (d * 0.05 + hm[i] * 0.012 + room[i] * 0.01) * fade[i]
    save(os.path.join(reel, 'audio.wav'), out[:total])
    print('дорожка', round(total / SR, 2), 'с')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
