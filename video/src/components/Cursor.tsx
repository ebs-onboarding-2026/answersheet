import React from "react";
import { C } from "../theme";

/** A plain arrow pointer, drawn rather than screenshotted so it stays crisp. */
export const Cursor: React.FC<{ size?: number; pressed?: number }> = ({
  size = 60,
  pressed = 0,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
    <circle cx="6" cy="6" r={10 * pressed} fill={C.ink} opacity={0.14 * (1 - pressed)} />
    <path
      d="M4 2 L4 17 L8.2 13.2 L11 19.4 L13.6 18.2 L10.9 12.2 L16.4 12.1 Z"
      fill={C.ink}
      stroke={C.sheet}
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  </svg>
);
