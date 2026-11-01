"""İlahi altyazısı: Whisper kelime zamanlarını doğru söz metniyle eşleştirir.

Her söz satırı Whisper'ın bir segmentine karşılık gelir. Kelime sayısı tutarsa her kelime
Whisper'ın zamanını alır; tutmazsa satır süresi harf sayısına göre bölünür.

    python3 ilahi_hazirla.py  ->  src/data/ilahi.json
"""
import json
import subprocess
from pathlib import Path

import numpy as np

KOK = Path(__file__).parent
VIDEO = KOK / "public" / "ilahi" / "ham.mp4"

# Doğru söz metni (Whisper'ın yazdığı yerine). Satır sayısı segment sayısıyla aynı olmalı.
SOZLER = [
    "Sen sinemdeki ben, ben gibi duran",
    "Sinemin üstünde haksız oturan",
    "Ey gönlümü yakıp kalbimi bilen",
    "Derdimi dermansız hâle düşürme",
    "Hâle düşürme, hâle düşürme",
    "Malûmundur hâlim ey Yüce Rahman",
    "Gizli saklı nem var hep sana ayan",
    "Ey rahmeti sonsuz, lütfu bîpâyan",
    "Gönlümü yüzde bir dara düşürme",
    "Dara düşürme, dara düşürme",
]


def main() -> None:
    from faster_whisper import WhisperModel

    ham = subprocess.run(["ffmpeg", "-v", "error", "-i", str(VIDEO), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
    ses = np.frombuffer(ham, np.int16).astype(np.float32) / 32768
    model = WhisperModel("large-v3", compute_type="int8")
    segmentler = list(model.transcribe(ses, language="tr", word_timestamps=True, beam_size=5, vad_filter=True)[0])
    if len(segmentler) != len(SOZLER):
        raise SystemExit(f"Whisper {len(segmentler)} satır buldu, SOZLER {len(SOZLER)} satır. Satırları elle eşleştir.")

    satirlar = []
    for seg, metin in zip(segmentler, SOZLER):
        kelimeler = metin.split()
        bulunan = [w for w in seg.words if not w.word.strip().startswith(("'", "’"))]
        if len(bulunan) == len(kelimeler):
            zaman = [{"w": k, "b": round(w.start, 2), "s": round(w.end, 2)} for k, w in zip(kelimeler, bulunan)]
        else:
            agirlik = np.cumsum([0] + [len(k) + 2 for k in kelimeler])
            sinir = seg.start + (seg.end - seg.start) * agirlik / agirlik[-1]
            zaman = [{"w": k, "b": round(float(sinir[i]), 2), "s": round(float(sinir[i + 1]), 2)} for i, k in enumerate(kelimeler)]
        satirlar.append({"metin": metin, "bas": round(seg.start, 2), "son": round(seg.end, 2), "kelimeler": zaman})
        print(f"{seg.start:6.2f}-{seg.end:6.2f} {'=' if len(bulunan) == len(kelimeler) else '~'} {metin}")

    sure = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(VIDEO)], capture_output=True, text=True).stdout)
    (KOK / "src" / "data" / "ilahi.json").write_text(json.dumps({"sure": round(sure, 2), "satirlar": satirlar}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
