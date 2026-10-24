import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";

export const ALTIN = "#E8C468";
export const ALTIN_KOYU = "#B8862F";
export const ALTIN_PARLAK = "#FFF3C4";

/** Hareketli film greni (önceden üretilmiş gürültü dokusu, her karede kaydırılır). */
export const Gren: React.FC<{ opaklik?: number }> = ({ opaklik = 0.07 }) => {
  const kare = useCurrentFrame();
  const x = Math.floor(random(`gx${kare}`) * 512);
  const y = Math.floor(random(`gy${kare}`) * 512);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${staticFile("gren.png")})`,
        backgroundPosition: `${x}px ${y}px`,
        opacity: opaklik,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

/** Kenar karartma. */
export const Vinyet: React.FC<{ guc?: number }> = ({ guc = 0.65 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 75% 60% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${guc}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

/** Yavaşça gezinen sıcak ışık sızması. */
export const IsikSizmasi: React.FC<{ opaklik?: number; hiz?: number }> = ({ opaklik = 0.22, hiz = 1 }) => {
  const kare = useCurrentFrame() * hiz;
  const x = 50 + 40 * Math.sin(kare / 70);
  const y = 30 + 25 * Math.cos(kare / 95);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${x}% ${y}%, rgba(255,170,80,0.9) 0%, rgba(255,120,60,0.35) 22%, rgba(0,0,0,0) 50%)`,
        mixBlendMode: "screen",
        opacity: opaklik,
        pointerEvents: "none",
      }}
    />
  );
};

/** Göz kırpan yıldızlar. */
export const Yildizlar: React.FC<{ adet?: number; tohum?: string; ustSinir?: number }> = ({
  adet = 140,
  tohum = "y",
  ustSinir = 1,
}) => {
  const kare = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {new Array(adet).fill(0).map((_, i) => {
        const x = random(`${tohum}x${i}`) * 100;
        const y = random(`${tohum}y${i}`) * 100 * ustSinir;
        const boyut = 1.5 + random(`${tohum}b${i}`) * 3.5;
        const faz = random(`${tohum}f${i}`) * Math.PI * 2;
        const hiz = 0.04 + random(`${tohum}h${i}`) * 0.1;
        const parlaklik = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(kare * hiz + faz));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: boyut,
              height: boyut,
              borderRadius: "50%",
              background: "#fffbe8",
              opacity: parlaklik,
              boxShadow: boyut > 3.5 ? `0 0 ${boyut * 3}px rgba(255,240,200,0.9)` : undefined,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Yukarı doğru süzülen altın tozları. */
export const AltinTozu: React.FC<{ adet?: number; opaklik?: number }> = ({ adet = 40, opaklik = 0.8 }) => {
  const kare = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: opaklik }}>
      {new Array(adet).fill(0).map((_, i) => {
        const hiz = 0.6 + random(`ah${i}`) * 1.4;
        const bas = random(`ay${i}`) * 2200;
        const y = 1980 - ((bas + kare * hiz) % 2100);
        const x = random(`ax${i}`) * 1080 + Math.sin((kare + i * 40) / 45) * 25;
        const boyut = 2 + random(`ab${i}`) * 5;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: boyut,
              height: boyut,
              borderRadius: "50%",
              background: ALTIN_PARLAK,
              boxShadow: `0 0 ${boyut * 4}px ${ALTIN}`,
              opacity: 0.3 + 0.5 * random(`ao${i}`),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Dönen ışık huzmeleri. */
export const IsikHuzmeleri: React.FC<{ opaklik?: number; merkezY?: number }> = ({ opaklik = 0.18, merkezY = 35 }) => {
  const kare = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `repeating-conic-gradient(from ${kare * 0.25}deg at 50% ${merkezY}%, rgba(255,230,170,0.55) 0deg 4deg, rgba(0,0,0,0) 4deg 18deg)`,
        maskImage: `radial-gradient(circle at 50% ${merkezY}%, black 0%, transparent 62%)`,
        WebkitMaskImage: `radial-gradient(circle at 50% ${merkezY}%, black 0%, transparent 62%)`,
        mixBlendMode: "screen",
        opacity: opaklik,
        pointerEvents: "none",
      }}
    />
  );
};

/** Hilal (SVG maske ile). */
export const Hilal: React.FC<{ boyut: number; parilti?: number }> = ({ boyut, parilti = 1 }) => (
  <svg width={boyut} height={boyut} viewBox="0 0 200 200" style={{ overflow: "visible" }}>
    <defs>
      <radialGradient id="hilalRenk" cx="35%" cy="40%" r="75%">
        <stop offset="0%" stopColor={ALTIN_PARLAK} />
        <stop offset="55%" stopColor={ALTIN} />
        <stop offset="100%" stopColor={ALTIN_KOYU} />
      </radialGradient>
      <mask id="hilalMaske">
        <rect width="200" height="200" fill="white" />
        <circle cx="128" cy="78" r="74" fill="black" />
      </mask>
      <filter id="hilalIsilti" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation={8 * parilti} result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <circle cx="100" cy="100" r="88" fill="url(#hilalRenk)" mask="url(#hilalMaske)" filter="url(#hilalIsilti)" />
  </svg>
);

/** Stilize cami silueti (kubbeler ve minareler). */
export const CamiSilueti: React.FC<{ renk?: string; isilti?: string }> = ({
  renk = "#070b1c",
  isilti = "rgba(232,196,104,0.35)",
}) => (
  <svg width="1080" height="560" viewBox="0 0 1080 560" style={{ filter: `drop-shadow(0 -6px 22px ${isilti})` }}>
    <g fill={renk}>
      {/* sol minare */}
      <rect x="150" y="120" width="34" height="440" />
      <rect x="140" y="250" width="54" height="14" />
      <rect x="143" y="160" width="48" height="12" />
      <polygon points="150,120 167,30 184,120" />
      {/* sağ minare */}
      <rect x="896" y="120" width="34" height="440" />
      <rect x="886" y="250" width="54" height="14" />
      <rect x="889" y="160" width="48" height="12" />
      <polygon points="896,120 913,30 930,120" />
      {/* ana gövde ve kubbeler */}
      <rect x="250" y="330" width="580" height="230" />
      <ellipse cx="540" cy="330" rx="190" ry="165" />
      <rect x="532" y="130" width="16" height="40" />
      <ellipse cx="335" cy="340" rx="85" ry="70" />
      <ellipse cx="745" cy="340" rx="85" ry="70" />
      <ellipse cx="270" cy="400" rx="45" ry="38" />
      <ellipse cx="810" cy="400" rx="45" ry="38" />
      {/* yan duvarlar */}
      <rect x="0" y="470" width="1080" height="90" />
    </g>
    {/* pencerelerden sızan ışık */}
    <g fill="rgba(255,205,120,0.55)">
      {[330, 400, 470, 540, 610, 680, 750].map((x) => (
        <rect key={x} x={x - 9} y="420" width="18" height="40" rx="9" />
      ))}
    </g>
  </svg>
);
