import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Paper } from "../components/Paper";
import { TimingRail } from "../components/TimingRail";
import { Sheet, Overlay } from "../components/Sheet";
import { Cursor } from "../components/Cursor";
import { Caption } from "../components/Caption";
import { C } from "../theme";
import { fontFamily } from "../font";

export const COMPOSE_D = 165;

const TOPIC = "TCP의 혼잡 제어";

/* Measured off docs/screenshots/02-teacher-home.png (2560px wide, 1280 CSS @2x). */
const INPUT = { x: 395, y: 582, w: 1819, h: 84 };
const BUTTON = { x: 395, y: 900, w: 215, h: 83 };

export const Compose: React.FC<{ d?: number }> = ({ d = COMPOSE_D }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 });
  const focus = interpolate(frame, [14, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const typed = Math.round(
    interpolate(frame, [22, 78], [0, TOPIC.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const caret = frame > 20 && frame < 88 && Math.floor(frame / 8) % 2 === 0;

  const enabled = interpolate(frame, [82, 92], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const travel = interpolate(frame, [88, 112], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const cx = interpolate(travel, [0, 1], [1680, 505]);
  const cy = interpolate(travel, [0, 1], [1320, 938]);
  const press = interpolate(frame, [114, 120, 128], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Paper>
      <TimingRail />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 128 }}>
        {/* No opacity fade: this scene opens the GIF, and a transparent first frame
            is what GitHub shows as the still poster. */}
        <div style={{ transform: `scale(${0.97 + enter * 0.03})` }}>
          <Sheet
            src="screenshots/02-teacher-home.png"
            crop={{ x: 300, y: 420, w: 2000, h: 690 }}
            width={1500}
          >
            {/* The placeholder is painted over so the typed topic reads as real input. */}
            <Overlay x={INPUT.x + 6} y={INPUT.y + 5}>
              <div
                style={{
                  width: INPUT.w - 12,
                  height: INPUT.h - 10,
                  backgroundColor: C.sheet,
                  display: "flex",
                  alignItems: "center",
                  paddingInlineStart: 22,
                  fontFamily,
                  fontSize: 31,
                  color: C.ink,
                  boxSizing: "border-box",
                }}
              >
                <span>{TOPIC.slice(0, typed)}</span>
                <span
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: 34,
                    marginInlineStart: 2,
                    backgroundColor: C.ink,
                    opacity: caret ? 1 : 0,
                  }}
                />
              </div>
            </Overlay>

            <Overlay x={INPUT.x} y={INPUT.y}>
              <div
                style={{
                  width: INPUT.w,
                  height: INPUT.h,
                  border: `${2 + focus}px solid ${C.ink}`,
                  borderRadius: 4,
                  opacity: focus,
                  boxSizing: "border-box",
                }}
              />
            </Overlay>

            {/* The shot has the button disabled; it goes ink once the topic is in. */}
            <Overlay x={BUTTON.x} y={BUTTON.y}>
              <div
                style={{
                  width: BUTTON.w,
                  height: BUTTON.h,
                  backgroundColor: C.ink,
                  borderRadius: 4,
                  opacity: enabled,
                  transform: `scale(${1 - press * 0.03})`,
                  display: "grid",
                  placeItems: "center",
                  fontFamily,
                  fontSize: 30,
                  fontWeight: 500,
                  color: "#fff",
                }}
              >
                문항 만들기
              </div>
            </Overlay>

            <Overlay x={cx} y={cy}>
              <Cursor size={96} pressed={press} />
            </Overlay>
          </Sheet>
        </div>
      </AbsoluteFill>
      <Caption
        duration={d}
        lines={["주제와 문항 수, 난이도.", "입력은 이게 전부입니다."]}
      />
    </Paper>
  );
};
