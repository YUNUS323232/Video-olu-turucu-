import React from "react";
import { Composition, registerRoot } from "remotion";
import { Mirac } from "./Mirac";
import { Umre, UMRE_TOPLAM } from "./Umre";
import { Konusma, KONUSMA_TOPLAM } from "./Konusma";
import { FPS, GENISLIK, TOPLAM, YUKSEKLIK } from "./zaman";

const Kok: React.FC = () =>
  React.createElement(
    React.Fragment,
    null,
    React.createElement(Composition, {
      id: "MiracKandili",
      component: Mirac,
      durationInFrames: TOPLAM,
      fps: FPS,
      width: GENISLIK,
      height: YUKSEKLIK,
    }),
    React.createElement(Composition, {
      id: "UmreTanitim",
      component: Umre,
      durationInFrames: UMRE_TOPLAM,
      fps: FPS,
      width: GENISLIK,
      height: YUKSEKLIK,
    }),
    React.createElement(Composition, {
      id: "KonusmaKurgu",
      component: Konusma,
      durationInFrames: KONUSMA_TOPLAM,
      fps: FPS,
      width: GENISLIK,
      height: YUKSEKLIK,
    }),
  );

registerRoot(Kok);
