import React from "react";
import { C } from "../theme";

/** Four bubbles, the bottom-left filled — the same mark the masthead prints. */
export const Mark: React.FC<{ size: number; fill?: number }> = ({ size, fill = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20">
    <circle cx="5" cy="5" r="3.2" fill="none" stroke={C.dropoutMid} strokeWidth="1.4" />
    <circle cx="15" cy="5" r="3.2" fill="none" stroke={C.dropoutMid} strokeWidth="1.4" />
    <circle cx="15" cy="15" r="3.2" fill="none" stroke={C.dropoutMid} strokeWidth="1.4" />
    <circle cx="5" cy="15" r="3.2" fill="none" stroke={C.dropoutMid} strokeWidth="1.4" />
    <circle cx="5" cy="15" r={3.2 * fill} fill={C.ink} />
  </svg>
);
