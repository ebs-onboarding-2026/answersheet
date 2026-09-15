import React from "react";
import { C } from "../theme";

/**
 * The black registration ticks down the left edge of a real OMR card. In the app
 * it is a fixed 26px rail; here it is scaled up for a 1080p frame.
 */
export const TimingRail: React.FC<{ progress?: number }> = ({ progress = 1 }) => (
  <div
    style={{
      position: "absolute",
      insetBlockStart: 0,
      insetInlineStart: 0,
      width: 44,
      height: `${progress * 100}%`,
      overflow: "hidden",
      borderInlineEnd: `2px solid ${C.dropout}`,
      backgroundColor: C.paper,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        height: 1080,
        backgroundImage: `repeating-linear-gradient(to bottom, ${C.ink} 0 16px, transparent 16px 48px)`,
        backgroundSize: "19px 100%",
        backgroundRepeat: "repeat-y",
        backgroundPosition: "0 24px",
        opacity: 0.88,
      }}
    />
  </div>
);
