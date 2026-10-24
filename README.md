# Video Oluşturucu: ücretsiz reklam ve tanıtım videosu seti

Ücretli API kullanmadan **tanıtım/reklam videosu** hazırlamak ve **ham videoları kurgulamak** için araçlar.

| Parça | Ne yapar |
|---|---|
| `araclar/kurgu.py` | ffmpeg kurgu motoru: kes, sessizlikleri at, 9:16'ya çevir, yazı ekle, geçişlerle birleştir, müzik ve altyazı ekle |
| `araclar/plan_uret.py` | Ürün brief'inden storyboard, sahne promptları ve kurgu planı üretir |
| `notebooks/wan22_ucretsiz_video.ipynb` | Kaggle/Colab'ın ücretsiz GPU'sunda Wan 2.2 ile klip üretir (yazıdan ve görselden video) |
| `.claude/skills/reklam-videosu/` | Claude Code skill'i: bu repoda Claude'a "reklam videosu yap" demen yeterli |

> **Gerçekçi beklenti:** Ücretsiz modeller (Wan 2.2 5B, 480p) Kling/Veo kalitesinde değildir. En iyi sonuç için
> ana sahneleri günlük ücretsiz kredilerle (Google Flow / PixVerse) üret, dolgu sahneleri Kaggle'da üret,
> hepsini bu araçlarla kurgula. Profesyonel görünümü model kadar kurgu belirler.

## Kurulum

1. **Python 3.9+** ve **ffmpeg** kur:
   - Windows: `winget install ffmpeg` (sonra terminali yeniden aç)
   - macOS: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`
2. Repoyu indir: `git clone <repo-adresi> && cd Video-olu-turucu-`
3. (İsteğe bağlı, otomatik altyazı için) `pip install faster-whisper`

Kurgu aracının başka bağımlılığı yok.

## 1) Ham videoyu kurgulamak

```bash
# Bilgi
python araclar/kurgu.py bilgi ham.mp4

# Konuşmadaki boşlukları otomatik kes (jump cut)
python araclar/kurgu.py sessizlik-kes konusma.mp4 -o temiz.mp4

# Yatay videoyu Reels/TikTok formatına çevir (bulanık arka planlı, görüntü kesilmez)
python araclar/kurgu.py format yatay.mp4 --oran 9:16 --sigdirma bulanik -o dikey.mp4

# Parçaları geçişlerle birleştir
python araclar/kurgu.py birlestir a.mp4 b.mp4 c.mp4 --oran 9:16 --gecis 0.3 --gecis-turu slideup -o birlesik.mp4

# Müzik ekle (konuşma varken müzik otomatik kısılır)
python araclar/kurgu.py muzik video.mp4 muzik.mp3 --ses 0.25 -o muzikli.mp4

# Otomatik Türkçe altyazı (faster-whisper gerekir)
python araclar/kurgu.py altyazi video.mp4 -o altyazili.mp4

# Kontrol için kareler çıkar
python araclar/kurgu.py kare video.mp4 --adet 6
```

### Tam kurgu: plan dosyası

Bütün kurgu tek bir JSON dosyasında tanımlanır (örnek: `ornekler/ham_video_plani.json`):

```bash
python araclar/kurgu.py plan ornekler/ham_video_plani.json
```

| Alan | Açıklama |
|---|---|
| `oran` | `9:16`, `16:9`, `1:1`, `4:5` |
| `sigdirma` | `kirp` (doldur, kenarları kes), `sigdir` (siyah bant), `bulanik` (bulanık arka plan) |
| `gecis` | `{"tur": "fade", "sure": 0.3}`. Türler: fade, fadeblack, fadewhite, dissolve, slideup, slideleft, smoothleft, wipeleft, circleopen, zoomin, ... `sure: 0` düz kesme yapar |
| `muzik` | `{"dosya": "muzik.mp3", "ses": 0.25, "ducking": true}` |
| `altyazi` | `{"dil": "tr", "model": "small"}` (otomatik) veya `{"dosya": "hazir.srt"}` |
| `klipler` | Sırayla: video (`dosya`, `bas`, `son`, `hiz`, `ses`), görsel (`gorsel`, `sure`, `zoom`), kart (`kart: {renk, sure}`). Her birine `yazilar: [{metin, konum: ust/orta/alt, bas, son, boyut, renk}]` eklenebilir |

Dosya yolları plan dosyasının bulunduğu klasöre göredir. Süreler `12`, `"1:05"` veya `"00:01:05.5"` olabilir.
Çıktının ses seviyesi sosyal medya standardına (-14 LUFS) ayarlanır.

## 2) Sıfırdan reklam (yapay zekâ klipleriyle)

```bash
# 1. ornekler/brief.json dosyasını kopyala ve kendi ürününe göre doldur
python araclar/plan_uret.py benim_brief.json -k proje/kahve
# -> proje/kahve/storyboard.md, sahneler.json, kurgu_plani.json
```

2. **Klipleri üret** (hepsi ücretsiz):
   - **Google Flow (Veo)** / **PixVerse**: günlük ücretsiz kredi, en iyi kalite. `storyboard.md` içindeki promptları yapıştır.
     Önce kanca ve ürün sahnelerini üret.
   - **Kaggle**: `notebooks/wan22_ucretsiz_video.ipynb` dosyasını Kaggle'a yükle (*Create → Import Notebook*),
     GPU T4'ü ve interneti aç, `sahneler.json` dosyasını yükle, toplu üretim hücresini çalıştır. Sınırsızdır ama yavaştır.
   - Ürün fotoğrafın varsa **görselden video** kullan; ürünün şekli ancak öyle korunur.
3. Klipleri `sahne_01.mp4`, `sahne_02.mp4`... adlarıyla `proje/kahve/` içine koy.
4. Kurgula:
   ```bash
   python araclar/kurgu.py plan proje/kahve/kurgu_plani.json
   ```

## Claude Code ile kullanım

Bu klasörde `claude` çalıştırıp şöyle yazman yeterli:

- *"Kahve dükkanım için 15 saniyelik Reels reklamı hazırla"*
- *"ham/ klasöründeki videoları 30 sn'lik tanıtım videosuna çevir, altyazı ve müzik ekle"*

`reklam-videosu` skill'i brief'i sorar, promptları yazar, kurgu planını hazırlar, render eder ve kareleri kontrol eder.

## Ücretsiz kaynaklar

- **Müzik (telifsiz):** YouTube Ses Kitaplığı (studio.youtube.com → Ses Kitaplığı), Pixabay Music
- **Ürün görseli / ilk kare:** Google Gemini / Flow görsel üretimi, Microsoft Designer (ücretsiz kotalar)
- **Elle ince ayar:** CapCut, DaVinci Resolve (ikisi de ücretsiz)

Ücretsiz planlarda genelde filigran ve **ticari kullanım kısıtı** olur. Satış yapan bir reklamda kullanmadan önce
aracın kullanım koşullarını kontrol et. Wan 2.2 Apache 2.0 lisanslıdır ve ticari kullanıma açıktır.

## Test

```bash
python -m unittest discover tests
```
