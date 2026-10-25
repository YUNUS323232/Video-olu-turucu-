import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "@fontsource/cinzel/700.css";
import "@fontsource/cinzel/900.css";
import "@fontsource/montserrat/300-italic.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/800.css";
import { ALTIN, ALTIN_KOYU, ALTIN_PARLAK, AltinTozu, Gren, IsikHuzmeleri, IsikSizmasi, Vinyet } from "./parcalar/Efektler";
import { AltinCizgi, HarfHarf, SANS, SERIF } from "./parcalar/Yazi";

// Hasbihâl Turizm sömestr umre tanıtımı (Instagram Reels, 9:16, 27 sn).
// Sahne sınırları müzikteki vuruşlarla aynıdır (umre_muzik.py): 3, 8, 16, 21 sn.
export const UMRE_TOPLAM = 810;
const SAHNELER = { kanca: [0, 90], kabe: [90, 240], fiyat: [240, 480], ozellik: [480, 630], kapanis: [630, 810] } as const;
const GECIS = 14;

const YESIL = "#0b3b2e";
const YESIL_KOYU = "#05211a";
const KREM = "#f7efdc";
const yumusak = Easing.bezier(0.16, 1, 0.3, 1);

const FIYATLAR = [
  { oda: "2'Lİ ODA", kisi: 2, fiyat: 1550 },
  { oda: "3'LÜ ODA", kisi: 3, fiyat: 1450 },
  { oda: "4'LÜ ODA", kisi: 4, fiyat: 1375 },
];
const OZELLIKLER = [
  "Kutsal topraklarda ibadet",
  "Alanında deneyimli hocalarımız",
  "Güvenli ve konforlu seyahat",
  "Huzurlu, unutulmaz bir yolculuk",
];

const gir = (kare: number, bas: number, sure = 18) =>
  interpolate(kare, [bas, bas + sure], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: yumusak });

/** Sahnenin başında ve sonunda yumuşak geçiş (yakınlaşma + bulanıklık). */
const Gecis: React.FC<{ sure: number; children: React.ReactNode; sonGecis?: boolean }> = ({ sure, children, sonGecis = true }) => {
  const kare = useCurrentFrame();
  const g = interpolate(kare, [0, GECIS], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const c = sonGecis ? interpolate(kare, [sure - GECIS, sure], [0, 1], { extrapolateLeft: "clamp" }) : 0;
  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(g, 1 - c),
        transform: `scale(${1.08 - 0.08 * g + 0.06 * c})`,
        filter: g < 1 || c > 0 ? `blur(${(1 - g) * 12 + c * 12}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Sekiz köşeli yıldız (Rub el-Hizb), logodaki motifin sade hâli. */
const Yildiz: React.FC<{ boyut: number; renk?: string; ic?: string; dondur?: number }> = ({
  boyut,
  renk = ALTIN,
  ic = YESIL,
  dondur = 0,
}) => (
  <svg width={boyut} height={boyut} viewBox="-50 -50 100 100" style={{ transform: `rotate(${dondur}deg)` }}>
    <rect x={-33} y={-33} width={66} height={66} fill={renk} />
    <rect x={-33} y={-33} width={66} height={66} fill={renk} transform="rotate(45)" />
    <circle r={22} fill={ic} />
    <circle r={14} fill="none" stroke={renk} strokeWidth={3} />
    <circle r={5} fill={renk} />
  </svg>
);

/** Koyu yeşil zemin üstünde yavaş dönen altın yıldız deseni. */
const DesenliZemin: React.FC<{ opaklik?: number }> = ({ opaklik = 0.09 }) => {
  const kare = useCurrentFrame();
  const hucre = 180;
  const yildizlar = [];
  for (let y = -1; y < 12; y++) {
    for (let x = -1; x < 7; x++) {
      const kayik = y % 2 ? hucre / 2 : 0;
      yildizlar.push(
        <div key={`${x}-${y}`} style={{ position: "absolute", left: x * hucre + kayik, top: y * hucre - (kare * 0.6) % hucre }}>
          <Yildiz boyut={110} renk={ALTIN} ic="transparent" dondur={kare * 0.3 + (x + y) * 22.5} />
        </div>,
      );
    }
  }
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 70% at 50% 40%, ${YESIL} 0%, ${YESIL_KOYU} 100%)` }}>
      <AbsoluteFill style={{ opacity: opaklik }}>{yildizlar}</AbsoluteFill>
    </AbsoluteFill>
  );
};

