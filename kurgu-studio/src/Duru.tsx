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
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/800.css";
import "@fontsource/montserrat/300-italic.css";
import "@fontsource/dancing-script/700.css";
import "@fontsource/jetbrains-mono/800.css";
import veri from "./data/duru.json";
import { Gren, Vinyet } from "./parcalar/Efektler";
import { SANS } from "./parcalar/Yazi";

// SMA Tip-1 hastası Duru için bağış çağrısı (Instagram Reels, 9:16).
// Sahne başları ve kelime zamanları seslendirmeden gelir (duru_ses.py -> data/duru.json).

const FPS = 30;
type Kelime = { w: string; b: number; s: number };
type Cumle = { sahne: string; metin: string; bas: number; son: number; kelimeler: Kelime[] };
const CUMLELER = (veri as unknown as { cumleler: Cumle[] }).cumleler;
const S = veri.sahneler as Record<"kanca" | "hastalik" | "hedef" | "ilerleme" | "kahve" | "slogan" | "cta", number>;
export const DURU_TOPLAM = Math.round(veri.toplam * FPS);

const PEMBE = "#e23d8c";
const PEMBE_ACIK = "#ffd6e8";
const TURUNCU = "#f58a1f";
const KAHVE = "#5a2410";
const KREM = "#fff7ee";
const YAZI = "Dancing Script, cursive";
const MONO = "'JetBrains Mono', monospace";
const GECIS = 12;

const SIRA = ["kanca", "hastalik", "hedef", "ilerleme", "kahve", "slogan", "cta"] as const;
const kare = (sn: number) => Math.round(sn * FPS);
const yumusak = Easing.bezier(0.16, 1, 0.3, 1);
const belir = (k: number, bas: number, sure = 14) =>
  interpolate(k, [bas, bas + sure], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: yumusak });
/** Sahne içindeki kare numarasına göre bir cümlenin başı (sahne başına göre). */
const cumleBasi = (sahne: string, sira = 0) => {
  const c = CUMLELER.filter((x) => x.sahne === sahne)[sira];
  return kare(c.bas - S[sahne as keyof typeof S]);
};

