#!/usr/bin/env python3
"""Reklam brief'inden storyboard, sahne promptları ve kurgu planı iskeleti üretir.

Kullanım:
    python araclar/plan_uret.py ornekler/brief.json -k proje/

Çıktılar (klasörde):
    storyboard.md      Okunabilir sahne listesi + her araç için promptlar
    sahneler.json      Wan 2.2 notebook'unun toplu üretimde okuduğu promptlar
    kurgu_plani.json   Klipler üretildikten sonra: python araclar/kurgu.py plan proje/kurgu_plani.json

Video modelleri İngilizce promptlarda daha tutarlı çalışır; bu yüzden sahne
tarifleri için brief'te *_en alanları kullanılır. Ekran yazıları Türkçe kalır.
"""

import argparse
import json
import sys
from pathlib import Path

PLATFORMLAR = {
    "tiktok": "9:16", "reels": "9:16", "shorts": "9:16",
    "kare": "1:1", "feed": "4:5", "youtube": "16:9", "yatay": "16:9",
}

TONLAR = {
    "enerjik": {
        "stil": "dynamic commercial, vibrant saturated colors, punchy contrast",
        "isik": "bright high-key studio lighting with colored rim lights",
        "gecis": "slideup", "gecis_sure": 0.25,
    },
    "luks": {
        "stil": "luxury cinematic commercial, elegant, shallow depth of field, film grain",
        "isik": "low-key moody lighting, soft golden highlights, deep shadows",
        "gecis": "fadeblack", "gecis_sure": 0.6,
    },
    "samimi": {
        "stil": "authentic lifestyle footage, natural colors, handheld feel",
        "isik": "soft natural window light, warm tones",
        "gecis": "fade", "gecis_sure": 0.4,
    },
    "minimal": {
        "stil": "clean minimalist product commercial, neutral palette, lots of negative space",
        "isik": "soft diffused even studio lighting",
        "gecis": "fade", "gecis_sure": 0.4,
    },
}

NEGATIF = ("blurry, low quality, distorted product, warped text, extra fingers, deformed hands, "
           "watermark, logo artifacts, flicker, jitter, oversaturated, static frame")

# Klasik kısa reklam yapısı: kanca -> bağlam -> ürün -> fayda -> çağrı.
SAHNE_SABLONLARI = [
    {
        "ad": "Kanca", "pay": 0.15,
        "amac": "İlk 1-2 saniyede kaydırmayı durdurmak.",
        "kamera": "fast push-in, extreme close-up",
        "tarif": "dramatic reveal of {urun}, {mekan}",
        "yazi": "{kanca}",
    },
    {
        "ad": "Bağlam / problem", "pay": 0.2,
        "amac": "Hedef kitlenin kendini görmesi.",
        "kamera": "medium shot, slow dolly",
        "tarif": "{kitle} in {mekan}, {problem}",
        "yazi": "{problem_tr}",
    },
    {
        "ad": "Ürün kahraman çekimi", "pay": 0.25,
        "amac": "Ürünü en iyi haliyle göstermek.",
        "kamera": "slow 180-degree orbit around the product, macro lens",
        "tarif": "hero shot of {urun} on a pedestal, {mekan}",
        "yazi": "{marka}",
    },
    {
        "ad": "Fayda", "pay": 0.2,
        "amac": "Ana faydayı görsel olarak kanıtlamak.",
        "kamera": "close-up, smooth tracking shot",
        "tarif": "{kitle} using {urun}, {fayda}",
        "yazi": "{fayda_tr}",
    },
    {
        "ad": "Çağrı (CTA)", "pay": 0.2,
        "amac": "Ne yapacağını söylemek: satın al / takip et / tıkla.",
        "kamera": "static locked-off shot, slight slow zoom",
        "tarif": "{urun} centered on a clean background, space for text",
        "yazi": "{cta}",
    },
]

ZORUNLU = ("urun_en",)


def doldur(sablon, alanlar):
    return sablon.format(**alanlar).strip(" ,")


def brief_oku(yol):
    brief = json.loads(Path(yol).read_text(encoding="utf-8"))
    eksik = [a for a in ZORUNLU if not brief.get(a)]
    if eksik:
        raise SystemExit(f"Brief'te eksik alan(lar): {', '.join(eksik)}")
    return brief


