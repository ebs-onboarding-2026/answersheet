import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Paper } from "../components/Paper";
import { TimingRail } from "../components/TimingRail";
import { Mark } from "../components/Mark";
import { C } from "../theme";
import { fontFamily } from "../font";

export const OUTRO_D = 120;

export const Outro: React.FC<{ d?: number }> = ({ d = OUTRO_D }) => {
  const frame = useCurrentFrame();

  const inn = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stack = interpolate(frame, [18, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /* Fades back to the paper the first frame started on, so the loop has no seam. */
  const out = interpolate(frame, [d - 14, d], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Paper grid>
      <TimingRail />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily,
          color: C.ink,
          opacity: out,
        }}
      >
        <div style={{ textAlign: "center", opacity: inn }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <Mark size={104} />
          </div>
          <div style={{ fontSize: 108, fontWeight: 700, letterSpacing: "-0.03em" }}>답안지</div>
          <div
            style={{
              marginTop: 26,
              fontSize: 36,
              color: C.graphite,
              opacity: stack,
              letterSpacing: "0.01em",
            }}
          >
            Next.js 16 · Neon Postgres · OpenAI · Vercel
          </div>
        </div>
      </AbsoluteFill>
    </Paper>
  );
};
