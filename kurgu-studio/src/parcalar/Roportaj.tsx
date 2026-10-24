import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ALTIN, ALTIN_PARLAK, AltinTozu, Gren, Hilal, IsikSizmasi, Vinyet } from "./Efektler";
import { KelimeKelime, SANS } from "./Yazi";
import { Altyazi } from "./Altyazi";
import { BOLUMLER, Bolum, GECIS_SURE, KART_SURE, ROPORTAJ, SORULAR, Soru } from "../zaman";

// Video çerçevesinin konumu (dikey ekranın ortası, 16:9).
// Instagram'ın alt arayüzüne (yaklaşık son 320 piksel) yazı denk gelmesin diye kutu biraz yukarıda.
const KUTU = { sol: 30, genislik: 1020, yukseklik: 574, ust: 520 };
const GECISLER = ["ac", "kay", "zoom"] as const;

const gecisTuru = (b: Bolum) => (b.no === 1 ? null : GECISLER[(b.no - 2) % GECISLER.length]);

const SoruKarti: React.FC<{ soru: Soru }> = ({ soru }) => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  const giris = spring({ frame: kare, fps, config: { damping: 16, mass: 0.9 } });
  const cikis = interpolate(kare, [KART_SURE - 16, KART_SURE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const cubuk = interpolate(kare, [4, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const etiket = `SORU  ·  RÖPORTAJ ${soru.bolum} / ${BOLUMLER.length}`;
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        top: KUTU.ust + KUTU.yukseklik + 70,
        width: 960,
        transform: `translateX(${(1 - giris) * -1150 + cikis * 1150}px)`,
        opacity: 1 - cikis * 0.5,
      }}
    >
      <div
        style={{
          position: "relative",
          padding: "34px 40px 38px 58px",
          borderRadius: 22,
          background: "linear-gradient(120deg, rgba(10,16,42,0.92), rgba(32,22,72,0.86))",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55), inset 0 0 0 1.5px rgba(232,196,104,0.45)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 10,
            height: `${cubuk * 100}%`,
            background: `linear-gradient(180deg, ${ALTIN_PARLAK}, ${ALTIN})`,
            boxShadow: `0 0 20px ${ALTIN}`,
          }}
        />
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: "0.3em",
            color: ALTIN,
            marginBottom: 14,
            opacity: interpolate(kare, [6, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          {etiket}
        </div>
        <KelimeKelime
          metin={soru.metin}
          bas={10}
          aralik={2}
          stil={{ fontFamily: SANS, fontWeight: 800, fontSize: 50, lineHeight: 1.15, color: "#fff" }}
        />
      </div>
    </div>
  );
};

/** Hangi röportajın oynadığını gösteren noktalar. */
const IlerlemeNoktalari: React.FC<{ aktif: number }> = ({ aktif }) => (
  <div
    style={{
      position: "absolute",
      top: KUTU.ust + KUTU.yukseklik + 30,
      width: "100%",
      display: "flex",
      justifyContent: "center",
      gap: 14,
    }}
  >
    {BOLUMLER.map((b) => (
      <div
        key={b.no}
        style={{
          width: b.no === aktif ? 42 : 12,
          height: 12,
          borderRadius: 6,
          background: b.no <= aktif ? ALTIN : "rgba(255,255,255,0.3)",
          boxShadow: b.no === aktif ? `0 0 14px ${ALTIN}` : undefined,
        }}
      />
    ))}
  </div>
);

export const Roportaj: React.FC = () => {
  const kare = useCurrentFrame();
  const bolum = BOLUMLER.find((b) => kare >= b.bas && kare < b.son) ?? BOLUMLER[BOLUMLER.length - 1];
  const yerel = kare - bolum.bas;
  const uzunluk = bolum.son - bolum.bas;
  const tur = gecisTuru(bolum);
  const g = interpolate(yerel, [0, GECIS_SURE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Ken Burns: her röportajda yavaş yaklaşma, yönü sırayla değişir.
  const ilerleme = yerel / uzunluk;
  const yon = bolum.no % 2 === 0 ? 1 : -1;
  const kenBurns = `scale(${1.02 + 0.07 * ilerleme}) translateX(${yon * (ilerleme - 0.5) * 28}px)`;

  let kutuStil: React.CSSProperties = {};
  let acilma = 0;
  let flas = 0;
  if (tur === "ac") {
    acilma = 50 * (1 - g);
    kutuStil = { clipPath: `inset(0 ${acilma}% 0 ${acilma}% round 26px)` };
  } else if (tur === "kay") {
    kutuStil = {
      transform: `translateX(${(1 - g) * 1150}px) rotate(${(1 - g) * 4}deg)`,
      filter: g < 1 ? `blur(${(1 - g) * 12}px)` : undefined,
    };
  } else if (tur === "zoom") {
    kutuStil = {
      transform: `scale(${1.3 - 0.3 * g})`,
      filter: g < 1 ? `blur(${(1 - g) * 16}px)` : undefined,
    };
    flas = 0.6 * (1 - g);
  }

  const cerceveIsiltisi = 0.35 + 0.25 * Math.sin(kare / 20);

  return (
    <AbsoluteFill style={{ background: "#05070f" }}>
      <OffthreadVideo src={staticFile("arka.mp4")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(5,7,20,0.75) 0%, rgba(5,7,20,0.15) 30%, rgba(5,7,20,0.15) 70%, rgba(5,7,20,0.8) 100%)",
        }}
      />
      <AltinTozu adet={30} opaklik={0.55} />
      {/* üst boşlukta yazısız hilal amblemi */}
      <div
        style={{
          position: "absolute",
          left: 540 - 70,
          top: KUTU.ust - 330,
          opacity: interpolate(kare, [10, 40], [0, 0.9], { extrapolateRight: "clamp" }),
          transform: `rotate(${Math.sin(kare / 50) * 4}deg)`,
        }}
      >
        <Hilal boyut={140} parilti={0.8 + 0.4 * Math.sin(kare / 18)} />
      </div>

      <div
        style={{
          position: "absolute",
          left: KUTU.sol,
          top: KUTU.ust,
          width: KUTU.genislik,
          height: KUTU.yukseklik,
          borderRadius: 26,
          overflow: "hidden",
          boxShadow: `0 30px 90px rgba(0,0,0,0.7), 0 0 0 2px rgba(232,196,104,${cerceveIsiltisi})`,
          ...kutuStil,
        }}
      >
        <div style={{ width: "100%", height: "100%", transform: kenBurns }}>
          <OffthreadVideo
            src={staticFile("roportaj.mp4")}
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.05) saturate(1.08)" }}
            volume={(f) => interpolate(f, [0, 10, ROPORTAJ - 20, ROPORTAJ], [0, 1, 1, 0], { extrapolateRight: "clamp" })}
          />
        </div>
        {/* sinematik renk: gölgelerde mavi, ışıklarda sıcak ton */}
        <AbsoluteFill
          style={{
            background: "linear-gradient(160deg, rgba(255,170,90,0.10), rgba(40,80,160,0.12))",
            mixBlendMode: "soft-light",
          }}
        />
      </div>

      {/* "ekran açılıyor" geçişinde açılan kenarlarda altın çizgiler */}
      {tur === "ac" && acilma > 0.5 ? (
        <>
          {[KUTU.sol + (KUTU.genislik * acilma) / 100, KUTU.sol + KUTU.genislik * (1 - acilma / 100)].map((x, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x - 2,
                top: KUTU.ust - 40,
                width: 4,
                height: KUTU.yukseklik + 80,
                background: ALTIN_PARLAK,
                boxShadow: `0 0 30px ${ALTIN}, 0 0 60px ${ALTIN}`,
              }}
            />
          ))}
        </>
      ) : null}

      <IlerlemeNoktalari aktif={bolum.no} />
      {/* Soru kartı ekrandayken altyazı gizlenir (aynı cümle iki kez yazılmasın). */}
      {SORULAR.some((s) => kare >= s.bas && kare < s.bas + KART_SURE) ? null : (
        <Altyazi ust={KUTU.ust + KUTU.yukseklik + 120} />
      )}

      {SORULAR.map((s) => (
        <Sequence key={s.no} from={s.bas} durationInFrames={KART_SURE} layout="none">
          <SoruKarti soru={s} />
        </Sequence>
      ))}

      {BOLUMLER.filter((b) => b.no > 1).map((b) => (
        <Sequence key={`ses${b.no}`} from={b.bas - 6} durationInFrames={30} layout="none">
          <Audio src={staticFile("sfx/vuus.wav")} volume={0.35} />
        </Sequence>
      ))}

      {flas > 0.01 ? <AbsoluteFill style={{ background: "#fff8e6", opacity: flas }} /> : null}
      <IsikSizmasi opaklik={0.1} hiz={0.6} />
      <Vinyet guc={0.55} />
      <Gren opaklik={0.06} />
    </AbsoluteFill>
  );
};
