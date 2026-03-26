import { useCallback, useRef } from "react";
import type { DualRangeSliderProps } from "../service/Cordicate-service";

export function DualRangeSlider({
  min = 0,
  max = 1,
  step = 0.01,
  valueMin,
  valueMax,
  onChange,
}: DualRangeSliderProps): JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"lo" | "hi" | null>(null);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, v));
  const snap = (v: number) => Math.round(v / step) * step;

  const fromPct = useCallback(
    (px: number) => {
      if (!trackRef.current) return min;
      const rect = trackRef.current.getBoundingClientRect();
      return snap(
        min + clamp((px - rect.left) / rect.width, 0, 1) * (max - min)
      );
    },
    [min, max, step]
  );

  const onMouseDown =
    (which: "lo" | "hi") =>
      (e: React.MouseEvent<HTMLDivElement>): void => {
        e.preventDefault();
        dragging.current = which;

        const move = (ev: MouseEvent) => {
          const val = fromPct(ev.clientX);
          if (dragging.current === "lo")
            onChange(clamp(val, min, valueMax - step), valueMax);
          else onChange(valueMin, clamp(val, valueMin + step, max));
        };

        const up = () => {
          dragging.current = null;
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
        };

        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      };

  const lo = pct(valueMin);
  const hi = pct(valueMax);

  return (
    <div className= "relative flex items-center" style = {{ height: 24 }
}>
  <div
        ref={ trackRef }
className = "relative w-full h-1.5 rounded-full"
style = {{ background: "rgba(255,255,255,0.08)" }}
      >
  <div
          className="absolute h-full rounded-full"
style = {{
  left: `${lo}%`,
    width: `${hi - lo}%`,
      background: "linear-gradient(90deg,#38bdf8,#818cf8)",
          }}
        />
{
  (
    [
      ["lo", lo, "border-sky-400"],
      ["hi", hi, "border-indigo-400"],
    ] as [string, number, string][]
  ).map(([which, pos, border]) => (
    <div
            key= { which }
            onMouseDown = { onMouseDown(which as "lo" | "hi") }
            className = {`absolute w-4 h-4 rounded-full ${border} border-2 bg-[#0f172a] cursor-grab active:cursor-grabbing shadow-lg transition-shadow hover:shadow-sky-500/30`}
style = {{
  left: `${pos}%`,
    top: "50%",
      transform: "translate(-50%,-50%)",
        zIndex: 2,
            }}
          />
        ))}
</div>
  </div>
  );
}