import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Freeze,
  OffthreadVideo,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/800.css";
import { SANS } from "./parcalar/Yazi";

// Diyetisyen videosu: "Detoks suları kilo verdirir mi?" (Reels, 9:16).
// Kaynak videoda altyazı gömülü (y ≈ 1600-1730); grafikler o bandın dışına yerleşir.
// Zamanlar konuşmanın kelime zamanlarıdır (faster-whisper), diyet_ses.py ile aynı.

const FPS = 30;
const KAYNAK_SURE = 20.8; // son kare: bundan sonra görüntü dondurulur
export const DIYET_TOPLAM = Math.round(22.2 * FPS);

const NANE = "#1fb37a";
const LIMON = "#ffd43b";
const SU = "#3fa9f5";
const KIRMIZI = "#ef4444";
const KOYU = "#12312a";

const ZAMAN = {
  dogrudan: 1.76,
  ancak: 3.66,
  mesela: 8.14,
  su: 8.76,
  siskinlik: 10.44,
  ama: 11.82,
  aciklama: 14.12,
  merak: 17.18,
  saglikla: 19.54,
};

const k = (sn: number) => Math.round(sn * FPS);
const yay = (kare: number, bas: number, fps: number, sonum = 12) => spring({ frame: kare - bas, fps, config: { damping: sonum, mass: 0.7 } });
const sondur = (kare: number, a: number, b: number) => interpolate(kare, [a, b], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Videoya vurgu anlarında hafif yakınlaşma (punch-in). */
const yakinlik = (sn: number) => {
  const adim = (a: number, hedef: number) => interpolate(sn, [a, a + 0.25], [0, hedef], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return 1 + adim(ZAMAN.dogrudan, 0.06) - adim(ZAMAN.ancak, 0.06) + adim(ZAMAN.ama, 0.1) - adim(ZAMAN.aciklama, 0.1) + adim(ZAMAN.merak, 0.04);
};

/** Limonlu detoks suyu bardağı. */
const Bardak: React.FC<{ boyut: number }> = ({ boyut }) => {
  const kare = useCurrentFrame();
  const dalga = Math.sin(kare / 6) * 2;
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 100 100">
      <defs>
        <clipPath id="bardak">
          <path d="M22 18 L78 18 L70 92 L30 92 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#bardak)">
        <rect x={0} y={0} width={100} height={100} fill="#eaf7ff" />
        <path d={`M0 ${34 + dalga} Q25 ${30 - dalga} 50 ${34 + dalga} T100 ${34 + dalga} V100 H0 Z`} fill="#9be3c0" opacity={0.85} />
        <circle cx={42} cy={58} r={11} fill={LIMON} stroke="#f2b705" strokeWidth={2} />
        <path d="M42 47 V69 M31 58 H53 M34 50 L50 66 M50 50 L34 66" stroke="#f2b705" strokeWidth={1.2} />
        <ellipse cx={60} cy={74} rx={9} ry={5} fill="#57c785" />
        <ellipse cx={60} cy={74} rx={6} ry={3} fill="#b8f0cf" />
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={35 + i * 14} cy={88 - ((kare * 0.8 + i * 20) % 50)} r={1.6} fill="#fff" opacity={0.8} />
        ))}
      </g>
      <path d="M22 18 L78 18 L70 92 L30 92 Z" fill="none" stroke="#fff" strokeWidth={3} />
      <path d="M64 6 L58 40" stroke="#ff6b9a" strokeWidth={4} strokeLinecap="round" />
      <path d="M76 20 Q90 14 88 28" fill={LIMON} stroke="#f2b705" strokeWidth={2} />
    </svg>
  );
};

const Damla: React.FC<{ boyut: number }> = ({ boyut }) => (
  <svg width={boyut} height={boyut} viewBox="0 0 24 24">
    <path d="M12 2 Q20 12 19 15.5 A7 7 0 0 1 5 15.5 Q4 12 12 2 Z" fill={SU} />
    <path d="M8.5 15 A3.5 3.5 0 0 0 12 18.5" stroke="#fff" strokeWidth={1.6} fill="none" strokeLinecap="round" />
  </svg>
);

