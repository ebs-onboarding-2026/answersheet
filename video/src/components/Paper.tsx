import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";

/** The page stock every scene sits on. `grid` turns on the landing hero's graph paper. */
export const Paper: React.FC<{ grid?: boolean; children?: React.ReactNode }> = ({
  grid,
  children,
}) => (
  <AbsoluteFill style={{ backgroundColor: C.paper }}>
    {grid ? (
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.dropout} 2px, transparent 2px), linear-gradient(90deg, ${C.dropout} 2px, transparent 2px)`,
          backgroundSize: "56px 56px",
          backgroundPosition: "-2px -2px",
          opacity: 0.85,
        }}
      />
    ) : null}
    {children}
  </AbsoluteFill>
);
