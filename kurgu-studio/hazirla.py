#!/usr/bin/env python3
"""Remotion için kaynakları hazırlar (public/ klasörüne):

- roportaj.mp4  röportaj bölümü: gürültüsü azaltılmış, büyütülmüş, keskinleştirilmiş görüntü
                ve temizlenmiş ses (RNNoise)
- arka.mp4      dikey format için bulanık ve karartılmış arka plan
- sfx/*.wav     ffmpeg ile sentezlenen efekt sesleri (geçiş, vuruş, ambiyans)

Kullanım: python3 hazirla.py [src/data/mirac.json]
"""

import json
import subprocess
import sys
from pathlib import Path

KOK = Path(__file__).resolve().parent
sys.path.insert(0, str(KOK.parent / "araclar"))
import kurgu  # noqa: E402

PUBLIC = KOK / "public"


def ffmpeg(*arg):
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-v", "error", *arg], check=True)


def roportaj(veri):
    kaynak = (KOK / veri["kaynak"]).resolve()
    sure = veri["son"] - veri["bas"]
    model = kurgu.rnnoise_modeli()
    gurultu = "afftdn=nf=-25"
    if model:
        (PUBLIC / "rnnoise.rnnn").write_bytes(model.read_bytes())
        gurultu = "arnndn=m=rnnoise.rnnn:mix=0.9"
    print("röportaj.mp4 hazırlanıyor...")
    ffmpeg("-ss", str(veri["bas"]), "-t", str(sure), "-i", str(kaynak),
           "-vf", "hqdn3d=1.5:1.5:6:6,scale=1280:720:flags=lanczos,unsharp=5:5:0.7:3:3:0.0,"
                  "eq=contrast=1.05:saturation=1.12,fps=30,format=yuv420p",
           "-af", f"aresample=48000,highpass=f=80,{gurultu},"
                  "acompressor=threshold=0.1:ratio=3:attack=10:release=250:makeup=2,"
                  "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000",
           "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-g", "15",
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "roportaj.mp4")
    (PUBLIC / "rnnoise.rnnn").unlink(missing_ok=True)
    print("arka.mp4 hazırlanıyor...")
    ffmpeg("-i", "roportaj.mp4", "-an",
           "-vf", "scale=540:960:force_original_aspect_ratio=increase,crop=540:960,"
                  "boxblur=20:3,eq=brightness=-0.12:saturation=0.8,format=yuv420p",
           "-c:v", "libx264", "-preset", "medium", "-crf", "26", "-g", "15", "arka.mp4")


def efektler():
    sfx = PUBLIC / "sfx"
    sfx.mkdir(exist_ok=True)
    print("efekt sesleri sentezleniyor...")
    # Geçiş "vuuş" sesi: filtrelenmiş pembe gürültü, yükselip alçalan
    ffmpeg("-f", "lavfi", "-i", "anoisesrc=d=0.9:c=pink:a=0.6",
           "-af", "highpass=f=300,lowpass=f=5000,afade=t=in:d=0.55:curve=exp,"
                  "afade=t=out:st=0.55:d=0.35,volume=0.9", "sfx/vuus.wav")
    # Derin vuruş (başlık girişi)
    ffmpeg("-f", "lavfi", "-i", "aevalsrc='0.9*sin(2*PI*(70-35*t)*t)*exp(-3.5*t)':d=1.8:s=48000",
           "-af", "lowpass=f=400,volume=1.2", "sfx/vurus.wav")
    # Parıltı (yıldız/ışık)
    ffmpeg("-f", "lavfi", "-i",
           "aevalsrc='0.25*sin(2*PI*1760*t)*exp(-5*t)+0.18*sin(2*PI*2637*t)*exp(-6*t)"
           "+0.12*sin(2*PI*3520*t)*exp(-7*t)':d=1.2:s=48000",
           "-af", "aecho=0.8:0.7:60|120:0.35|0.2", "sfx/parilti.wav")
    # Ambiyans: yumuşak, uzun akor (La minör), yankılı
    ffmpeg("-f", "lavfi", "-i",
           "aevalsrc='(0.16*sin(2*PI*110*t)+0.11*sin(2*PI*164.81*t)+0.09*sin(2*PI*220*t)"
           "+0.06*sin(2*PI*261.63*t)+0.04*sin(2*PI*329.63*t))*(0.85+0.15*sin(2*PI*0.25*t))':d=14:s=48000",
           "-af", "lowpass=f=1800,aecho=0.8:0.6:300|700:0.3|0.2,afade=t=in:d=2,afade=t=out:st=11:d=3",
           "-ac", "2", "sfx/ambiyans.wav")


def main():
    veri_yolu = Path(sys.argv[1]) if len(sys.argv) > 1 else KOK / "src" / "data" / "mirac.json"
    veri = json.loads(veri_yolu.read_text(encoding="utf-8"))
    PUBLIC.mkdir(exist_ok=True)
    import os
    os.chdir(PUBLIC)
    kurgu.ffmpeg_kontrol()
    roportaj(veri)
    efektler()
    print("Hazır:", PUBLIC)


if __name__ == "__main__":
    main()
