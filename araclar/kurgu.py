#!/usr/bin/env python3
"""Ücretsiz reklam/tanıtım videosu kurgu aracı (ffmpeg tabanlı).

Ham videoları ve yapay zekâ ile üretilmiş klipleri keser, dikey/kare formata
çevirir, yazı ekler, geçişlerle birleştirir, müzik ve altyazı ekler.

Örnekler:
    python araclar/kurgu.py bilgi ham.mp4
    python araclar/kurgu.py kes ham.mp4 --bas 3 --son 0:12 -o parca.mp4
    python araclar/kurgu.py sessizlik-kes konusma.mp4 -o temiz.mp4
    python araclar/kurgu.py format yatay.mp4 --oran 9:16 --sigdirma bulanik -o dikey.mp4
    python araclar/kurgu.py birlestir a.mp4 b.mp4 c.mp4 --oran 9:16 --gecis 0.4 -o birlesik.mp4
    python araclar/kurgu.py muzik video.mp4 muzik.mp3 --ses 0.25 -o muzikli.mp4
    python araclar/kurgu.py altyazi video.mp4 -o altyazili.mp4
    python araclar/kurgu.py kare video.mp4 --adet 6
    python araclar/kurgu.py plan ornekler/kurgu_plani.json
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

ORANLAR = {
    "9:16": (1080, 1920),
    "16:9": (1920, 1080),
    "1:1": (1080, 1080),
    "4:5": (1080, 1350),
}
FPS = 30
SES_HIZI = 48000
SIGDIRMA_MODLARI = ("kirp", "sigdir", "bulanik")
GECIS_TURLERI = (
    "fade", "fadeblack", "fadewhite", "dissolve", "wipeleft", "wiperight",
    "slideleft", "slideright", "slideup", "slidedown", "circleopen",
    "circleclose", "smoothleft", "smoothright", "zoomin", "radial",
)
FONT_ADAYLARI = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/segoeuib.ttf",
)
# Konuşma gürültüsü temizleme modeli (RNNoise, ffmpeg arnndn). İlk kullanımda indirilir.
RNNOISE_URL = ("https://raw.githubusercontent.com/GregorR/rnnoise-models/master/"
               "somnolent-hogwash-2018-09-01/sh.rnnn")
RNNOISE_YOLU = Path.home() / ".cache" / "video-olusturucu" / "sh.rnnn"

# Altyazı (libass) font adını dosya adından değil aile adından bulur.
FONT_AILELERI = {
    "dejavusans-bold": "DejaVu Sans",
    "arial bold": "Arial",
    "arialbd": "Arial",
    "segoeuib": "Segoe UI",
}


class KurguHatasi(Exception):
    pass


# --- yardımcılar ---------------------------------------------------------

def ffmpeg_kontrol():
    for arac in ("ffmpeg", "ffprobe"):
        if not shutil.which(arac):
            raise KurguHatasi(
                f"'{arac}' bulunamadı. Kurulum: Windows -> 'winget install ffmpeg', "
                "macOS -> 'brew install ffmpeg', Linux -> 'sudo apt install ffmpeg'."
            )


def calistir(komut, cwd=None):
    sonuc = subprocess.run(komut, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                           encoding="utf-8", errors="replace")
    if sonuc.returncode != 0:
        son_satirlar = "\n".join(sonuc.stderr.strip().splitlines()[-25:])
        raise KurguHatasi(f"ffmpeg hatası:\n{son_satirlar}")
    return sonuc


def sure_cevir(deger):
    """3.5, "12", "1:05", "00:01:05.5" -> saniye."""
    if deger is None:
        return None
    if isinstance(deger, (int, float)):
        return float(deger)
    parcalar = str(deger).strip().split(":")
    toplam = 0.0
    for parca in parcalar:
        toplam = toplam * 60 + float(parca)
    return toplam


def incele(yol):
    sonuc = calistir([
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration:stream=codec_type,width,height,r_frame_rate",
        "-of", "json", str(yol),
    ])
    veri = json.loads(sonuc.stdout)
    akislar = veri.get("streams", [])
    video = next((a for a in akislar if a.get("codec_type") == "video"), None)
    return {
        "sure": float(veri.get("format", {}).get("duration") or 0),
        "genislik": video.get("width") if video else None,
        "yukseklik": video.get("height") if video else None,
        "fps": video.get("r_frame_rate") if video else None,
        "ses_var": any(a.get("codec_type") == "audio" for a in akislar),
    }


def font_bul(tercih=None):
    for aday in ([tercih] if tercih else []) + list(FONT_ADAYLARI):
        if aday and Path(aday).is_file():
            return Path(aday)
    raise KurguHatasi("Yazı için font bulunamadı. Plana \"font\": \"/yol/font.ttf\" ekleyin.")


def rnnoise_modeli():
    """Model dosyasını indirir; indirilemezse None döner (afftdn'e düşülür)."""
    if RNNOISE_YOLU.is_file():
        return RNNOISE_YOLU
    try:
        import urllib.request
        RNNOISE_YOLU.parent.mkdir(parents=True, exist_ok=True)
        gecici = RNNOISE_YOLU.with_suffix(".indiriliyor")
        urllib.request.urlretrieve(RNNOISE_URL, gecici)
        gecici.replace(RNNOISE_YOLU)
        return RNNOISE_YOLU
    except Exception as hata:  # ağ yoksa basit FFT gürültü azaltmaya geç
        print(f"Uyarı: RNNoise modeli indirilemedi ({hata}); basit gürültü azaltma kullanılacak.")
        return None


def iyilestirme_ayari(deger):
    """true / false / {"goruntu": bool, "ses": bool} -> (goruntu, ses)"""
    if isinstance(deger, dict):
        return bool(deger.get("goruntu", False)), bool(deger.get("ses", False))
    return bool(deger), bool(deger)


def atempo_zinciri(hiz):
    """atempo 0.5-2.0 aralığını kabul eder; dışındaki hızları zincirler."""
    filtreler = []
    while hiz > 2.0:
        filtreler.append("atempo=2.0")
        hiz /= 2.0
    while hiz < 0.5:
        filtreler.append("atempo=0.5")
        hiz /= 0.5
    filtreler.append(f"atempo={hiz:.6f}")
    return ",".join(filtreler)


def sigdirma_filtresi(mod, gen, yuk):
    if mod == "kirp":
        return f"scale={gen}:{yuk}:force_original_aspect_ratio=increase:flags=lanczos,crop={gen}:{yuk}"
    if mod == "sigdir":
        return (f"scale={gen}:{yuk}:force_original_aspect_ratio=decrease:flags=lanczos,"
                f"pad={gen}:{yuk}:(ow-iw)/2:(oh-ih)/2:color=black")
    if mod == "bulanik":
        return (f"split[arka][on];"
                f"[arka]scale={gen}:{yuk}:force_original_aspect_ratio=increase,crop={gen}:{yuk},"
                f"boxblur=25:3,eq=brightness=-0.08[arka2];"
                f"[on]scale={gen}:{yuk}:force_original_aspect_ratio=decrease:flags=lanczos[on2];"
                f"[arka2][on2]overlay=(W-w)/2:(H-h)/2")
    raise KurguHatasi(f"Bilinmeyen sığdırma modu: {mod} (seçenekler: {', '.join(SIGDIRMA_MODLARI)})")


class Calisma:
    """Geçici klasör: font ve yazı dosyaları buraya kopyalanır, ffmpeg bu klasörde
    çalışır. Böylece filtrelerde Windows yolları vb. için kaçış gerekmez."""

    def __init__(self, font=None):
        self.klasor = Path(tempfile.mkdtemp(prefix="kurgu_"))
        self._font_kaynak = font
        self._font_hazir = False
        self._sayac = 0

    def font(self):
        if not self._font_hazir:
            shutil.copy(font_bul(self._font_kaynak), self.klasor / "font.ttf")
            self._font_hazir = True
        return "font.ttf"

    def gurultu_filtresi(self):
        if not hasattr(self, "_gurultu"):
            model = rnnoise_modeli()
            if model:
                shutil.copy(model, self.klasor / "rnnoise.rnnn")
                self._gurultu = "arnndn=m=rnnoise.rnnn:mix=0.9"
            else:
                self._gurultu = "afftdn=nf=-25"
        return self._gurultu

    def yeni_ad(self, onek, uzanti):
        self._sayac += 1
        return f"{onek}_{self._sayac:03d}.{uzanti}"

    def temizle(self):
        shutil.rmtree(self.klasor, ignore_errors=True)


def yazi_filtresi(calisma, yazi, gen, yuk):
    metin = str(yazi.get("metin", "")).strip()
    if not metin:
        return None
    boyut_carpan = float(yazi.get("boyut", 1.0))
    font_boyutu = int(min(gen, yuk) * 0.065 * boyut_carpan)
    # Satır başına sığacak yaklaşık karakter sayısı.
    karakter = max(8, int(gen * 0.86 / (font_boyutu * 0.55)))
    satirlar = []
    for paragraf in metin.split("\n"):
        satirlar.extend(textwrap.wrap(paragraf, karakter) or [""])
    dosya = calisma.yeni_ad("yazi", "txt")
    (calisma.klasor / dosya).write_text("\n".join(satirlar), encoding="utf-8")

    konum = yazi.get("konum", "alt")
    y_ifadeleri = {
        "ust": "h*0.10",
        "orta": "(h-text_h)/2",
        "alt": "h*0.78-text_h",
    }
    if isinstance(konum, (int, float)):
        # Sayı: ekran yüksekliğinin oranı (0.0 = en üst, 1.0 = en alt)
        y_ifadeleri[konum] = f"h*{float(konum)}"
    elif konum not in y_ifadeleri:
        raise KurguHatasi(f"Bilinmeyen yazı konumu: {konum} (ust, orta, alt veya 0-1 arası sayı)")
    renk = yazi.get("renk", "white")
    parcalar = [
        f"drawtext=fontfile={calisma.font()}",
        f"textfile={dosya}",
        "expansion=none",
        f"fontsize={font_boyutu}",
        f"fontcolor={renk}",
        f"line_spacing={int(font_boyutu * 0.25)}",
        "x=(w-text_w)/2",
        f"y={y_ifadeleri[konum]}",
        "shadowcolor=black@0.6",
        "shadowx=3",
        "shadowy=3",
    ]
    if yazi.get("kutu", True):
        parcalar += ["box=1", f"boxcolor={yazi.get('kutu_renk', 'black@0.45')}",
                     f"boxborderw={int(font_boyutu * 0.35)}"]
    bas, son = sure_cevir(yazi.get("bas")), sure_cevir(yazi.get("son"))
    if bas is not None or son is not None:
        parcalar.append(f"enable='between(t,{bas or 0},{son if son is not None else 99999})'")
    return ":".join(parcalar)


# --- klip işleme -----------------------------------------------------------

def klip_isle(calisma, klip, gen, yuk, varsayilan_sigdirma, plan_klasoru, varsayilan_iyilestir=False):
    """Tek bir klibi (video / görsel / kart) hedef formatta ara dosyaya çevirir."""
    cikti = calisma.yeni_ad("klip", "mp4")
    girdiler = []
    sigdirma = klip.get("sigdirma", varsayilan_sigdirma)
    hiz = float(klip.get("hiz", 1.0))
    ses_seviyesi = float(klip.get("ses", 1.0))
    goruntu_iyilestir, ses_temizle = iyilestirme_ayari(klip.get("iyilestir", varsayilan_iyilestir))
    # Sıkıştırma gürültüsünü azalt (büyütmeden önce), büyüttükten sonra keskinleştir.
    on_filtre = "hqdn3d=1.5:1.5:6:6," if goruntu_iyilestir else ""

    if "kart" in klip:
        kart = klip["kart"] or {}
        sure = sure_cevir(kart.get("sure", 3))
        renk = kart.get("renk", "#111111")
        girdiler += ["-f", "lavfi", "-i", f"color=c={renk}:s={gen}x{yuk}:r={FPS}:d={sure}"]
        video_zinciri = "[0:v]format=yuv420p"
        ses_var = False
    elif "gorsel" in klip:
        yol = (plan_klasoru / klip["gorsel"]).resolve()
        if not yol.is_file():
            raise KurguHatasi(f"Görsel bulunamadı: {yol}")
        sure = sure_cevir(klip.get("sure", 3))
        if klip.get("zoom", True):
            # zoompan tek kareden 'd' kadar kare üretir; bu yüzden görsel döngüye alınmaz.
            girdiler += ["-i", str(yol)]
            kare = int(sure * FPS)
            video_zinciri = (f"[0:v]{sigdirma_filtresi(sigdirma, gen, yuk)},scale={gen * 2}:{yuk * 2},"
                             f"zoompan=z='min(zoom+0.0012,1.18)':d={kare}"
                             f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={gen}x{yuk}:fps={FPS}")
        else:
            girdiler += ["-loop", "1", "-t", f"{sure}", "-i", str(yol)]
            video_zinciri = f"[0:v]{sigdirma_filtresi(sigdirma, gen, yuk)}"
        ses_var = False
    elif "dosya" in klip:
        yol = (plan_klasoru / klip["dosya"]).resolve()
        if not yol.is_file():
            raise KurguHatasi(f"Video bulunamadı: {yol}")
        bilgi = incele(yol)
        bas = sure_cevir(klip.get("bas")) or 0.0
        son = sure_cevir(klip.get("son"))
        if son is None or son > bilgi["sure"]:
            son = bilgi["sure"]
        if son <= bas:
            raise KurguHatasi(f"{yol.name}: 'son' ({son}) 'bas' ({bas}) değerinden büyük olmalı.")
        sure = (son - bas) / hiz
        girdiler += ["-ss", f"{bas}", "-t", f"{son - bas}", "-i", str(yol)]
        video_zinciri = f"[0:v]{on_filtre}{sigdirma_filtresi(sigdirma, gen, yuk)}"
        if hiz != 1.0:
            video_zinciri += f",setpts=PTS/{hiz}"
        ses_var = bilgi["ses_var"] and ses_seviyesi > 0
    else:
        raise KurguHatasi(f"Klipte 'dosya', 'gorsel' veya 'kart' alanı olmalı: {klip}")

    if goruntu_iyilestir:
        video_zinciri += ",unsharp=5:5:0.7:3:3:0.0,eq=contrast=1.04:saturation=1.10"
    video_zinciri += f",fps={FPS},setsar=1"
    for yazi in klip.get("yazilar", []):
        filtre = yazi_filtresi(calisma, yazi, gen, yuk)
        if filtre:
            video_zinciri += "," + filtre
    video_zinciri += f",format=yuv420p,trim=duration={sure:.3f}[v]"

    if ses_var:
        ses_zinciri = "[0:a]"
        ses_zinciri += atempo_zinciri(hiz) + "," if hiz != 1.0 else ""
        if ses_temizle:
            # Uğultuyu kes, gürültüyü temizle, konuşma seviyesini dengele.
            ses_zinciri += (f"aresample={SES_HIZI},highpass=f=80,{calisma.gurultu_filtresi()},"
                            "acompressor=threshold=0.1:ratio=3:attack=10:release=250:makeup=2,")
        ses_zinciri += f"volume={ses_seviyesi},"
    else:
        girdiler += ["-f", "lavfi", "-t", f"{sure}", "-i", f"anullsrc=r={SES_HIZI}:cl=stereo"]
        ses_zinciri = "[1:a]"
    ses_zinciri += (f"aresample={SES_HIZI},aformat=channel_layouts=stereo,"
                    f"apad,atrim=duration={sure:.3f}[a]")

    calistir(["ffmpeg", "-y", "-hide_banner", *girdiler,
              "-filter_complex", f"{video_zinciri};{ses_zinciri}",
              "-map", "[v]", "-map", "[a]",
              "-c:v", "libx264", "-preset", "medium", "-crf", "18",
              "-c:a", "aac", "-b:a", "192k", "-ar", str(SES_HIZI),
              "-movflags", "+faststart", cikti], cwd=calisma.klasor)
    return cikti


def klipleri_birlestir(calisma, klipler, gecis):
    """Aynı formattaki ara dosyaları (isteğe bağlı geçişlerle) birleştirir."""
    if len(klipler) == 1:
        return klipler[0]
    cikti = calisma.yeni_ad("birlesik", "mp4")
    girdiler = []
    for klip in klipler:
        girdiler += ["-i", klip]

    gecis_suresi = float((gecis or {}).get("sure", 0))
    if gecis_suresi > 0:
        sureler = [incele(calisma.klasor / k)["sure"] for k in klipler]
        en_kisa = min(sureler)
        if gecis_suresi >= en_kisa:
            gecis_suresi = round(en_kisa * 0.4, 3)
        tur = gecis.get("tur", "fade")
        if tur not in GECIS_TURLERI:
            raise KurguHatasi(f"Bilinmeyen geçiş: {tur} (seçenekler: {', '.join(GECIS_TURLERI)})")
        filtreler = []
        onceki_v, onceki_a = "[0:v]", "[0:a]"
        toplam = sureler[0]
        for i in range(1, len(klipler)):
            ofset = toplam - gecis_suresi
            filtreler.append(f"{onceki_v}[{i}:v]xfade=transition={tur}:duration={gecis_suresi}"
                             f":offset={ofset:.3f}[v{i}]")
            filtreler.append(f"{onceki_a}[{i}:a]acrossfade=d={gecis_suresi}[a{i}]")
            onceki_v, onceki_a = f"[v{i}]", f"[a{i}]"
            toplam = ofset + sureler[i]
        filtre = ";".join(filtreler)
        haritalar = ["-map", onceki_v, "-map", onceki_a]
    else:
        akislar = "".join(f"[{i}:v][{i}:a]" for i in range(len(klipler)))
        filtre = f"{akislar}concat=n={len(klipler)}:v=1:a=1[v][a]"
        haritalar = ["-map", "[v]", "-map", "[a]"]

    calistir(["ffmpeg", "-y", "-hide_banner", *girdiler, "-filter_complex", filtre, *haritalar,
              "-c:v", "libx264", "-preset", "medium", "-crf", "18",
              "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", cikti], cwd=calisma.klasor)
    return cikti


# --- altyazı -------------------------------------------------------------

def srt_zamani(saniye):
    ms = int(round(saniye * 1000))
    s, ms = divmod(ms, 1000)
    d, s = divmod(s, 60)
    sa, d = divmod(d, 60)
    return f"{sa:02d}:{d:02d}:{s:02d},{ms:03d}"


def altyazi_uret(video_yolu, srt_yolu, dil="tr", model="small"):
    try:
        from faster_whisper import WhisperModel
    except ImportError as hata:
        raise KurguHatasi("Altyazı için önce kurun: pip install faster-whisper") from hata
    print(f"Konuşma metne çevriliyor (model: {model}, ilk seferde model indirilir)...")
    whisper = WhisperModel(model, device="auto", compute_type="int8")
    parcalar, _ = whisper.transcribe(str(video_yolu), language=dil, vad_filter=True)
    satirlar = []
    for i, parca in enumerate(parcalar, 1):
        satirlar.append(f"{i}\n{srt_zamani(parca.start)} --> {srt_zamani(parca.end)}\n{parca.text.strip()}\n")
    Path(srt_yolu).write_text("\n".join(satirlar), encoding="utf-8")
    return len(satirlar)


# --- son işlem: altyazı + müzik + ses normalizasyonu ----------------------

def son_islem(calisma, girdi, cikti, muzik=None, altyazi=None, normalize=True, plan_klasoru=Path(".")):
    """girdi: çalışma klasöründeki dosya adı; cikti: mutlak yol."""
    girdi_yolu = calisma.klasor / girdi
    bilgi = incele(girdi_yolu)
    girdiler = ["-i", girdi]
    video_filtre = "[0:v]null"
    ses_filtre = "[0:a]anull[konusma]"

    if altyazi:
        srt = "altyazi.srt"
        if altyazi.get("dosya"):
            shutil.copy((plan_klasoru / altyazi["dosya"]).resolve(), calisma.klasor / srt)
        else:
            adet = altyazi_uret(girdi_yolu, calisma.klasor / srt, altyazi.get("dil", "tr"),
                                altyazi.get("model", "small"))
            print(f"{adet} altyazı satırı üretildi.")
        if (calisma.klasor / srt).stat().st_size > 0:
            font = font_bul(altyazi.get("font"))
            shutil.copy(font, calisma.klasor / "altyazi_font.ttf")
            aile = FONT_AILELERI.get(font.stem.lower(), font.stem)
            boyut = int(altyazi.get("boyut", 14 if bilgi["yukseklik"] > bilgi["genislik"] else 20))
            stil = (f"Fontname={aile},Bold=1,FontSize={boyut},PrimaryColour=&H00FFFFFF,"
                    "OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=60")
            video_filtre = f"[0:v]subtitles={srt}:fontsdir=.:force_style='{stil}'"
            # Altyazının kopyasını çıktının yanına da koy (platformlara ayrıca yüklemek için).
            shutil.copy(calisma.klasor / srt, Path(cikti).with_suffix(".srt"))
    video_filtre += "[v]"

    if muzik:
        muzik_yolu = (plan_klasoru / muzik["dosya"]).resolve()
        if not muzik_yolu.is_file():
            raise KurguHatasi(f"Müzik bulunamadı: {muzik_yolu}")
        girdiler += ["-stream_loop", "-1", "-i", str(muzik_yolu)]
        sure = bilgi["sure"]
        kapanis = min(2.0, sure / 4)
        ses = float(muzik.get("ses", 0.25))
        ses_filtre = (f"[1:a]aresample={SES_HIZI},aformat=channel_layouts=stereo,volume={ses},"
                      f"atrim=duration={sure:.3f},afade=t=in:d=0.5,"
                      f"afade=t=out:st={sure - kapanis:.3f}:d={kapanis:.3f}[muzik];")
        if muzik.get("ducking", True):
            # Konuşma varken müziği otomatik kıs.
            ses_filtre += ("[0:a]asplit[konusma0][yan];"
                           "[muzik][yan]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=500[muzik2];"
                           "[konusma0][muzik2]")
        else:
            ses_filtre += "[0:a][muzik]"
        ses_filtre += "amix=inputs=2:duration=first:normalize=0[konusma]"

    ses_filtre += ";[konusma]"
    ses_filtre += "loudnorm=I=-14:TP=-1.5:LRA=11," if normalize else ""
    ses_filtre += f"aresample={SES_HIZI}[a]"

    calistir(["ffmpeg", "-y", "-hide_banner", *girdiler,
              "-filter_complex", f"{video_filtre};{ses_filtre}",
              "-map", "[v]", "-map", "[a]", "-t", f"{bilgi['sure']:.3f}",
              "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
              "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(cikti)],
             cwd=calisma.klasor)


# --- plan ----------------------------------------------------------------

def plan_uygula(plan, plan_klasoru=Path(".")):
    oran = plan.get("oran", "9:16")
    if oran not in ORANLAR:
        raise KurguHatasi(f"Bilinmeyen oran: {oran} (seçenekler: {', '.join(ORANLAR)})")
    gen, yuk = ORANLAR[oran]
    sigdirma = plan.get("sigdirma", "kirp")
    klipler = plan.get("klipler") or []
    if not klipler:
        raise KurguHatasi("Planda en az bir klip olmalı ('klipler').")
    cikti = (plan_klasoru / plan.get("cikti", "cikti.mp4")).resolve()
    cikti.parent.mkdir(parents=True, exist_ok=True)

    calisma = Calisma(plan.get("font"))
    try:
        ara_dosyalar = []
        for i, klip in enumerate(klipler, 1):
            ad = klip.get("dosya") or klip.get("gorsel") or "kart"
            print(f"[{i}/{len(klipler)}] işleniyor: {ad}")
            ara_dosyalar.append(klip_isle(calisma, klip, gen, yuk, sigdirma, plan_klasoru,
                                          plan.get("iyilestir", False)))
        print("Klipler birleştiriliyor...")
        birlesik = klipleri_birlestir(calisma, ara_dosyalar, plan.get("gecis"))
        print("Müzik / altyazı / ses ayarı...")
        altyazi = plan.get("altyazi")
        if altyazi is True:
            altyazi = {}
        son_islem(calisma, birlesik, cikti, muzik=plan.get("muzik"), altyazi=altyazi or None,
                  normalize=plan.get("ses_normalize", True), plan_klasoru=plan_klasoru)
    finally:
        calisma.temizle()
    bilgi = incele(cikti)
    print(f"Bitti: {cikti}  ({bilgi['genislik']}x{bilgi['yukseklik']}, {bilgi['sure']:.1f} sn)")
    return cikti


# --- sessizlik kesme -------------------------------------------------------

def sessizlik_kes(girdi, cikti, esik="-35dB", min_sessizlik=0.6, pay=0.12):
    bilgi = incele(girdi)
    if not bilgi["ses_var"]:
        raise KurguHatasi("Videoda ses yok; sessizlik kesme yapılamaz.")
    sonuc = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(girdi), "-af",
                            f"silencedetect=noise={esik}:d={min_sessizlik}", "-f", "null", "-"],
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                           encoding="utf-8", errors="replace")
    baslar = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", sonuc.stderr)]
    bitisler = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", sonuc.stderr)]
    sessizlikler = list(zip(baslar, bitisler + [bilgi["sure"]] * (len(baslar) - len(bitisler))))

    tutulacak, imlec = [], 0.0
    for bas, son in sessizlikler:
        parca_son = min(bilgi["sure"], max(0.0, bas) + pay)
        if parca_son - imlec > 0.15:
            tutulacak.append((imlec, parca_son))
        imlec = max(imlec, son - pay)
    if bilgi["sure"] - imlec > 0.15:
        tutulacak.append((imlec, bilgi["sure"]))
    if not tutulacak:
        raise KurguHatasi("Videonun tamamı sessiz görünüyor; --esik değerini düşürün (örn. -45dB).")

    kesilen = bilgi["sure"] - sum(s - b for b, s in tutulacak)
    print(f"{len(sessizlikler)} sessiz bölüm bulundu, {kesilen:.1f} sn kesilecek.")
    secim = "+".join(f"between(t,{b:.3f},{s:.3f})" for b, s in tutulacak)
    with tempfile.TemporaryDirectory(prefix="kurgu_") as klasor:
        script = Path(klasor) / "filtre.txt"
        script.write_text(f"[0:v]select='{secim}',setpts=N/FRAME_RATE/TB[v];"
                          f"[0:a]aselect='{secim}',asetpts=N/SR/TB[a]", encoding="utf-8")
        calistir(["ffmpeg", "-y", "-hide_banner", "-i", str(girdi), "-filter_complex_script", str(script),
                  "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                  "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(cikti)])
    print(f"Bitti: {cikti}")


# --- komutlar --------------------------------------------------------------

def komut_bilgi(arg):
    for yol in arg.girdiler:
        print(f"{yol}: {json.dumps(incele(yol), ensure_ascii=False)}")


def komut_kes(arg):
    bas = sure_cevir(arg.bas) or 0.0
    komut = ["ffmpeg", "-y", "-hide_banner", "-ss", f"{bas}", "-i", arg.girdi]
    if arg.son is not None:
        komut += ["-t", f"{sure_cevir(arg.son) - bas}"]
    calistir(komut + ["-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-b:a", "192k",
                      "-movflags", "+faststart", arg.cikti])
    print(f"Bitti: {arg.cikti}")


def komut_format(arg):
    plan_uygula({"oran": arg.oran, "sigdirma": arg.sigdirma, "cikti": str(Path(arg.cikti).resolve()),
                 "ses_normalize": False, "klipler": [{"dosya": str(Path(arg.girdi).resolve())}]})


def komut_birlestir(arg):
    plan_uygula({"oran": arg.oran, "sigdirma": arg.sigdirma, "cikti": str(Path(arg.cikti).resolve()),
                 "gecis": {"tur": arg.gecis_turu, "sure": arg.gecis},
                 "klipler": [{"dosya": str(Path(g).resolve())} for g in arg.girdiler]})


def komut_muzik(arg):
    bilgi = incele(arg.video)
    oran = min(ORANLAR, key=lambda o: abs(ORANLAR[o][0] / ORANLAR[o][1] - bilgi["genislik"] / bilgi["yukseklik"]))
    plan_uygula({"oran": oran, "cikti": str(Path(arg.cikti).resolve()),
                 "muzik": {"dosya": str(Path(arg.muzik).resolve()), "ses": arg.ses, "ducking": not arg.ducking_yok},
                 "klipler": [{"dosya": str(Path(arg.video).resolve()), "sigdirma": "sigdir"}]})


def komut_altyazi(arg):
    bilgi = incele(arg.girdi)
    oran = min(ORANLAR, key=lambda o: abs(ORANLAR[o][0] / ORANLAR[o][1] - bilgi["genislik"] / bilgi["yukseklik"]))
    plan_uygula({"oran": oran, "cikti": str(Path(arg.cikti).resolve()),
                 "altyazi": {"dil": arg.dil, "model": arg.model},
                 "klipler": [{"dosya": str(Path(arg.girdi).resolve()), "sigdirma": "sigdir"}]})


def komut_sessizlik(arg):
    sessizlik_kes(arg.girdi, arg.cikti, arg.esik, arg.min_sure)


def komut_kare(arg):
    """Kontrol için videodan eşit aralıklı kareler çıkarır."""
    bilgi = incele(arg.girdi)
    klasor = Path(arg.klasor or Path(arg.girdi).with_suffix("").name + "_kareler")
    klasor.mkdir(parents=True, exist_ok=True)
    for i in range(arg.adet):
        zaman = bilgi["sure"] * (i + 0.5) / arg.adet
        calistir(["ffmpeg", "-y", "-hide_banner", "-ss", f"{zaman:.3f}", "-i", arg.girdi,
                  "-frames:v", "1", "-vf", "scale=540:-2", str(klasor / f"kare_{i + 1:02d}.jpg")])
    print(f"{arg.adet} kare kaydedildi: {klasor}")


def komut_plan(arg):
    plan_yolu = Path(arg.plan).resolve()
    if not plan_yolu.is_file():
        raise KurguHatasi(f"Plan dosyası bulunamadı: {plan_yolu}")
    plan = json.loads(plan_yolu.read_text(encoding="utf-8"))
    plan_uygula(plan, plan_yolu.parent)


def ayristirici():
    p = argparse.ArgumentParser(description="Ücretsiz reklam/tanıtım videosu kurgu aracı (ffmpeg).",
                                formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    alt = p.add_subparsers(dest="komut", required=True)

    k = alt.add_parser("bilgi", help="Video süresi, çözünürlük, ses bilgisi")
    k.add_argument("girdiler", nargs="+")
    k.set_defaults(fonk=komut_bilgi)

    k = alt.add_parser("kes", help="Videodan parça kes")
    k.add_argument("girdi")
    k.add_argument("--bas", default="0", help="Başlangıç (sn veya dd:ss)")
    k.add_argument("--son", help="Bitiş (sn veya dd:ss)")
    k.add_argument("-o", "--cikti", required=True)
    k.set_defaults(fonk=komut_kes)

    k = alt.add_parser("sessizlik-kes", help="Konuşmadaki boşlukları otomatik kes (jump cut)")
    k.add_argument("girdi")
    k.add_argument("--esik", default="-35dB", help="Sessizlik eşiği (varsayılan -35dB)")
    k.add_argument("--min-sure", type=float, default=0.6, help="En kısa sessizlik (sn)")
    k.add_argument("-o", "--cikti", required=True)
    k.set_defaults(fonk=komut_sessizlik)

    k = alt.add_parser("format", help="9:16 / 1:1 / 4:5 / 16:9 formata çevir")
    k.add_argument("girdi")
    k.add_argument("--oran", default="9:16", choices=ORANLAR)
    k.add_argument("--sigdirma", default="bulanik", choices=SIGDIRMA_MODLARI)
    k.add_argument("-o", "--cikti", required=True)
    k.set_defaults(fonk=komut_format)

    k = alt.add_parser("birlestir", help="Videoları geçişlerle birleştir")
    k.add_argument("girdiler", nargs="+")
    k.add_argument("--oran", default="9:16", choices=ORANLAR)
    k.add_argument("--sigdirma", default="kirp", choices=SIGDIRMA_MODLARI)
    k.add_argument("--gecis", type=float, default=0.4, help="Geçiş süresi (sn), 0 = kesme")
    k.add_argument("--gecis-turu", default="fade", choices=GECIS_TURLERI)
    k.add_argument("-o", "--cikti", required=True)
    k.set_defaults(fonk=komut_birlestir)

    k = alt.add_parser("muzik", help="Arka plan müziği ekle (konuşmada otomatik kısılır)")
    k.add_argument("video")
    k.add_argument("muzik")
    k.add_argument("--ses", type=float, default=0.25, help="Müzik seviyesi (0-1)")
    k.add_argument("--ducking-yok", action="store_true", help="Konuşmada müziği kısma")
    k.add_argument("-o", "--cikti", required=True)
    k.set_defaults(fonk=komut_muzik)

    k = alt.add_parser("altyazi", help="Otomatik altyazı üret ve videoya yak (faster-whisper)")
    k.add_argument("girdi")
    k.add_argument("--dil", default="tr")
    k.add_argument("--model", default="small", help="tiny/base/small/medium/large-v3")
    k.add_argument("-o", "--cikti", required=True)
    k.set_defaults(fonk=komut_altyazi)

    k = alt.add_parser("kare", help="Kontrol için videodan kareler çıkar")
    k.add_argument("girdi")
    k.add_argument("--adet", type=int, default=6)
    k.add_argument("--klasor")
    k.set_defaults(fonk=komut_kare)

    k = alt.add_parser("plan", help="JSON kurgu planını uygula (tam reklam kurgusu)")
    k.add_argument("plan")
    k.set_defaults(fonk=komut_plan)
    return p


def main(argv=None):
    arg = ayristirici().parse_args(argv)
    try:
        ffmpeg_kontrol()
        arg.fonk(arg)
    except KurguHatasi as hata:
        print(f"HATA: {hata}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
