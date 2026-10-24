#!/usr/bin/env python3
"""src/data/transkript.json + altyazi_duzeltme.json -> src/data/altyazi.json

Transkripti üretmek için (faster-whisper, Hugging Face erişimi gerekir):
    python3 ../araclar/kurgu.py altyazi ...   veya   transkript betiği
Bu betik sadece düzeltmeleri uygular ve satırları ekrana sığacak parçalara böler.
"""

import json
from pathlib import Path

VERI = Path(__file__).resolve().parent / "src" / "data"
EN_FAZLA_KARAKTER = 50  # iki satıra sığan yaklaşık uzunluk


def kelimeleri_dagit(metin, bas, son):
    """Düzeltilen satırda kelime zamanlarını süreye eşit (uzunluğa orantılı) dağıt."""
    kelimeler = metin.split()
    toplam = sum(len(k) + 1 for k in kelimeler)
    t, sonuc = bas, []
    for k in kelimeler:
        sure = (son - bas) * (len(k) + 1) / toplam
        sonuc.append({"k": k, "bas": round(t, 3), "son": round(t + sure, 3)})
        t += sure
    return sonuc


def bol(kelimeler):
    """Uzun satırı yaklaşık eşit parçalara böl."""
    metin_uzunlugu = sum(len(k["k"]) + 1 for k in kelimeler)
    parca_sayisi = max(1, -(-metin_uzunlugu // EN_FAZLA_KARAKTER))
    hedef = metin_uzunlugu / parca_sayisi
    parcalar, simdiki, uzunluk = [], [], 0
    for k in kelimeler:
        simdiki.append(k)
        uzunluk += len(k["k"]) + 1
        if uzunluk >= hedef and len(parcalar) < parca_sayisi - 1:
            parcalar.append(simdiki)
            simdiki, uzunluk = [], 0
    if simdiki:
        parcalar.append(simdiki)
    return parcalar


def main():
    transkript = json.loads((VERI / "transkript.json").read_text(encoding="utf-8"))
    duzeltme = json.loads((VERI / "altyazi_duzeltme.json").read_text(encoding="utf-8"))
    silinecek = {round(float(x), 1) for x in duzeltme.get("sil", [])}
    duzelt = {round(float(k), 1): v for k, v in duzeltme.get("duzelt", {}).items()}

    cikti = []
    for satir in transkript:
        anahtar = round(satir["bas"], 1)
        if anahtar in silinecek:
            continue
        if anahtar in duzelt:
            kelimeler = kelimeleri_dagit(duzelt[anahtar], satir["bas"], satir["son"])
        else:
            kelimeler = []
            for w in satir["kelimeler"]:
                # Boşlukla başlamayan parça (ör. "'a") önceki kelimenin devamıdır.
                if kelimeler and not w["k"].startswith(" "):
                    kelimeler[-1]["k"] += w["k"].strip()
                    kelimeler[-1]["son"] = w["son"]
                elif w["k"].strip():
                    kelimeler.append({"k": w["k"].strip(), "bas": w["bas"], "son": w["son"]})
        for parca in bol(kelimeler):
            cikti.append({"bas": parca[0]["bas"], "son": parca[-1]["son"], "kelimeler": parca})

    (VERI / "altyazi.json").write_text(json.dumps(cikti, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(cikti)} altyazı parçası yazıldı.")


if __name__ == "__main__":
    main()
