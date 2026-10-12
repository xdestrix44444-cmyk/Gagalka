# Ниже и «демоничнее», но сдержанно: тон ниже без замедления + тихий слой на октаву ниже.
import sys, random
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from fx import *
from dark import dark_reverb, bed  # noqa: E402  (dark.py лежит рядом)

def shift(x, p):
    """Тон × p без изменения длительности: сжать по времени, потом «плёнкой» вернуть длину."""
    return speed(stretch(x, 1 / p), p)

def sat(x, drive):
    return [math.tanh(v * drive) / math.tanh(drive) for v in x]

def voice(src, semis, sub_gain, sub_drive=1.0, tempo=1.0):
    p = 2 ** (semis / 12)
    main = shift(src, p)
    # согласные (с, ш, т, к) берём из исходного голоса: при понижении тона они глохнут первыми
    highs = band(src, 2600, 7000)
    parts = [(main, 1.0), (highs, 0.45)]
    if sub_gain:
        sub = band(shift(src, p / 2), 50, 1400)
        parts.append((sat(sub, sub_drive), sub_gain))
    x = mix(*parts)
    if tempo != 1.0: x = speed(x, tempo)
    x = stutter(x, second_phrase(x, gap=0.22) - 0.01, 0.085, 3)
    x = band(x, 70, 6000)
    return mix((x, 0.8), (crush(x, 3, 6), 0.2))

if __name__ == '__main__':
    src = load(sys.argv[2]); out = sys.argv[3]; rnd = random.Random(41)
    room = lambda x: dark_reverb(pad(x), 0.34, 1.4, 2600, 0.04)
    V = {
        '7 — ниже на 3 полутона':                 lambda: bed(room(voice(src, -3, 0)), rnd),
        '8 — ниже + тень на октаву ниже':         lambda: bed(room(voice(src, -3, 0.3)), rnd),
        '9 — ниже, тень с хрипом':                lambda: bed(room(voice(src, -3, 0.35, 1.8)), rnd),
        '10 — как 8, но говорит медленнее':       lambda: bed(room(voice(src, -2, 0.3, 1.0, 0.93)), rnd),
    }
    for name, f in V.items():
        save(f'{out}/{name}.wav', f()); print('ok', name)
