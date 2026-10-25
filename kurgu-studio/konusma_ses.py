"""Konuşma kurgusu için fon müziği ve efekt sesleri (numpy sentezi, telifsiz).

Konuşmanın altında kısık duran yumuşak pad, teknik liste boyunca hafif nabız,
sahne geçişlerinde whoosh, liste maddelerinde tık ve kapanışta ışıltı sesi.
Zamanlar kaynak videonun saniyeleridir (src/Konusma.tsx ile aynı).

    python3 konusma_ses.py  ->  public/ek/fon.wav
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100
SURE = 39.5
N = int(SR * SURE)
t = np.arange(N) / SR
rng = np.random.default_rng(3)

WHOOSH = [5.5, 16.6, 18.5, 31.1]
TIKLAR = [24.96, 25.76, 26.62, 27.48, 29.26]
ISILTI = [31.3, 34.3]


def hz(nota: float) -> float:
    return 440.0 * 2 ** ((nota - 69) / 12)


def ekle(hedef, ses, bas):
    i = int(bas * SR)
    j = min(len(hedef), i + len(ses))
    if 0 <= i < len(hedef):
        hedef[i:j] += ses[: j - i]


def zarf(n, atak, birakma):
    x = np.arange(n) / SR
    return np.clip(x / atak, 0, 1) * np.clip((n / SR - x) / birakma, 0, 1)


def pad(notalar, sure):
    n = int(sure * SR)
    x = np.arange(n) / SR
    s = np.zeros(n)
    for nota in notalar:
        for kay in (-0.07, 0.06):
            for h in (1, 2, 3):
                s += np.sin(2 * np.pi * hz(nota + kay) * h * x + rng.uniform(0, 6.3)) / h**2
    return s * zarf(n, 1.5, 1.5) / len(notalar)


def whoosh(sure=0.7):
    n = int(sure * SR)
    gurultu = rng.normal(0, 1, n)
    # Kayan tek kutuplu alçak geçiren: kesim frekansı yükselip iner.
    x = np.arange(n) / n
    kesim = 300 + 5000 * np.sin(np.pi * x) ** 2
    a = np.exp(-2 * np.pi * kesim / SR)
    y = np.zeros(n)
    onceki = 0.0
    for i in range(n):
        onceki = (1 - a[i]) * gurultu[i] + a[i] * onceki
        y[i] = onceki
    return y * np.sin(np.pi * x) ** 1.5 * 2.2


def tik():
    n = int(0.12 * SR)
    x = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2400 * x) * 0.6 + np.sin(2 * np.pi * 1200 * x)) * np.exp(-x * 60) * 0.5


def isilti(sure=2.5):
    n = int(sure * SR)
    s = np.zeros(n)
    for k in range(28):
        bas = rng.uniform(0, sure * 0.7)
        f = hz(rng.choice([86, 89, 91, 93, 96, 98]))
        m = int(0.6 * SR)
        x = np.arange(m) / SR
        ekle(s, np.sin(2 * np.pi * f * x) * np.exp(-x * 7) * 0.12, bas)
    return s * zarf(n, 0.05, 0.8)


def yanki(s, sure=2.5, karisim=0.35):
    n = int(sure * SR)
    x = np.arange(n) / SR
    ir = rng.normal(0, 1, n) * np.exp(-x * 3)
    ir[0] = 0
    ir /= np.sqrt(np.sum(ir**2))
    uz = 1 << int(np.ceil(np.log2(len(s) + n)))
    return (1 - karisim) * s + karisim * np.fft.irfft(np.fft.rfft(s, uz) * np.fft.rfft(ir, uz), uz)[: len(s)]


# Pad: Dm - Bb - F - C döngüsü, kapanışta D majöre çözülür.
muzik = np.zeros(N)
akorlar = [[50, 57, 62, 65], [46, 53, 58, 62], [41, 53, 57, 60], [48, 55, 60, 64]]
for i, bas in enumerate(np.arange(0, 31, 4.0)):
    ekle(muzik, pad(akorlar[i % 4], 5.5), bas)
ekle(muzik, pad([50, 57, 62, 66, 69], 8.5), 31.0)

# Teknik liste boyunca 120 BPM yumuşak nabız (alçak sinüs + filtreli gürültü).
nabiz = np.zeros(N)
for vurus in np.arange(24.5, 31.0, 0.5):
    n = int(0.25 * SR)
    x = np.arange(n) / SR
    ekle(nabiz, np.sin(2 * np.pi * (55 + 40 * np.exp(-x * 40)) * x) * np.exp(-x * 14), vurus)

efekt = np.zeros(N)
for z in WHOOSH:
    ekle(efekt, whoosh() * 0.5, z - 0.35)
for z in TIKLAR:
    ekle(efekt, tik(), z)
for z in ISILTI:
    ekle(efekt, isilti(), z)

karisim = 0.35 * yanki(muzik, 3, 0.4) + 0.45 * nabiz + yanki(efekt, 1.8, 0.25)
karisim *= np.clip(t / 1.5, 0, 1) * np.clip((SURE - t) / 2.0, 0, 1)
stereo = np.stack([karisim, np.roll(karisim, int(0.008 * SR))], axis=1)
stereo /= np.max(np.abs(stereo)) / 0.9

cikti = Path(__file__).parent / "public" / "ek" / "fon.wav"
cikti.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(cikti), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype("<i2").tobytes())
print(cikti)
