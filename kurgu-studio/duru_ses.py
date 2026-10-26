"""Duru kampanya videosu: seslendirme, zaman çizelgesi ve fon müziği.

1. public/duru/seslendirme.mp3 varsa (ör. ElevenLabs kaydı) onu kullanır; cümle başlarını
   faster-whisper ile bulur. Yoksa her cümleyi Piper (tr_TR-dfki-medium) ile seslendirir.
2. Kelime zamanlarını faster-whisper ile bulur (altyazı için).
3. Sahne başlarına oturan duygusal piyano + yaylı pad müziği üretir.

    python3 duru_ses.py  ->  public/duru/ses.wav, public/duru/fon.wav, src/data/duru.json

Gerekenler: pip install piper-tts faster-whisper huggingface_hub
"""
import json
import subprocess
import wave
from pathlib import Path
from types import SimpleNamespace

import numpy as np

KOK = Path(__file__).parent
KLASOR = KOK / "public" / "duru"
MODEL = KOK / "cikti" / "piper" / "tr" / "tr_TR" / "dfki" / "medium" / "tr_TR-dfki-medium.onnx"
SR = 44100
BASLANGIC = 0.35  # ilk sözden önceki boşluk (kalp atışı burada başlar)
CTA_UZATMA = 5.0  # son cümleden sonra banka bilgileri ekranda kalır

# (sahne, seslendirilecek metin, altyazı metni)
CUMLELER = [
    ("kanca", "Bu gülümsemeye iyi bak.", "Bu gülümsemeye iyi bak."),
    ("kanca", "Duru'nun zamanı daralıyor.", "Duru'nun zamanı daralıyor."),
    ("hastalik", "Duru, es em a tip bir hastası.", "Duru, SMA Tip-1 hastası."),
    ("hastalik", "Kasları her geçen gün biraz daha güçsüzleşiyor.", "Kasları her geçen gün biraz daha güçsüzleşiyor."),
    ("hedef", "Onu yaşatacak ilaç için, bir milyon sekiz yüz on beş bin dolar gerekiyor.", "Onu yaşatacak ilaç için 1.815.000 dolar gerekiyor."),
    ("ilerleme", "Kampanya yüzde ona ulaştı. Ama zaman hızla akıyor.", "Kampanya %10'a ulaştı. Ama zaman hızla akıyor."),
    ("kahve", "Bir kahve parası bile, Duru için bir nefes demek.", "Bir kahve parası bile, Duru için bir nefes demek."),
    ("slogan", "Kayısılar yeşerecek, Duru ilacına yetişecek.", "Kayısılar yeşerecek, Duru ilacına yetişecek."),
    ("cta", "Valilik izinli hesaplar ekranda. Bağış yap, paylaş. Duru'nun sesi ol.", "Valilik izinli hesaplar ekranda. Bağış yap, paylaş. Duru'nun sesi ol."),
]
ARA = {"kanca": 0.25, "hastalik": 0.3, "hedef": 0.35, "ilerleme": 0.35, "kahve": 0.35, "slogan": 0.4, "cta": 0.3}


def oku_wav(yol: Path) -> np.ndarray:
    ham = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(yol), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(ham, np.float32).copy()


def yaz_wav(yol: Path, ses: np.ndarray) -> None:
    if ses.ndim == 1:
        ses = np.stack([ses, ses], axis=1)
    with wave.open(str(yol), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(ses, -1, 1) * 32767).astype("<i2").tobytes())


def kirp_sessizlik(s: np.ndarray, esik: float = 0.01) -> np.ndarray:
    idx = np.where(np.abs(s) > esik)[0]
    return s[max(0, idx[0] - 200) : idx[-1] + 2000] if len(idx) else s


