import { useRef, useEffect, useCallback, useState, type JSX } from "react";
import type {
  DataPoint,
  LineSegment,
  Pan,
  Tooltip,
} from "../service/Cordicate-service";
import { drawLightCanvas } from "../canvas/canvasDraw";
import { DPad } from "./ui/DPad";

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  bgImage: HTMLImageElement | null;
  dataPoints: DataPoint[];
  filteredPoints: DataPoint[];
  lineSegments: LineSegment[];
  confMin: number;
  confMax: number;
  areaMin: number;
  areaMax: number;
  areaAbsMax: number;
  bboxSizeMin: number;
  bboxSizeMax: number;
  bboxSizeAbsMax: number;
  showBboxes: boolean;
  showLines: boolean;
  showLabels: boolean;
  showOnlyRejected: boolean;
  pan: Pan;
  setPan: React.Dispatch<React.SetStateAction<Pan>>;
  selectedRows: Set<number>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<number>>>;
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  lastClicked: number;
  setLastClicked: (i: number) => void;
  activePoint: DataPoint | null;
  filteredCount: number;
  totalCount: number;
  onNavPoint: (dir: "up" | "down" | "left" | "right") => void;
}

const CANVAS_W = 1200;
const CANVAS_H = 500;

const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono',monospace" };
const sans: React.CSSProperties = { fontFamily: "'DM Sans',sans-serif" };

