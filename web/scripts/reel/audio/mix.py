# Сведение ролика: голоса (voice/*.wav), запись модема и звуки приложения (sfx.wav: левый канал — гул,
# правый — эффекты; их отрисовывает страница ролика движком sound.ts). Расписание — timeline.json.
# Запуск: python3 mix.py <папка ролика> <путь к modem.mp3>  → <папка>/audio.wav
import json, math, os, struct, subprocess, sys, tempfile, wave

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fx import SR, load, save

DRONE_RMS = 0.03   # средняя громкость гула под голосом
SFX_PEAK = 0.5     # пик эффектов относительно пика голоса (голос ~0.89)
MODEM_GAIN = 0.4


def load_stereo(path):
    with wave.open(path) as w:
        assert w.getframerate() == SR and w.getnchannels() == 2, 'sfx.wav: ожидается 2 канала 22 050 Гц'
        n = w.getnframes()
        d = struct.unpack('<%dh' % (n * 2), w.readframes(n))
    return [v / 32768 for v in d[0::2]], [v / 32768 for v in d[1::2]]


def modem(path, at_ms, len_ms):
    wav = tempfile.mktemp(suffix='.wav')
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@22050', '-c', '1', path, wav], check=True)
    x = load(wav)[int(1.6 * SR):int((1.6 + len_ms / 1000) * SR)]
    n = len(x); a = int(0.01 * SR); r = int(0.02 * SR)
    return [v * min(1, i / a) * min(1, (n - i) / r) for i, v in enumerate(x)]


def main(reel, modem_path):
    tl = json.load(open(os.path.join(reel, 'timeline.json')))
    total = int(tl['total'] / 1000 * SR)
    out = [0.0] * total

    def put(x, at_ms, g):
        a = int(at_ms / 1000 * SR)
        for i, v in enumerate(x):
            if 0 <= a + i < total: out[a + i] += v * g

    drone, sfx = load_stereo(os.path.join(reel, 'sfx.wav'))
    rms = math.sqrt(sum(v * v for v in drone) / max(1, len(drone))) or 1
    peak = max(abs(v) for v in sfx) or 1
    put(drone, 0, DRONE_RMS / rms)
    put(sfx, 0, SFX_PEAK * 0.89 / peak)
    for s in tl['sfx']:
        if s['kind'] == 'modem': put(modem(modem_path, s['at'], s.get('len', 250)), s['at'], MODEM_GAIN)
    files = {}
    for v in tl['voice']:
        x = files.setdefault(v['file'], load(os.path.join(reel, 'voice', v['file'])))
        if 'from' in v:
            # кусок реплики: от начала фразы до следующей, хвост эха мягко гасится
            x = x[int(v['from'] * SR):int(v['to'] * SR)]
            n = len(x); r = int(min(0.25 * SR, n / 3))
            x = [s * min(1, (n - i) / r) for i, s in enumerate(x)]
        put(x, v['at'], 1.0)
    save(os.path.join(reel, 'audio.wav'), out)
    print('дорожка', round(total / SR, 2), 'с; гул ×%.2f, эффекты ×%.2f' % (DRONE_RMS / rms, SFX_PEAK * 0.89 / peak))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
