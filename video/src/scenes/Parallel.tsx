import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Paper } from "../components/Paper";
import { TimingRail } from "../components/TimingRail";
import { Caption } from "../components/Caption";
import { C } from "../theme";
import { fontFamily } from "../font";

export const PARALLEL_D = 150;

/* The measurement this video exists to show, from the README: ten questions in
   one call take 92s; one call per checkpoint, run at once, take 27s. */
const SLOW_SEC = 92;
const FAST_SEC = 27;

const AXIS_X = 430;
const AXIS_W = 1180;
const START_F = 16;
const END_F = 140;

/** Each parallel call lands at a slightly different moment; the last one is 27s. */
const LANES = [22.4, 24.1, 23.2, 25.6, 24.8, 26.3, 25.1, FAST_SEC];

const px = (sec: number) => (sec / SLOW_SEC) * AXIS_W;

export const Parallel: React.FC<{ d?: number }> = ({ d = PARALLEL_D }) => {
  const frame = useCurrentFrame();

  const sec = interpolate(frame, [START_F, END_F], [0, SLOW_SEC], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fastDone = sec >= FAST_SEC;
  const slowDone = sec >= SLOW_SEC;

  return (
    <Paper>
      <TimingRail />
      <AbsoluteFill style={{ fontFamily, color: C.ink }}>
        <div style={{ position: "absolute", left: AXIS_X, top: 118, fontSize: 40, fontWeight: 600 }}>
          열 문항 만들기
        </div>
        <div
          style={{
            position: "absolute",
            left: AXIS_X + AXIS_W - 260,
            top: 118,
            width: 260,
            textAlign: "right",
            fontSize: 40,
            fontWeight: 600,
            color: C.graphite,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {sec.toFixed(1)}초
        </div>

        {/* One call writes all ten. */}
        <Lane label="한 번에" y={256} />
        <Track y={306} h={30} />
        <Fill y={306} h={30} w={px(Math.min(sec, SLOW_SEC))} color={C.ink} />
        <Stamp y={300} x={AXIS_X + px(SLOW_SEC)} text="92초" show={slowDone} tone={C.graphite} />

        {/* One call per checkpoint, all in flight at once. */}
        <Lane label="쪼개서 동시에" y={438} />
        {LANES.map((endSec, i) => (
          <React.Fragment key={i}>
            <Track y={492 + i * 34} h={20} />
            <Fill
              y={492 + i * 34}
              h={20}
              w={px(Math.min(sec, endSec))}
              color={C.dropoutDeep}
            />
          </React.Fragment>
        ))}
        <Stamp
          y={440}
          x={AXIS_X + px(FAST_SEC)}
          text="27초"
          show={fastDone}
          tone={C.redpen}
        />
        <div
          style={{
            position: "absolute",
            left: AXIS_X + px(FAST_SEC),
            top: 486,
            width: 3,
            height: 272,
            backgroundColor: C.redpen,
            opacity: fastDone ? 0.55 : 0,
          }}
        />
      </AbsoluteFill>
      <Caption
        duration={d}
        accent={C.redpen}
        lines={["한 호출로 열 문항이면 92초.", "지점별로 쪼개 동시에 쓰면 27초."]}
      />
    </Paper>
  );
};

const Lane: React.FC<{ label: string; y: number }> = ({ label, y }) => (
  <div
    style={{
      position: "absolute",
      left: 120,
      top: y,
      width: AXIS_X - 160,
      textAlign: "right",
      fontSize: 34,
      fontWeight: 500,
      color: C.graphite,
    }}
  >
    {label}
  </div>
);

const Track: React.FC<{ y: number; h: number }> = ({ y, h }) => (
  <div
    style={{
      position: "absolute",
      left: AXIS_X,
      top: y,
      width: AXIS_W,
      height: h,
      backgroundColor: C.dropout,
      borderRadius: 2,
    }}
  />
);

const Fill: React.FC<{ y: number; h: number; w: number; color: string }> = ({ y, h, w, color }) => (
  <div
    style={{
      position: "absolute",
      left: AXIS_X,
      top: y,
      width: w,
      height: h,
      backgroundColor: color,
      borderRadius: 2,
    }}
  />
);

const Stamp: React.FC<{ x: number; y: number; text: string; show: boolean; tone: string }> = ({
  x,
  y,
  text,
  show,
  tone,
}) => (
  <div
    style={{
      position: "absolute",
      left: x + 16,
      top: y,
      fontSize: 38,
      fontWeight: 700,
      color: tone,
      opacity: show ? 1 : 0,
      fontVariantNumeric: "tabular-nums",
    }}
  >
    {text}
  </div>
);
