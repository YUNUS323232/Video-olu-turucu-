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
  random,
  staticFile,
  useCurrentFrame,
} from "remotion";
import "@fontsource/cinzel/700.css";
import "@fontsource/cinzel/900.css";
import "@fontsource/montserrat/300-italic.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/800.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/800.css";
import veri from "./data/konusma.json";
import { ALTIN, ALTIN_KOYU, ALTIN_PARLAK, Gren, IsikHuzmeleri, Vinyet } from "./parcalar/Efektler";
import { SANS, SERIF } from "./parcalar/Yazi";

// Konuşmalı dikey video: anlatıcının sesli talimatlarına göre kurgu.
// 0-5.5 sn tam ekran, 5.5-16.6 ekran ortadan bölünür (üstte sözler), 16.6'da tam ekrana döner,
// 18.5'te yuvarlak içine alınır ve alt kısımda teknik liste akar, 31.1'den sonra ışıltılı kapanış.
// Zamanlar kaynak videonun saniyeleridir; FPS 30 olduğundan kare = sn * 30.

const FPS = 30;
const KAYNAK_SURE = 38.0;
export const KONUSMA_TOPLAM = Math.round((KAYNAK_SURE + 1.5) * FPS);

const MONO = "'JetBrains Mono', monospace";
const CAMGOBEGI = "#4fe3ff";
const LACIVERT = "#06111f";

type Kelime = { w: string; b: number; s: number };
type Cumle = { bas: number; son: number; kelimeler: Kelime[] };
const CUMLELER = (veri as { cumleler: Cumle[] }).cumleler;
const ICERIK = CUMLELER[2]; // "Türkoğlu 1 No'lu Ceza İnfaz Kurumu'nda çalışıyorum."
const LISTE = [
  { ad: "YASTIK", kod: "YS-01", bas: 24.96 },
  { ad: "KUMAŞ", kod: "KM-02", bas: 25.76 },
  { ad: "PANTOLON", kod: "PN-03", bas: 26.62 },
  { ad: "CEKET", kod: "CK-04", bas: 27.48 },
  { ad: "MAVİ KOT PANTOLON", kod: "KT-05", bas: 29.26 },
];

const yumusak = Easing.bezier(0.65, 0, 0.35, 1);
const gecis = (sn: number, a: number, b: number) =>
  interpolate(sn, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: yumusak });
