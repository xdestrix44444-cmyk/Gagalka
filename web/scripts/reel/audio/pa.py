# Голос толкований «как объявление в Припяти»: уличный громкоговоритель, отражения от панельных домов,
# длинный уличный хвост. Речь чуть быстрее оригинала.
import os, sys, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fx import *
from dark import dark_reverb
from demon import sat
from ghost import terminal6
from dark import drone

def loudspeaker(x, tempo=1.12, echoes=1.0, hall=0.3):
    if tempo != 1.0: x = stretch(x, tempo)
    x = band(x, 330, 5200)
    x = mix((x, 1.0), (biquad(x, 'bp', 1900, 0.9), 0.6))  # рупор: выпирающая середина
    x = sat(x, 1.8)
    out = pad(x, 0.1, 1.6)
    # отражения от домов: каждое дальше, тише и глуше
    for d, g, lp in ((0.165, 0.38, 3500), (0.255, 0.27, 2800), (0.39, 0.18, 2200), (0.58, 0.1, 1800)):
        refl = [0.0] * int((0.1 + d) * SR) + biquad(x, 'lp', lp)
        out = mix((out, 1.0), (refl, g * echoes))
    out = dark_reverb(out, hall, 1.5, 3200, 0.02)
    rnd = random.Random(5); n = len(out)
    return mix((out, 1), (noise(n, rnd, 4000), 0.006))

def to22(path):
    return load(path)

if __name__ == '__main__':
    d = sys.argv[1]; out = sys.argv[2]
    for v in ('Sulafat', 'Vindemiatrix', 'Erinome', 'Aoede', 'Leda', 'Despina'):
        save(f'{out}/голос — {v}.wav', loudspeaker(load(f'{d}/r_{v}.wav'))); print('ok', v)
    save(f'{out}/для сравнения — baya v5 (Silero).wav', loudspeaker(load(sys.argv[3]))); print('ok baya')
    # связка с терминалом
    t = terminal6(load(sys.argv[4]))
    g = loudspeaker(load(f'{d}/r_{sys.argv[5]}.wav'))
    at = len(t) - int(1.1 * SR)
    both = [0.0] * (at + len(g))
    for i, v in enumerate(t): both[i] += v * 0.9
    for i, v in enumerate(g): both[at + i] += v
    save(f'{out}/связка — терминал + {sys.argv[5]}.wav', mix((both, 1), (drone(len(both)), 0.02))); print('ok связка')
