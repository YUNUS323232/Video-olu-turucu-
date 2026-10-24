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

export type Bolum = { no: number; bas: number; son: number; soru?: string };

// Röportaj bölümleri, röportaj Sequence'ının içindeki kare numaralarıyla.
export const BOLUMLER: Bolum[] = (() => {
  const sinirlar = [veri.bas, ...veri.kesimler, veri.son];
  const sorular = veri.sorular as string[];
  return sinirlar.slice(0, -1).map((bas, i) => ({
    no: i + 1,
    bas: Math.round((bas - veri.bas) * FPS),
    son: Math.round((sinirlar[i + 1] - veri.bas) * FPS),
    soru: sorular[i] || undefined,
  }));
})();

export const veriler = veri;