const AltinYazi: React.CSSProperties = {
  backgroundImage: `linear-gradient(180deg, ${ALTIN_PARLAK} 0%, ${ALTIN} 45%, ${ALTIN_KOYU} 100%)`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

// 1) Kanca: soru ile açılış.
const Kanca: React.FC = () => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  const y = spring({ frame: kare, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill>
      <DesenliZemin />
      <IsikHuzmeleri opaklik={0.18} merkezY={30} />
      <div style={{ position: "absolute", top: 380, width: "100%", display: "flex", justifyContent: "center", opacity: y, transform: `scale(${0.4 + 0.6 * y})` }}>
        <Yildiz boyut={170} dondur={kare * 1.2} />
      </div>
      <div style={{ position: "absolute", top: 640, width: "100%" }}>
        <HarfHarf metin="SÖMESTR TATİLİNİ" bas={6} aralik={1.5} tur="yuksel" stil={{ fontFamily: SERIF, fontWeight: 700, fontSize: 82, color: "#fff" }} />
      </div>
      <div style={{ position: "absolute", top: 760, width: "100%" }}>
        <HarfHarf metin="KUTSAL" bas={22} aralik={2} tur="buyut" parlak parlamaBas={50} stil={{ fontFamily: SERIF, fontWeight: 900, fontSize: 150, lineHeight: 1 }} />
      </div>
      <div style={{ position: "absolute", top: 920, width: "100%" }}>
        <HarfHarf metin="TOPRAKLARDA" bas={30} aralik={1.5} tur="buyut" parlak parlamaBas={56} stil={{ fontFamily: SERIF, fontWeight: 900, fontSize: 118, lineHeight: 1 }} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 1090,
          width: "100%",
          textAlign: "center",
          fontFamily: SANS,
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: 60,
          color: KREM,
          opacity: gir(kare, 48),
          transform: `translateY(${(1 - gir(kare, 48)) * 30}px)`,
        }}
      >
        geçirmeye ne dersiniz?
      </div>
      <AltinTozu adet={45} opaklik={0.8} />
    </AbsoluteFill>
  );
};

/** Altın çerçeveli Kâbe penceresi, yavaş yakınlaşma ile. */
const KabePencere: React.FC<{ genislik: number; yukseklik: number; zoomBas?: number }> = ({ genislik, yukseklik, zoomBas = 1.05 }) => {
  const kare = useCurrentFrame();
  return (
    <div
      style={{
        width: genislik,
        height: yukseklik,
        borderRadius: genislik / 2,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: "hidden",
        border: `6px solid ${ALTIN}`,
        boxShadow: `0 0 0 3px ${YESIL_KOYU}, 0 0 0 9px ${ALTIN_KOYU}, 0 30px 80px rgba(0,0,0,0.6), 0 0 90px rgba(232,196,104,0.35)`,
        position: "relative",
      }}
    >
      <Img
        src={staticFile("umre/kabe.jpg")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "60% 70%",
          transform: `scale(${zoomBas + kare * 0.0012})`,
          transformOrigin: "60% 65%",
        }}
      />
    </div>
  );
};

