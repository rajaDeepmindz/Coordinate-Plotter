import type { JSX } from "react";

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  activeColor?: string;
  activeLabelColor?: string;
}

export function Toggle({
  value,
  onChange,
  label,
  activeColor = "#3b82f6",
  activeLabelColor = "#1d4ed8",
}: Props): JSX.Element {
  return (
    <label
      style={{
        display: "flex", alignItems: "center", gap: 7,
        cursor: "pointer", userSelect: "none",
      }}
    >
      <div
        onClick={() => onChange(!value)}
        style={{
          position: "relative", width: 36, height: 20, borderRadius: 10, flexShrink: 0,
          background: value ? activeColor : "#cbd5e1",
          border: `1.5px solid ${value ? activeColor : "#b0bec5"}`,
          transition: "all 0.2s",
        }}
      >
        <div
          style={{
            position: "absolute", top: 2, left: value ? 16 : 2,
            width: 14, height: 14, borderRadius: "50%", background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.18)", transition: "left 0.2s",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11, fontWeight: 500,
          color: value ? activeLabelColor : "#64748b",
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        {label}
      </span>
    </label>
  );
}