/** Şişkinlik: söndükçe küçülen balon. */
const Balon: React.FC<{ boyut: number; son: number }> = ({ boyut, son }) => (
  <svg width={boyut} height={boyut} viewBox="0 0 24 24">
    <ellipse cx={12} cy={10} rx={7 - 2 * son} ry={8 - 2.5 * son} fill={NANE} />
    <path d={`M12 ${18 - 2.5 * son} L10.5 ${20 - 2.5 * son} H13.5 Z`} fill={NANE} />
    <path d={`M12 ${20 - 2.5 * son} Q10 22 12 24`} stroke="#7a8a85" strokeWidth={1} fill="none" />
    <ellipse cx={9.5} cy={7} rx={1.5} ry={2.2} fill="#fff" opacity={0.6} />
  </svg>
);

const Alev: React.FC<{ boyut: number }> = ({ boyut }) => {
  const kare = useCurrentFrame();
  const t = Math.sin(kare / 3) * 0.6;
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 24 24">
      <path d={`M12 2 Q${18 + t} 9 17 15 A5 5 0 0 1 7 15 Q${6 - t} 10 10 7 Q10 11 12 11 Q11 6 12 2 Z`} fill="#ff8a1f" />
      <path d="M12 12 Q15 15 14 17 A2 2 0 0 1 10 17 Q9.5 15 12 12 Z" fill={LIMON} />
    </svg>
  );
};

/** Yuvarlak rozet: ✓ ya da ✗. */
const Isaret: React.FC<{ dogru: boolean; boyut?: number }> = ({ dogru, boyut = 56 }) => (
  <svg width={boyut} height={boyut} viewBox="0 0 24 24">
    <circle cx={12} cy={12} r={11} fill={dogru ? NANE : KIRMIZI} />
    {dogru ? (
      <path d="M6.5 12.5 L10.5 16.5 L17.5 8" stroke="#fff" strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5" stroke="#fff" strokeWidth={2.8} strokeLinecap="round" />
    )}
  </svg>
);

const cam: React.CSSProperties = {
  background: "rgba(255,255,255,0.88)",
  backdropFilter: "blur(14px)",
  borderRadius: 34,
  boxShadow: "0 20px 50px rgba(0,0,0,0.28)",
};

/** Kanca başlığı: büyük açılır, sonra küçülüp üstte kalır. */
const Baslik: React.FC<{ sn: number }> = ({ sn }) => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  const giris = yay(kare, 1, fps, 11);
  const kucul = interpolate(sn, [ZAMAN.ancak - 0.2, ZAMAN.ancak + 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const gizle = sondur(kare, k(ZAMAN.merak) - 6, k(ZAMAN.merak) + 6);
  const olcek = (0.5 + 0.5 * giris) * (1 - 0.42 * kucul);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: interpolate(kucul, [0, 1], [150, 60]),
        width: 1080,
        display: "flex",
        justifyContent: "center",
        opacity: giris * gizle,
        transform: `scale(${olcek})`,
        transformOrigin: "50% 0%",
      }}
    >
      <div style={{ ...cam, display: "flex", alignItems: "center", gap: 26, padding: "26px 44px 26px 30px", border: `5px solid ${NANE}` }}>
        <Bardak boyut={170} />
        <div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 84, color: KOYU, lineHeight: 1 }}>DETOKS SULARI</div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 62, color: NANE, lineHeight: 1.15, marginTop: 6 }}>
            KİLO VERDİRİR <span style={{ color: "#fff", background: NANE, borderRadius: 14, padding: "0 14px" }}>Mİ?</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Orta bölgede çıkan cevap rozeti. */
const Rozet: React.FC<{ bas: number; bit: number; dogru: boolean; metin: string; alt: string }> = ({ bas, bit, dogru, metin, alt }) => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (kare < k(bas) - 2 || kare > k(bit) + 8) return null;
  const g = yay(kare, k(bas), fps, 10);
  const c = sondur(kare, k(bit) - 4, k(bit) + 6);
  const sallan = dogru ? 0 : Math.sin((kare - k(bas)) / 2) * 6 * Math.max(0, 1 - (kare - k(bas)) / 15);
  return (
    <div style={{ position: "absolute", top: 1110, width: 1080, display: "flex", justifyContent: "center", opacity: g * c, transform: `scale(${0.6 + 0.4 * g}) translateX(${sallan}px) rotate(${dogru ? 0 : -2}deg)` }}>
      <div style={{ ...cam, display: "flex", alignItems: "center", gap: 24, padding: "24px 44px 24px 28px", border: `5px solid ${dogru ? NANE : KIRMIZI}` }}>
        <Isaret dogru={dogru} boyut={92} />
        <div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 64, color: dogru ? NANE : KIRMIZI, lineHeight: 1 }}>{metin}</div>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 36, color: KOYU, marginTop: 8 }}>{alt}</div>
        </div>
      </div>
    </div>
  );
};

