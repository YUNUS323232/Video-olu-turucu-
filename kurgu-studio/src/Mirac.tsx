import React, { useEffect, useState } from "react";
import { AbsoluteFill, Sequence, continueRender, delayRender } from "remotion";
import "@fontsource/cinzel/700.css";
import "@fontsource/cinzel/900.css";
import "@fontsource/montserrat/300-italic.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/800.css";
import { Giris } from "./parcalar/Giris";
import { Roportaj } from "./parcalar/Roportaj";
import { Kapanis } from "./parcalar/Kapanis";
import { GIRIS, KAPANIS, KAPANIS_BAS, ROPORTAJ, ROPORTAJ_BAS } from "./zaman";

const FONTLAR = ["700 50px Cinzel", "900 50px Cinzel", "italic 300 50px Montserrat", "600 50px Montserrat", "800 50px Montserrat"];

export const Mirac: React.FC = () => {
  // Fontlar yüklenmeden kare çekilmesin.
  const [tutamak] = useState(() => delayRender("fontlar"));
  useEffect(() => {
    Promise.all(FONTLAR.map((f) => document.fonts.load(f, "MİRAÇ ğüşıöç"))).then(() => continueRender(tutamak));
  }, [tutamak]);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Sequence from={ROPORTAJ_BAS} durationInFrames={ROPORTAJ} name="Röportaj">
        <Roportaj />
      </Sequence>
      <Sequence from={0} durationInFrames={GIRIS} name="Açılış">
        <Giris />
      </Sequence>
      <Sequence from={KAPANIS_BAS} durationInFrames={KAPANIS} name="Kapanış">
        <Kapanis />
      </Sequence>
    </AbsoluteFill>
  );
};
