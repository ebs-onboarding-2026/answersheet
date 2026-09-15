import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Paper } from "../components/Paper";
import { TimingRail } from "../components/TimingRail";
import { Sheet, Overlay } from "../components/Sheet";
import { Bubble } from "../components/Bubble";
import { Cursor } from "../components/Cursor";
import { Caption } from "../components/Caption";
import { fontFamily } from "../font";
import { C } from "../theme";

export const TAKING_D = 180;

/* The (e) 18KB bubble on docs/screenshots/07-taking-quiz.png. */
const CHOICE = { x: 806, y: 1382, size: 46 };

export const Taking: React.FC<{ d?: number }> = ({ d = TAKING_D }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /* Reads the question, then looks down at the choices. */
  const pan = interpolate(frame, [24, 80], [400, 955], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  });

  const travel = interpolate(frame, [86, 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const cx = interpolate(travel, [0, 1], [1750, CHOICE.x + 8]);
  const cy = interpolate(travel, [0, 1], [1750, CHOICE.y - 6]);
  const press = interpolate(frame, [112, 118, 126], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fill = spring({ frame: frame - 116, fps, config: { damping: 10, mass: 0.5 } });
  const cursorOut = interpolate(frame, [138, 152], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Paper>
      <TimingRail />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 96, fontFamily, color: C.ink }}>
        <div style={{ opacity: enter }}>
          <Sheet
            src="screenshots/07-taking-quiz.png"
            crop={{ x: 660, y: pan, w: 1320, h: 570 }}
            width={1500}
          >
            <Overlay x={CHOICE.x - CHOICE.size / 2} y={CHOICE.y - CHOICE.size / 2}>
              <Bubble size={CHOICE.size} fill={Math.max(0, fill)} />
            </Overlay>
            <Overlay x={cx} y={cy}>
              <div style={{ opacity: cursorOut }}>
                <Cursor size={96} pressed={press} />
              </div>
            </Overlay>
          </Sheet>
        </div>
      </AbsoluteFill>
      <Caption duration={d} lines={["학생은 공유 코드로 들어와", "한 화면에 한 문항씩 풉니다."]} />
    </Paper>
  );
};