// 2) Kâbe ve program adı.
const Kabe: React.FC = () => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: kare - 4, fps, config: { damping: 16, mass: 0.9 } });
  return (
    <AbsoluteFill>
      <DesenliZemin opaklik={0.07} />
      <div style={{ position: "absolute", left: 120, top: 210, opacity: p, transform: `translateY(${(1 - p) * 120}px)` }}>
        <KabePencere genislik={840} yukseklik={1020} />
      </div>
      <div style={{ position: "absolute", top: 1290, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, letterSpacing: "0.35em", color: ALTIN, opacity: gir(kare, 20) }}>
          SÖMESTR TATİLİNDE
        </div>
      </div>
      <div style={{ position: "absolute", top: 1350, width: "100%" }}>
        <HarfHarf metin="13 GECE 14 GÜN" bas={26} aralik={1.5} tur="yuksel" stil={{ fontFamily: SERIF, fontWeight: 900, fontSize: 104, color: "#fff", textShadow: "0 6px 30px rgba(0,0,0,0.5)" }} />
      </div>
      <div style={{ position: "absolute", top: 1480, width: "100%" }}>
        <HarfHarf metin="UMRE PROGRAMI" bas={44} aralik={1.5} tur="buyut" parlak parlamaBas={80} stil={{ fontFamily: SERIF, fontWeight: 900, fontSize: 96 }} />
      </div>
      <AltinCizgi bas={60} genislik={520} stil={{ position: "absolute", top: 1610, left: 280 }} />
      <div
        style={{
          position: "absolute",
          top: 1640,
          width: "100%",
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: 44,
          color: KREM,
          opacity: gir(kare, 72),
        }}
      >
        Mekke ve Medine'de huzur dolu günler
      </div>
      <AltinTozu adet={35} opaklik={0.7} />
    </AbsoluteFill>
  );
};