const belir = (sn: number, a: number, sure = 0.5) =>
  interpolate(sn, [a, a + sure], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

// Videonun kutusu ve içindeki görüntünün ölçeği/odak noktası.
// Odak noktası (fx, fy) kaynak görüntüde yüzün yeri; kutunun (cx, cy) noktasına oturur.
type Duzen = { x: number; y: number; g: number; h: number; r: number; s: number; fx: number; fy: number; cx: number; cy: number };
const TAM: Duzen = { x: 0, y: 0, g: 1080, h: 1920, r: 0, s: 1.08, fx: 540, fy: 576, cx: 540, cy: 576 }; // 1.08: sağ alttaki filigranı dışarıda bırakır
const BOLUK: Duzen = { x: 0, y: 960, g: 1080, h: 960, r: 0, s: 1.0, fx: 540, fy: 730, cx: 540, cy: 480 };
const YUVARLAK: Duzen = { x: 230, y: 250, g: 620, h: 620, r: 310, s: 0.7, fx: 540, fy: 760, cx: 310, cy: 310 };
const KAPANIS: Duzen = { x: 290, y: 330, g: 500, h: 500, r: 250, s: 0.56, fx: 540, fy: 760, cx: 250, cy: 250 };

const karistir = (a: Duzen, b: Duzen, p: number): Duzen =>
  Object.fromEntries(Object.keys(a).map((k) => [k, lerp(a[k as keyof Duzen], b[k as keyof Duzen], p)])) as Duzen;

const duzenHesapla = (sn: number) => {
  const bolme = gecis(sn, 5.5, 6.2) * (1 - gecis(sn, 16.6, 17.3));
  const yuvarlak = gecis(sn, 18.5, 19.3);
  const kapanis = gecis(sn, 31.1, 32.0);
  let d = karistir(TAM, BOLUK, bolme);
  d = karistir(d, YUVARLAK, yuvarlak);
  d = karistir(d, KAPANIS, kapanis);
  return { d, bolme, yuvarlak, kapanis };
};

/** Kaynak video, zamanla değişen bir kutunun içinde. */
const VideoKutusu: React.FC<{ d: Duzen; halka: number; kapanis: number }> = ({ d, halka, kapanis }) => {
  const kare = useCurrentFrame();
  const sn = kare / FPS;
  const video = (
    <OffthreadVideo
      src={staticFile("ek/ham.mp4")}
      muted
      style={{
        position: "absolute",
        width: 1080 * d.s,
        height: 1920 * d.s,
        left: d.cx - d.fx * d.s,
        top: d.cy - d.fy * d.s,
        maxWidth: "none",
      }}
    />
  );
  const halkaRenk = kapanis > 0.5 ? ALTIN : CAMGOBEGI;
  return (
    <div style={{ position: "absolute", left: d.x, top: d.y, width: d.g, height: d.h }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: d.r,
          overflow: "hidden",
          boxShadow: halka > 0 ? `0 0 ${60 * halka}px ${kapanis > 0.5 ? "rgba(232,196,104,0.55)" : "rgba(79,227,255,0.45)"}` : undefined,
        }}
      >
        {sn < KAYNAK_SURE ? video : <Freeze frame={Math.round(KAYNAK_SURE * FPS) - 2}>{video}</Freeze>}
      </div>
      {halka > 0 && (
        <svg
          width={d.g + 80}
          height={d.h + 80}
          viewBox="-50 -50 100 100"
          style={{ position: "absolute", left: -40, top: -40, opacity: halka, overflow: "visible" }}
        >
          <circle r={44.2} fill="none" stroke={halkaRenk} strokeWidth={0.7} />
          <circle
            r={47.5}
            fill="none"
            stroke={halkaRenk}
            strokeWidth={0.5}
            strokeDasharray="2 3"
            transform={`rotate(${kare * 0.8})`}
            opacity={0.8}
          />
          {/* Dönen yay */}
          <circle
            r={47.5}
            fill="none"
            stroke={halkaRenk}
            strokeWidth={1.6}
            strokeDasharray="18 280"
            strokeLinecap="round"
            transform={`rotate(${-kare * 2.2})`}
          />
          {/* Saat çizgileri */}
          {Array.from({ length: 24 }).map((_, i) => (
            <line
              key={i}
              x1={0}
              y1={-49.5}
              x2={0}
              y2={i % 6 === 0 ? -52.5 : -51}
              stroke={halkaRenk}
              strokeWidth={0.4}
              transform={`rotate(${i * 15})`}
              opacity={0.7}
            />
          ))}
        </svg>
      )}
    </div>
  );
};

/** Kelime kelime altyazı: en fazla 3 kelimelik parçalar, konuşulan kelime vurgulu. */
const Altyazi: React.FC<{ sn: number; ust: number; boyut?: number; gizliAraliklar: [number, number][] }> = ({
  sn,
  ust,
  boyut = 62,
  gizliAraliklar,
}) => {
  if (gizliAraliklar.some(([a, b]) => sn >= a && sn < b)) return null;
  const cumle = CUMLELER.find((c) => sn >= c.bas - 0.1 && sn < c.son + 0.35);
  if (!cumle) return null;
  const parcalar: Kelime[][] = [];
  for (let i = 0; i < cumle.kelimeler.length; i += 3) parcalar.push(cumle.kelimeler.slice(i, i + 3));
  const parca = [...parcalar].reverse().find((p) => sn >= p[0].b - 0.1) ?? parcalar[0];
  const giris = belir(sn, parca[0].b - 0.1, 0.18);
  return (
    <div
      style={{
        position: "absolute",
        top: ust,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: "0 30px",
        padding: "0 60px",
        boxSizing: "border-box",
        transform: `scale(${0.92 + 0.08 * giris})`,
        opacity: giris,
      }}
    >
      {parca.map((k, i) => {
        const aktif = sn >= k.b - 0.05 && sn < k.s + 0.1;
        return (
          <span
            key={i}
            style={{
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: boyut,
              color: aktif ? "#ffe36b" : "#ffffff",
              transform: `scale(${aktif ? 1.08 : 1})`,
              display: "inline-block",
              textShadow: "0 4px 0 rgba(0,0,0,0.55), 0 0 24px rgba(0,0,0,0.6)",
              WebkitTextStroke: "2px rgba(0,0,0,0.65)",
              paintOrder: "stroke fill",
            }}
          >
            {k.w}
          </span>
        );
      })}
    </div>
  );
};

