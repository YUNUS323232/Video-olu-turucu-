import React from "react";
import { interpolate, Easing, useCurrentFrame } from "remotion";
import { ALTIN, ALTIN_KOYU, ALTIN_PARLAK } from "./Efektler";

export const SERIF = "Cinzel, serif";
export const SANS = "Montserrat, sans-serif";

const yumusak = Easing.bezier(0.16, 1, 0.3, 1);

/** Harf harf beliren yazı. tur: "buyut" (büyükten oturur), "yuksel" (aşağıdan gelir), "sonuk" (sadece belirir). */
export const HarfHarf: React.FC<{
  metin: string;
  bas: number;
  aralik?: number;
  tur?: "buyut" | "yuksel" | "sonuk";
  stil?: React.CSSProperties;
  parlak?: boolean;
  parlamaBas?: number;
}> = ({ metin, bas, aralik = 3, tur = "yuksel", stil, parlak, parlamaBas = 1e9 }) => {
  const kare = useCurrentFrame();
  const harfler = Array.from(metin);
  // Parlama: altın gradyanın parlak bandı harflerin üzerinden sırayla geçer.
  const altinStil = (i: number): React.CSSProperties =>
    parlak
      ? {
          backgroundImage: `linear-gradient(105deg, ${ALTIN_KOYU} 0%, ${ALTIN} 35%, ${ALTIN_PARLAK} 47%, #ffffff 50%, ${ALTIN_PARLAK} 53%, ${ALTIN} 65%, ${ALTIN_KOYU} 100%)`,
          backgroundSize: "300% 100%",
          backgroundPosition: `${interpolate(kare, [parlamaBas + i * 2, parlamaBas + i * 2 + 24], [100, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}% 50%`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }
      : {};
  return (
    <div style={{ display: "flex", justifyContent: "center", whiteSpace: "pre", ...stil }}>
      {harfler.map((harf, i) => {
        const t = interpolate(kare, [bas + i * aralik, bas + i * aralik + 18], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: yumusak,
        });
        let donusum = "";
        let bulanik = 0;
        if (tur === "buyut") {
          donusum = `scale(${2.2 - 1.2 * t})`;
          bulanik = 18 * (1 - t);
        } else if (tur === "yuksel") {
          donusum = `translateY(${(1 - t) * 0.6}em)`;
          bulanik = 6 * (1 - t);
        }
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: t,
              transform: donusum,
              filter: bulanik > 0.1 ? `blur(${bulanik}px)` : undefined,
              ...altinStil(i),
            }}
          >
            {harf}
          </span>
        );
      })}
    </div>
  );
};

/** Kelime kelime maskeden yükselen yazı. */
export const KelimeKelime: React.FC<{ metin: string; bas: number; aralik?: number; stil?: React.CSSProperties }> = ({
  metin,
  bas,
  aralik = 3,
  stil,
}) => {
  const kare = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: "0.28em", ...stil }}>
      {metin.split(" ").map((kelime, i) => {
        const t = interpolate(kare, [bas + i * aralik, bas + i * aralik + 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: yumusak,
        });
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.08em" }}>
            <span style={{ display: "inline-block", transform: `translateY(${(1 - t) * 110}%)` }}>{kelime}</span>
          </span>
        );
      })}
    </div>
  );
};

/** Ortadan iki yana açılan altın çizgi. */
export const AltinCizgi: React.FC<{ bas: number; genislik: number; stil?: React.CSSProperties }> = ({
  bas,
  genislik,
  stil,
}) => {
  const kare = useCurrentFrame();
  const t = interpolate(kare, [bas, bas + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: yumusak,
  });
  return (
    <div
      style={{
        width: genislik * t,
        height: 3,
        margin: "0 auto",
        background: `linear-gradient(90deg, transparent, ${ALTIN} 20%, ${ALTIN_PARLAK} 50%, ${ALTIN} 80%, transparent)`,
        boxShadow: `0 0 18px ${ALTIN}`,
        ...stil,
      }}
    />
  );
};
