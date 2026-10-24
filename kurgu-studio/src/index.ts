import React from "react";
import { Composition, registerRoot } from "remotion";
import { Mirac } from "./Mirac";
import { FPS, GENISLIK, TOPLAM, YUKSEKLIK } from "./zaman";

const Kok: React.FC = () =>
  React.createElement(Composition, {
    id: "MiracKandili",
    component: Mirac,
    durationInFrames: TOPLAM,
    fps: FPS,
    width: GENISLIK,
    height: YUKSEKLIK,
  });

registerRoot(Kok);
