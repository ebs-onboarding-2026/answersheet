import React from "react";
import { Img, staticFile } from "remotion";
import { C, SHOT_W } from "../theme";

export type Crop = { x: number; y: number; w: number; h: number };

/**
 * A region of one of the README screenshots, mounted as a sheet of paper.
 *
 * The crop is given in the screenshot's own pixels (all of them are 2560 wide,
 * shot at 1280 CSS px on a 2x display), so coordinates read off the image drop
 * straight in. Children are positioned in that same space by `Overlay`, which
 * means a vector mark stays glued to the pixel it points at while the crop pans.
 */
export const Sheet: React.FC<{
  src: string;
  crop: Crop;
  width: number;
  children?: React.ReactNode;
}> = ({ src, crop, width, children }) => {
  const scale = width / crop.w;
  const height = crop.h * scale;

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        backgroundColor: C.sheet,
        border: `2px solid ${C.dropout}`,
        borderRadius: 3,
        boxShadow: "0 24px 60px rgba(18, 35, 58, 0.13)",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: SHOT_W * scale,
          left: -crop.x * scale,
          top: -crop.y * scale,
          transformOrigin: "0 0",
        }}
      >
        <Img src={staticFile(src)} style={{ width: "100%", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * Places a vector element at a point measured on the screenshot. Sits inside the
 * unscaled image space, so `x`/`y` are screenshot pixels.
 */
export const Overlay: React.FC<{
  x: number;
  y: number;
  children: React.ReactNode;
}> = ({ x, y, children }) => (
  <div style={{ position: "absolute", left: x, top: y }}>{children}</div>
);
