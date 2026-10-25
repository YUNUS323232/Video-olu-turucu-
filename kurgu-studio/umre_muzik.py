"""Umre tanıtımı için telifsiz fon müziği üretir (numpy ile sentez, dış kaynak yok).

Re Hicaz dizisinde: bas dron, yumuşak pad akorları, kanun benzeri telli melodi ve
sahne geçişlerine denk gelen hafif def vuruşları. Tempo 60 BPM; sahne sınırları
(3, 8, 16, 21 sn) tam vuruşa düşer.

    python3 umre_muzik.py  ->  public/umre/muzik.wav
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100
SURE = 27.0
N = int(SR * SURE)
rng = np.random.default_rng(7)


def frekans(nota: float) -> float:
    """MIDI nota numarasından Hz."""
    return 440.0 * 2 ** ((nota - 69) / 12)


def zarf(n: int, atak: float, birakma: float) -> np.ndarray:
    t = np.arange(n) / SR
    a = np.clip(t / atak, 0, 1)
    b = np.clip((n / SR - t) / birakma, 0, 1)
    return a * b


def ekle(hedef: np.ndarray, ses: np.ndarray, bas: float) -> None:
    i = int(bas * SR)
    j = min(N, i + len(ses))
    if i < N:
        hedef[i:j] += ses[: j - i]


def pad(notalar, sure: float) -> np.ndarray:
    """Hafif detune edilmiş, yumuşak testere dişi (ilk birkaç harmonik) akor."""
    n = int(sure * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for nota in notalar:
        for kay in (-0.08, 0.0, 0.07):
            f = frekans(nota + kay)
            for h in range(1, 6):
                s += np.sin(2 * np.pi * f * h * t + rng.uniform(0, 6.28)) / (h**1.6)
    s *= zarf(n, 1.2, 1.5)
    return s / (len(notalar) * 3)


def tel(nota: float, sure: float = 1.6, parlaklik: float = 0.5) -> np.ndarray:
    """Karplus-Strong telli çalgı (kanun/ud benzeri), blok blok vektörleştirilmiş."""
    n = int(sure * SR)
    p = max(2, int(round(SR / frekans(nota))))
    y = np.zeros(n + p)
    y[:p] = rng.uniform(-1, 1, p)
    kayip = 0.996
    for i in range(p, n + p, p):
        j = min(i + p, n + p)
        onceki = y[i - p : j - p]
        kaydirilmis = np.concatenate(([y[i - p - 1] if i - p - 1 >= 0 else 0.0], onceki[:-1]))
        y[i:j] = kayip * (parlaklik * onceki + (1 - parlaklik) * kaydirilmis)
    s = y[p:]
    return s * zarf(n, 0.002, 0.3)


def def_vurusu(guc: float = 1.0) -> np.ndarray:
    """Def: alçak gövde tonu + kısa deri hışırtısı."""
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    govde = np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 30)) * t) * np.exp(-t * 9)
    hisirti = rng.normal(0, 1, n) * np.exp(-t * 45) * 0.15
    return (govde + hisirti) * guc


def yanki(s: np.ndarray, sure: float = 2.8, karisim: float = 0.35) -> np.ndarray:
    """Üstel sönümlü gürültü darbe tepkisiyle FFT konvolüsyon reverb."""
    n = int(sure * SR)
    t = np.arange(n) / SR
    ir = rng.normal(0, 1, n) * np.exp(-t * 3.2)
    ir[0] = 0
    ir /= np.sqrt(np.sum(ir**2))
    uz = 1 << int(np.ceil(np.log2(len(s) + n)))
    islak = np.fft.irfft(np.fft.rfft(s, uz) * np.fft.rfft(ir, uz), uz)[: len(s)]
    return (1 - karisim) * s + karisim * islak


# Re Hicaz: D Eb F# G A Bb C D  (D4 = 62)
D = 62
HICAZ = [0, 1, 4, 5, 7, 8, 10, 12]

dron = np.zeros(N)
t = np.arange(N) / SR
for nota, g in ((D - 24, 0.5), (D - 17, 0.3), (D - 12, 0.22)):
    dron += g * np.sin(2 * np.pi * frekans(nota) * t) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * t))
dron *= np.clip(t / 2.5, 0, 1) * np.clip((SURE - t) / 2.5, 0, 1)

# Pad akorları: Dm - Eb - Cm - D (hicaz kadansı), her biri sahne uzunluğunda.
akorlar = [
    (0, 3, [D - 12, D - 5, D]),            # D5 açılış
    (3, 5, [D - 11, D - 5, D + 3]),        # Eb (Kâbe)
    (8, 4, [D - 14, D - 7, D - 2]),        # C (fiyatlar)
    (12, 4, [D - 12, D - 4, D + 3]),       # D7 -> gerilim
    (16, 5, [D - 17, D - 10, D - 5]),      # Gm (özellikler)
    (21, 6, [D - 12, D - 8, D - 5, D]),    # D majör (hicaz tonik, kapanış)
]
pad_kanal = np.zeros(N)
for bas, sure, notalar in akorlar:
    ekle(pad_kanal, pad(notalar, sure + 1.5), max(0, bas - 0.4))

# Melodi: (vuruş zamanı sn, dizideki derece, oktav kayması)
motif = [(0, 0), (0.5, 1), (1, 2), (1.5, 3), (2, 4), (3, 3), (3.5, 2), (4, 1), (5, 2), (6, 1), (6.5, 0)]
melodi = []
for tekrar, kok in ((0, 0), (8, 0), (16, 3)):
    for z, d in motif:
        melodi.append((tekrar + z, d, kok))
# Kapanış: yükselen arpej ve tonikte uzun nota
for z, d in ((21, 0), (21.5, 2), (22, 4), (22.5, 7), (24, 7), (24.5, 4), (25, 2), (25.25, 1), (25.5, 0)):
    melodi.append((z, d, 0))

tel_kanal = np.zeros(N)
for z, d, kok in melodi:
    derece = d + kok
    nota = D + HICAZ[derece % 7] + 12 * (derece // 7)
    ses = tel(nota, sure=2.2 if z >= 25.5 else 1.4, parlaklik=0.55)
    ekle(tel_kanal, ses * (0.9 if z < 21 else 1.0), z)
    # Kanunun çift teli: bir oktav üstte hafif ses
    ekle(tel_kanal, tel(nota + 12, 0.9, 0.6) * 0.18, z + 0.012)

# Def: fiyat sahnesinden itibaren düm ... tek, sahne başlarında vurgulu.
def_kanal = np.zeros(N)
for vurus in np.arange(8, 25, 1.0):
    vurgu = vurus in (8, 16, 21)
    ekle(def_kanal, def_vurusu(1.0 if vurgu else 0.45), vurus)
    if vurus % 2 == 1:
        ekle(def_kanal, def_vurusu(0.25), vurus + 0.5)
# Açılış ve Kâbe sahnesine girişte tek derin vuruş.
ekle(def_kanal, def_vurusu(0.9), 0.0)
ekle(def_kanal, def_vurusu(0.9), 3.0)

karisim = 0.55 * dron + 0.5 * pad_kanal + 0.9 * yanki(tel_kanal, 3.2, 0.4) + 0.7 * yanki(def_kanal, 1.5, 0.2)
karisim *= np.clip((SURE - t) / 1.8, 0, 1)  # son 1.8 sn'de söner

# Stereo: tel hafif sağa, pad geniş (Haas), dron ortada.
sol = karisim + 0.12 * yanki(tel_kanal, 3.2, 0.6)
sag = karisim + 0.12 * np.roll(pad_kanal, int(0.012 * SR))
stereo = np.stack([sol, sag], axis=1)
stereo /= np.max(np.abs(stereo)) / 0.89

cikti = Path(__file__).parent / "public" / "umre" / "muzik.wav"
cikti.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(cikti), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype("<i2").tobytes())
print(cikti)
