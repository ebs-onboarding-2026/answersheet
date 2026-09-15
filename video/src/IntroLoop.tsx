import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Compose } from "./scenes/Compose";
import { Parallel } from "./scenes/Parallel";
import { Taking } from "./scenes/Taking";
import { Grading } from "./scenes/Grading";
import { Outro } from "./scenes/Outro";

/**
 * The 18s cut that becomes the README's GIF. Same scene components, shorter
 * holds — a 35s GIF at a readable width is too heavy to put at the top of a
 * README.
 */
const LOOP_SCENES = [
  { d: 140, el: (d: number) => <Compose d={d} /> },
  { d: 125, el: (d: number) => <Parallel d={d} /> },
  { d: 150, el: (d: number) => <Taking d={d} /> },
  { d: 80, el: (d: number) => <Grading d={d} /> },
  { d: 45, el: (d: number) => <Outro d={d} /> },
];

export const LOOP_DURATION = LOOP_SCENES.reduce((n, s) => n + s.d, 0);

export const IntroLoop: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill>
      {LOOP_SCENES.map((scene, i) => {
        const from = at;
        at += scene.d;
        return (
          <Sequence key={i} from={from} durationInFrames={scene.d}>
            {scene.el(scene.d)}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
