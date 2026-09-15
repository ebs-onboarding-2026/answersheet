import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Paper } from "../components/Paper";
import { TimingRail } from "../components/TimingRail";
import { Mark } from "../components/Mark";
import { C } from "../theme";
import { fontFamily } from "../font";

export const TITLE_D = 75;

export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rail = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fill = spring({ frame: frame - 18, fps, config: { damping: 11, mass: 0.6 } });
  const rise = interpolate(frame, [8, 30], [26, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textIn = interpolate(frame, [8, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tagIn = interpolate(frame, [26, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Paper grid>
      <TimingRail progress={rail} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily,
          color: C.ink,
        }}
      >
        <div style={{ transform: `translateY(${rise}px)`, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 34 }}>
            <Mark size={128} fill={fill} />
          </div>
          <div
            style={{
              fontSize: 132,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              opacity: textIn,
            }}
          >
            답안지
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 44,
              fontWeight: 400,
              color: C.graphite,
              opacity: tagIn,
            }}
          >
            주제만 적으면, 문항이 나옵니다
          </div>
        </div>
      </AbsoluteFill>
    </Paper>
  );
};
