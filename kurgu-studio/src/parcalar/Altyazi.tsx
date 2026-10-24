import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import altyazi from "../data/altyazi.json";
import { ALTIN } from "./Efektler";
import { SANS } from "./Yazi";

type Kelime = { k: string; bas: number; son: number };
type Parca = { bas: number; son: number; kelimeler: Kelime[] };

const PARCALAR = altyazi as Parca[];

/** Kelime kelime parlayan altyazı. Zamanlar röportaj başlangıcına göre saniyedir. */
export const Altyazi: React.FC<{ ust: number }> = ({ ust }) => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = kare / fps;
  const parca = PARCALAR.find((p) => t >= p.bas && t < p.son + 0.15);
  if (!parca) return null;
  const giris = spring({ frame: kare - Math.round(parca.bas * fps), fps, config: { damping: 18, mass: 0.6 } });
  return (
    <div
      style={{
        position: "absolute",
        top: ust,
        left: 50,
        width: 980,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: 18,
        rowGap: 4,
        transform: `scale(${0.92 + 0.08 * giris})`,
        opacity: giris,
      }}
    >
      {parca.kelimeler.map((k, i) => {
        // Aynı anda tek kelime vurgulanır: başlamış son kelime, bitişinden sonra kısa süre daha.
        const sonraki = parca.kelimeler[i + 1];
        const aktif = t >= k.bas && t < k.son + 0.05 && !(sonraki && t >= sonraki.bas);
        const soylendi = t >= k.bas;
        const vurgu = interpolate(t, [k.bas, k.bas + 0.12], [1.06, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span
            key={i}
            style={{
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 50,
              lineHeight: 1.25,
              color: aktif ? ALTIN : soylendi ? "#ffffff" : "rgba(255,255,255,0.82)",
              transform: aktif ? `scale(${vurgu})` : undefined,
              display: "inline-block",
              textShadow: "0 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(0,0,0,0.9), 2px 2px 0 #000, -2px -2px 0 #000",
            }}
          >
            {k.k}
          </span>
        );
      })}
    </div>
  );
};