/** "Mesela" ile başlayan madde listesi: biri biri ardına gelir, sonuncusu yanlış. */
const Liste: React.FC<{ sn: number }> = ({ sn }) => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (sn < ZAMAN.mesela - 0.2 || sn > ZAMAN.aciklama + 0.4) return null;
  const kutu = yay(kare, k(ZAMAN.mesela), fps, 14);
  const c = sondur(kare, k(ZAMAN.aciklama) - 2, k(ZAMAN.aciklama) + 10);
  const maddeler = [
    { bas: ZAMAN.su, ikon: <Damla boyut={74} />, metin: "Su tüketimini artırır", dogru: true },
    { bas: ZAMAN.siskinlik, ikon: <Balon boyut={74} son={interpolate(sn, [ZAMAN.siskinlik, ZAMAN.siskinlik + 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />, metin: "Şişkinliği azaltabilir", dogru: true },
    { bas: ZAMAN.ama, ikon: <Alev boyut={74} />, metin: "Doğrudan yağ yakmaz", dogru: false },
  ];
  return (
    <div style={{ position: "absolute", left: 90, top: 980, width: 900, opacity: kutu * c, transform: `translateY(${(1 - kutu) * 80}px)` }}>
      <div style={{ ...cam, padding: "26px 34px" }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 34, color: NANE, letterSpacing: "0.12em", marginBottom: 8 }}>DETOKS SUYU NE YAPAR?</div>
        {maddeler.map((m, i) => {
          const g = yay(kare, k(m.bas) - 3, fps, 12);
          const vurgu = !m.dogru && sn > m.bas ? 1 + 0.03 * Math.sin((kare - k(m.bas)) / 4) : 1;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "16px 0",
                borderTop: i ? "2px solid rgba(18,49,42,0.1)" : undefined,
                opacity: g,
                transform: `translateX(${(1 - g) * -60}px) scale(${vurgu})`,
                transformOrigin: "0% 50%",
              }}
            >
              <div style={{ width: 80, display: "flex", justifyContent: "center" }}>{m.ikon}</div>
              <div style={{ flex: 1, fontFamily: SANS, fontWeight: 800, fontSize: 50, color: m.dogru ? KOYU : KIRMIZI }}>{m.metin}</div>
              <div style={{ transform: `scale(${yay(kare, k(m.bas) + 4, fps, 8)})` }}>
                <Isaret dogru={m.dogru} boyut={66} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** "Açıklama kısmına yazdım": aşağıyı gösteren zıplayan ok. */
const Aciklama: React.FC<{ sn: number }> = ({ sn }) => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (sn < ZAMAN.aciklama - 0.1 || sn > ZAMAN.merak + 2.4) return null;
  const g = yay(kare, k(ZAMAN.aciklama), fps, 11);
  const c = sondur(kare, k(ZAMAN.merak + 2) - 4, k(ZAMAN.merak + 2) + 6);
  const zipla = Math.abs(Math.sin((kare - k(ZAMAN.aciklama)) / 6)) * 22;
  return (
    <div style={{ position: "absolute", top: 1160, width: 1080, display: "flex", flexDirection: "column", alignItems: "center", opacity: g * c, transform: `scale(${0.7 + 0.3 * g})` }}>
      <div style={{ ...cam, background: KOYU, display: "flex", alignItems: "center", gap: 20, padding: "22px 42px" }}>
        <svg width={64} height={64} viewBox="0 0 24 24">
          <rect x={4} y={3} width={16} height={18} rx={2.5} fill="none" stroke={LIMON} strokeWidth={2} />
          <path d="M8 8 H16 M8 12 H16 M8 16 H13" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: "#fff" }}>Detaylar açıklamada</span>
      </div>
      <svg width={90} height={110} viewBox="0 0 24 30" style={{ marginTop: 14 + zipla }}>
        <path d="M12 2 V24 M4 16 L12 26 L20 16" stroke={LIMON} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/** Kapanış: "Sağlıkla kalın" ve kaydet/paylaş çağrısı. */
const Kapanis: React.FC<{ sn: number }> = ({ sn }) => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (sn < ZAMAN.saglikla - 0.2) return null;
  const g = yay(kare, k(ZAMAN.saglikla), fps, 12);
  const cta = yay(kare, k(ZAMAN.saglikla) + 12, fps, 10);
  const nabiz = 1 + 0.035 * Math.max(0, Math.sin((kare - k(ZAMAN.saglikla)) / 5));
  return (
    <>
      <div style={{ position: "absolute", top: 120, width: 1080, display: "flex", justifyContent: "center", opacity: g, transform: `translateY(${(1 - g) * -60}px)` }}>
        <div style={{ ...cam, display: "flex", alignItems: "center", gap: 20, padding: "22px 44px", border: `5px solid ${NANE}` }}>
          <Bardak boyut={110} />
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 70, color: KOYU }}>Sağlıkla kalın!</span>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1180, width: 1080, display: "flex", justifyContent: "center", gap: 24, opacity: cta, transform: `scale(${(0.6 + 0.4 * cta) * nabiz})` }}>
        {[
          { metin: "Kaydet", ikon: <path d="M6 3 H18 V21 L12 16.5 L6 21 Z" fill="#fff" /> },
          { metin: "Paylaş", ikon: <path d="M3 11 L21 3 L14 21 L11 13 Z" fill="#fff" /> },
        ].map((b) => (
          <div key={b.metin} style={{ display: "flex", alignItems: "center", gap: 14, background: `linear-gradient(135deg, ${NANE}, #12936a)`, borderRadius: 60, padding: "20px 40px", boxShadow: "0 16px 40px rgba(18,147,106,0.45)" }}>
            <svg width={48} height={48} viewBox="0 0 24 24">{b.ikon}</svg>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: "#fff" }}>{b.metin}</span>
          </div>
        ))}
      </div>
    </>
  );
};