/** Sahne geçişi: içeri yakınlaşarak gelir, çıkarken bulanıklaşır. */
const Gecis: React.FC<{ uzunluk: number; son: boolean; children: React.ReactNode }> = ({ uzunluk, son, children }) => {
  const k = useCurrentFrame();
  const g = interpolate(k, [0, GECIS], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const c = son ? interpolate(k, [uzunluk - GECIS, uzunluk], [0, 1], { extrapolateLeft: "clamp" }) : 0;
  return (
    <AbsoluteFill style={{ opacity: Math.min(g, 1 - c), transform: `scale(${1.06 - 0.06 * g + 0.05 * c})`, filter: g < 1 || c > 0 ? `blur(${(1 - g) * 10 + c * 10}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

/** Bulanık zemin + net fotoğraf. */
const BulanikZemin: React.FC<{ foto: string; karanlik?: number }> = ({ foto, karanlik = 0.35 }) => (
  <AbsoluteFill>
    <Img src={staticFile(`duru/${foto}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `blur(40px) brightness(${1 - karanlik}) saturate(1.2)`, transform: "scale(1.3)" }} />
  </AbsoluteFill>
);

const Foto: React.FC<{ foto: string; g: number; h: number; yuvarlak?: boolean; zoom?: number; konum?: string; stil?: React.CSSProperties }> = ({
  foto,
  g,
  h,
  yuvarlak,
  zoom = 0.0009,
  konum = "50% 40%",
  stil,
}) => {
  const k = useCurrentFrame();
  return (
    <div style={{ width: g, height: h, borderRadius: yuvarlak ? "50%" : 44, overflow: "hidden", ...stil }}>
      <Img src={staticFile(`duru/${foto}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: konum, transform: `scale(${1.04 + k * zoom})` }} />
    </div>
  );
};

/** Yukarı süzülen kalpler. */
const Kalpler: React.FC<{ adet?: number; renk?: string; opaklik?: number }> = ({ adet = 18, renk = PEMBE, opaklik = 0.5 }) => {
  const k = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: opaklik }}>
      {Array.from({ length: adet }).map((_, i) => {
        const hiz = 1.2 + random(`kh${i}`) * 2.2;
        const y = 2000 - ((random(`ky${i}`) * 2100 + k * hiz) % 2150);
        const x = random(`kx${i}`) * 1000 + Math.sin((k + i * 50) / 30) * 30;
        const boyut = 30 + random(`kb${i}`) * 50;
        return (
          <svg key={i} width={boyut} height={boyut} viewBox="0 0 24 24" style={{ position: "absolute", left: x, top: y, transform: `rotate(${Math.sin((k + i * 20) / 25) * 15}deg)` }}>
            <path d="M12 21 L3.5 12.5 Q0 9 2.5 5.5 Q6 1.5 12 6.5 Q18 1.5 21.5 5.5 Q24 9 20.5 12.5 Z" fill={renk} />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

/** Kayısı ikonu (kampanyanın simgesi). */
const Kayisi: React.FC<{ boyut: number; dolu?: boolean; yuz?: boolean }> = ({ boyut, dolu = true, yuz }) => (
  <svg width={boyut} height={boyut} viewBox="0 0 40 40">
    <path d="M20 9 Q24 2 31 4 Q27 10 20 9" fill={dolu ? "#4caf50" : "#d7e9d4"} />
    <circle cx={20} cy={23} r={14} fill={dolu ? TURUNCU : "#fbe1c6"} />
    <path d="M20 10 Q15 22 20 37" stroke={dolu ? "#e07010" : "#f3d0ad"} strokeWidth={1.5} fill="none" />
    <ellipse cx={13} cy={18} rx={3.5} ry={2.2} fill="#ffffff" opacity={dolu ? 0.45 : 0.3} />
    {yuz && (
      <>
        <circle cx={15} cy={24} r={1.8} fill={KAHVE} />
        <circle cx={25} cy={24} r={1.8} fill={KAHVE} />
        <path d="M16 29 Q20 32 24 29" stroke={KAHVE} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      </>
    )}
  </svg>
);

/** Kelime kelime altyazı (en fazla 3 kelime), sahne içi kare ile değil global saniye ile. */
const Altyazi: React.FC<{ sn: number }> = ({ sn }) => {
  const c = CUMLELER.find((x) => x.sahne !== "cta" && sn >= x.bas - 0.1 && sn < x.son + 0.25);
  if (!c) return null;
  const parcalar: Kelime[][] = [];
  for (let i = 0; i < c.kelimeler.length; i += 3) parcalar.push(c.kelimeler.slice(i, i + 3));
  const parca = [...parcalar].reverse().find((p) => sn >= p[0].b - 0.08) ?? parcalar[0];
  const t = interpolate(sn, [parca[0].b - 0.08, parca[0].b + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 1420, width: "100%", display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0 26px", padding: "0 90px", boxSizing: "border-box", opacity: t, transform: `scale(${0.9 + 0.1 * t})` }}>
      {parca.map((k, i) => {
        const aktif = sn >= k.b - 0.04 && sn < k.s + 0.08;
        return (
          <span
            key={i}
            style={{
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 66,
              color: aktif ? "#fff200" : "#fff",
              display: "inline-block",
              transform: `scale(${aktif ? 1.1 : 1})`,
              WebkitTextStroke: "10px rgba(0,0,0,0.85)",
              paintOrder: "stroke fill",
              textShadow: "0 6px 18px rgba(0,0,0,0.5)",
            }}
          >
            {k.w}
          </span>
        );
      })}
    </div>
  );
};

// 1) Kanca: gülümseme, kalp atışı ve "zamanı daralıyor".
const Kanca: React.FC = () => {
  const k = useCurrentFrame();
  const atis = Math.max(0, Math.sin(((k % 25.5) / 25.5) * Math.PI * 2)) ** 6; // kalp atışı ritmi (0.85 sn)
  const ikinci = cumleBasi("kanca", 1);
  const kum = interpolate(k, [ikinci, ikinci + 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <BulanikZemin foto="pembe_kazak" karanlik={0.45} />
      <div style={{ position: "absolute", left: 90, top: 330, transform: `scale(${1 + atis * 0.015})`, boxShadow: "0 30px 90px rgba(0,0,0,0.5)", borderRadius: 44, border: "6px solid #fff" }}>
        <Foto foto="pembe_kazak" g={900} h={1000} zoom={0.0018} konum="50% 30%" />
      </div>
      <div style={{ position: "absolute", top: 110, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 60, color: "#fff", textShadow: "0 4px 20px rgba(0,0,0,0.6)", opacity: belir(k, 4, 10) }}>
        Bu gülümsemeye iyi bak
      </div>
      <div style={{ position: "absolute", top: 190, width: "100%", display: "flex", justifyContent: "center", opacity: belir(k, ikinci - 4, 10), transform: `scale(${0.6 + 0.4 * belir(k, ikinci - 4, 12)})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: "#d62d4f", borderRadius: 20, padding: "10px 30px", boxShadow: `0 0 ${30 + atis * 40}px rgba(214,45,79,0.8)` }}>
          {/* Kum saati */}
          <svg width={54} height={54} viewBox="0 0 24 24">
            <path d="M6 2 H18 V6 Q18 10 13 12 Q18 14 18 18 V22 H6 V18 Q6 14 11 12 Q6 10 6 6 Z" fill="none" stroke="#fff" strokeWidth={1.6} />
            <path d={`M7.5 ${4 + kum * 4} H16.5 Q16 9 12 11.3 Q8 9 7.5 ${4 + kum * 4} Z`} fill="#fff" />
            <path d={`M7.5 20.5 H16.5 V${20.5 - kum * 4} Q12 ${18 - kum * 3} 7.5 ${20.5 - kum * 4} Z`} fill="#fff" />
          </svg>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 50, color: "#fff", letterSpacing: "0.02em" }}>ZAMANI DARALIYOR</span>
        </div>
      </div>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 55% at 50% 45%, transparent 55%, rgba(120,0,20,${0.25 + atis * 0.25}) 100%)` }} />
    </AbsoluteFill>
  );
};

// 2) Hastalık: SMA Tip-1 ve azalan kas gücü.
const Hastalik: React.FC = () => {
  const k = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: k, fps, config: { damping: 14 } });
  const ikinci = cumleBasi("hastalik", 1);
  const guc = interpolate(k, [ikinci, ikinci + 80], [78, 31], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #fff0f6 0%, ${PEMBE_ACIK} 100%)` }}>
      <Kalpler adet={16} renk="#f7a8c8" opaklik={0.6} />
      <div style={{ position: "absolute", left: 210, top: 150, opacity: p, transform: `scale(${0.7 + 0.3 * p})` }}>
        <Foto foto="kalpli" g={660} h={660} yuvarlak konum="50% 45%" stil={{ border: `10px solid #fff`, boxShadow: `0 0 0 6px ${PEMBE}, 0 30px 70px rgba(226,61,140,0.35)` }} />
      </div>
      <div style={{ position: "absolute", top: 860, width: "100%", textAlign: "center", fontFamily: YAZI, fontWeight: 700, fontSize: 120, color: PEMBE, opacity: belir(k, 6), lineHeight: 1 }}>
        Duru Babacan
      </div>
      <div style={{ position: "absolute", top: 1000, width: "100%", display: "flex", justifyContent: "center", opacity: belir(k, 14) }}>
        <div style={{ background: KAHVE, color: "#fff", fontFamily: SANS, fontWeight: 800, fontSize: 44, padding: "12px 34px", borderRadius: 14 }}>SMA TİP-1 · ÖLÜMCÜL KAS HASTALIĞI</div>
      </div>
      <div style={{ position: "absolute", left: 140, top: 1130, width: 800, opacity: belir(k, ikinci - 6) }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: SANS, fontWeight: 800, fontSize: 36, color: KAHVE, marginBottom: 12 }}>
          <span>KAS GÜCÜ</span>
          <span style={{ color: guc < 45 ? "#d62d4f" : KAHVE }}>%{Math.round(guc)}</span>
        </div>
        <div style={{ height: 40, borderRadius: 20, background: "rgba(90,36,16,0.15)", overflow: "hidden" }}>
          <div style={{ width: `${guc}%`, height: "100%", borderRadius: 20, background: `linear-gradient(90deg, #d62d4f, ${guc < 45 ? "#ff6b6b" : PEMBE})` }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 3) Hedef: ilaç için gereken tutar sayarak gelir.