def plan_olustur(brief):
    ton = TONLAR.get(brief.get("ton", "minimal"))
    if ton is None:
        raise SystemExit(f"Bilinmeyen ton: {brief.get('ton')} (seçenekler: {', '.join(TONLAR)})")
    platform = brief.get("platform", "reels")
    oran = PLATFORMLAR.get(platform)
    if oran is None:
        raise SystemExit(f"Bilinmeyen platform: {platform} (seçenekler: {', '.join(PLATFORMLAR)})")
    toplam = float(brief.get("sure", 15))

    alanlar = {
        "urun": brief["urun_en"],
        "mekan": brief.get("mekan_en", "modern minimal studio"),
        "kitle": brief.get("kitle_en", "a young person"),
        "problem": brief.get("problem_en", "looking frustrated"),
        "fayda": brief.get("fayda_en", "looking satisfied and confident"),
        "marka": brief.get("marka", ""),
        "kanca": brief.get("kanca", "Bunu görmeden geçme!"),
        "problem_tr": brief.get("problem", ""),
        "fayda_tr": brief.get("fayda", ""),
        "cta": "\n".join(x for x in (brief.get("cta", "Hemen sipariş ver"), brief.get("web", "")) if x),
    }
    dikey = oran in ("9:16", "4:5")
    cerceve = "vertical 9:16 framing" if dikey else ("square framing" if oran == "1:1" else "widescreen framing")

    sahneler = []
    for i, sablon in enumerate(SAHNE_SABLONLARI, 1):
        sure = round(toplam * sablon["pay"], 1)
        tarif = doldur(sablon["tarif"], alanlar)
        # Wan/Kling/Veo için ortak yapı: özne + eylem + mekan + kamera + ışık + stil.
        prompt = (f"{tarif}. Camera: {sablon['kamera']}. Lighting: {ton['isik']}. "
                  f"Style: {ton['stil']}, {cerceve}, photorealistic, 4k detail.")
        sahneler.append({
            "no": i,
            "ad": sablon["ad"],
            "amac": sablon["amac"],
            "sure": sure,
            "dosya": f"sahne_{i:02d}.mp4",
            "prompt": prompt,
            "negatif": NEGATIF,
            "yazi": doldur(sablon["yazi"], alanlar),
        })

    kurgu = {
        "cikti": "reklam_final.mp4",
        "oran": oran,
        "sigdirma": "kirp",
        "gecis": {"tur": ton["gecis"], "sure": ton["gecis_sure"]},
        "klipler": [],
    }
    if brief.get("muzik"):
        kurgu["muzik"] = {"dosya": brief["muzik"], "ses": 0.3, "ducking": True}
    for s in sahneler:
        klip = {"dosya": s["dosya"], "bas": 0, "son": s["sure"]}
        if s["yazi"]:
            konum = "orta" if s["no"] == len(sahneler) else ("ust" if s["no"] == 1 else "alt")
            klip["yazilar"] = [{"metin": s["yazi"], "konum": konum}]
        kurgu["klipler"].append(klip)
    return {"oran": oran, "platform": platform, "toplam": toplam, "sahneler": sahneler}, kurgu


def storyboard_yaz(brief, plan):
    satirlar = [
        f"# Storyboard: {brief.get('marka', '')} {brief.get('urun', brief['urun_en'])}".rstrip(),
        "",
        f"- Platform: **{plan['platform']}** ({plan['oran']}), toplam ~{plan['toplam']:.0f} sn",
        f"- Ton: **{brief.get('ton', 'minimal')}**",
        f"- Hedef kitle: {brief.get('hedef_kitle', '-')}",
        "",
        "Her sahne için 5 sn'lik klip üret; kurgu planı onu sahne süresine kırpar.",
        "Aynı sahneyi 2-3 kez üretip en iyisini seç. Ürün görselin varsa **görselden video (image-to-video)** kullan:",
        "ürün şekli metinden üretimde bozulur, görselden üretimde korunur.",
        "",
    ]
    for s in plan["sahneler"]:
        satirlar += [
            f"## {s['no']}. {s['ad']} ({s['sure']} sn) → `{s['dosya']}`",
            "",
            f"*Amaç:* {s['amac']}",
            "",
            f"*Ekran yazısı:* {s['yazi'] or '-'}",
            "",
            "**Prompt (Wan 2.2 / Kling / Veo / PixVerse):**",
            "",
            "```",
            s["prompt"],
            "```",
            "",
            "**Negatif prompt (Wan / PixVerse):**",
            "",
            "```",
            s["negatif"],
            "```",
            "",
        ]
    satirlar += [
        "## Sonraki adımlar",
        "",
        "1. Klipleri üret (Kaggle notebook'u `sahneler.json` dosyasını okuyabilir veya promptları",
        "   Google Flow / PixVerse / Kling'e yapıştır), `sahne_XX.mp4` adıyla bu klasöre koy.",
        "2. Müzik eklemek istersen telifsiz bir parçayı (ör. YouTube Ses Kitaplığı) buraya koyup",
        "   `kurgu_plani.json` içine `\"muzik\": {\"dosya\": \"muzik.mp3\", \"ses\": 0.3}` ekle.",
        "3. `python araclar/kurgu.py plan <bu_klasor>/kurgu_plani.json`",
    ]
    return "\n".join(satirlar) + "\n"


def main(argv=None):
    p = argparse.ArgumentParser(description="Reklam brief'inden storyboard + prompt + kurgu planı üretir.")
    p.add_argument("brief", help="brief.json yolu (örnek: ornekler/brief.json)")
    p.add_argument("-k", "--klasor", default="proje", help="Çıktı klasörü (varsayılan: proje)")
    arg = p.parse_args(argv)

    brief = brief_oku(arg.brief)
    plan, kurgu = plan_olustur(brief)
    klasor = Path(arg.klasor)
    klasor.mkdir(parents=True, exist_ok=True)
    (klasor / "storyboard.md").write_text(storyboard_yaz(brief, plan), encoding="utf-8")
    (klasor / "sahneler.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    (klasor / "kurgu_plani.json").write_text(json.dumps(kurgu, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(plan['sahneler'])} sahne yazıldı: {klasor}/storyboard.md, sahneler.json, kurgu_plani.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
