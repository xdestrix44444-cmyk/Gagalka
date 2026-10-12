# Озвучка ролика: терминал (Silero eugene v4, тёмный зал + гул) и диктор (Gemini Erinome, громкоговоритель).
# Запуск: <python с torch> voice.py <папка ролика>; нужны SILERO_MODEL (путь к v4_ru.pt) и GEMINI_API_KEY.
# В папке ролика должен лежать texts.json; результат — voice/*.wav и voice/durations.json.
import base64, json, os, random, subprocess, sys, tempfile, time, urllib.error, urllib.request, wave

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fx import SR, load, save, pad, stutter, second_phrase, band, crush, mix
from dark import dark_reverb, bed, drone
from pa import loudspeaker

TTS_MODELS = tuple(os.environ.get('TTS_MODELS', 'gemini-2.5-flash-preview-tts,gemini-3.1-flash-tts-preview').split(','))
NARRATOR = 'Erinome'
TEMPO = 1.32


def to22(src):
    """Любой wav → моно 16 бит 22 050 Гц (частота, на которой работают эффекты)."""
    dst = tempfile.mktemp(suffix='.wav')
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@22050', src, dst], check=True)
    return dst


def write_wav(path, pcm, rate):
    with wave.open(path, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)


def silero(model, text, path):
    audio = model.apply_tts(text=text, speaker='eugene', sample_rate=48000, put_accent=True, put_yo=True)
    write_wav(path, (audio.clamp(-1, 1) * 32767).short().numpy().tobytes(), 48000)


def terminal(src, stutter_on=None):
    """Вариант «6 — тёмный зал + низкий гул»: тон ниже, заикание (на первой или второй фразе), тёмный реверб."""
    from fx import speed
    x = speed(src, 0.88)
    if stutter_on == 'second':
        x = stutter(x, second_phrase(x, gap=0.22) - 0.01, 0.085, 3)
    elif stutter_on == 'first':
        onset = next((i for i, v in enumerate(x) if abs(v) > 0.05), 0) / SR
        x = stutter(x, onset, 0.07, 3)
    x = band(x, 200, 4300)
    x = mix((x, 0.8), (crush(x, 3, 6), 0.2))
    # фразы ищем до реверба: хвост эха замазывает паузы; pad() сдвигает всё на 0,3 с
    segs = [(a + 0.3, b + 0.3) for a, b in speech_segments(x, gap=0.2)]
    # гул (drone) не здесь: он идёт общей дорожкой под всем роликом
    return bed(dark_reverb(pad(x), 0.4, 1.7, 2200, 0.05), random.Random(41), 0.01), segs


def gemini(text, path):
    key = os.environ['GEMINI_API_KEY']
    body = {'contents': [{'parts': [{'text': text}]}], 'generationConfig': {'responseModalities': ['AUDIO'],
            'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': NARRATOR}}}}}
    last = None
    for model in TTS_MODELS:
        for attempt in range(int(os.environ.get('TTS_TRIES', '3'))):
            req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
                data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
            try:
                d = json.load(urllib.request.urlopen(req, timeout=180))
                write_wav(path, base64.b64decode(d['candidates'][0]['content']['parts'][0]['inlineData']['data']), 24000)
                return model
            except urllib.error.HTTPError as e:
                last = f'{model}: {e.code}'
                if e.code == 429 and b'PerDay' in e.read(): break  # дневной лимит — сразу к следующей модели
                time.sleep(30)
    raise RuntimeError(f'Озвучка не удалась ({last})')


def bounds(x, rel=0.08, win=0.03):
    """Где в файле начинается и кончается речь (без хвоста эха), в секундах."""
    w = int(win * SR); peak = max(abs(v) for v in x) or 1
    loud = [i for i in range(0, len(x), w) if max(abs(v) for v in x[i:i + w]) > rel * peak]
    return (loud[0] / SR, (loud[-1] + w) / SR) if loud else (0.0, len(x) / SR)


def speech_segments(x, rel=0.04, win=0.02, gap=0.16):
    """Куски речи между паузами длиннее gap секунд: [(начало, конец)] в секундах."""
    w = int(win * SR); peak = max(abs(v) for v in x) or 1
    loud = [max(abs(v) for v in x[i:i + w]) > rel * peak for i in range(0, len(x), w)]
    segs = []; start = None; quiet = 0
    for k, on in enumerate(loud):
        if on:
            if start is None: start = k
            quiet = 0
        elif start is not None:
            quiet += 1
            if quiet * win >= gap:
                segs.append((start * win, (k - quiet + 1) * win)); start = None; quiet = 0
    if start is not None: segs.append((start * win, len(loud) * win))
    return segs


def subtitle_anchors(raw, text, tempo, lead=0.1):
    """Опорные точки субтитров [(символ, мс от начала обработанного файла)].
    Речь между паузами идёт равномерно; каждая пауза в голосе привязывается к ближайшему знаку препинания."""
    segs = [(lead + a / tempo, lead + b / tempo) for a, b in speech_segments(raw)]
    if not segs: return [(0, 0), (len(text), 1000)]
    n = len(text)
    marks = [i + 1 for i, ch in enumerate(text) if ch in '.,!?:;—' and i + 1 < n]
    total = sum(b - a for a, b in segs)
    anchors = [(0, segs[0][0])]; done = 0.0; used = 0
    for (a, b), nxt in zip(segs, segs[1:]):
        done += b - a
        guess = round(n * done / total)
        near = min(marks, key=lambda m: abs(m - guess), default=None)
        if near is not None and near > used and abs(near - guess) < 0.15 * n:
            anchors += [(near, b), (near, nxt[0])]; used = near
    anchors.append((n, segs[-1][1]))
    return [(c, round(t * 1000)) for c, t in anchors]


def main(reel):
    texts = json.load(open(os.path.join(reel, 'texts.json')))
    out = os.path.join(reel, 'voice'); os.makedirs(out, exist_ok=True)
    raw = os.path.join(out, 'raw'); os.makedirs(raw, exist_ok=True)
    info = {}

    import torch
    model = torch.package.PackageImporter(os.environ['SILERO_MODEL']).load_pickle('tts_models', 'model')
    # заикание: у первой реплики — на второй фразе, у ошибки — на первом слове
    stut = {'open': 'second', 'err': 'first'}
    for name, text in texts['terminal'].items():
        p = os.path.join(raw, f'{name}.wav'); silero(model, text, p)
        y, segs = terminal(load(to22(p)), stut.get(name)); save(os.path.join(out, f'{name}.wav'), y)
        b = bounds(y); info[name] = {'sec': len(y) / SR, 'start': b[0], 'end': b[1], 'segs': segs}
        print('терминал:', name, round(len(y) / SR, 2), 'с')

    for i, card in enumerate(texts['cards'], 1):
        p = os.path.join(raw, f'card{i}.wav')
        if not os.path.exists(p):
            used = gemini(card['voice'], p); print('диктор: модель', used); time.sleep(8)
        y = loudspeaker(load(to22(p)), tempo=TEMPO); save(os.path.join(out, f'card{i}.wav'), y)
        b = bounds(y); info[f'card{i}'] = {'sec': len(y) / SR, 'start': b[0], 'end': b[1],
                                          'subs': subtitle_anchors(load(to22(p)), card['voice'], TEMPO)}
        print('диктор: карта', i, round(len(y) / SR, 2), 'с')

    json.dump(info, open(os.path.join(out, 'durations.json'), 'w'), indent=2)


if __name__ == '__main__':
    main(sys.argv[1])
