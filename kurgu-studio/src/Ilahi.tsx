import React, { useEffect, useState } from "react";
import { AbsoluteFill, Easing, OffthreadVideo, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";
import "@fontsource/cormorant-garamond/600-italic.css";
import "@fontsource/cormorant-garamond/700-italic.css";
import veri from "./data/ilahi.json";
import { ALTIN, ALTIN_PARLAK } from "./parcalar/Efektler";

// İlahi videosuna estetik söz altyazısı: satır satır, okunan kelime altınla parlar.
// Söz zamanları ilahi_hazirla.py ile üretilir (data/ilahi.json).

const FPS = 30;
type Kelime = { w: string; b: number; s: number };
type Satir = { metin: string; bas: number; son: number; kelimeler: Kelime[] };
const SATIRLAR = (veri as { satirlar: Satir[] }).satirlar;
export const ILAHI_TOPLAM = Math.floor(veri.sure * FPS);

const SERIF = "'Cormorant Garamond', serif";
const yumusak = Easing.bezier(0.22, 1, 0.36, 1);

/** Satırın ekranda kaldığı aralık: bir sonraki satır gelene kadar. */
const aralik = (i: number): [number, number] => {
  const s = SATIRLAR[i];
  const sonraki = SATIRLAR[i + 1];
  return [s.bas - 0.25, sonraki ? sonraki.bas - 0.12 : s.son + 0.9];
};

/** Ortası baklava dilimli ince altın süs çizgisi. */
const Sus: React.FC<{ g: number }> = ({ g }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, opacity: g }}>
    <div style={{ width: 150 * g, height: 2, background: `linear-gradient(90deg, transparent, ${ALTIN})` }} />
    <div style={{ width: 12, height: 12, transform: "rotate(45deg)", background: ALTIN, boxShadow: `0 0 12px ${ALTIN}` }} />
    <div style={{ width: 150 * g, height: 2, background: `linear-gradient(90deg, ${ALTIN}, transparent)` }} />
  </div>
);

const SatirYazi: React.FC<{ satir: Satir; sn: number; bas: number; bit: number }> = ({ satir, sn, bas, bit }) => {
  const giris = interpolate(sn, [bas, bas + 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: yumusak });
  const cikis = interpolate(sn, [bit - 0.35, bit], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const nakarat = /^(Hâle|Dara) düşürme/.test(satir.metin);
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 1390,
        textAlign: "center",
        opacity: giris * (1 - cikis),
        transform: `translateY(${(1 - giris) * 28 - cikis * 16}px)`,
        filter: giris < 1 || cikis > 0 ? `blur(${(1 - giris) * 8 + cikis * 6}px)` : undefined,
      }}
    >
      <Sus g={giris} />
      <div style={{ marginTop: 22, lineHeight: 1.12, textWrap: "balance", fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, fontSize: nakarat ? 84 : 78, letterSpacing: "0.005em" }}>
        {satir.kelimeler.map((k, i) => {
          // Kelime söylenmeden önce soluk, söylenirken altın, sonra beyaz.
          const parla = interpolate(sn, [k.b - 0.08, k.b + 0.12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const sonmus = interpolate(sn, [k.s, k.s + 0.45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const aktif = parla * (1 - sonmus);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                margin: "0 0.14em",
                color: aktif > 0.05 ? ALTIN_PARLAK : "#ffffff",
                opacity: 0.62 + 0.38 * parla,
                transform: `translateY(${-4 * aktif}px)`,
                textShadow: [
                  "0 2px 3px rgba(0,0,0,0.85)",
                  "0 0 18px rgba(0,0,0,0.55)",
                  aktif > 0.05 ? `0 0 ${26 * aktif}px rgba(232,196,104,${0.9 * aktif})` : "",
                ]
                  .filter(Boolean)
                  .join(", "),
              }}
            >
              {k.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const Ilahi: React.FC = () => {
  const [tutamak] = useState(() => delayRender("fontlar"));
  useEffect(() => {
    Promise.all(["italic 700 50px 'Cormorant Garamond'", "italic 600 50px 'Cormorant Garamond'"].map((f) => document.fonts.load(f, "Hâle düşürme ğüşıöçİ"))).then(() =>
      continueRender(tutamak),
    );
  }, [tutamak]);
  const sn = useCurrentFrame() / FPS;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo src={staticFile("ilahi/ham.mp4")} style={{ width: 1080, height: 1920 }} />
      {/* Alt kısımda yumuşak karartma: açık renkli taş ve gökyüzünde de okunsun. */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 58%, rgba(0,0,0,0.42) 74%, rgba(0,0,0,0.5) 86%, rgba(0,0,0,0.25) 100%)" }} />
      {SATIRLAR.map((s, i) => {
        const [bas, bit] = aralik(i);
        return sn >= bas && sn < bit ? <SatirYazi key={i} satir={s} sn={sn} bas={bas} bit={bit} /> : null;
      })}
    </AbsoluteFill>
  );
};
