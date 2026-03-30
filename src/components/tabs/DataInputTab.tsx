import type { JSX } from "react";
import type { Stats } from "../../service/Cordicate-service";
interface Props {
  dataInput: string;
  setDataInput: (v: string) => void;
  onPlot: () => void;
  onClear: () => void;
  stats: Stats | null;
}

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono',monospace" };

export function DataInputTab({
  dataInput, setDataInput, onPlot, onClear, stats,
}: Props): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 14px", flexShrink: 0,
          background: "#fff", borderBottom: "1px solid #f1f5f9",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em", ...mono }}>
          PIPE-DELIMITED TABLE
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-s" onClick={onPlot}>▶ Plot Data</button>
          <button
            className="btn btn-d"
            onClick={onClear}
            disabled={!dataInput.trim()}
            style={{ opacity: !dataInput.trim() ? 0.45 : 1 }}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Body: textarea + stats */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <textarea
          className="cp-ta"
          style={{ flex: 1, borderRadius: 0, border: "none", borderRight: "1.5px solid #f1f5f9", background: "#f8fafc", color: "#476185" }}
          value={dataInput}
          onChange={(e) => setDataInput(e.target.value)}
          placeholder="| # | FRAME NO | TIMESTAMP | REJECTED | CENTRE | BOUNDING BOX | CONFIDENCE | CLASS ID | SOURCE | MASK AREA | REJECT REASON |"
        />

        {/* Stats panel */}
        <div
          style={{
            width: 300, padding: 6, overflowY: "auto",
            flexShrink: 0, background: "#033545", borderLeft: "1px solid #f1f5f9",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 900, color: "#94a3b8", letterSpacing: "0.07em", marginBottom: 10, ...mono }}>
            STATISTICS
          </div>

          {stats ? (
            <>
              <StatBlock
                rows={[
                  ["Shown", `${stats.shown}/${stats.total}`, "#2563eb"],
                  ["Accepted", stats.acc, "#15803d"],
                  ["Rejected", stats.rej, "#b91c1c"],
                ]}
              />
              <StatBlock
                rows={[
                  ["Avg Conf", stats.avg, "#7c3aed"],
                  ["Min Conf", stats.mn, "#0369a1"],
                  ["Max Conf", stats.mx, "#0369a1"],
                ]}
              />
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, ...mono }}>
                <div>{stats.t0}</div>
                <div style={{ color: "#e2e8f0" }}>↓</div>
                <div>{stats.t1}</div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: "#cbd5e1", fontStyle: "italic" }}>No data loaded</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  rows,
}: {
  rows: [string, string | number, string][];
}): JSX.Element {
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono',monospace" };
  return (
    <div
      style={{
        background: "#f8fafc", border: "1.5px solid #e2e8f0",
        borderRadius: 8, padding: "8px 10px", marginBottom: 8,
      }}
    >
      {rows.map(([k, v, c]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0" }}>
          <span style={{ color: "#94a3b8", fontWeight: 500 }}>{k}</span>
          <span style={{ color: c, fontWeight: 700, ...mono }}>{v}</span>
        </div>
      ))}
    </div>
  );
}
