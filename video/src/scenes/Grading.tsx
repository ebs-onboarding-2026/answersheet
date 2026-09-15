import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Paper } from "../components/Paper";
import { TimingRail } from "../components/TimingRail";
import { Sheet, Overlay } from "../components/Sheet";
import { RedRing } from "../components/RedRing";
import { Caption } from "../components/Caption";
import { fontFamily } from "../font";
import { C } from "../theme";

export const GRADING_D = 180;

export const Grading: React.FC<{ d?: number }> = ({ d = GRADING_D }) => {
  const frame = useCurrentFrame();

  const enter = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /* Holds on the score, then drops to the first question's marked answer. */
  const pan = interpolate(frame, [92, 148], [170, 770], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  });

  return (
    <Paper>
      <TimingRail />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 108, fontFamily, color: C.ink }}>
        <div style={{ opacity: enter }}>
          <Sheet
            src="screenshots/08-result.png"
            crop={{ x: 620, y: pan, w: 1400, h: 570 }}
            width={1500}
          >
            {/* "8문항 중 8문항 정답", circled the way a marker would. */}
            <Overlay x={860 - 131} y={450 - 46}>
              <RedRing rx={119} ry={34} from={34} length={26} />
            </Overlay>
          </Sheet>
        </div>
      </AbsoluteFill>
      <Caption
        duration={d}
        lines={["채점은 서버가 합니다.", "정답은 브라우저로 내려가지 않습니다."]}
      />
    </Paper>
  );
};
