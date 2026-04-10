import { useRef, useEffect, useCallback, useState, type JSX } from "react";
type Props = any;
import { drawLightCanvas } from "../canvas/canvasDraw";
import type { Tooltip } from "../service/Cordicate-service";
import { Layers } from "lucide-react";

const CANVAS_W = 1200;
const CANVAS_H = 500;

export function CanvasSection({
  canvasRef,
  bgImage,
  dataPoints,
  filteredPoints,
  lineSegments,
  manualPoints,
  manualLines,
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
  onNavPoint,
}: Props): JSX.Element {
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const [tooltip, setTooltip] = useState<Tooltip>({
    visible: false,
    x: 0,
    y: 0,
    point: null,
  });

  console.log("CanvasSection rendered with activePoint:", activePoint);
  console.log(
    "DataPoints length:",
    dataPoints.length,
    "FilteredPoints length:",
    filteredPoints.length,
  );
  console.log("Pan state:", tooltip, pan);
  const isPanning = useRef(false);
  const didPan = useRef(false);
  const panStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") onNavPoint("up");
    if (e.key === "ArrowDown") onNavPoint("down");
    if (e.key === "ArrowLeft") onNavPoint("left");
    if (e.key === "ArrowRight") onNavPoint("right");
    if (e.key.toLowerCase() === "r") setPan({ x: 0, y: 0 });
  };

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
      manualPoints,
      manualLines,
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
    bgImage,
    dataPoints,
    lineSegments,
    manualPoints,
    manualLines,
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
    canvasRef,
  ]);

  const hitTest = useCallback(
    (clientX: number, clientY: number): number => {
      const canvas = canvasRef.current;
      if (!canvas) return -1;
      const rect = canvas.getBoundingClientRect();
      const cx = (clientX - rect.left) * (canvas.width / rect.width) - pan.x;
      const cy = (clientY - rect.top) * (canvas.height / rect.height) - pan.y;
      for (let i = filteredPoints.length - 1; i >= 0; i--) {
        const p = filteredPoints[i];
        const dx = cx - p.center.x,
          dy = cy - p.center.y;
        if (Math.sqrt(dx * dx + dy * dy) <= 10) return dataPoints.indexOf(p);
      }
      return -1;
    },
    [canvasRef, pan, filteredPoints, dataPoints],
  );

  // Helper to get dimensions consistently
  const getDims = (point: any) => {
    if (!point) return { w: 0, h: 0 };
    const w =
      point.bbox?.w ||
      (point.bbox ? Math.abs(point.bbox.x2 - point.bbox.x1) : point.width || 0);
    const h =
      point.bbox?.h ||
      (point.bbox
        ? Math.abs(point.bbox.y2 - point.bbox.y1)
        : point.height || 0);
    return { w: Math.round(w), h: Math.round(h) };
  };

  return (
    <div className="flex h-[550px] w-full bg-slate-950 overflow-hidden border border-slate-800 shadow-lg">
      <div
        className="relative flex-1 bg-[#0f172a] overflow-auto p-4 flex items-center justify-center focus:outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="relative shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden border border-slate-700">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="block cursor-crosshair"
            onMouseMove={(e) => {
              if (isPanning.current) {
                setPan({
                  x: panStart.current.px + e.clientX - panStart.current.mx,
                  y: panStart.current.py + e.clientY - panStart.current.my,
                });
                return;
              }
              const found = hitTest(e.clientX, e.clientY);
              setHoveredIdx(found);
              if (found >= 0)
                setTooltip({
                  visible: true,
                  x: e.clientX,
                  y: e.clientY,
                  point: dataPoints[found],
                });
              else setTooltip((t) => ({ ...t, visible: false }));
            }}
            onMouseDown={(e) => {
              didPan.current = false;
              if (e.button === 1 || (e.button === 0 && e.altKey)) {
                isPanning.current = true;
                panStart.current = {
                  mx: e.clientX,
                  my: e.clientY,
                  px: pan.x,
                  py: pan.y,
                };
                e.preventDefault();
              }
            }}
            onMouseUp={() => {
              isPanning.current = false;
            }}
            onClick={(e) => {
              if (didPan.current) return;
              const found = hitTest(e.clientX, e.clientY);
              if (found < 0) return;
              setSelectedRows((prev: Iterable<unknown> | null | undefined) => {
                const next = new Set(prev);
                if (e.ctrlKey || e.metaKey)
                  next.has(found) ? next.delete(found) : next.add(found);
                else {
                  next.clear();
                  next.add(found);
                }
                return next;
              });
              setActiveIdx(found);
              setLastClicked(found);
            }}
          />

          {/* ── FLOATING DIMENSION LABEL ON CANVAS ── */}
          {/* {activeIdx !== -1 && dataPoints[activeIdx] && (
            <div
              className="absolute pointer-events-none font-mono font-bold text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded shadow-xl z-20 border border-amber-400/50 flex items-center gap-1"
              style={{
                left: dataPoints[activeIdx].center.x + pan.x,
                top:
                  dataPoints[activeIdx].center.y +
                  pan.y -
                  getDims(dataPoints[activeIdx]).h / 2 -
                  25,
                transform: "translateX(30%)",
              }}
            >
              <span>W-{getDims(dataPoints[activeIdx]).w}px</span>
              <span className="opacity-50">×</span>
              <span>H-{getDims(dataPoints[activeIdx]).h}px</span>
            </div>
          )} */}

          {(pan.x !== 0 || pan.y !== 0) && (
            <button
              onClick={() => setPan({ x: 0, y: 0 })}
              className="absolute bottom-4 left-4 bg-indigo-600/90 text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest backdrop-blur-md hover:bg-indigo-500 border border-indigo-400/30"
            >
              ⌖ Center View
            </button>
          )}

          {/* Tooltip Overlay */}
          {tooltip.visible && tooltip.point && (
            <div
              className="fixed pointer-events-none z-[999] bg-slate-900/95 backdrop-blur-xl text-white rounded-xl shadow-2xl border border-white/10 p-4 min-w-[240px]"
              style={{ left: tooltip.x + 40, top: tooltip.y - 20 }}
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  {
                    label: "Width",
                    val: `${getDims(tooltip.point).w}px`,
                    color: "text-emerald-400",
                  },
                  {
                    label: "Height",
                    val: `${getDims(tooltip.point).h}px`,
                    color: "text-emerald-400",
                  },
                  {
                    label: "Confidence",
                    val: `${(tooltip.point.confidence * 100).toFixed(2)}%`,
                    color: "text-blue-400",
                  },
                  {
                    label: "Area",
                    val: tooltip.point.area ?? "N/A",
                    color: "text-slate-300",
                  },
                  {
                    label: "X / Y Center",
                    val: `${tooltip.point.center.x.toFixed(1)} / ${tooltip.point.center.y.toFixed(1)}`,
                    color: "text-slate-300",
                  },
                  {
                    label: "Frame",
                    val: tooltip.point.frameNumber,
                    color: "text-yellow-400",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col">
                    <span className="text-[8px] font-bold text-slate-500 uppercase">
                      {item.label}
                    </span>
                    <span
                      className={`text-[11px] font-bold font-mono ${item.color}`}
                    >
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT SIDE: THE INTELLIGENCE PANEL ── */}
      <div className="w-[340px] bg-slate-900 border-l border-slate-800 flex flex-col p-4 overflow-y-auto scrollbar-hide space-y-6">
        {/* Header Stats */}
        <section className="grid grid-cols-2 gap-2">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[8px] text-slate-500 font-bold uppercase">
              Total Points
            </div>
            <div className="text-white font-mono text-lg">
              {dataPoints.length}
            </div>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-[8px] text-slate-500 font-bold uppercase">
              Filtered
            </div>
            <div className="text-emerald-400 font-mono text-lg">
              {filteredCount}
            </div>
          </div>
        </section>

        {/* MAIN INSPECTOR: Priority to Active Click, Fallback to Hover */}
        <section className="space-y-4">
          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Layers size={14} /> Object Inspector
          </h4>

          {activePoint || (tooltip.visible && tooltip.point) ? (
            (() => {
              const p = activePoint || tooltip.point!;
              const dims = getDims(p);
              return (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* 1. Primary Identity Card */}
                  <div className="bg-indigo-600 p-4 rounded-xl shadow-lg shadow-indigo-500/10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-indigo-100 uppercase">
                        Detection ID
                      </span>
                      <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] font-mono">
                        {p.source.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-2xl font-mono font-bold text-white tracking-tighter">
                      #{dataPoints.indexOf(p)}
                    </div>
                  </div>
                  {/* 2. Temporal Data (Time) */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="text-[9px] font-bold text-slate-500 uppercase border-b border-slate-900 pb-2">
                      Timing & Confidence
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[8px] text-slate-500">FRAME</div>
                        <div className="text-amber-500 font-mono text-sm">
                          {p.frameNumber}
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] text-slate-500">
                          CONFIDENCE
                        </div>
                        <div className="text-blue-400 font-mono text-sm">
                          {(p.confidence * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[8px] text-slate-500">
                          RELATIVE TIME
                        </div>
                        <div className="text-slate-300 font-mono text-sm">
                          +{p.relativeTime?.toFixed(4)} s
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-[8px] text-slate-500">
                          TIMESTAMP
                        </div>
                        <div className="text-slate-400 font-mono text-xs">
                          {p.timestamp}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Geometry & Area */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="text-[9px] font-bold text-slate-500 uppercase border-b border-slate-900 pb-2">
                      Dimensions & Pos
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[8px] text-slate-500">
                          WIDTH / HEIGHT
                        </div>
                        <div className="text-white font-mono text-sm">
                          {dims.w} × {dims.h}{" "}
                          <span className="text-[9px] opacity-40">px</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] text-slate-500">
                          TOTAL AREA
                        </div>
                        <div className="text-emerald-400 font-mono text-sm">
                          {p.area || dims.w * dims.h}{" "}
                          <span className="text-[9px] opacity-40">px²</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] text-slate-500">
                          CENTER X
                        </div>
                        <div className="text-slate-300 font-mono text-sm">
                          {p.center.x.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] text-slate-500">
                          CENTER Y
                        </div>
                        <div className="text-slate-300 font-mono text-sm">
                          {p.center.y.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-900">
                      <div className="text-[8px] text-slate-500">
                        BOUNDING BOX (x1, y1, x2, y2)
                      </div>
                      <div className="text-slate-400 font-mono text-[10px]">
                        {p.bbox?.x1}, {p.bbox?.y1} → {p.bbox?.x2}, {p.bbox?.y2}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="bg-slate-950/40 border-2 border-dashed border-slate-800 p-10 rounded-2xl text-center">
              <div className="text-slate-600 text-xs font-bold uppercase tracking-widest leading-relaxed">
                Select or hover <br /> a point to view <br /> full telemetry
              </div>
            </div>
          )}
        </section>

        {/* Section 3: Legend */}
        <section className="space-y-4 pt-4 border-t border-slate-800">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            Legend
          </h4>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-slate-400 font-bold">
                STATUS: N (Accepted)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-600" />
              <span className="text-[10px] text-slate-400 font-bold">
                STATUS: Y (Rejected)
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
