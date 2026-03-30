import { useRef, useCallback, type JSX } from "react";

interface Props {
  min?: number;
  max?: number;
  step?: number;
  valueMin: number;
  valueMax: number;
  onChange: (lo: number, hi: number) => void;
  colorStart?: string;
  colorEnd?: string;
}

export function DualRangeSlider({
  min = 0, max = 1, step = 0.01,
  valueMin, valueMax, onChange,
  colorStart = "#3b82f6",
  colorEnd = "#0ea5e9",
}: Props): JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"lo" | "hi" | null>(null);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const snap = useCallback((v: number) => Math.round(v / step) * step, [step]);

  const fromPct = useCallback(
    (px: number) => {
      if (!trackRef.current) return min;
      const rect = trackRef.current.getBoundingClientRect();
      return snap(min + clamp((px - rect.left) / rect.width, 0, 1) * (max - min));
    },
    [min, max, snap],
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

  const lo = pct(valueMin), hi = pct(valueMax);

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", height: 24 }}>
      <div
        ref={trackRef}
        style={{
          position: "relative", width: "100%", height: 6,
          borderRadius: 3, background: "#dde3ed",
        }}
      >
        <div
          style={{
            position: "absolute", height: "100%",
            left: `${lo}%`, width: `${hi - lo}%`,
            borderRadius: 3,
            background: `linear-gradient(90deg,${colorStart},${colorEnd})`,
          }}
        />
        {(["lo", "hi"] as const).map((which) => (
          <div
            key={which}
            onMouseDown={onMouseDown(which)}
            style={{
              position: "absolute",
              left: `${which === "lo" ? lo : hi}%`,
              top: "50%", transform: "translate(-50%,-50%)", zIndex: 2,
              width: 16, height: 16, borderRadius: "50%",
              background: "#fff",
              border: `2px solid ${which === "lo" ? colorStart : colorEnd}`,
              boxShadow: "0 1px 4px rgba(0,0,0,0.14)",
              cursor: "grab",
            }}
          />
        ))}
      </div>
    </div>
  );
}