const FONTLAR = ["600 50px Montserrat", "800 50px Montserrat"];

export const Diyet: React.FC<{ kaynak?: string }> = ({ kaynak = "diyet/iyi.mp4" }) => {
  const [tutamak] = useState(() => delayRender("fontlar"));
  useEffect(() => {
    Promise.all(FONTLAR.map((f) => document.fonts.load(f, "DETOKS İĞŞÇÖÜ ığşçöü"))).then(() => continueRender(tutamak));
  }, [tutamak]);
  const kare = useCurrentFrame();
  const sn = kare / FPS;
  const olcek = yakinlik(sn);
  const video = <OffthreadVideo src={staticFile(kaynak)} muted={false} style={{ width: 1080, height: 1920 }} />;
  const son = sn >= KAYNAK_SURE - 0.05;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* Yüz merkezli yakınlaşma; altyazı bandı kadrajda kalır. */}
      <AbsoluteFill style={{ transform: `scale(${olcek})`, transformOrigin: "50% 32%" }}>
        {son ? <Freeze frame={k(KAYNAK_SURE) - 2}>{video}</Freeze> : video}
      </AbsoluteFill>
      {/* Üstte hafif koyulaştırma: başlık okunaklı olsun. */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 22%)" }} />
      <Baslik sn={sn} />
      <Rozet bas={ZAMAN.dogrudan} bit={ZAMAN.ancak - 0.1} dogru={false} metin="Doğrudan etkisi yok" alt="Tek başına kilo verdirmez" />
      <Rozet bas={ZAMAN.ancak} bit={ZAMAN.mesela - 0.3} dogru metin="Dolaylı faydaları var" alt="Destekleyici bir içecek" />
      <Liste sn={sn} />
      <Aciklama sn={sn} />
      <Kapanis sn={sn} />
      <Audio src={staticFile("diyet/fon.wav")} volume={0.13} />
      <Audio src={staticFile("diyet/efekt.wav")} volume={0.32} />
    </AbsoluteFill>
  );
};
