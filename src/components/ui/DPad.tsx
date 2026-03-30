import type { JSX } from "react";

interface Props {
  onUp: () => void;
  onDown: () => void;
  onLeft: () => void;
  onRight: () => void;
}

const BASE: React.CSSProperties = {
  width: 34, height: 34, display: "flex", alignItems: "center",
  justifyContent: "center", borderRadius: 8, border: "1.5px solid #cbd5e1",
  background: "#f8fafc", color: "#475569", fontSize: 13, fontWeight: 600,
  cursor: "pointer", transition: "all 0.15s",
  boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
};

function DBtn({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
  return (
    <button
      style={BASE}
      onClick={onClick}
      onMouseEnter={(e) =>
        Object.assign((e.currentTarget as HTMLElement).style, {
          background: "#eff6ff", borderColor: "#93c5fd", color: "#2563eb",
        })
      }
      onMouseLeave={(e) =>
        Object.assign((e.currentTarget as HTMLElement).style, {
          background: "#f8fafc", borderColor: "#cbd5e1", color: "#475569",
        })
      }
    >
      {label}
    </button>
  );
}

export function DPad({ onUp, onDown, onLeft, onRight }: Props): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <DBtn label="▲" onClick={onUp} />
      <div style={{ display: "flex", gap: 3 }}>
        <DBtn label="◀" onClick={onLeft} />
        <div
          style={{
            width: 34, height: 34, borderRadius: 8,
            border: "1.5px solid #e2e8f0", background: "#f1f5f9",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#94a3b8" }} />
        </div>
        <DBtn label="▶" onClick={onRight} />
      </div>
      <DBtn label="▼" onClick={onDown} />
    </div>
  );
}
