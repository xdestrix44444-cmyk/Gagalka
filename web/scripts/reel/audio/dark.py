# Варианты «Терминала» для eugene v4: от сухого к мрачному. Согласные чище: шире полоса, меньше «битости».
import sys, random
sys.path.insert(0, sys.argv[1] if __name__ == '__main__' else __import__('os').path.dirname(__file__))
from fx import *

def dark_reverb(x, wet, size, tone, predelay=0.0):
    """Реверб с тёмным хвостом: отражения проходят через фильтр низких частот tone (Гц)."""
    pre = [0.0] * int(predelay * SR)
    tail = reverb(pre + x, 1.0, size)
    tail = biquad(biquad(tail, 'lp', tone), 'hp', 120)
    dry = x + [0.0] * (len(tail) - len(x))
    return [d * (1 - wet * 0.5) + t * wet for d, t in zip(dry, tail)]

def drone(n, f=46):
    return [0.5 * math.sin(2 * math.pi * f * i / SR) + 0.3 * math.sin(2 * math.pi * f * 1.5 * i / SR + 1) for i in range(n)]

def term(x, pitch):
    x = speed(x, pitch)
    x = stutter(x, second_phrase(x, gap=0.22) - 0.01, 0.085, 3)
    x = band(x, 200, 4300)
    return mix((x, 0.8), (crush(x, 3, 6), 0.2))

def bed(x, rnd, hum_g=0.02):
    n = len(x)
    return mix((x, 1), (hum(n), hum_g), (noise(n, rnd, 5000), 0.01))

if __name__ == '__main__':
  src = load(sys.argv[2]); out = sys.argv[3]; rnd = random.Random(41)
  V = {
      '1 — сухой (как раньше)':            lambda: bed(echo(pad(term(src, 0.9)), 0.11, 0.25, 0.25), rnd),
      '2 — небольшая комната':             lambda: bed(dark_reverb(pad(term(src, 0.9)), 0.22, 0.7, 4000), rnd),
      '3 — бетонный зал':                  lambda: bed(dark_reverb(pad(term(src, 0.9)), 0.32, 1.25, 3000, 0.03), rnd),
      '4 — бетонный зал, на полтона ниже': lambda: bed(dark_reverb(pad(term(src, 0.86)), 0.32, 1.25, 2800, 0.03), rnd),
      '5 — тёмный зал':                    lambda: bed(dark_reverb(pad(term(src, 0.88)), 0.4, 1.7, 2200, 0.05), rnd),
      '6 — тёмный зал + низкий гул':       lambda: (lambda y: mix((y, 1), (drone(len(y)), 0.035)))(bed(dark_reverb(pad(term(src, 0.88)), 0.4, 1.7, 2200, 0.05), rnd, 0.01)),
  }
  for name, f in V.items():
      save(f'{out}/{name}.wav', f()); print('ok', name)
