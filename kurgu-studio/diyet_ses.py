"""Diyetisyen videosu için hafif fon müziği ve efekt sesleri (numpy sentezi, telifsiz).

Majör tonda neşeli pizzicato/ukulele benzeri akorlar, yumuşak kick ve shaker;
rozet ve liste maddelerinde pop, doğru maddelerde ding, yanlışta alçak buzz.
Zamanlar src/Diyet.tsx ile aynıdır.

    python3 diyet_ses.py  ->  public/diyet/fon.wav
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100
SURE = 22.2
N = int(SR * SURE)
rng = np.random.default_rng(5)

POP = [0.05, 1.76, 3.66, 8.14, 14.12, 17.18]
DING = [8.76, 10.44]
BUZZ = [11.82]
WHOOSH = [3.5, 7.9, 13.9]


def hz(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def ekle(h, s, bas):
    i = int(bas * SR)
    j = min(len(h), i + len(s))
    if 0 <= i < len(h):
        h[i:j] += s[: j - i]


def tel(nota, sure=0.6, parlaklik=0.6):
    """Karplus-Strong ile kısa, tatlı tel sesi."""
    n = int(sure * SR)
    p = max(2, int(round(SR / hz(nota))))
    y = np.zeros(n + p)
    y[:p] = rng.uniform(-1, 1, p)
    for i in range(p, n + p, p):
        j = min(i + p, n + p)
        once = y[i - p : j - p]
        kay = np.concatenate(([y[i - p - 1]], once[:-1]))
        y[i:j] = 0.993 * (parlaklik * once + (1 - parlaklik) * kay)
    s = y[p:]
    return s * np.clip((sure - np.arange(n) / SR) / 0.15, 0, 1)


def kick():
    n = int(0.25 * SR)
    x = np.arange(n) / SR
    return np.sin(2 * np.pi * (50 + 90 * np.exp(-x * 35)) * x) * np.exp(-x * 16)


def shaker():
    n = int(0.08 * SR)
    x = np.arange(n) / SR
    g = rng.normal(0, 1, n)
    g = np.diff(np.concatenate(([0], g)))  # yüksek geçiren
    return g * np.exp(-x * 60) * 0.25


def pop():
    n = int(0.12 * SR)
    x = np.arange(n) / SR
    return np.sin(2 * np.pi * (900 - 500 * x / 0.12) * x) * np.exp(-x * 40)


def ding():
    n = int(0.9 * SR)
    x = np.arange(n) / SR
    return sum(a * np.sin(2 * np.pi * f * x) for f, a in ((1568, 0.6), (2349, 0.3), (3136, 0.15))) * np.exp(-x * 6)


def buzz():
    n = int(0.35 * SR)
    x = np.arange(n) / SR
    kare = np.sign(np.sin(2 * np.pi * 110 * x)) + 0.5 * np.sign(np.sin(2 * np.pi * 116 * x))
    return kare * np.exp(-x * 7) * 0.25


def whoosh(sure=0.5):
    n = int(sure * SR)
    g = rng.normal(0, 1, n)
    x = np.arange(n) / n
    a = np.exp(-2 * np.pi * (300 + 4000 * np.sin(np.pi * x) ** 2) / SR)
    y = np.zeros(n)
    o = 0.0
    for i in range(n):
        o = (1 - a[i]) * g[i] + a[i] * o
        y[i] = o
    return y * np.sin(np.pi * x) ** 2 * 2


# C - G - Am - F, 100 BPM; sekizliklerle hafif arpej.
VURUS = 60 / 100
akorlar = [[60, 64, 67, 72], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]]
muzik = np.zeros(N)
ritim = np.zeros(N)
t = 0.0
olcu = 0
while t < SURE - 1:
    akor = akorlar[olcu % 4]
    desen = [0, 2, 1, 3, 2, 1, 3, 2]
    for k, d in enumerate(desen):
        ekle(muzik, tel(akor[d], 0.7) * (0.8 if k % 2 == 0 else 0.55), t + k * VURUS / 2)
    ekle(muzik, tel(akor[0] - 24, 1.4, 0.4) * 0.9, t)  # bas
    for k in range(4):
        if t >= 1.0:  # ilk saniye sadece akor; ritim sonra girer
            ekle(ritim, kick() * (0.9 if k % 2 == 0 else 0.5), t + k * VURUS)
        ekle(ritim, shaker(), t + k * VURUS + VURUS / 2)
    t += 4 * VURUS
    olcu += 1

efekt = np.zeros(N)
for z in POP:
    ekle(efekt, pop() * 0.6, z)
for z in DING:
    ekle(efekt, ding() * 0.5, z)
for z in BUZZ:
    ekle(efekt, buzz(), z)
for z in WHOOSH:
    ekle(efekt, whoosh() * 0.4, z - 0.25)

x = np.arange(N) / SR
fon = (0.6 * muzik + 0.5 * ritim) * np.clip(x / 0.5, 0, 1) * np.clip((SURE - x) / 1.5, 0, 1)
# Efektler müzikten bağımsız seviyede: fon kısık çalınsa da duyulsunlar diye ayrı dosya.
for ad, ses in (("fon", fon), ("efekt", efekt)):
    st = np.stack([ses, np.roll(ses, int(0.006 * SR))], axis=1)
    st /= np.max(np.abs(st)) / 0.9
    cikti = Path(__file__).parent / "public" / "diyet" / f"{ad}.wav"
    with wave.open(str(cikti), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype("<i2").tobytes())
    print(cikti)
