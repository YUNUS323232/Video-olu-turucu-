import veri from "./data/mirac.json";

export const FPS = 30;
export const GENISLIK = 1080;
export const YUKSEKLIK = 1920;

// Açılış ve kapanış, röportajın üzerine BINDIRME kadar biner (geçiş süresi).
export const GIRIS = 225; // 7.5 sn
export const BINDIRME = 15;
export const KAPANIS = 225; // 7.5 sn

export const ROPORTAJ = Math.round((veri.son - veri.bas) * FPS);
export const ROPORTAJ_BAS = GIRIS - BINDIRME;
export const KAPANIS_BAS = ROPORTAJ_BAS + ROPORTAJ - BINDIRME;
export const TOPLAM = KAPANIS_BAS + KAPANIS;

// Soru kartının ekranda kalma süresi (her röportajın başında).
export const KART_SURE = 105; // 3.5 sn
export const GECIS_SURE = 14;

export type Bolum = { no: number; bas: number; son: number };
export type Soru = { no: number; bas: number; metin: string; bolum: number };

// Röportaj bölümleri (kişi değişimleri), röportaj Sequence'ının içindeki kare numaralarıyla.
export const BOLUMLER: Bolum[] = (() => {
  const sinirlar = [veri.bas, ...veri.kesimler, veri.son];
  return sinirlar.slice(0, -1).map((bas, i) => ({
    no: i + 1,
    bas: Math.round((bas - veri.bas) * FPS),
    son: Math.round((sinirlar[i + 1] - veri.bas) * FPS),
  }));
})();

// Soru kartları: soru sorulduğu anda çıkar.
export const SORULAR: Soru[] = (veri.sorular as { zaman: number; metin: string }[]).map((s, i) => {
  const bas = Math.round(s.zaman * FPS) - 4;
  const bolum = BOLUMLER.find((b) => bas >= b.bas && bas < b.son) ?? BOLUMLER[BOLUMLER.length - 1];
  return { no: i + 1, bas, metin: s.metin, bolum: bolum.no };
});

export const veriler = veri;