const Hedef: React.FC = () => {
  const k = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: k, fps, config: { damping: 13 } });
  const sayac = interpolate(k, [12, 85], [0, 1815000], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const bitti = k >= 85;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 70% at 50% 35%, #3b1408 0%, #1a0703 100%)" }}>
      <div style={{ position: "absolute", left: 330, top: 170, opacity: p, transform: `scale(${0.6 + 0.4 * p})` }}>
        <Foto foto="sari" g={420} h={420} yuvarlak konum="50% 35%" stil={{ border: `8px solid ${TURUNCU}`, boxShadow: "0 0 60px rgba(245,138,31,0.5)" }} />
      </div>
      <div style={{ position: "absolute", top: 680, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 46, letterSpacing: "0.12em", color: "#ffd9b0", opacity: belir(k, 6) }}>
        HAYATİ İLACI İÇİN GEREKEN
      </div>
      <div
        style={{
          position: "absolute",
          top: 770,
          width: "100%",
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 150,
          color: "#fff",
          letterSpacing: "-0.03em",
          textShadow: bitti ? `0 0 ${30 + 15 * Math.sin(k / 5)}px rgba(245,138,31,0.9)` : "none",
          transform: `scale(${bitti ? 1 + 0.02 * Math.sin(k / 5) : 1})`,
        }}
      >
        {Math.round(sayac).toLocaleString("tr-TR")} $
      </div>
      <div style={{ position: "absolute", top: 980, width: "100%", textAlign: "center", fontFamily: YAZI, fontWeight: 700, fontSize: 76, lineHeight: 1.15, color: TURUNCU, opacity: belir(k, 90) }}>
        tek başına imkânsız,
        <br />
        birlikte mümkün
      </div>
    </AbsoluteFill>
  );
};

