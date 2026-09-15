import React from "react";
import { C } from "../theme";

/**
 * The one interaction vocabulary of the interface. `fill` is 0..1 so the mark can
 * be sprung in rather than switched on.
 */
export const Bubble: React.FC<{
  size: number;
  fill?: number;
  tone?: "ink" | "red" | "green";
  ring?: string;
}> = ({ size, fill = 0, tone = "ink", ring }) => {
  const dot = tone === "red" ? C.redpen : tone === "green" ? C.ok : C.ink;
  const border = fill > 0.05 ? dot : (ring ?? C.dropoutMid);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        border: `${Math.max(2, size * 0.075)}px solid ${border}`,
        backgroundColor: C.sheet,
        display: "grid",
        placeItems: "center",
        flex: "none",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: 999,
          backgroundColor: dot,
          transform: `scale(${fill})`,
          opacity: fill > 0 ? 1 : 0,
        }}
      />
    </div>
  );
};