export function CanvasSection({
  canvasRef,
  bgImage,
  dataPoints,
  filteredPoints,
  lineSegments,
  confMin,
  confMax,
  areaMin,
  areaMax,
  areaAbsMax,
  bboxSizeMin,
  bboxSizeMax,
  bboxSizeAbsMax,
  showBboxes,
  showLines,
  showLabels,
  showOnlyRejected,
  pan,
  setPan,
  selectedRows,
  setSelectedRows,
  activeIdx,
  setActiveIdx,
  setLastClicked,
  activePoint,
  filteredCount,
  totalCount,
  onNavPoint,
}: Props): JSX.Element {
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const [tooltip, setTooltip] = useState<Tooltip>({
    visible: false,
    x: 0,
    y: 0,
    point: null,
  });

  const isPanning = useRef(false);
  const didPan = useRef(false);
  const panStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  /* ── Redraw ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawLightCanvas({
      ctx,
      canvas,
      bgImage,
      dataPoints,
      lineSegments,
      confMin,
      confMax,
      areaMin,
      areaMax,
      areaAbsMax,
      bboxSizeMin,
      bboxSizeMax,
      bboxSizeAbsMax,
      showBboxes,
      showLines,
      showLabels,
      showOnlyRejected,
      hoveredIdx,
      selectedRows,
      pan,
      activeIdx,
    });
  }, [
    bgImage, dataPoints, lineSegments,
    confMin, confMax, areaMin, areaMax, areaAbsMax,
    bboxSizeMin, bboxSizeMax, bboxSizeAbsMax,
    showBboxes, showLines, showLabels, showOnlyRejected,
    hoveredIdx, selectedRows, pan, activeIdx, canvasRef,
  ]);

  /* ── Hit-test ── */
  const hitTest = useCallback(
    (clientX: number, clientY: number): number => {
      const canvas = canvasRef.current;
      if (!canvas) return -1;
      const rect = canvas.getBoundingClientRect();
      const cx = (clientX - rect.left) * (canvas.width / rect.width) - pan.x;
      const cy = (clientY - rect.top) * (canvas.height / rect.height) - pan.y;
      for (let i = filteredPoints.length - 1; i >= 0; i--) {
        const p = filteredPoints[i];
        const dx = cx - p.center.x, dy = cy - p.center.y;
        if (Math.sqrt(dx * dx + dy * dy) <= 10) return dataPoints.indexOf(p);
      }
      return -1;
    },
    [canvasRef, pan, filteredPoints, dataPoints],
  );

  /* ── Mouse handlers ── */
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    didPan.current = false;
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isPanning.current) {
        didPan.current = true;
        setPan({
          x: panStart.current.px + e.clientX - panStart.current.mx,
          y: panStart.current.py + e.clientY - panStart.current.my,
        });
        return;
      }
      const found = hitTest(e.clientX, e.clientY);
      setHoveredIdx(found);
      if (found >= 0)
        setTooltip({ visible: true, x: e.clientX, y: e.clientY, point: dataPoints[found] });
      else
        setTooltip((t) => ({ ...t, visible: false }));
    },
    [hitTest, setPan, dataPoints],
  );

  const handleMouseUp = () => { isPanning.current = false; };

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (didPan.current) return;
      const found = hitTest(e.clientX, e.clientY);
      if (found < 0) return;
      setSelectedRows((prev) => {
        const next = new Set(prev);
        if (e.ctrlKey || e.metaKey) {
          next.has(found) ? next.delete(found) : next.add(found);
        } else {
          next.clear();
          next.add(found);
        }
        return next;
      });
      setActiveIdx(found);
      setLastClicked(found);
    },
    [hitTest, setSelectedRows, setActiveIdx, setLastClicked],
  );

  return (
    <>
      {/*
        ── Outer scroll container ──────────────────────────────────────────────
        Full width of the page, horizontally scrollable if viewport < CANVAS_W.
        Height is exactly CANVAS_H so it never grows/shrinks.
      */}
      <div
        style={{
          width: "100%",
          height: CANVAS_H,
          overflowX: "auto",
          overflowY: "hidden",
          flexShrink: 0,
          background: "#e8edf2",
          // subtle inset stripe so the area outside the canvas reads as "outside"
          backgroundImage:
            "repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(0,0,0,0.018) 8px,rgba(0,0,0,0.018) 16px)",
        }}
      >
        {/*
          ── Centering row ──────────────────────────────────────────────────────
          min-width forces the row to be at least CANVAS_W wide so the canvas
          never gets squeezed. justify-content centers it when there IS room.
        */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            minWidth: CANVAS_W,
            height: "100%",
          }}
        >
          {/*
            ── Canvas wrapper — exactly 1200×500 ────────────────────────────────
            position:relative so all the HUD overlays are anchored to the canvas,
            not to the scroll container.
          */}
          <div
            style={{
              position: "relative",
              width: CANVAS_W,
              height: CANVAS_H,
              flexShrink: 0,
              cursor: "crosshair",
              // thin shadow so the canvas edge is visible against the bg
              boxShadow: "0 0 0 1px rgba(0,0,0,0.10), 0 4px 24px rgba(0,0,0,0.08)",
            }}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
            onMouseLeave={() => {
              setHoveredIdx(-1);
              setTooltip((t) => ({ ...t, visible: false }));
              isPanning.current = false;
            }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              style={{
                display: "block",
                width: CANVAS_W,
                height: CANVAS_H,
              }}
            />

            {/* ── Legend HUD ── */}
            <div
              className="hud"
              style={{ position: "absolute", top: 12, left: 12, padding: "10px 14px" }}
            >
              <div
                style={{
                  fontSize: 9, fontWeight: 700, color: "#94a3b8",
                  letterSpacing: "0.1em", marginBottom: 8, ...mono,
                }}
              >
                LEGEND
              </div>
              {(
                [
                  ["#16a34a", "Accepted"],
                  ["#dc2626", "Rejected"],
                ] as [string, string][]
              ).map(([c, l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <div
                    style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: c, boxShadow: `0 0 0 2px white,0 0 0 3.5px ${c}55`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>{l}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                <div style={{ width: 16, height: 2.5, borderRadius: 2, background: "#f59e0b" }} />
                <span style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>Selected BBox</span>
              </div>
              {showOnlyRejected && (
                <div
                  style={{
                    marginTop: 7, padding: "3px 6px", borderRadius: 4,
                    background: "#fef2f2", border: "1px solid #fca5a5",
                    fontSize: 9, fontWeight: 700, color: "#b91c1c", ...mono,
                  }}
                >
                  ✗ REJECTED ONLY
                </div>
              )}
            </div>

            {/* ── Active point HUD ── */}
            {activePoint && (
              <div
                className="hud"
                style={{ position: "absolute", top: 12, right: 12, padding: "10px 16px", minWidth: 168 }}
              >
                <div
                  style={{
                    fontSize: 9, fontWeight: 700, color: "#2563eb",
                    letterSpacing: "0.1em", marginBottom: 9, ...mono,
                  }}
                >
                  ACTIVE POINT
                </div>
                {(
                  [
                    ["Frame", activePoint.frameNumber, "#0f172a"],
                    ["Position", `(${activePoint.center.x},${activePoint.center.y})`, "#475569"],
                    ["Confidence", activePoint.confidence.toFixed(4), "#2563eb"],
                    ...(activePoint.area !== null
                      ? [["Area", String(activePoint.area), "#15803d"]]
                      : []),
                  ] as [string, string, string][]
                ).map(([k, v, c]) => (
                  <div
                    key={k}
                    style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 4 }}
                  >
                    <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{k}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: c, ...mono }}>{v}</span>
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 7, paddingTop: 7, borderTop: "1px solid #f1f5f9",
                    fontSize: 11, fontWeight: 700, textAlign: "center",
                    color: activePoint.status === "N" ? "#15803d" : "#b91c1c", ...mono,
                  }}
                >
                  {activePoint.status === "N" ? "✓ ACCEPTED" : "✗ REJECTED"}
                </div>
              </div>
            )}

            {/* ── Point count badge ── */}
            {totalCount > 0 && (
              <div
                style={{
                  position: "absolute", top: 12, left: "50%",
                  transform: "translateX(-50%)",
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px",
                  background: "rgba(255,255,255,0.95)",
                  border: "1.5px solid #e2e8f0", borderRadius: 6,
                  ...mono, fontSize: 10,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: "#2563eb", fontWeight: 700 }}>{filteredCount}</span>
                <span style={{ color: "#cbd5e1" }}>/</span>
                <span style={{ color: "#64748b", fontWeight: 600 }}>{totalCount}</span>
                <span style={{ color: "#94a3b8", fontSize: 9 }}>pts</span>
              </div>
            )}

            {/* ── DPad ── */}
            <div style={{ position: "absolute", bottom: 14, right: 14 }}>
              <div
                style={{
                  textAlign: "center", fontSize: 9, color: "#94a3b8",
                  fontWeight: 600, marginBottom: 5, letterSpacing: "0.06em", ...mono,
                }}
              >
                {filteredPoints.length ? "NAV PTS" : "PAN"}
              </div>
              <DPad
                onUp={() => onNavPoint("up")}
                onDown={() => onNavPoint("down")}
                onLeft={() => onNavPoint("left")}
                onRight={() => onNavPoint("right")}
              />
            </div>

            {/* ── Reset pan ── */}
            {(pan.x !== 0 || pan.y !== 0) && (
              <button
                className="btn btn-g"
                onClick={() => setPan({ x: 0, y: 0 })}
                style={{ position: "absolute", bottom: 14, left: 12, fontSize: 10 }}
              >
                ⌖ Reset Pan
              </button>
            )}

            {/* ── Click hint ── */}
            {totalCount > 0 && (
              <div
                style={{
                  position: "absolute", bottom: 14, left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 10, color: "#94a3b8", fontWeight: 500,
                  ...sans,
                  background: "rgba(255,255,255,0.85)",
                  padding: "2px 8px", borderRadius: 4,
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Click a point to select · Alt+drag to pan
              </div>
            )}
          </div>
          {/* end canvas wrapper */}
        </div>
        {/* end centering row */}
      </div>
      {/* end scroll container */}

      {/* ── Tooltip (portal fixed — always on top of everything) ── */}
      {tooltip.visible && tooltip.point && (
        <div
          style={{
            position: "fixed", zIndex: 50,
            left: tooltip.x + 16, top: tooltip.y - 10,
            background: "#fff", border: "1.5px solid #e2e8f0",
            borderRadius: 12, padding: "12px 16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)",
            pointerEvents: "none", minWidth: 180, ...sans,
          }}
        >
          <div
            style={{
              fontSize: 9, fontWeight: 700, color: "#2563eb",
              letterSpacing: "0.1em", marginBottom: 10, ...mono,
            }}
          >
            DETECTION INFO
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {(
              [
                ["Area", tooltip.point.area ?? "—", "#0f172a"],
                ["Frame", tooltip.point.frameNumber, "#0f172a"],
                ["Position", `(${tooltip.point.center.x}, ${tooltip.point.center.y})`, "#475569"],
                ["Confidence", tooltip.point.confidence.toFixed(4), "#2563eb"],
                ["Timestamp", tooltip.point.timestamp, "#64748b"],
                ["Δt", `+${(tooltip.point.relativeTime || 0).toFixed(3)}s`, "#94a3b8"],
              ] as [string, string | number, string][]
            ).map(([k, v, c]) => (
              <div key={k} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, width: 72, flexShrink: 0 }}>
                  {k}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: c, ...mono }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
            <span
              style={{
                fontSize: 11, fontWeight: 700,
                color: tooltip.point.status === "N" ? "#15803d" : "#b91c1c", ...mono,
              }}
            >
              {tooltip.point.status === "N" ? "✓ ACCEPTED" : "✗ REJECTED"}
            </span>
          </div>
          {tooltip.point.description !== "-" && (
            <div style={{ marginTop: 5, fontSize: 10, color: "#d97706", fontWeight: 500 }}>
              {tooltip.point.description}
            </div>
          )}
        </div>
      )}
    </>
  );
}