// 4) İlerleme: 50 kayısıdan 5'i dolu (%10), zaman akıyor.
const Ilerleme: React.FC = () => {
  const k = useCurrentFrame();
  const ikinci = CUMLELER.find((c) => c.sahne === "ilerleme")!.kelimeler.find((w) => w.w === "Ama");
  const amaKare = ikinci ? kare(ikinci.b - S.ilerleme) : 60;
  const yuzde = interpolate(k, [8, 45], [0, 10], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${KREM} 0%, #ffe6cc 100%)` }}>
      <div style={{ position: "absolute", top: 150, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 44, color: KAHVE, letterSpacing: "0.1em", opacity: belir(k, 2) }}>
        KAMPANYA DURUMU
      </div>
      <div style={{ position: "absolute", top: 210, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 260, color: TURUNCU, lineHeight: 1 }}>
        %{Math.round(yuzde)}
      </div>
      <div style={{ position: "absolute", left: 90, top: 520, width: 900, display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 10 }}>
        {Array.from({ length: 50 }).map((_, i) => {
          const dolu = i < Math.round(yuzde / 2);
          const t = belir(k, 4 + i * 0.6, 10);
          return (
            <div key={i} style={{ opacity: t, transform: `scale(${(0.5 + 0.5 * t) * (dolu && i === Math.round(yuzde / 2) - 1 ? 1.12 : 1)})`, display: "flex", justifyContent: "center" }}>
              <Kayisi boyut={78} dolu={dolu} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1010, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 600, fontSize: 40, color: KAHVE, opacity: belir(k, 30) }}>
        Hedef: <b>1.815.000 $</b>
      </div>
      {/* Zaman akıyor: hızla dönen saat */}
      <div style={{ position: "absolute", top: 1110, width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 26, opacity: belir(k, amaKare - 4) }}>
        <svg width={110} height={110} viewBox="-50 -50 100 100">
          <circle r={44} fill="#fff" stroke="#d62d4f" strokeWidth={6} />
          <line x1={0} y1={0} x2={0} y2={-30} stroke={KAHVE} strokeWidth={6} strokeLinecap="round" transform={`rotate(${Math.max(0, k - amaKare) * 2})`} />
          <line x1={0} y1={0} x2={0} y2={-38} stroke="#d62d4f" strokeWidth={3} strokeLinecap="round" transform={`rotate(${Math.max(0, k - amaKare) * 24})`} />
          <circle r={5} fill={KAHVE} />
        </svg>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: "#d62d4f" }}>Zaman hızla akıyor</span>
      </div>
    </AbsoluteFill>
  );
};

