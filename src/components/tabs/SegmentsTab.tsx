import type { JSX } from "react";
import type { LineSegment } from "../../service/Cordicate-service";
import { Toggle } from "../ui/Toggle";
interface Props {
  segInput: string;
  setSegInput: (v: string) => void;
  lineSegments: LineSegment[];
  showSegments: boolean;
  setShowSegments: (v: boolean) => void;
  onPlot: () => void;
  onClear: () => void;
}

export function SegmentsTab({
  segInput, setSegInput,
  lineSegments, showSegments, setShowSegments,
  onPlot, onClear,
}: Props): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Header bar */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 14px", flexShrink: 0, background: "#fff",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        {/* Segment color legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {([["#059669", "Entry"], ["#d97706", "Middle"], ["#dc2626", "Exit"]] as [string, string][]).map(
            ([c, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 18, height: 2.5, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{l}</span>
              </div>
            ),
          )}
          {lineSegments.length > 0 && (
            <span
              style={{
                fontSize: 10, fontWeight: 700, color: "#7c3aed",
                background: "#f5f3ff", border: "1px solid #ddd6fe",
                padding: "1px 7px", borderRadius: 4,
                fontFamily: "'IBM Plex Mono',monospace",
              }}
            >
              {lineSegments.length} seg{lineSegments.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Show / Hide toggle — visible only when segments exist */}
          {lineSegments.length > 0 && (
            <Toggle
              value={showSegments}
              onChange={setShowSegments}
              label={showSegments ? "Visible" : "Hidden"}
              activeColor="#7c3aed"
              activeLabelColor="#6d28d9"
            />
          )}

          <button className="btn btn-s" onClick={onPlot}>▶ Plot</button>
          <button
            className="btn btn-d"
            onClick={onClear}
            disabled={!lineSegments.length && !segInput.trim()}
            style={{ opacity: !lineSegments.length && !segInput.trim() ? 0.45 : 1 }}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Textarea */}
      <div style={{ flex: 1, padding: 12, minHeight: 0 }}>
        <textarea
          className="cp-ta"
          value={segInput}
          onChange={(e) => setSegInput(e.target.value)}
          placeholder="[[(x1,y1),(x2,y2)], [(x1,y1),(x2,y2)], ...]"
        />
      </div>
    </div>
  );
}