/** Sayı yukarı sayarak oturur. */
const SayacFiyat: React.FC<{ hedef: number; bas: number }> = ({ hedef, bas }) => {
  const kare = useCurrentFrame();
  const t = interpolate(kare, [bas, bas + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const deger = Math.round(hedef * (0.6 + 0.4 * t));
  return <span>{deger.toLocaleString("tr-TR")}</span>;
};

const Kisiler: React.FC<{ adet: number }> = ({ adet }) => (
  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
    {Array.from({ length: adet }).map((_, i) => (
      <svg key={i} width={34} height={40} viewBox="0 0 34 40">
        <circle cx={17} cy={10} r={9} fill={ALTIN} />
        <path d="M2 40 Q2 22 17 22 Q32 22 32 40 Z" fill={ALTIN} />
      </svg>
    ))}
  </div>
);

// 3) Oda fiyatları.
const Fiyat: React.FC = () => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <AbsoluteFill>
        <Img src={staticFile("umre/kabe.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(18px) brightness(0.45)", transform: "scale(1.15)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(5,33,26,0.55) 0%, rgba(5,33,26,0.85) 100%)` }} />
      <div style={{ position: "absolute", top: 250, width: "100%" }}>
        <HarfHarf metin="ODA SEÇENEKLERİ" bas={6} aralik={1.5} tur="yuksel" parlak parlamaBas={40} stil={{ fontFamily: SERIF, fontWeight: 900, fontSize: 92 }} />
      </div>
      <div style={{ position: "absolute", top: 370, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 600, fontSize: 40, color: KREM, opacity: gir(kare, 20) }}>
        Kişi başı fiyatlar
      </div>
      {FIYATLAR.map((f, i) => {
        const bas = 30 + i * 32;
        const s = spring({ frame: kare - bas, fps, config: { damping: 13 } });
        const vurgu = i === 2 ? 0.5 + 0.5 * Math.sin((kare - bas) / 8) : 0;
        return (
          <div
            key={f.oda}
            style={{
              position: "absolute",
              left: 120,
              top: 500 + i * 360,
              width: 840,
              height: 310,
              borderRadius: 36,
              background: `linear-gradient(160deg, ${KREM} 0%, #efe0bd 100%)`,
              border: `5px solid ${ALTIN}`,
              boxShadow: `0 24px 60px rgba(0,0,0,0.45), 0 0 ${40 * vurgu}px rgba(232,196,104,0.6)`,
              opacity: s,
              transform: `translateX(${(1 - s) * (i % 2 ? 900 : -900)}px)`,
              display: "flex",
              alignItems: "center",
              padding: "0 56px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ width: 270, textAlign: "center" }}>
              <Kisiler adet={f.kisi} />
              <div
                style={{
                  marginTop: 18,
                  background: YESIL,
                  color: "#fff",
                  fontFamily: SANS,
                  fontWeight: 800,
                  fontSize: 38,
                  borderRadius: 40,
                  padding: "10px 0",
                }}
              >
                {f.oda}
              </div>
            </div>
            <div style={{ flex: 1, textAlign: "right", fontFamily: SANS, fontWeight: 800, fontSize: 132, color: YESIL, letterSpacing: "-0.02em" }}>
              <SayacFiyat hedef={f.fiyat} bas={bas} />
              <span style={{ fontSize: 80, marginLeft: 8 }}>$</span>
            </div>
          </div>
        );
      })}
      <IsikSizmasi opaklik={0.12} />
    </AbsoluteFill>
  );
};

/** Basit çizgi ikonlar (afişteki dört özellik). */
const Ikon: React.FC<{ tur: number }> = ({ tur }) => {
  const ortak = { fill: "none", stroke: ALTIN, strokeWidth: 5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={110} height={110} viewBox="0 0 100 100">
      {tur === 0 && (
        <g {...ortak}>
          <path d="M20 85 L20 55 Q50 20 80 55 L80 85 Z" />
          <path d="M50 22 L50 10 M44 14 Q50 4 56 14" />
          <path d="M42 85 L42 66 Q50 58 58 66 L58 85" />
        </g>
      )}
      {tur === 1 && (
        <g {...ortak}>
          <path d="M18 30 L50 18 L82 30 L50 42 Z" />
          <path d="M30 36 L30 52 Q50 64 70 52 L70 36" />
          <path d="M82 30 L82 50" />
          <path d="M20 88 Q20 66 50 66 Q80 66 80 88" />
        </g>
      )}
      {tur === 2 && (
        <g {...ortak}>
          <path d="M50 10 L84 22 L84 48 Q84 76 50 90 Q16 76 16 48 L16 22 Z" />
          <path d="M34 50 L46 62 L68 38" />
        </g>
      )}
      {tur === 3 && (
        <g {...ortak}>
          <path d="M50 84 L18 50 Q6 34 18 22 Q32 10 50 30 Q68 10 82 22 Q94 34 82 50 Z" />
        </g>
      )}
    </svg>
  );
};

// 4) Özellikler.
const Ozellik: React.FC = () => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <DesenliZemin opaklik={0.08} />
      <div style={{ position: "absolute", top: 300, width: "100%" }}>
        <HarfHarf metin="NEDEN HASBİHÂL?" bas={4} aralik={1.5} tur="yuksel" parlak parlamaBas={36} stil={{ fontFamily: SERIF, fontWeight: 900, fontSize: 88 }} />
      </div>
      <AltinCizgi bas={18} genislik={480} stil={{ position: "absolute", top: 420, left: 300 }} />
      {OZELLIKLER.map((o, i) => {
        const s = spring({ frame: kare - 20 - i * 18, fps, config: { damping: 15 } });
        return (
          <div
            key={o}
            style={{
              position: "absolute",
              left: 110,
              top: 520 + i * 270,
              width: 860,
              display: "flex",
              alignItems: "center",
              gap: 40,
              opacity: s,
              transform: `translateY(${(1 - s) * 80}px)`,
            }}
          >
            <div
              style={{
                width: 170,
                height: 170,
                borderRadius: 85,
                border: `3px solid ${ALTIN_KOYU}`,
                background: "rgba(232,196,104,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Ikon tur={i} />
            </div>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 54, color: "#fff", lineHeight: 1.2 }}>{o}</div>
          </div>
        );
      })}
      <AltinTozu adet={30} opaklik={0.6} />
    </AbsoluteFill>
  );
};

// 5) Kapanış: marka ve iletişim.
const Kapanis: React.FC = () => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame: kare, fps, config: { damping: 12 } });
  const sonKarartma = interpolate(kare, [160, 180], [0, 1], { extrapolateLeft: "clamp" });
  const nabiz = 1 + 0.025 * Math.sin(kare / 6);
  return (
    <AbsoluteFill>
      <DesenliZemin opaklik={0.1} />
      <IsikHuzmeleri opaklik={0.2} merkezY={22} />
      <div style={{ position: "absolute", top: 200, width: "100%", display: "flex", justifyContent: "center", opacity: logo, transform: `scale(${0.5 + 0.5 * logo})` }}>
        <Yildiz boyut={210} dondur={kare * 0.6} />
      </div>
      <div style={{ position: "absolute", top: 450, width: "100%" }}>
        <HarfHarf metin="Hasbihâl" bas={10} aralik={2} tur="buyut" parlak parlamaBas={45} stil={{ fontFamily: SERIF, fontWeight: 900, fontSize: 150, lineHeight: 1 }} />
      </div>
      <div style={{ position: "absolute", top: 620, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 40, letterSpacing: "0.3em", color: "#fff", opacity: gir(kare, 26) }}>
        TURİZM HAC & UMRE
      </div>
      <div style={{ position: "absolute", top: 690, width: "100%", textAlign: "center", fontFamily: SANS, fontStyle: "italic", fontWeight: 300, fontSize: 52, color: ALTIN, opacity: gir(kare, 36) }}>
        Huzura Yolculuk...
      </div>
      <AltinCizgi bas={40} genislik={600} stil={{ position: "absolute", top: 790, left: 240 }} />

      <div style={{ position: "absolute", top: 850, width: "100%", textAlign: "center", opacity: gir(kare, 50), transform: `translateY(${(1 - gir(kare, 50)) * 30}px)` }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 40, color: KREM }}>Türkiye'nin her yerinden</div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: "#fff", marginTop: 6 }}>KATILIM İMKÂNI</div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 1060,
          left: 110,
          width: 860,
          padding: "40px 0",
          borderRadius: 40,
          background: `linear-gradient(160deg, ${KREM}, #ecdcb4)`,
          border: `5px solid ${ALTIN}`,
          textAlign: "center",
          opacity: gir(kare, 64),
          transform: `scale(${(0.9 + 0.1 * gir(kare, 64)) * (kare > 90 ? nabiz : 1)})`,
          boxShadow: "0 24px 70px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 34, letterSpacing: "0.25em", color: ALTIN_KOYU }}>BİLGİ VE KAYIT</div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 76, color: YESIL, marginTop: 12 }}>0 322 450 40 50</div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 76, color: YESIL }}>0 505 136 40 50</div>
      </div>

      <div style={{ position: "absolute", top: 1440, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 58, ...AltinYazi, opacity: gir(kare, 84) }}>
        @hasbihalturizm
      </div>
      <div style={{ position: "absolute", top: 1530, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 600, fontSize: 38, color: KREM, opacity: gir(kare, 96) }}>
        Kutsal topraklara birlikte ulaşıyoruz
      </div>
      <AltinTozu adet={50} opaklik={0.85} />
      <AbsoluteFill style={{ background: "#000", opacity: sonKarartma }} />
    </AbsoluteFill>
  );
};

