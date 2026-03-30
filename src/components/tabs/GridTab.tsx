import { useRef, useEffect, type JSX } from "react";
import type { DataPoint } from "../../service/Cordicate-service";

interface Props {
  dataPoints: DataPoint[];
  filteredPoints: DataPoint[];
  selectedRows: Set<number>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<number>>>;
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  lastClicked: number;
  setLastClicked: (i: number) => void;
  confMin: number;
  confMax: number;
  areaMin: number;
  areaMax: number;
  areaAbsMax: number;
  showOnlyRejected: boolean;
}

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono',monospace" };

export function GridTab({
  dataPoints, filteredPoints,
  selectedRows, setSelectedRows,
  activeIdx, setActiveIdx,
  lastClicked, setLastClicked,
  confMin, confMax,
  areaMin, areaMax, areaAbsMax,
  showOnlyRejected,
}: Props): JSX.Element {
  const activeRowRef = useRef<HTMLTableRowElement | null>(null);

  /* Auto-scroll to active row when canvas selects a point */
  useEffect(() => {
    if (activeIdx >= 0 && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeIdx]);

  const selSize = selectedRows.size;
  const allChecked = dataPoints.length > 0 && selSize === dataPoints.length;
  const someChecked = selSize > 0 && selSize < dataPoints.length;

  const toggleSelectAll = (checked: boolean) =>
    setSelectedRows(checked ? new Set(dataPoints.map((_, i) => i)) : new Set());

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && lastClicked !== -1) {
        const lo = Math.min(lastClicked, idx), hi = Math.max(lastClicked, idx);
        if (!e.ctrlKey && !e.metaKey) next.clear();
        for (let i = lo; i <= hi; i++) next.add(i);
      } else if (e.ctrlKey || e.metaKey) {
        next.has(idx) ? next.delete(idx) : next.add(idx);
      } else {
        next.clear();
        next.add(idx);
      }
      return next;
    });
    setLastClicked(idx);
    setActiveIdx(idx);
  };

  const isInRange = (p: DataPoint) =>
    p.confidence >= confMin && p.confidence <= confMax &&
    (areaAbsMax === 0 || p.area === null || (p.area >= areaMin && p.area <= areaMax)) &&
    (!showOnlyRejected || p.status === "Y");

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Grid header bar */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 12px", flexShrink: 0,
          background: "#fff", borderBottom: "1px solid #f1f5f9",
        }}
      >
        <button className="btn btn-g" style={{ fontSize: 10 }} onClick={() => setSelectedRows(new Set())}>
          ✕ Clear
        </button>
        <button className="btn btn-p" style={{ fontSize: 10 }} onClick={() => toggleSelectAll(true)}>
          ☑ All
        </button>

        {/* Conf range badge */}
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 9px", background: "#f8fafc",
            border: "1.5px solid #e2e8f0", borderRadius: 6,
            ...mono, fontSize: 10,
          }}
        >
          <span style={{ color: "#94a3b8" }}>conf</span>
          <span style={{ color: "#2563eb", fontWeight: 700 }}>{confMin.toFixed(2)}</span>
          <span style={{ color: "#cbd5e1" }}>–</span>
          <span style={{ color: "#0ea5e9", fontWeight: 700 }}>{confMax.toFixed(2)}</span>
        </div>

        {/* Area range badge (only shown when area data exists) */}
        {areaAbsMax > 0 && (
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 9px", background: "#f0fdf4",
              border: "1.5px solid #bbf7d0", borderRadius: 6,
              ...mono, fontSize: 10,
            }}
          >
            <span style={{ color: "#94a3b8" }}>area</span>
            <span style={{ color: "#15803d", fontWeight: 700 }}>{areaMin}</span>
            <span style={{ color: "#cbd5e1" }}>–</span>
            <span style={{ color: "#16a34a", fontWeight: 700 }}>{areaMax}</span>
          </div>
        )}

        {/* Rejected-only indicator */}
        {showOnlyRejected && (
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 9px", background: "#fef2f2",
              border: "1.5px solid #fca5a5", borderRadius: 6,
              ...mono, fontSize: 10, color: "#b91c1c", fontWeight: 700,
            }}
          >
            ✗ REJECTED ONLY
          </div>
        )}

        <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
          {!dataPoints.length
            ? "No data loaded"
            : selSize === 0
              ? `${filteredPoints.length} visible / ${dataPoints.length} total`
              : `${selSize} of ${dataPoints.length} selected`}
        </span>
      </div>

      {/* Table body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {!dataPoints.length ? (
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: "100%", color: "#94a3b8", fontSize: 12, fontStyle: "italic",
            }}
          >
            Paste data in{" "}
            <span style={{ color: "#2563eb", fontWeight: 600, margin: "0 4px" }}>Data Input</span>{" "}
            then click ▶ Plot Data
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                <th style={{ width: 36, padding: "7px 10px", textAlign: "center", borderRight: "1px solid #f1f5f9" }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked; }}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    style={{ accentColor: "#3b82f6", cursor: "pointer" }}
                  />
                </th>
                {["Frame","Timestamp","Center","BBox","Confidence","Class","Source","Area","Rejected?","Reason"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "7px 10px", textAlign: "left", fontWeight: 700,
                      color: "#64748b", fontSize: 9, letterSpacing: "0.07em",
                      textTransform: "uppercase", whiteSpace: "nowrap",
                      borderRight: "1px solid #f1f5f9", ...mono,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataPoints.map((p, idx) => {
                const isSel = selectedRows.has(idx);
                const isActive = idx === activeIdx;
                const inRange = isInRange(p);
                const bboxStr = p.bbox
                  ? `[${p.bbox.x1},${p.bbox.y1},${p.bbox.x2},${p.bbox.y2}]` : "—";

                const rowBg = isActive
                  ? "#eff6ff"
                  : isSel
                    ? "#dbeafe"
                    : !inRange
                      ? undefined
                      : idx % 2 === 0 ? "#fff" : "#fafbfc";

                return (
                  <tr
                    key={idx}
                    ref={idx === activeIdx ? activeRowRef : undefined}
                    className="trow"
                    onClick={(e) => handleRowClick(e, idx)}
                    style={{
                      borderBottom: "1px solid #f1f5f9", cursor: "pointer",
                      background: rowBg, opacity: !inRange ? 0.3 : 1,
                      outline: isActive ? "2px solid #bfdbfe" : "none",
                      outlineOffset: -2,
                    }}
                  >
                    <td style={{ padding: "5px 10px", textAlign: "center", borderRight: "1px solid #f1f5f9" }}>
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedRows((prev) => {
                            const n = new Set(prev);
                            e.target.checked ? n.add(idx) : n.delete(idx);
                            return n;
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ accentColor: "#3b82f6", cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9", fontWeight: 600, color: "#0f172a", ...mono }}>
                      {p.frameNumber}
                    </td>
                    <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9", color: "#64748b", fontSize: 10, whiteSpace: "nowrap", ...mono }}>
                      {p.timestamp}
                    </td>
                    <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9", color: "#0f172a", whiteSpace: "nowrap", ...mono }}>
                      ({p.center.x},{p.center.y})
                    </td>
                    <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9", color: "#64748b", fontSize: 9.5, whiteSpace: "nowrap", ...mono }}>
                      {bboxStr}
                    </td>
                    <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: p.confidence < 0.5 ? "#d97706" : p.confidence >= 0.8 ? "#2563eb" : "#475569",
                          ...mono,
                        }}
                      >
                        {p.confidence.toFixed(4)}
                      </span>
                    </td>
                    <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9", color: "#64748b", ...mono }}>
                      {p.classId ?? "—"}
                    </td>
                    <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9", color: "#64748b" }}>
                      {p.source}
                    </td>
                    <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9", color: "#64748b", ...mono }}>
                      {p.area ?? "—"}
                    </td>
                    <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9" }}>
                      <span className={p.status === "Y" ? "tag-y" : "tag-n"}>
                        {p.status === "Y" ? "YES" : "NO"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "5px 10px", color: "#94a3b8",
                        maxWidth: 120, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                      title={p.description}
                    >
                      {p.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