def seslendir() -> tuple[np.ndarray, list[dict]]:
    """Cümleleri tek tek seslendirir; ses ve cümle zamanlarını döndürür."""
    gecici = KOK / "cikti" / "duru_tts"
    gecici.mkdir(parents=True, exist_ok=True)
    parcalar, cumleler, t = [np.zeros(int(BASLANGIC * SR))], [], BASLANGIC
    for i, (sahne, metin, altyazi) in enumerate(CUMLELER):
        yol = gecici / f"c{i:02d}.wav"
        subprocess.run(
            ["python3", "-m", "piper", "-m", str(MODEL), "-f", str(yol), "--length-scale", "0.97"],
            input=metin.encode(),
            check=True,
            capture_output=True,
        )
        s = kirp_sessizlik(oku_wav(yol))
        cumleler.append({"sahne": sahne, "metin": altyazi, "bas": round(t, 3), "son": round(t + len(s) / SR, 3)})
        parcalar.append(s)
        t += len(s) / SR
        sonraki = CUMLELER[i + 1][0] if i + 1 < len(CUMLELER) else None
        bosluk = 0.6 if sonraki and sonraki != sahne else ARA[sahne]
        parcalar.append(np.zeros(int(bosluk * SR)))
        t += bosluk
    return np.concatenate(parcalar), cumleler


def kelimeleri_bul(ses: np.ndarray) -> list:
    from faster_whisper import WhisperModel

    model = WhisperModel("medium", compute_type="int8")
    ses16 = np.interp(np.arange(0, len(ses), SR / 16000), np.arange(len(ses)), ses).astype(np.float32)
    kelimeler: list[SimpleNamespace] = []
    for seg in model.transcribe(ses16, language="tr", word_timestamps=True)[0]:
        for w in seg.words:
            # Whisper eki ayrı verir ("Duru" + "'nun"); önceki kelimeye ekle.
            if kelimeler and w.word.strip()[:1] in "'’":
                kelimeler[-1].word += w.word.strip()
                kelimeler[-1].end = w.end
            else:
                kelimeler.append(SimpleNamespace(word=w.word.strip(), start=w.start, end=w.end))
    return kelimeler


def sade(kelime: str) -> str:
    return "".join(h for h in kelime.lower() if h.isalnum())


def hazir_cumleler(bulunan: list) -> list[dict]:
    """Hazır kayıtta her cümlenin başını ilk kelimesinden bulur (sırayla arar)."""
    cumleler, imlec = [], 0
    for sahne, _, altyazi in CUMLELER:
        ilk = sade(altyazi.split()[0])
        while imlec < len(bulunan) and sade(bulunan[imlec].word) != ilk:
            imlec += 1
        if imlec == len(bulunan):
            raise SystemExit(f"Kayıtta bu cümle bulunamadı: {altyazi}")
        cumleler.append({"sahne": sahne, "metin": altyazi, "bas": round(float(bulunan[imlec].start), 3), "_i": imlec})
        imlec += 1
    for i, c in enumerate(cumleler):
        # Cümle sonu: sonraki cümleden önceki son kelime. Sonuncuda kelime sayısı kadar
        # ilerle (Whisper kaydın sonuna "Altyazı M.K." gibi uydurma kelime ekleyebiliyor).
        bas_i = c.pop("_i")
        son_i = cumleler[i + 1]["_i"] - 1 if i + 1 < len(cumleler) else bas_i + len(c["metin"].split()) - 1
        c["son"] = round(float(bulunan[min(son_i, len(bulunan) - 1)].end), 3)
    return cumleler


def kelime_zamanlari(bulunan: list, cumleler: list[dict]) -> None:
    """Her cümleye kelime zamanlarını ekler; kelimeler altyazı metninden alınır."""
    for c in cumleler:
        kelimeler = c["metin"].split()
        icinde = [w for w in bulunan if c["bas"] - 0.15 <= w.start < c["son"] + 0.1]
        # Whisper'ın kelime sayısı tutmazsa süreyi harf sayısına göre böl.
        if len(icinde) == len(kelimeler):
            c["kelimeler"] = [{"w": k, "b": round(w.start, 2), "s": round(w.end, 2)} for k, w in zip(kelimeler, icinde)]
        else:
            agirlik = np.cumsum([0] + [len(k) + 2 for k in kelimeler])
            sinir = c["bas"] + (c["son"] - c["bas"]) * agirlik / agirlik[-1]
            c["kelimeler"] = [{"w": k, "b": round(sinir[i], 2), "s": round(sinir[i + 1], 2)} for i, k in enumerate(kelimeler)]


