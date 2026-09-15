import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Title, TITLE_D } from "./scenes/Title";
import { Compose, COMPOSE_D } from "./scenes/Compose";
import { Parallel, PARALLEL_D } from "./scenes/Parallel";
import { Taking, TAKING_D } from "./scenes/Taking";
import { Grading, GRADING_D } from "./scenes/Grading";
import { Results, RESULTS_D } from "./scenes/Results";
import { Outro, OUTRO_D } from "./scenes/Outro";

/** 35s at 30fps. Scene lengths are summed rather than hand-written offsets. */
export const FULL_SCENES = [
  { d: TITLE_D, el: <Title /> },
  { d: COMPOSE_D, el: <Compose /> },
  { d: PARALLEL_D, el: <Parallel /> },
  { d: TAKING_D, el: <Taking /> },
  { d: GRADING_D, el: <Grading /> },
  { d: RESULTS_D, el: <Results /> },
  { d: OUTRO_D, el: <Outro /> },
];

export const FULL_DURATION = FULL_SCENES.reduce((n, s) => n + s.d, 0);

export const IntroFull: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill>
      {FULL_SCENES.map((scene, i) => {
        const from = at;
        at += scene.d;
        return (
          <Sequence key={i} from={from} durationInFrames={scene.d}>
            {scene.el}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
