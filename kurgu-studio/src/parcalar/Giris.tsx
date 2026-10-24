import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AltinTozu, CamiSilueti, Gren, Hilal, IsikHuzmeleri, IsikSizmasi, Vinyet, Yildizlar } from "./Efektler";
import { AltinCizgi, HarfHarf, SANS, SERIF } from "./Yazi";
import { BINDIRME, GIRIS, veriler } from "../zaman";

export const GECE_ARKA = "linear-gradient(180deg, #03050f 0%, #0a1433 45%, #1d1747 80%, #2c1c4f 100%)";

const GirisIcerik: React.FC = () => {
  const kare = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hilal = spring({ frame: kare - 4, fps, config: { damping: 14, mass: 1.2 } });
  const cami = spring({ frame: kare - 12, fps, config: { damping: 18 } });
  const yildiz = interpolate(kare, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  // Başlık grubuna yavaş yaklaşma (push-in).
  const yaklas = interpolate(kare, [40, GIRIS], [1, 1.06], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ background: GECE_ARKA, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: yildiz }}>
        <Yildizlar adet={160} tohum="giris" ustSinir={0.75} />
      </AbsoluteFill>
      <IsikHuzmeleri opaklik={interpolate(kare, [20, 90], [0, 0.22], { extrapolateRight: "clamp" })} merkezY={16} />

      <div
        style={{
          position: "absolute",
          left: 540 - 130,
          top: 160,
          opacity: hilal,
          transform: `scale(${0.5 + 0.5 * hilal}) rotate(${-25 * (1 - hilal) + Math.sin(kare / 40) * 3}deg)`,
        }}
      >
        <Hilal boyut={260} parilti={1 + 0.3 * Math.sin(kare / 12)} />
      </div>

      <div style={{ position: "absolute", left: 0, bottom: 0, transform: `translateY(${(1 - cami) * 560}px)` }}>
        <CamiSilueti />
      </div>

      <AltinTozu adet={45} opaklik={interpolate(kare, [30, 70], [0, 0.9], { extrapolateRight: "clamp" })} />

      <AbsoluteFill style={{ transform: `scale(${yaklas})` }}>
        <div style={{ position: "absolute", top: 650, width: "100%", textAlign: "center" }}>
          <HarfHarf
            metin={veriler.ust_baslik.toLocaleUpperCase("tr-TR")}
            bas={24}
            aralik={1}
            tur="sonuk"
            stil={{ fontFamily: SANS, fontWeight: 600, fontSize: 40, letterSpacing: "0.22em", color: "#e7e2ff" }}
          />
          <AltinCizgi bas={44} genislik={520} stil={{ marginTop: 26 }} />
        </div>
        <div style={{ position: "absolute", top: 760, width: "100%" }}>
          <HarfHarf
            metin={veriler.baslik[0].toLocaleUpperCase("tr-TR")}
            bas={52}
            aralik={4}
            tur="buyut"
            parlak
            parlamaBas={128}
            stil={{
              fontFamily: SERIF,
              fontWeight: 900,
              fontSize: 205,
              lineHeight: 1.05,
              filter: "drop-shadow(0 8px 30px rgba(232,196,104,0.35))",
            }}
          />
        </div>
        <div style={{ position: "absolute", top: 985, width: "100%" }}>
          <HarfHarf
            metin={veriler.baslik[1].toLocaleUpperCase("tr-TR")}
            bas={74}
            aralik={3}
            tur="yuksel"
            parlak
            parlamaBas={138}
            stil={{
              fontFamily: SERIF,
              fontWeight: 900,
              fontSize: 150,
              lineHeight: 1.05,
              filter: "drop-shadow(0 8px 30px rgba(232,196,104,0.35))",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 1175,
            width: "100%",
            textAlign: "center",
            fontFamily: SANS,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 84,
            color: "#ffffff",
            opacity: interpolate(kare, [104, 124], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            letterSpacing: `${interpolate(kare, [104, 140], [0.6, 0.18], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            })}em`,
            textShadow: "0 0 30px rgba(255,255,255,0.35)",
          }}
        >
          {veriler.alt_baslik}
        </div>
      </AbsoluteFill>

      <IsikSizmasi opaklik={0.18} />
      <Vinyet guc={0.7} />
      <Gren opaklik={0.08} />
    </AbsoluteFill>
  );
};

/** Açılış: son BINDIRME karede ekran ortadan ikiye ayrılıp röportajı açar. */
export const Giris: React.FC = () => {
  const kare = useCurrentFrame();
  const cikis = interpolate(kare, [GIRIS - BINDIRME, GIRIS], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const sesler = (
    <>
      <Audio src={staticFile("sfx/ambiyans.wav")} volume={(f) => interpolate(f, [0, 20, GIRIS - 30, GIRIS], [0, 0.55, 0.55, 0])} />
      <Sequence from={4}>
        <Audio src={staticFile("sfx/parilti.wav")} volume={0.5} />
      </Sequence>
      <Sequence from={52}>
        <Audio src={staticFile("sfx/vurus.wav")} volume={0.9} />
      </Sequence>
      <Sequence from={128}>
        <Audio src={staticFile("sfx/parilti.wav")} volume={0.45} />
      </Sequence>
      <Sequence from={GIRIS - BINDIRME - 10}>
        <Audio src={staticFile("sfx/vuus.wav")} volume={0.6} />
      </Sequence>
    </>
  );
  if (cikis <= 0) {
    return (
      <>
        <GirisIcerik />
        {sesler}
      </>
    );
  }
  const kayma = cikis * 560;
  return (
    <>
      <AbsoluteFill style={{ clipPath: "inset(0 50% 0 0)", transform: `translateX(${-kayma}px)` }}>
        <GirisIcerik />
      </AbsoluteFill>
      <AbsoluteFill style={{ clipPath: "inset(0 0 0 50%)", transform: `translateX(${kayma}px)` }}>
        <GirisIcerik />
      </AbsoluteFill>
      {/* ayrılan kenarlarda altın ışık */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 540 - kayma - 3,
          width: 6 + kayma * 2,
          height: 1920,
          borderLeft: "3px solid #FFF3C4",
          borderRight: "3px solid #FFF3C4",
          boxShadow: "0 0 40px #E8C468, inset 0 0 40px rgba(232,196,104,0.4)",
          opacity: 1 - cikis * 0.6,
        }}
      />
      {sesler}
    </>
  );
};
