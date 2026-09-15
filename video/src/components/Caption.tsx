import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C } from "../theme";
import { fontFamily } from "../font";

/**
 * One sentence at a time on a strip of paper. Fades in over 8 frames and out over
 * the last 8 of whatever Sequence it sits in.
 */
export const Caption: React.FC<{
  lines: string[];
  /** Frames this caption is on screen. useVideoConfig would report the whole
   *  composition's length, not the Sequence's, so the scene passes its own. */
  duration: number;
  accent?: string;
}> = ({ lines, duration, accent }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, 8, duration - 8, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const lift = interpolate(frame, [0, 12], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        insetInline: 0,
        bottom: 68,
        display: "flex",
        justifyContent: "center",
        opacity,
        transform: `translateY(${lift}px)`,
      }}
    >
      <div
        style={{
          backgroundColor: C.sheet,
          border: `2px solid ${C.dropout}`,
          borderRadius: 3,
          padding: "22px 40px",
          maxWidth: 1340,
          textAlign: "center",
          fontFamily,
          color: C.ink,
          fontSize: 42,
          lineHeight: 1.42,
          fontWeight: 500,
          letterSpacing: "-0.011em",
        }}
      >
        {lines.map((line, i) => (
          <div key={i} style={i === 1 && accent ? { color: accent } : undefined}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};