// 5) Kahve: bir kahve = bir nefes.
const Kahve: React.FC = () => {
  const k = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: k - 4, fps, config: { damping: 14 } });
  const kart = spring({ frame: k - 22, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill>
      <BulanikZemin foto="kahve" karanlik={0.2} />
      <div style={{ position: "absolute", left: 140, top: 120, opacity: p, transform: `translateY(${(1 - p) * 80}px) rotate(${-3 * p}deg)`, background: "#fff", padding: "22px 22px 90px", borderRadius: 10, boxShadow: "0 30px 70px rgba(0,0,0,0.35)" }}>
        <Foto foto="kahve" g={760} h={780} konum="50% 25%" stil={{ borderRadius: 4 }} />
        <div style={{ position: "absolute", bottom: 18, width: 760, textAlign: "center", fontFamily: YAZI, fontWeight: 700, fontSize: 62, color: PEMBE }}>Bugün kahveler Duru için</div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 1050,
          width: 840,
          height: 300,
          background: "#fff",
          borderRadius: 40,
          border: `6px solid ${PEMBE}`,
          display: "flex",
          alignItems: "center",
          gap: 30,
          padding: "0 46px",
          boxSizing: "border-box",
          opacity: kart,
          transform: `scale(${0.7 + 0.3 * kart})`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        }}
      >
        <svg width={190} height={190} viewBox="0 0 100 100">
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${36 + i * 12} ${30 - ((k * 0.6 + i * 6) % 14)} q-5 -7 0 -14 q5 -7 0 -14`} stroke="#c8a690" strokeWidth={3} fill="none" opacity={0.7} />
          ))}
          <path d="M18 40 H78 V62 Q78 86 48 86 Q18 86 18 62 Z" fill="#7fb3c8" />
          <path d="M78 46 Q94 46 92 60 Q90 72 76 70" stroke="#7fb3c8" strokeWidth={6} fill="none" />
          <ellipse cx={48} cy={42} rx={28} ry={6} fill="#8b4a23" />
          <path d="M48 47 Q40 40 44 37 Q48 35 48 39 Q48 35 52 37 Q56 40 48 47" fill="#f3d7b6" />
        </svg>
        <div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: KAHVE }}>1 sembolik kahve</div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 130, color: PEMBE, lineHeight: 1 }}>200 ₺</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 6) Slogan: kayısılar yeşerecek.
const Slogan: React.FC = () => {
  const k = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: k, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #bfe6ff 0%, #e8f7d8 55%, #9ed27a 100%)" }}>
      {/* Dallardan büyüyen kayısılar */}
      {Array.from({ length: 22 }).map((_, i) => {
        const x = random(`sx${i}`) * 1000;
        // Yazı bandını (880-1380) boş bırak.
        const y = i % 2 ? 40 + random(`sy${i}`) * 780 : 1400 + random(`sy${i}`) * 420;
        const b = spring({ frame: k - 3 - i * 2.2, fps, config: { damping: 9 } });
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, transform: `scale(${b}) rotate(${Math.sin((k + i * 10) / 20) * 10}deg)`, opacity: 0.85 }}>
            <Kayisi boyut={60 + random(`sb${i}`) * 50} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 240, top: 260, opacity: p, transform: `scale(${0.6 + 0.4 * p})` }}>
        <Foto foto="pembe_kazak" g={600} h={600} yuvarlak konum="50% 30%" stil={{ border: "12px solid #fff", boxShadow: `0 0 0 6px ${TURUNCU}, 0 30px 70px rgba(0,0,0,0.25)` }} />
      </div>
      <div style={{ position: "absolute", top: 930, width: "100%", textAlign: "center", fontFamily: YAZI, fontWeight: 700, fontSize: 112, color: "#2f7d1f", lineHeight: 1.05, textShadow: "0 4px 0 #fff, 0 0 30px #fff", opacity: belir(k, 8) }}>
        Kayısılar yeşerecek,
      </div>
      <div style={{ position: "absolute", top: 1065, width: "100%", textAlign: "center", fontFamily: YAZI, fontWeight: 700, fontSize: 104, color: TURUNCU, lineHeight: 1.05, textShadow: "0 4px 0 #fff, 0 0 30px #fff", opacity: belir(k, 32) }}>
        Duru ilacına yetişecek!
      </div>
      <div style={{ position: "absolute", left: 470, top: 1210, transform: `scale(${spring({ frame: k - 40, fps, config: { damping: 8 } })})` }}>
        <Kayisi boyut={140} yuz />
      </div>
    </AbsoluteFill>
  );
};

const IBANLAR = [
  { simge: "₺", iban: "TR65 0001 0001 8386 9299 0050 04" },
  { simge: "€", iban: "TR11 0001 0001 8386 9299 0050 06" },
  { simge: "$", iban: "TR38 0001 0001 8386 9299 0050 05" },
];

// 7) Bağış bilgileri ve paylaş çağrısı.
const Cta: React.FC = () => {
  const k = useCurrentFrame();
  const { fps } = useVideoConfig();
  const kart = spring({ frame: k, fps, config: { damping: 15 } });
  const nabiz = 1 + 0.04 * Math.max(0, Math.sin(k / 6));
  const satir = (i: number) => belir(k, 8 + i * 5, 12);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${PEMBE_ACIK} 0%, #fff0f6 100%)` }}>
      <Kalpler adet={12} renk="#f7a8c8" opaklik={0.45} />
      <div style={{ position: "absolute", left: 60, top: 90, width: 960, display: "flex", alignItems: "center", gap: 28, opacity: kart }}>
        <Foto foto="kalpli" g={190} h={190} yuvarlak konum="50% 40%" stil={{ border: `6px solid ${PEMBE}`, flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: YAZI, fontWeight: 700, fontSize: 92, color: PEMBE, lineHeight: 1 }}>Duru'nun sesi ol</div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 30, color: KAHVE, marginTop: 8 }}>SMA TİP-1 ÖLÜMCÜL KAS HASTASI</div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 50,
          top: 330,
          width: 980,
          background: "#fff",
          borderRadius: 40,
          border: `5px solid ${PEMBE}`,
          padding: "36px 40px",
          boxSizing: "border-box",
          boxShadow: "0 30px 80px rgba(226,61,140,0.25)",
          opacity: kart,
          transform: `translateY(${(1 - kart) * 120}px)`,
        }}
      >
        <div style={{ textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 40, color: PEMBE, letterSpacing: "0.04em" }}>VALİLİK İZİNLİ BAĞIŞ HESAPLARI</div>
        <div style={{ textAlign: "center", fontFamily: SANS, fontWeight: 600, fontSize: 32, color: KAHVE, marginTop: 6 }}>Ziraat Bankası · Alıcı: <b>Cansu Babacan</b></div>
        <div style={{ marginTop: 26 }}>
          {IBANLAR.map((x, i) => (
            <div key={x.iban} style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 0", borderTop: i ? "2px dashed #f3c2d8" : undefined, opacity: satir(i), transform: `translateX(${(1 - satir(i)) * 60}px)` }}>
              <span style={{ width: 64, height: 64, borderRadius: 32, background: PEMBE, color: "#fff", fontFamily: SANS, fontWeight: 800, fontSize: 38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{x.simge}</span>
              <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 42, color: "#2b1a12", letterSpacing: "-0.01em" }}>{x.iban}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 14, fontFamily: SANS, fontWeight: 800, fontSize: 36, color: "#fff", background: KAHVE, borderRadius: 14, padding: "10px 0", opacity: satir(3) }}>AÇIKLAMA: DURU</div>
        <div style={{ marginTop: 26, paddingTop: 22, borderTop: `3px solid ${PEMBE_ACIK}`, opacity: satir(4) }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 30, color: PEMBE }}>YURT DIŞI (EUR)</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, color: "#2b1a12", marginTop: 4 }}>NL10 BUNQ 2168 6933 90</div>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: KAHVE, marginTop: 4 }}>Alıcı: SMA Children · BIC: BUNQNL2A · Açıklama: Duru Babacan</div>
        </div>
        <div style={{ marginTop: 22, textAlign: "center", fontFamily: SANS, fontWeight: 600, fontSize: 28, color: "#7a5a4a", opacity: satir(5) }}>
          Faaliyet No: <b>44.2026.5148</b> · Harun Babacan
        </div>
      </div>
      <div style={{ position: "absolute", top: 1250, width: "100%", display: "flex", justifyContent: "center", opacity: belir(k, 40) }}>
        <div style={{ background: `linear-gradient(90deg, ${PEMBE}, ${TURUNCU})`, color: "#fff", fontFamily: SANS, fontWeight: 800, fontSize: 50, padding: "22px 54px", borderRadius: 60, transform: `scale(${nabiz})`, boxShadow: "0 16px 40px rgba(226,61,140,0.45)" }}>
          BAĞIŞ YAP · PAYLAŞ
        </div>
      </div>
      <div style={{ position: "absolute", top: 1390, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 44, color: PEMBE, opacity: belir(k, 50) }}>
        @sma.durubabacan
      </div>
    </AbsoluteFill>
  );
};

