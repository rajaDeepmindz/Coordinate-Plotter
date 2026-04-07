import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type JSX,
} from "react";
import {
  parseData,
  parseSegments,
  computeStats,
  type DataPoint,
  type LineSegment,
  type Pan,
} from "../service/Cordicate-service";
import { CanvasSection } from "../components/CanvasSection";
import { BottomPanel } from "../components/BottomPanel";
import { ControlsBar } from "../components/ControlsBar";

function FontLink(): null {
  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href =
      "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(l);
  }, []);
  return null;
}

const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  .lcp-root {
    --accent: #3b82f6; --accent-dark: #1d4ed8;
    --s: #fff; --s2: #f8fafc; --s3: #f1f5f9;
    --b: #e2e8f0; --bs: #cbd5e1;
    --t: #0f172a; --t2: #475569; --t3: #94a3b8;
    --mono: 'IBM Plex Mono',monospace; --sans: 'DM Sans',sans-serif;
  }
  .btn { display:inline-flex; align-items:center; gap:5px; padding:5px 11px;
    border-radius:7px; font-size:11px; font-weight:600; cursor:pointer;
    transition:all .15s; border:1.5px solid; font-family:'DM Sans',sans-serif; }
  .btn:disabled { cursor:not-allowed; }
  .btn-p { background:#eff6ff; border-color:#93c5fd; color:#1d4ed8; }
  .btn-p:hover { background:#dbeafe; border-color:#3b82f6; }
  .btn-d { background:#fef2f2; border-color:#fca5a5; color:#b91c1c; }
  .btn-d:hover:not(:disabled) { background:#fee2e2; }
  .btn-s { background:#f0fdf4; border-color:#86efac; color:#15803d; }
  .btn-s:hover { background:#dcfce7; }
  .btn-g { background:#fff; border-color:#cbd5e1; color:#475569; }
  .btn-g:hover { background:#f8fafc; border-color:#3b82f6; color:#1d4ed8; }
  .cp-tab { padding:8px 18px; font-size:11px; font-weight:600; cursor:pointer;
    border:none; background:transparent; border-bottom:2.5px solid transparent;
    color:#94a3b8; transition:all .15s; font-family:'DM Sans',sans-serif; letter-spacing:.02em; }
  .cp-tab:hover { color:#475569; background:#f8fafc; }
  .cp-tab.on { color:#1d4ed8; border-bottom-color:#3b82f6; background:#eff6ff; }
  .cp-ta { width:100%; height:100%; padding:12px; font-family:'IBM Plex Mono',monospace;
    font-size:11px; color:#0f172a; background:#fff; border:1.5px solid #e2e8f0;
    border-radius:8px; resize:none; outline:none; line-height:1.6; }
  .cp-ta:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.1); }
  .cp-ta::placeholder { color:#94a3b8; }
  .trow:hover td { background: rgba(239,246,255,0.7) !important; }
  .tag-y { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;
    padding:2px 7px; border-radius:4px; font-size:9px; font-weight:700;
    font-family:'IBM Plex Mono',monospace; }
  .tag-n { background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0;
    padding:2px 7px; border-radius:4px; font-size:9px; font-weight:700;
    font-family:'IBM Plex Mono',monospace; }
  .hud { background:rgba(255,255,255,0.97); border:1.5px solid #e2e8f0;
    border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.08); backdrop-filter:blur(12px); }
  ::-webkit-scrollbar { width:5px; height:5px; }
  ::-webkit-scrollbar-track { background:#f1f5f9; }
  ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }
`;

export default function CoordinatePlotter(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [lineSegments, setLineSegments] = useState<LineSegment[]>([]);

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [activeIdx, setActiveIdx] = useState(-1);
  const [lastClicked, setLastClicked] = useState(-1);

  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });

  const [confMin, setConfMin] = useState(0);
  const [confMax, setConfMax] = useState(1);

  const [areaMin, setAreaMin] = useState(0);
  const [areaMax, setAreaMax] = useState(0);
  const [areaAbsMin, setAreaAbsMin] = useState(0);
  const [areaAbsMax, setAreaAbsMax] = useState(0);

  const [bboxSizeMin, setBBoxSizeMin] = useState(0);
  const [bboxSizeMax, setBBoxSizeMax] = useState(0);
  const [bboxSizeAbsMin, setBBoxSizeAbsMin] = useState(0);
  const [bboxSizeAbsMax, setBBoxSizeAbsMax] = useState(0);

  const [showBboxes, setShowBboxes] = useState(false);
  const [showLines, setShowLines] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [showSegments, setShowSegments] = useState(true);
  const [showOnlyRejected, setShowOnlyRejected] = useState(false);

  const [activeTab, setActiveTab] = useState<"segments" | "data" | "grid">("segments");
  const [segInput, setSegInput] = useState("");
  const [dataInput, setDataInput] = useState("");

  useEffect(() => {
    if (!dataPoints.length || areaAbsMax === 0) return;
    const cfp = dataPoints.filter(
      (p) => p.confidence >= confMin && p.confidence <= confMax,
    );
    const areas = cfp.map((p) => p.area).filter((a): a is number => a !== null);
    if (areas.length > 0) {
      const lo = Math.min(...areas), hi = Math.max(...areas);
      setAreaMin(lo);
      setAreaMax(hi);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confMin, confMax]);

  const filteredPoints = useMemo<DataPoint[]>(
    () =>
      dataPoints.filter((p) => {
        const withinConf = p.confidence >= confMin && p.confidence <= confMax;
        const withinArea = areaAbsMax === 0 || p.area === null || (p.area >= areaMin && p.area <= areaMax);
        const s = p.bbox ? Math.hypot(Math.abs(p.bbox.x2 - p.bbox.x1), Math.abs(p.bbox.y2 - p.bbox.y1)) : null;
        const withinSize = bboxSizeAbsMax === 0 || p.bbox === null || (s !== null && s >= bboxSizeMin && s <= bboxSizeMax);
        const withinRejected = !showOnlyRejected || p.status === "Y";
        return withinConf && withinArea && withinSize && withinRejected;
      }),
    [dataPoints, confMin, confMax, areaMin, areaMax, areaAbsMax, bboxSizeMin, bboxSizeMax, bboxSizeAbsMax, showOnlyRejected],
  );

  const stats = useMemo(() => computeStats(dataPoints, filteredPoints), [dataPoints, filteredPoints]);
  const activePoint: DataPoint | null = activeIdx >= 0 ? dataPoints[activeIdx] : null;
  const drawSegments = showSegments ? lineSegments : ([] as LineSegment[]);

  const parseAndPlot = (): void => {
    const result = parseData(dataInput);
    if (result.errors.length) alert("Parsing errors:\n" + result.errors.join("\n"));
    if (!result.points.length) { alert("No valid data points found!"); return; }

    const base = result.points[0].timestampSec;
    result.points.forEach((p) => { p.relativeTime = p.timestampSec - base; });

    const confidences = result.points.map((p) => p.confidence);
    setConfMin(Math.min(...confidences));
    setConfMax(Math.max(...confidences));

    const areas = result.points.map((p) => p.area).filter((a): a is number => a !== null);
    if (areas.length > 0) {
      const lo = Math.min(...areas), hi = Math.max(...areas);
      setAreaAbsMin(lo); setAreaAbsMax(hi); setAreaMin(lo); setAreaMax(hi);
    } else {
      setAreaAbsMin(0); setAreaAbsMax(0); setAreaMin(0); setAreaMax(0);
    }

    const sizes = result.points
      .map((p) => (p.bbox ? Math.hypot(Math.abs(p.bbox.x2 - p.bbox.x1), Math.abs(p.bbox.y2 - p.bbox.y1)) : null))
      .filter((s): s is number => s !== null);
    if (sizes.length > 0) {
      const slo = Math.min(...sizes), shi = Math.max(...sizes);
      setBBoxSizeAbsMin(slo); setBBoxSizeAbsMax(shi); setBBoxSizeMin(slo); setBBoxSizeMax(shi);
    } else {
      setBBoxSizeAbsMin(0); setBBoxSizeAbsMax(0); setBBoxSizeMin(0); setBBoxSizeMax(0);
    }

    setDataPoints(result.points);
    setSelectedRows(new Set());
    setActiveIdx(-1);
    setLastClicked(-1);
  };

  const clearData = (): void => {
    setDataInput(""); setDataPoints([]); setSelectedRows(new Set());
    setActiveIdx(-1); setLastClicked(-1);
    setConfMin(0); setConfMax(1);
    setAreaMin(0); setAreaMax(0); setAreaAbsMin(0); setAreaAbsMax(0);
  };

  const plotSegments = (): void => {
    if (!segInput.trim()) { alert("Paste segment data first."); return; }
    try { setLineSegments(parseSegments(segInput)); setShowSegments(true); }
    catch (e) { alert("Bad segments: " + (e as Error).message); }
  };

  const clearSegments = (): void => { setLineSegments([]); setSegInput(""); };

  const navPoint = useCallback(
    (dir: "up" | "down" | "left" | "right"): void => {
      if (!filteredPoints.length) {
        const s = 60;
        setPan((p) => ({
          x: p.x + (dir === "left" ? s : dir === "right" ? -s : 0),
          y: p.y + (dir === "up" ? s : dir === "down" ? -s : 0),
        }));
        return;
      }
      const curFi = filteredPoints.findIndex((p) => dataPoints.indexOf(p) === activeIdx);
      const next =
        dir === "right" || dir === "down"
          ? Math.min(filteredPoints.length - 1, Math.max(curFi, 0) + 1)
          : Math.max(0, curFi <= 0 ? 0 : curFi - 1);
      const gi = dataPoints.indexOf(filteredPoints[next]);
      setActiveIdx(gi);
      setSelectedRows(new Set([gi]));
    },
    [filteredPoints, dataPoints, activeIdx],
  );

  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono',monospace" };
  const sans: React.CSSProperties = { fontFamily: "'DM Sans',sans-serif" };

  return (
    <div
      className="lcp-root"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        // ✅ KEY CHANGE: the root scrolls vertically
        overflowY: "auto",
        overflowX: "auto",
        background: "#f1f5f9",
        ...sans,
        color: "#0f172a",
        // ✅ min-width ensures canvas is never clipped on narrow viewports
        minWidth: 1220,
      }}
    >
      <style>{CSS}</style>
      <FontLink />

      {/* ── HEADER — sticks to the scroll container top ── */}
      <header
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          height: 52,
          background: "#fff",
          borderBottom: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
          // ✅ sticky so header stays visible while scrolling
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "linear-gradient(135deg,#3b82f6,#06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(59,130,246,0.32)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.8" fill="white" fillOpacity="0.95" />
              <circle cx="3" cy="4" r="1.8" fill="white" fillOpacity="0.6" />
              <circle cx="13" cy="12" r="1.8" fill="white" fillOpacity="0.6" />
              <line x1="3" y1="4" x2="13" y2="12" stroke="white" strokeOpacity="0.35" strokeWidth="1" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.01em" }}>
              Coordinate Plotter
            </div>
            <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.1em", ...mono }}>
              DETECTION VISUALIZER
            </div>
          </div>
          <span
            style={{
              background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe",
              padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700,
              ...mono, letterSpacing: "0.06em", marginLeft: 4,
            }}
          >
            v4
          </span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {showOnlyRejected && dataPoints.length > 0 && (
            <span
              style={{
                fontSize: 10, fontWeight: 700, color: "#b91c1c",
                background: "#fef2f2", border: "1px solid #fca5a5",
                padding: "2px 8px", borderRadius: 4, ...mono,
              }}
            >
              ✗ REJECTED FILTER ON
            </span>
          )}
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
            Click pt to select · Alt+drag to pan
          </span>
        </div>
      </header>

      {/* ── CANVAS AREA — fixed 1200×500, never shrinks or grows ── */}
      <div
        style={{
          flexShrink: 0,
          width: "100%",
          height: 500,
          position: "relative",
          background: "#e2e8f0",
        }}
      >
        <CanvasSection
          canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
          bgImage={bgImage}
          dataPoints={dataPoints}
          filteredPoints={filteredPoints}
          lineSegments={drawSegments}
          confMin={confMin}
          confMax={confMax}
          areaMin={areaMin}
          areaMax={areaMax}
          areaAbsMax={areaAbsMax}
          bboxSizeMin={bboxSizeMin}
          bboxSizeMax={bboxSizeMax}
          bboxSizeAbsMax={bboxSizeAbsMax}
          showBboxes={showBboxes}
          showLines={showLines}
          showLabels={showLabels}
          showOnlyRejected={showOnlyRejected}
          pan={pan}
          setPan={setPan}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          activeIdx={activeIdx}
          setActiveIdx={setActiveIdx}
          lastClicked={lastClicked}
          setLastClicked={setLastClicked}
          activePoint={activePoint}
          filteredCount={filteredPoints.length}
          totalCount={dataPoints.length}
          onNavPoint={navPoint}
        />
      </div>

      {/* ── CONTROLS BAR — sits directly below the fixed canvas ── */}
      <div style={{ flexShrink: 0, width: "100%" }}>
        <ControlsBar
          bgImage={bgImage}
          setBgImage={setBgImage}
          confMin={confMin}
          confMax={confMax}
          setConfMin={setConfMin}
          setConfMax={setConfMax}
          areaMin={areaMin}
          areaMax={areaMax}
          areaAbsMin={areaAbsMin}
          areaAbsMax={areaAbsMax}
          setAreaMin={setAreaMin}
          setAreaMax={setAreaMax}
          bboxSizeMin={bboxSizeMin}
          bboxSizeMax={bboxSizeMax}
          bboxSizeAbsMin={bboxSizeAbsMin}
          bboxSizeAbsMax={bboxSizeAbsMax}
          setBBoxSizeMin={setBBoxSizeMin}
          setBBoxSizeMax={setBBoxSizeMax}
          showBboxes={showBboxes}
          setShowBboxes={setShowBboxes}
          showLines={showLines}
          setShowLines={setShowLines}
          showLabels={showLabels}
          setShowLabels={setShowLabels}
          showOnlyRejected={showOnlyRejected}
          setShowOnlyRejected={setShowOnlyRejected}
        />
      </div>

      {/* ── BOTTOM PANEL — scrollable content below ── */}
      <div style={{ flexShrink: 0, width: "100%" }}>
        <BottomPanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          dataPoints={dataPoints}
          filteredPoints={filteredPoints}
          lineSegments={lineSegments}
          stats={stats}
          segInput={segInput}
          setSegInput={setSegInput}
          showSegments={showSegments}
          setShowSegments={setShowSegments}
          onPlotSegments={plotSegments}
          onClearSegments={clearSegments}
          dataInput={dataInput}
          setDataInput={setDataInput}
          onPlotData={parseAndPlot}
          onClearData={clearData}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          activeIdx={activeIdx}
          setActiveIdx={setActiveIdx}
          lastClicked={lastClicked}
          setLastClicked={setLastClicked}
          confMin={confMin}
          confMax={confMax}
          areaMin={areaMin}
          areaMax={areaMax}
          areaAbsMax={areaAbsMax}
          showOnlyRejected={showOnlyRejected}
        />
      </div>
    </div>
  );
}