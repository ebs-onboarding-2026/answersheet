import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C } from "../theme";

/** A red-pen ring drawn on, the way a marker circles something on paper. */
export const RedRing: React.FC<{
  rx: number;
  ry: number;
  from: number;
  length?: number;
  tilt?: number;
}> = ({ rx, ry, from, length = 26, tilt = -1.6 }) => {
  const frame = useCurrentFrame();
  const perimeter = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const drawn = interpolate(frame, [from, from + length], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <svg
      width={rx * 2 + 24}
      height={ry * 2 + 24}
      style={{ display: "block", transform: `rotate(${tilt}deg)`, overflow: "visible" }}
    >
      <ellipse
        cx={rx + 12}
        cy={ry + 12}
        rx={rx}
        ry={ry}
        fill="none"
        stroke={C.redpen}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={perimeter}
        strokeDashoffset={perimeter * (1 - drawn)}
        transform={`rotate(-140 ${rx + 12} ${ry + 12})`}
      />
    </svg>
  );
};
