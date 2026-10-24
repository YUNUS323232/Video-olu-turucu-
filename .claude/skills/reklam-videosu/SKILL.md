---
name: reklam-videosu
description: Ücretsiz araçlarla tanıtım/reklam videosu hazırlar ve ham videoları kurgular. Kullanıcı reklam, tanıtım, ürün videosu, Reels/TikTok/Shorts videosu, storyboard, video promptu istediğinde veya yüklediği ham videonun kesilmesini, birleştirilmesini, dikey formata çevrilmesini, yazı/müzik/altyazı eklenmesini istediğinde kullan.
---

# Reklam videosu yönetmeni

Bu repodaki araçlarla çalışırsın. Ücretli API kullanma. Kullanıcının bütçesi yok.

- `araclar/plan_uret.py`: brief → `storyboard.md`, `sahneler.json`, `kurgu_plani.json`
- `araclar/kurgu.py`: ffmpeg kurgu motoru (`plan`, `kes`, `sessizlik-kes`, `format`, `birlestir`, `muzik`, `altyazi`, `kare`, `bilgi`)
- `notebooks/wan22_ucretsiz_video.ipynb`: Kaggle/Colab'da ücretsiz Wan 2.2 klip üretimi

## A) Sıfırdan reklam (yapay zekâ klipleriyle)

1. Eksikse sor (en fazla bir tur): ürün nedir, kime satılıyor, ana fayda, platform (reels/tiktok/youtube/kare), ton (enerjik/luks/samimi/minimal), süre, CTA ve web/instagram adresi, ürün fotoğrafı var mı.
2. `ornekler/brief.json` biçiminde `proje/<ad>/brief.json` yaz. `*_en` alanlarını sen İngilizce ve somut yaz: malzeme, renk, doku, mekân. Ekran yazıları Türkçe, kısa (en fazla 6-7 kelime) ve emojisiz olmalı (font emoji çizemez).
3. `python araclar/plan_uret.py proje/<ad>/brief.json -k proje/<ad>` çalıştır.
4. `storyboard.md` dosyasını oku ve promptları sahneye özel iyileştir. Şablon cümleleri bırakma; her sahneye somut eylem, kamera hareketi ve ışık yaz. Bir prompt tek bir kamera hareketi ve tek bir eylem içermeli. Aynı değişiklikleri `sahneler.json` içine de yaz.
5. Kullanıcıya üretim yolunu anlat:
   - Google Flow (Veo, günlük ücretsiz kredi) ve PixVerse ana sahneler için kullanılır. Kredi az olduğundan önce kanca ve ürün sahneleri üretilir.
   - Kaggle notebook'u sınırsız ama yavaştır (480p). Dolgu/arka plan sahneleri için uygundur.
   - Ürün fotoğrafı varsa görselden videoyu (image-to-video) öner. Ürün şekli ancak öyle korunur.
6. Klipler `sahne_XX.mp4` adlarıyla klasöre gelince 7. adıma geç.

## B) Ham video kurgusu

1. `python araclar/kurgu.py bilgi <dosyalar>` ile süre, çözünürlük ve ses bilgisine bak.
2. Konuşmalı çekimde önce `sessizlik-kes` ile boşlukları al. Konuşma kesik kesik duyuluyorsa `--esik -45dB` veya `--min-sure 0.8` dene.
3. Neyin nerede olduğunu anlamak için `kare <video> --adet 8` ile kareleri çıkar ve görsellere bak. Kullanıcıya en iyi anları sor ya da önerini sun.
4. `ornekler/ham_video_plani.json` biçiminde kurgu planı yaz (bkz. 7. adım).

## 7. Kurgu planı kuralları

- Toplam süre: Reels/TikTok için 15-30 sn, ilk 2 saniyede kanca.
- `oran`: dikey platformlar için `9:16`. Yatay ham video için `sigdirma: "bulanik"` kullan (görüntü kesilmez, arka plan bulanıklaşır). Yüzün/ürünün ortada olduğu çekimde `kirp` kullan.
- Geçişler kısa olmalı (0.2-0.5 sn). Enerjik tonda `slideup`/`smoothleft`, lüks tonda `fadeblack` kullan.
- Yazılar ekranda en az 1.5 sn kalmalı. Sahne başına tek yazı olmalı. `konum` değeri `ust`, `orta` veya `alt` olur (alt kısım platform arayüzüyle çakışabilir, önemli yazıyı `ust`/`orta` koy).
- Konuşma varsa `"altyazi": {"dil": "tr"}` ekle (sesi kapalı izleyenler için). Bunun için `pip install faster-whisper` gerekir.
- Müzik telifsiz olmalı (YouTube Ses Kitaplığı, Pixabay Music). `ducking: true` konuşmada müziği kısar.
- Son klip CTA kartı olmalı: `{"kart": {"renk": "#111111", "sure": 2.5}, "yazilar": [...]}`.

## 8. Render ve kontrol

1. `python araclar/kurgu.py plan <plan.json>` çalıştır.
2. `python araclar/kurgu.py kare <cikti.mp4> --adet 6` ile kareleri çıkar, görsellere bakıp yazı taşması, yanlış kırpma veya siyah kare kontrolü yap. Sorun varsa planı düzeltip tekrar render et.
3. Kullanıcıya dosya yolunu, süreyi ve platforma yüklerken dikkat edeceği şeyleri (kapak karesi, açıklama, hashtag) söyle.

Hata alırsan ffmpeg çıktısının son satırlarına bak. Yol hatalarında planın bulunduğu klasöre göre göreli yol kullanıldığını hatırla.
