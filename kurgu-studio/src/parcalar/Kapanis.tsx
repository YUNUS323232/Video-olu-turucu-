import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ALTIN, AltinTozu, CamiSilueti, Gren, Hilal, IsikHuzmeleri, IsikSizmasi, Vinyet, Yildizlar } from "./Efektler";
import { AltinCizgi, HarfHarf, SANS, SERIF } from "./Yazi";
import { GECE_ARKA } from "./Giris";
import { BINDIRME, KAPANIS, veriler } from "../zaman";

export const Kapanis: React.FC = () => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Röportajın üzerine yakınlaşarak gelir.
  const giris = interpolate(kare, [0, BINDIRME], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const hilal = spring({ frame: kare - 8, fps, config: { damping: 14 } });
  const kararma = interpolate(kare, [KAPANIS - 25, KAPANIS], [0, 1], { extrapolateLeft: "clamp" });
  const yazi = (bas: number) =>
    interpolate(kare, [bas, bas + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        opacity: giris,
        transform: `scale(${1.18 - 0.18 * giris})`,
        filter: giris < 1 ? `blur(${(1 - giris) * 14}px)` : undefined,
      }}
    >
      <AbsoluteFill style={{ background: GECE_ARKA }} />
      <Yildizlar adet={150} tohum="kapanis" ustSinir={0.75} />
      <IsikHuzmeleri opaklik={0.2} merkezY={18} />
      <div
        style={{
          position: "absolute",
          left: 540 - 110,
          top: 210,
          opacity: hilal,
          transform: `scale(${0.6 + 0.4 * hilal}) rotate(${Math.sin(kare / 40) * 3}deg)`,
        }}
      >
        <Hilal boyut={220} />
      </div>
      <div style={{ position: "absolute", left: 0, bottom: 0 }}>
        <CamiSilueti />
      </div>
      <AltinTozu adet={50} opaklik={0.9} />

      <div style={{ position: "absolute", top: 600, width: "100%" }}>
        <HarfHarf
          metin={veriler.kapanis[0].toLocaleUpperCase("tr-TR")}
          bas={18}
          aralik={2}
          tur="yuksel"
          stil={{ fontFamily: SERIF, fontWeight: 700, fontSize: 92, color: "#ffffff", textShadow: "0 6px 30px rgba(0,0,0,0.5)" }}
        />
      </div>
      <div style={{ position: "absolute", top: 715, width: "100%" }}>
        <HarfHarf
          metin={veriler.kapanis[1].toLocaleUpperCase("tr-TR")}
          bas={36}
          aralik={2}
          tur="buyut"
          parlak
          parlamaBas={80}
          stil={{ fontFamily: SERIF, fontWeight: 900, fontSize: 104, filter: "drop-shadow(0 8px 30px rgba(232,196,104,0.4))" }}
        />
      </div>
      <AltinCizgi bas={66} genislik={600} stil={{ position: "absolute", top: 870, left: 240 }} />
      <div
        style={{
          position: "absolute",
          top: 910,
          width: "100%",
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: 44,
          letterSpacing: "0.06em",
          color: "#e7e2ff",
          opacity: yazi(82),
          transform: `translateY(${(1 - yazi(82)) * 30}px)`,
        }}
      >
        İzlediğiniz için teşekkürler
      </div>
      <div
        style={{
          position: "absolute",
          top: 1060,
          width: "100%",
          textAlign: "center",
          opacity: yazi(110),
          transform: `translateY(${(1 - yazi(110)) * 30}px)`,
        }}
      >
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 28, letterSpacing: "0.4em", color: ALTIN }}>
          HAZIRLAYAN
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 900,
            fontSize: 120,
            color: "#ffffff",
            textShadow: `0 0 30px ${ALTIN}`,
            marginTop: 4,
          }}
        >
          {veriler.hazirlayan}
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 34, letterSpacing: "0.25em", color: "#cfc8f0", marginTop: 6 }}>
          {veriler.konum.toLocaleUpperCase("tr-TR")}
        </div>
      </div>

      <IsikSizmasi opaklik={0.16} />
      <Vinyet guc={0.7} />
      <Gren opaklik={0.08} />
      <AbsoluteFill style={{ background: "#000", opacity: kararma }} />

      <Audio src={staticFile("sfx/vuus.wav")} volume={0.6} />
      <Sequence from={6}>
        <Audio
          src={staticFile("sfx/ambiyans.wav")}
          volume={(f) => interpolate(f, [0, 20, KAPANIS - 40, KAPANIS - 6], [0, 0.55, 0.55, 0], { extrapolateRight: "clamp" })}
        />
      </Sequence>
      <Sequence from={36}>
        <Audio src={staticFile("sfx/vurus.wav")} volume={0.7} />
      </Sequence>
      <Sequence from={80}>
        <Audio src={staticFile("sfx/parilti.wav")} volume={0.45} />
      </Sequence>
    </AbsoluteFill>
  );
};
