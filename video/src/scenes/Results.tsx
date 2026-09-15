import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Paper } from "../components/Paper";
import { TimingRail } from "../components/TimingRail";
import { Sheet, Overlay } from "../components/Sheet";
import { RedRing } from "../components/RedRing";
import { Caption } from "../components/Caption";
import { fontFamily } from "../font";
import { C } from "../theme";

export const RESULTS_D = 180;

export const Results: React.FC<{ d?: number }> = ({ d = RESULTS_D }) => {
  const frame = useCurrentFrame();

  const enter = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /* One unbroken scroll: the class totals, the roster, then per-question accuracy. */
  const scroll = interpolate(frame, [18, 160], [1240, 2280], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  });

  return (
    <Paper>
      <TimingRail />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 96, fontFamily, color: C.ink }}>
        <div style={{ opacity: enter }}>
          <Sheet
            src="screenshots/04-teacher-results.png"
            crop={{ x: 440, y: scroll, w: 1760, h: 700 }}
            width={1560}
          >
            {/* The question the class lost — 25%. */}
            <Overlay x={2107 - 70} y={2672 - 42}>
              <RedRing rx={58} ry={30} from={150} length={22} tilt={2.2} />
            </Overlay>
          </Sheet>
        </div>
      </AbsoluteFill>
      <Caption duration={d} lines={["누가 몇 점인지,", "어느 문항이 무너졌는지."]} />
    </Paper>
  );
};