const FONTLAR = ["700 50px Cinzel", "900 50px Cinzel", "italic 300 50px Montserrat", "600 50px Montserrat", "800 50px Montserrat"];

export const Umre: React.FC = () => {
  const [tutamak] = useState(() => delayRender("fontlar"));
  useEffect(() => {
    Promise.all(FONTLAR.map((f) => document.fonts.load(f, "SÖMESTR İÂğüşıöç"))).then(() => continueRender(tutamak));
  }, [tutamak]);

  const sahne = (ad: keyof typeof SAHNELER, icerik: React.ReactNode, son = true) => {
    const [bas, bit] = SAHNELER[ad];
    // Bir sonraki sahne GECIS kadar erken başlar; bu sahne o sürede söner.
    const uzunluk = bit - bas + (son ? GECIS : 0);
    return (
      <Sequence from={bas} durationInFrames={uzunluk} name={ad}>
        <Gecis sure={uzunluk} sonGecis={son}>
          {icerik}
        </Gecis>
      </Sequence>
    );
  };

  return (
    <AbsoluteFill style={{ background: YESIL_KOYU }}>
      {sahne("kanca", <Kanca />)}
      {sahne("kabe", <Kabe />)}
      {sahne("fiyat", <Fiyat />)}
      {sahne("ozellik", <Ozellik />)}
      {sahne("kapanis", <Kapanis />, false)}
      <Vinyet guc={0.55} />
      <Gren opaklik={0.06} />
      <Audio src={staticFile("umre/muzik.wav")} />
    </AbsoluteFill>
  );
};