# ---------------------------------------------------------------- müzik
rng = np.random.default_rng(11)


def hz(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


def piyano(nota: int, sure: float, guc: float = 1.0) -> np.ndarray:
    n = int(sure * SR)
    x = np.arange(n) / SR
    f = hz(nota)
    s = np.zeros(n)
    for h, a in ((1, 1.0), (2, 0.45), (3, 0.22), (4, 0.12), (5, 0.06), (6, 0.03)):
        kayma = 1 + 0.0004 * h * h  # tel sertliği
        s += a * np.sin(2 * np.pi * f * h * kayma * x) * np.exp(-x * (1.2 + 0.9 * h))
    vurus = rng.normal(0, 1, min(n, 400)) * np.exp(-np.arange(min(n, 400)) / 60) * 0.05
    s[: len(vurus)] += vurus
    return s * np.clip(x / 0.004, 0, 1) * np.clip((sure - x) / 0.25, 0, 1) * guc


def yayli(notalar, sure: float) -> np.ndarray:
    n = int(sure * SR)
    x = np.arange(n) / SR
    s = np.zeros(n)
    for nota in notalar:
        for kay in (-0.06, 0.0, 0.05):
            vib = 0.003 * np.sin(2 * np.pi * 5.2 * x + rng.uniform(0, 6))
            faz = 2 * np.pi * hz(nota + kay) * np.cumsum(1 + vib) / SR
            s += sum(np.sin(faz * h) / h**1.8 for h in range(1, 6))
    return s * np.clip(x / 1.4, 0, 1) * np.clip((sure - x) / 1.2, 0, 1) / (3 * len(notalar))


def kalp_atisi() -> np.ndarray:
    n = int(0.9 * SR)
    x = np.arange(n) / SR
    tek = lambda gecikme, g: np.where(x >= gecikme, np.sin(2 * np.pi * 52 * (x - gecikme)) * np.exp(-(x - gecikme) * 18), 0) * g
    return tek(0, 1.0) + tek(0.18, 0.7)


def yanki(s: np.ndarray, sure=3.0, karisim=0.4) -> np.ndarray:
    n = int(sure * SR)
    x = np.arange(n) / SR
    ir = rng.normal(0, 1, n) * np.exp(-x * 2.6)
    ir[0] = 0
    ir /= np.sqrt(np.sum(ir**2))
    uz = 1 << int(np.ceil(np.log2(len(s) + n)))
    return (1 - karisim) * s + karisim * np.fft.irfft(np.fft.rfft(s, uz) * np.fft.rfft(ir, uz), uz)[: len(s)]


def ekle(hedef, ses, bas):
    i = int(bas * SR)
    j = min(len(hedef), i + len(ses))
    if 0 <= i < len(hedef):
        hedef[i:j] += ses[: j - i]


def muzik(sahneler: dict[str, float], toplam: float) -> np.ndarray:
    """Am - F - C - G ilerleyişi; kanca sadece kalp atışı, sloganda yükselip CTA'da sakinleşir."""
    N = int(toplam * SR)
    piyano_k, yayli_k, kalp_k = np.zeros(N), np.zeros(N), np.zeros(N)
    # Kanca: kalp atışları, piyano yok (dikkat çekici sessizlik).
    for z in np.arange(0.0, sahneler["hastalik"], 0.85):
        ekle(kalp_k, kalp_atisi(), z)
    akorlar = [(57, [45, 52, 57, 60, 64]), (53, [41, 48, 53, 57, 60]), (60, [48, 55, 60, 64, 67]), (55, [43, 50, 55, 59, 62])]
    bas = sahneler["hastalik"]
    tempo = 0.5
    i = 0
    while bas < toplam - 1.0:
        kok, akor = akorlar[i % 4]
        olcu = 2.0
        yogun = bas >= sahneler["slogan"] - 0.01 and bas < sahneler["cta"] + 2
        ekle(piyano_k, piyano(akor[0] - 12, 3.0, 0.8), bas)
        arpej = [akor[1], akor[2], akor[3], akor[4], akor[3], akor[2]] if not yogun else [akor[2], akor[3], akor[4], akor[4] + 5, akor[4], akor[3]]
        for k, nota in enumerate(arpej[: int(olcu / tempo) + 2]):
            if bas + k * tempo * 0.67 < bas + olcu:
                ekle(piyano_k, piyano(nota, 1.8, 0.45 if not yogun else 0.6), bas + k * tempo * 0.67)
        if bas >= sahneler["hedef"]:
            ekle(yayli_k, yayli([akor[1] + 12, akor[2] + 12, akor[3] + 12], olcu + 1.2), bas - 0.3)
        bas += olcu
        i += 1
    karisim = 0.8 * yanki(piyano_k, 3.2, 0.45) + 0.55 * yanki(yayli_k, 3.5, 0.5) + 1.1 * kalp_k
    t = np.arange(N) / SR
    karisim *= np.clip((toplam - t) / 2.5, 0, 1)
    sol = karisim + 0.08 * np.roll(yayli_k, int(0.011 * SR))
    sag = karisim + 0.08 * np.roll(piyano_k, int(0.009 * SR))
    st = np.stack([sol, sag], axis=1)
    return st / (np.max(np.abs(st)) / 0.9)


def main() -> None:
    hazir = KLASOR / "seslendirme.mp3"
    if hazir.exists():
        ses = np.concatenate([np.zeros(int(BASLANGIC * SR)), oku_wav(hazir)])
        bulunan = kelimeleri_bul(ses)
        cumleler = hazir_cumleler(bulunan)
        filtre = "highpass=f=80,acompressor=threshold=-20dB:ratio=2:makeup=2,loudnorm=I=-16:TP=-1.5"
    else:
        ses, cumleler = seslendir()
        bulunan = kelimeleri_bul(ses)
        filtre = "highpass=f=90,equalizer=f=3000:t=q:w=1:g=3,acompressor=threshold=-18dB:ratio=3:makeup=3,aecho=0.8:0.5:40:0.12,loudnorm=I=-16:TP=-1.5"
    kelime_zamanlari(bulunan, cumleler)

    sahneler: dict[str, float] = {}
    for c in cumleler:
        sahneler.setdefault(c["sahne"], max(0.0, c["bas"] - 0.25))
    sahneler["kanca"] = 0.0
    toplam = round(cumleler[-1]["son"] + CTA_UZATMA, 2)

    # Ses: hafif sıkıştırma, -16 LUFS civarı.
    ses = np.concatenate([ses, np.zeros(int((toplam - len(ses) / SR) * SR) + SR)])
    yaz_wav(KLASOR / "ses_ham.wav", ses * 0.9)
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-y", "-i", str(KLASOR / "ses_ham.wav"),
            "-af", filtre,
            "-ar", str(SR), str(KLASOR / "ses.wav"),
        ],
        check=True,
    )
    (KLASOR / "ses_ham.wav").unlink()
    yaz_wav(KLASOR / "fon.wav", muzik(sahneler, toplam))

    veri = {"toplam": toplam, "sahneler": sahneler, "cumleler": cumleler}
    (KOK / "src" / "data" / "duru.json").write_text(json.dumps(veri, ensure_ascii=False, indent=1))
    for c in cumleler:
        print(f"{c['bas']:6.2f}-{c['son']:6.2f} [{c['sahne']}] {c['metin']}")
    print("toplam", toplam, "sahneler", sahneler)


if __name__ == "__main__":
    main()
