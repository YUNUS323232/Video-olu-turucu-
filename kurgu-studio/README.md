# Kurgu Stüdyosu (Remotion)

Röportaj videoları için hareketli kurgu: animasyonlu açılış, her röportajda soru kartı,
"ekran açılma" / kayma / zoom geçişleri, Ken Burns hareketi, film greni, ışık sızması,
hilal ve cami silueti animasyonlu kapanış. Efekt sesleri ffmpeg ile sentezlenir (telifsiz).

## Kurulum

```bash
cd kurgu-studio
npm install
python3 hazirla.py          # public/ altına temizlenmiş röportaj, bulanık arka plan, efekt sesleri
```

## Kullanım

- Önizleme ve düzenleme: `npx remotion studio` (tarayıcıda açılır)
- Video çıktısı: `npm run render` → `cikti/mirac_kandili_reels.mp4`

Bu ortamda olduğu gibi Chrome indirilemiyorsa kurulu tarayıcıyı gösterin:
`--browser-executable=/yol/chrome-headless-shell`

## Kendi videon için

`src/data/mirac.json` dosyasını düzenle:

| Alan | Açıklama |
|---|---|
| `kaynak`, `bas`, `son` | Ham video ve kullanılacak aralık (sn) |
| `kesimler` | Kişi değiştiği anlar (orijinal videodaki saniye). Bulmak için: `ffmpeg -i video.mp4 -vf "select='gt(scene,0.35)',showinfo" -f null - 2>&1 \| grep pts_time` |
| `sorular` | Röportaj sırasıyla sorular. Boş kalırsa "Röportaj 3 / 10" kartı çıkar |
| `ust_baslik`, `baslik`, `alt_baslik` | Açılış yazıları |
| `kapanis`, `hazirlayan`, `konum` | Kapanış yazıları |

JSON değişince `hazirla.py` dosyasını tekrar çalıştır (sadece `kaynak`, `bas`, `son` değiştiyse gerekir).

Remotion lisansı: bireyler ve en fazla 3 çalışanlı şirketler için ücretsiz.