const SAHNE_BILESEN: Record<(typeof SIRA)[number], React.FC> = {
  kanca: Kanca,
  hastalik: Hastalik,
  hedef: Hedef,
  ilerleme: Ilerleme,
  kahve: Kahve,
  slogan: Slogan,
  cta: Cta,
};

const FONTLAR = ["600 50px Montserrat", "800 50px Montserrat", "700 50px 'Dancing Script'", "800 50px 'JetBrains Mono'"];

export const Duru: React.FC = () => {
  const [tutamak] = useState(() => delayRender("fontlar"));
  useEffect(() => {
    Promise.all(FONTLAR.map((f) => document.fonts.load(f, "DURU İĞŞÇÖÜ ığşçöü ₺€$"))).then(() => continueRender(tutamak));
  }, [tutamak]);
  const k = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SIRA.map((ad, i) => {
        const bas = kare(S[ad]);
        const son = i + 1 < SIRA.length ? kare(S[SIRA[i + 1]]) : DURU_TOPLAM;
        const sonGecis = i + 1 < SIRA.length;
        const uzunluk = son - bas + (sonGecis ? GECIS : 0);
        const Bilesen = SAHNE_BILESEN[ad];
        return (
          <Sequence key={ad} from={bas} durationInFrames={uzunluk} name={ad}>
            <Gecis uzunluk={uzunluk} son={sonGecis}>
              <Bilesen />
            </Gecis>
          </Sequence>
        );
      })}
      <Altyazi sn={k / FPS} />
      <Vinyet guc={0.3} />
      <Gren opaklik={0.04} />
      <Audio src={staticFile("duru/ses.wav")} />
      <Audio src={staticFile("duru/fon.wav")} volume={0.22} />
    </AbsoluteFill>
  );
};
