import React from "react";
import { Composition } from "remotion";
import { IntroFull, FULL_DURATION } from "./IntroFull";
import { IntroLoop, LOOP_DURATION } from "./IntroLoop";
import { FPS, W, H } from "./theme";

export const Root: React.FC = () => (
  <>
    <Composition
      id="IntroFull"
      component={IntroFull}
      durationInFrames={FULL_DURATION}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="IntroLoop"
      component={IntroLoop}
      durationInFrames={LOOP_DURATION}
      fps={FPS}
      width={W}
      height={H}
    />
  </>
);