/** Bölünmüş ekranda üst yarı: söylenen sözler büyük yazıyla. */
const UstPanel: React.FC<{ sn: number; p: number }> = ({ sn, p }) => {
  if (p <= 0) return null;
  const cumle = CUMLELER.find((c) => c !== ICERIK && sn >= c.bas - 0.1 && sn < c.son + 0.5 && c.bas > 4);
  const icerikGorunur = sn >= ICERIK.bas - 0.2 && sn < 15.1;
  // İçerik cümlesi: "Türkoğlu 1 No'lu" / "CEZA İNFAZ KURUMU'NDA" / "çalışıyorum"
  const satirlar = [
    { kelimeler: ICERIK.kelimeler.slice(0, 2), stil: { fontFamily: SERIF, fontWeight: 900, fontSize: 96, color: "#fff" } },
    { kelimeler: ICERIK.kelimeler.slice(2, 5), stil: { fontFamily: SERIF, fontWeight: 900, fontSize: 80 }, altin: true },
    { kelimeler: ICERIK.kelimeler.slice(5), stil: { fontFamily: SANS, fontStyle: "italic", fontWeight: 300, fontSize: 62, color: "#e8eefc" } },
  ];
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 960 * p + 2, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #0a1428 0%, #101d3a 70%, #15254a 100%)" }} />
      <IsikHuzmeleri opaklik={0.12} merkezY={20} />
      {/* Panelin altındaki ayırıcı çizgi */}
      <div style={{ position: "absolute", left: 0, bottom: 0, width: 1080 * p, height: 6, background: `linear-gradient(90deg, ${ALTIN_KOYU}, ${ALTIN_PARLAK}, ${ALTIN_KOYU})` }} />
      <div style={{ position: "absolute", top: 120, width: "100%", textAlign: "center", fontFamily: MONO, fontWeight: 500, fontSize: 30, letterSpacing: "0.3em", color: ALTIN, opacity: belir(sn, 6.2) }}>
        {icerikGorunur ? "TANIŞALIM" : "DİNLİYORUM..."}
      </div>
      {icerikGorunur ? (
        <div style={{ position: "absolute", top: 300, width: "100%" }}>
          {satirlar.map((satir, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "center", gap: 26, marginBottom: 18, padding: "0 50px", flexWrap: "wrap" }}>
              {satir.kelimeler.map((k, j) => {
                const t = belir(sn, k.b - 0.08, 0.35);
                return (
                  <span
                    key={j}
                    style={{
                      display: "inline-block",
                      opacity: t,
                      transform: `translateY(${(1 - t) * 40}px) scale(${0.85 + 0.15 * t})`,
                      filter: `blur(${(1 - t) * 8}px)`,
                      ...satir.stil,
                      ...(satir.altin
                        ? {
                            backgroundImage: `linear-gradient(180deg, ${ALTIN_PARLAK} 0%, ${ALTIN} 50%, ${ALTIN_KOYU} 100%)`,
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            color: "transparent",
                          }
                        : {}),
                    }}
                  >
                    {i === 1 ? k.w.toLocaleUpperCase("tr-TR") : k.w}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        cumle && (
          <div style={{ position: "absolute", top: 300, width: "100%", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px", padding: "0 80px", boxSizing: "border-box" }}>
            {cumle.kelimeler.map((k, j) => {
              const t = belir(sn, k.b - 0.08, 0.3);
              return (
                <span key={j} style={{ fontFamily: SANS, fontWeight: 800, fontSize: 70, color: sn < k.s + 0.1 && sn >= k.b ? "#ffe36b" : "#fff", opacity: 0.15 + 0.85 * t }}>
                  {k.w}
                </span>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

/** Yuvarlak düzende arka plan: mühendislik çizimi ızgarası ve tarama çizgisi. */
const TeknikZemin: React.FC<{ p: number; sn: number }> = ({ p, sn }) => {
  if (p <= 0) return null;
  const tarama = (sn * 260) % 2200 - 140;
  return (
    <AbsoluteFill style={{ opacity: p }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 55% at 50% 30%, #0d2340 0%, ${LACIVERT} 75%)` }} />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(rgba(79,227,255,0.07) 2px, transparent 2px), linear-gradient(90deg, rgba(79,227,255,0.07) 2px, transparent 2px), linear-gradient(rgba(79,227,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(79,227,255,0.035) 1px, transparent 1px)`,
          backgroundSize: "120px 120px, 120px 120px, 24px 24px, 24px 24px",
          backgroundPosition: `0 ${sn * 12}px`,
        }}
      />
      <div style={{ position: "absolute", left: 0, top: tarama, width: 1080, height: 140, background: "linear-gradient(180deg, transparent, rgba(79,227,255,0.08), transparent)" }} />
      {/* Köşe işaretleri */}
      {[
        [40, 40, 0],
        [1040, 40, 90],
        [1040, 1880, 180],
        [40, 1880, 270],
      ].map(([x, y, a]) => (
        <svg key={a} width={70} height={70} style={{ position: "absolute", left: x - 6, top: y - 6, transform: `rotate(${a}deg)`, transformOrigin: "6px 6px" }}>
          <path d="M6 60 L6 6 L60 6" fill="none" stroke={CAMGOBEGI} strokeWidth={3} opacity={0.6} />
        </svg>
      ))}
      <div style={{ position: "absolute", left: 70, top: 70, fontFamily: MONO, fontWeight: 500, fontSize: 24, color: CAMGOBEGI, opacity: 0.7, letterSpacing: "0.12em" }}>
        REC ● {`00:${String(Math.floor(sn)).padStart(2, "0")}:${String(Math.floor((sn % 1) * 30)).padStart(2, "0")}`}
      </div>
      <div style={{ position: "absolute", right: 70, top: 70, fontFamily: MONO, fontWeight: 500, fontSize: 24, color: CAMGOBEGI, opacity: 0.7, letterSpacing: "0.12em" }}>
        MOD: TEKNİK
      </div>
    </AbsoluteFill>
  );
};

/** Teknik liste: her kalem söylendiği anda kod, çizgi ve dolan çubukla gelir. */
const TeknikListe: React.FC<{ sn: number; gorunur: number }> = ({ sn, gorunur }) => {
  if (gorunur <= 0 || sn < 24.6) return null;
  const baslik = belir(sn, 24.6, 0.4);
  return (
    <div style={{ position: "absolute", left: 90, top: 990, width: 900, opacity: gorunur }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: baslik, borderBottom: `2px solid ${CAMGOBEGI}`, paddingBottom: 14, marginBottom: 26 }}>
        <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, color: "#fff", letterSpacing: "0.08em" }}>TEKNİK DÖKÜM</span>
        <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 26, color: CAMGOBEGI }}>
          {String(LISTE.filter((l) => sn >= l.bas).length).padStart(2, "0")}/{String(LISTE.length).padStart(2, "0")}
        </span>
      </div>
      {LISTE.map((l, i) => {
        const t = belir(sn, l.bas - 0.06, 0.35);
        const dolum = interpolate(sn, [l.bas, l.bas + 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const aktif = sn >= l.bas && (i === LISTE.length - 1 ? sn < l.bas + 1.6 : sn < LISTE[i + 1].bas);
        // Harfler yazılıyormuş gibi, sonra yerine oturur.
        const harf = Math.ceil(interpolate(sn, [l.bas - 0.05, l.bas + 0.35], [0, l.ad.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
        return (
          <div
            key={l.kod}
            style={{
              display: "flex",
              alignItems: "center",
              height: 112,
              marginBottom: 14,
              padding: "0 26px",
              borderRadius: 14,
              border: `2px solid ${aktif ? CAMGOBEGI : "rgba(79,227,255,0.25)"}`,
              background: aktif ? "rgba(79,227,255,0.14)" : "rgba(10,30,55,0.75)",
              boxShadow: aktif ? "0 0 30px rgba(79,227,255,0.35)" : undefined,
              opacity: t,
              transform: `translateX(${(1 - t) * 120}px)`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 26, color: CAMGOBEGI, width: 130 }}>{l.kod}</span>
            <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: l.ad.length > 10 ? 44 : 52, color: "#fff", flex: 1, letterSpacing: "0.04em" }}>
              {l.ad.slice(0, harf)}
              {harf < l.ad.length && <span style={{ color: CAMGOBEGI }}>▌</span>}
            </span>
            <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, color: dolum >= 1 ? "#7dffb2" : CAMGOBEGI, width: 120, textAlign: "right" }}>
              {dolum >= 1 ? "✓ OK" : `${Math.round(dolum * 100)}%`}
            </span>
            <div style={{ position: "absolute", left: 0, bottom: 0, height: 5, width: `${dolum * 100}%`, background: `linear-gradient(90deg, ${CAMGOBEGI}, #7dffb2)` }} />
          </div>
        );
      })}
    </div>
  );
};

/** Yukarıdan dökülen ışıltılar. */
const Isiltilar: React.FC<{ sn: number; p: number }> = ({ sn, p }) => {
  if (p <= 0) return null;
  const kare = sn * FPS;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: p }}>
      {Array.from({ length: 110 }).map((_, i) => {
        const hiz = 2.5 + random(`ih${i}`) * 5;
        const gecikme = random(`ig${i}`) * 60;
        const yol = (kare - 31.1 * FPS - gecikme) * hiz;
        if (yol < 0) return null;
        const y = -40 + (yol % 2050);
        const x = random(`ix${i}`) * 1080 + Math.sin((kare + i * 30) / 25) * 30;
        const boyut = 3 + random(`ib${i}`) * 9;
        const parilti = 0.4 + 0.6 * Math.abs(Math.sin(kare / (4 + random(`ip${i}`) * 6) + i));
        const yildiz = i % 4 === 0;
        return yildiz ? (
          <svg key={i} width={boyut * 4} height={boyut * 4} viewBox="-10 -10 20 20" style={{ position: "absolute", left: x, top: y, opacity: parilti, filter: `drop-shadow(0 0 6px ${ALTIN})` }}>
            <path d="M0 -10 L2 -2 L10 0 L2 2 L0 10 L-2 2 L-10 0 L-2 -2 Z" fill={ALTIN_PARLAK} transform={`rotate(${kare * 3 + i * 20})`} />
          </svg>
        ) : (
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
              boxShadow: `0 0 ${boyut * 3}px ${ALTIN}`,
              opacity: parilti * 0.85,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Kapanış: koyu sıcak zemin, yukarıdan ışık, isim ve kalem çipleri. */
const Kapanis: React.FC<{ sn: number; p: number }> = ({ sn, p }) => {
  if (p <= 0) return null;
  const isim = belir(sn, 32.0, 0.7);
  const kurum = belir(sn, 32.5, 0.7);
  return (
    <>
      <AbsoluteFill style={{ opacity: p, background: "radial-gradient(ellipse 90% 60% at 50% 0%, #3a2a10 0%, #140e06 55%, #080604 100%)" }} />
      <AbsoluteFill style={{ opacity: p * 0.9, background: "radial-gradient(ellipse 45% 35% at 50% -5%, rgba(255,230,160,0.55) 0%, rgba(255,200,100,0) 70%)", mixBlendMode: "screen" }} />
      <div style={{ opacity: p }}>
        <IsikHuzmeleri opaklik={0.28} merkezY={-5} />
      </div>
      <div style={{ position: "absolute", top: 1000, width: "100%", textAlign: "center", opacity: isim, transform: `translateY(${(1 - isim) * 40}px)` }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, letterSpacing: "0.3em", color: "#fff" }}>TÜRKOĞLU 1 NO'LU</div>
      </div>
      <div style={{ position: "absolute", top: 1065, width: "100%", textAlign: "center", opacity: kurum, transform: `translateY(${(1 - kurum) * 40}px)` }}>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 84, lineHeight: 1.1, backgroundImage: `linear-gradient(180deg, ${ALTIN_PARLAK}, ${ALTIN} 55%, ${ALTIN_KOYU})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          CEZA İNFAZ<br />KURUMU
        </div>
        <div style={{ margin: "26px auto 0", width: 520 * kurum, height: 3, background: `linear-gradient(90deg, transparent, ${ALTIN}, transparent)` }} />
      </div>
      <div style={{ position: "absolute", top: 1360, left: 70, width: 940, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20 }}>
        {LISTE.map((l, i) => {
          const t = belir(sn, 33.0 + i * 0.22, 0.45);
          return (
            <div
              key={l.kod}
              style={{
                fontFamily: SANS,
                fontWeight: 800,
                fontSize: 36,
                color: "#2a1a05",
                padding: "16px 34px",
                borderRadius: 60,
                background: `linear-gradient(180deg, ${ALTIN_PARLAK}, ${ALTIN})`,
                boxShadow: "0 10px 30px rgba(0,0,0,0.45), 0 0 24px rgba(232,196,104,0.4)",
                opacity: t,
                transform: `translateY(${(1 - t) * -60}px) scale(${0.8 + 0.2 * t})`,
              }}
            >
              {l.ad}
            </div>
          );
        })}
      </div>
    </>
  );
};

const FONTLAR = ["900 50px Cinzel", "italic 300 50px Montserrat", "800 50px Montserrat", "500 50px 'JetBrains Mono'", "800 50px 'JetBrains Mono'"];

export const Konusma: React.FC = () => {
  const [tutamak] = useState(() => delayRender("fontlar"));
  useEffect(() => {
    Promise.all(FONTLAR.map((f) => document.fonts.load(f, "TÜRKOĞLU İNFAZ ğüşıöç"))).then(() => continueRender(tutamak));
  }, [tutamak]);

  const kare = useCurrentFrame();
  const sn = kare / FPS;
  const { d, bolme, yuvarlak, kapanis } = duzenHesapla(sn);
  const sonKarartma = interpolate(sn, [KAYNAK_SURE + 0.8, KAYNAK_SURE + 1.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Altyazının yeri düzene göre: tam ekranda alt üçte bir, yuvarlakta dairenin altı.
  const altyaziUst = lerp(lerp(1430, 1000, yuvarlak), 880, kapanis);

  return (
    <AbsoluteFill style={{ background: LACIVERT }}>
      <TeknikZemin p={yuvarlak * (1 - kapanis)} sn={sn} />
      <Kapanis sn={sn} p={kapanis} />
      <VideoKutusu d={d} halka={yuvarlak} kapanis={kapanis} />
      <UstPanel sn={sn} p={bolme} />
      <TeknikListe sn={sn} gorunur={1 - kapanis} />
      <Isiltilar sn={sn} p={kapanis} />
      <Altyazi
        sn={sn}
        ust={altyaziUst}
        boyut={kapanis > 0.5 ? 50 : 62}
        gizliAraliklar={[
          [5.4, 17.2], // üst panel sözleri zaten gösteriyor
          [24.6, 31.0], // teknik liste
        ]}
      />
      <Vinyet guc={0.45} />
      <Gren opaklik={0.05} />
      <AbsoluteFill style={{ background: "#000", opacity: sonKarartma }} />
      <Audio src={staticFile("ek/ses.wav")} />
      <Audio src={staticFile("ek/fon.wav")} volume={0.16} />
    </AbsoluteFill>
  );
};
