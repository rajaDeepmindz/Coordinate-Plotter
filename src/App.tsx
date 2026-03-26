import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  type DataPoint,
  type LineSegment,
  type Pan,
  type Tooltip,
  type Stats,
  parseData,
  parseSegments,
  computeStats,
} from "./service/Cordicate-service";

/* ── Font loader ─────────────────────────────────────────────────────────────── */
function LightFontLink(): null {
  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href =
      "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(l);
  }, []);
  return null;
}

/* ── Light canvas draw ───────────────────────────────────────────────────────── */
function drawLightCanvas({
  ctx, canvas, bgImage, dataPoints, lineSegments,
  confMin, confMax, showBboxes, showLines, showLabels,
  hoveredIdx, selectedRows, pan, activeIdx,
}: {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  bgImage: HTMLImageElement | null;
  dataPoints: DataPoint[];
  lineSegments: LineSegment[];
  confMin: number; confMax: number;
  showBboxes: boolean; showLines: boolean; showLabels: boolean;
  hoveredIdx: number; selectedRows: Set<number>; pan: Pan; activeIdx: number;
}): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(pan.x, pan.y);

  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(-pan.x, -pan.y, canvas.width, canvas.height);
    const step = 40;
    ctx.strokeStyle = "rgba(148,163,184,0.2)";
    ctx.lineWidth = 1;
    for (let x = (-pan.x % step) - step; x < canvas.width - pan.x + step; x += step) {
      ctx.beginPath(); ctx.moveTo(x, -pan.y); ctx.lineTo(x, canvas.height - pan.y); ctx.stroke();
    }
    for (let y = (-pan.y % step) - step; y < canvas.height - pan.y + step; y += step) {
      ctx.beginPath(); ctx.moveTo(-pan.x, y); ctx.lineTo(canvas.width - pan.x, y); ctx.stroke();
    }
    ctx.fillStyle = "rgba(100,116,139,0.12)";
    for (let x = (-pan.x % step) - step; x < canvas.width - pan.x + step; x += step) {
      for (let y = (-pan.y % step) - step; y < canvas.height - pan.y + step; y += step) {
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  const fp = dataPoints.filter((p) => p.confidence >= confMin && p.confidence <= confMax);

  if (showLines && fp.length > 1) {
    for (let i = 0; i < fp.length - 1; i++) {
      const f = fp[i].center, t = fp[i + 1].center;
      const angle = Math.atan2(t.y - f.y, t.x - f.x), hL = 8;
      const grad = ctx.createLinearGradient(f.x, f.y, t.x, t.y);
      grad.addColorStop(0, "rgba(59,130,246,0.4)");
      grad.addColorStop(1, "rgba(14,165,233,0.65)");
      ctx.strokeStyle = grad; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(t.x, t.y); ctx.stroke();
      ctx.fillStyle = "rgba(14,165,233,0.8)";
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x - hL * Math.cos(angle - Math.PI / 7), t.y - hL * Math.sin(angle - Math.PI / 7));
      ctx.lineTo(t.x - hL * Math.cos(angle + Math.PI / 7), t.y - hL * Math.sin(angle + Math.PI / 7));
      ctx.closePath(); ctx.fill();
    }
  }

  if (showBboxes) {
    fp.forEach((p) => {
      if (!p.bbox) return;
      ctx.strokeStyle = p.status === "Y" ? "rgba(220,38,38,0.5)" : "rgba(22,163,74,0.5)";
      ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.strokeRect(p.bbox.x1, p.bbox.y1, p.bbox.x2 - p.bbox.x1, p.bbox.y2 - p.bbox.y1);
      ctx.setLineDash([]);
    });
  }

  if (selectedRows.size > 0) {
    selectedRows.forEach((idx) => {
      const p = dataPoints[idx];
      if (!p?.bbox) return;
      ctx.strokeStyle = "rgba(245,158,11,0.9)"; ctx.lineWidth = 2;
      ctx.strokeRect(p.bbox.x1, p.bbox.y1, p.bbox.x2 - p.bbox.x1, p.bbox.y2 - p.bbox.y1);
      ctx.fillStyle = "rgba(245,158,11,0.9)";
      ctx.font = "bold 9px 'IBM Plex Mono',monospace";
      ctx.fillText(`F${p.frameNumber}`, p.bbox.x1 + 2, p.bbox.y1 - 4);
    });
  }

  fp.forEach((p) => {
    const gi = dataPoints.indexOf(p);
    const isHov = gi === hoveredIdx, isSel = selectedRows.has(gi), isActive = gi === activeIdx;
    const r = isHov || isActive ? 7 : isSel ? 5.5 : 4;
    const accepted = p.status === "N";
    const color = accepted ? "#16a34a" : "#dc2626";
    const glowColor = accepted ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.15)";

    if (isHov || isActive) {
      ctx.beginPath(); ctx.arc(p.center.x, p.center.y, r + 7, 0, 2 * Math.PI);
      ctx.fillStyle = glowColor; ctx.fill();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(p.center.x, p.center.y, r + 1.5, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(p.center.x, p.center.y, r, 0, 2 * Math.PI); ctx.fill();

    if (isActive) {
      ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.center.x, p.center.y, r + 4, 0, 2 * Math.PI); ctx.stroke();
    } else if (isHov || isSel) {
      ctx.strokeStyle = isSel ? "#f59e0b" : "#64748b"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.center.x, p.center.y, r + 2, 0, 2 * Math.PI); ctx.stroke();
    }

    if (showLabels) {
      ctx.fillStyle = "rgba(15,23,42,0.8)";
      ctx.font = "9px 'IBM Plex Mono',monospace";
      ctx.fillText(`F${p.frameNumber}`, p.center.x + 9, p.center.y - 8);
    }
  });

  if (lineSegments.length) {
    const n = lineSegments.length;
    lineSegments.forEach((seg, i) => {
      ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2);
      ctx.strokeStyle = i === 0 ? "rgba(5,150,105,0.85)" : i === n - 1 ? "rgba(220,38,38,0.85)" : "rgba(217,119,6,0.8)";
      ctx.lineWidth = 2.5; ctx.stroke();
    });
  }
  ctx.restore();
}

/* ── Dual Range Slider ───────────────────────────────────────────────────────── */
function LightDualRangeSlider({ min = 0, max = 1, step = 0.01, valueMin, valueMax, onChange }: {
  min?: number; max?: number; step?: number;
  valueMin: number; valueMax: number;
  onChange: (lo: number, hi: number) => void;
}): JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"lo" | "hi" | null>(null);
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const snap = (v: number) => Math.round(v / step) * step;

  const fromPct = useCallback((px: number) => {
    if (!trackRef.current) return min;
    const rect = trackRef.current.getBoundingClientRect();
    return snap(min + clamp((px - rect.left) / rect.width, 0, 1) * (max - min));
  }, [min, max, step]);

  const onMouseDown = (which: "lo" | "hi") => (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault();
    dragging.current = which;
    const move = (ev: MouseEvent) => {
      const val = fromPct(ev.clientX);
      if (dragging.current === "lo") onChange(clamp(val, min, valueMax - step), valueMax);
      else onChange(valueMin, clamp(val, valueMin + step, max));
    };
    const up = () => { dragging.current = null; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const lo = pct(valueMin), hi = pct(valueMax);
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", height: 24 }}>
      <div ref={trackRef} style={{ position: "relative", width: "100%", height: 6, borderRadius: 3, background: "#dde3ed" }}>
        <div style={{ position: "absolute", height: "100%", left: `${lo}%`, width: `${hi - lo}%`, borderRadius: 3, background: "linear-gradient(90deg,#3b82f6,#0ea5e9)" }} />
        {([["lo", lo, "#3b82f6"], ["hi", hi, "#0ea5e9"]] as [string, number, string][]).map(([which, pos, color]) => (
          <div key={which} onMouseDown={onMouseDown(which as "lo" | "hi")}
            style={{
              position: "absolute", left: `${pos}%`, top: "50%", transform: "translate(-50%,-50%)", zIndex: 2,
              width: 16, height: 16, borderRadius: "50%", background: "#fff",
              border: `2px solid ${color}`, boxShadow: "0 1px 4px rgba(0,0,0,0.14)", cursor: "grab"
            }} />
        ))}
      </div>
    </div>
  );
}

/* ── Light DPad ──────────────────────────────────────────────────────────────── */
function LightDPad({ onUp, onDown, onLeft, onRight }: { onUp: () => void; onDown: () => void; onLeft: () => void; onRight: () => void; }): JSX.Element {
  const btn: React.CSSProperties = {
    width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: 8, border: "1.5px solid #cbd5e1", background: "#f8fafc",
    color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer",
    transition: "all 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
  };
  const Btn = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button style={btn} onClick={onClick}
      onMouseEnter={(e) => { Object.assign((e.currentTarget as HTMLElement).style, { background: "#eff6ff", borderColor: "#93c5fd", color: "#2563eb" }); }}
      onMouseLeave={(e) => { Object.assign((e.currentTarget as HTMLElement).style, { background: "#f8fafc", borderColor: "#cbd5e1", color: "#475569" }); }}
    >{label}</button>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <Btn label="▲" onClick={onUp} />
      <div style={{ display: "flex", gap: 3 }}>
        <Btn label="◀" onClick={onLeft} />
        <div style={{ width: 34, height: 34, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#94a3b8" }} />
        </div>
        <Btn label="▶" onClick={onRight} />
      </div>
      <Btn label="▼" onClick={onDown} />
    </div>
  );
}

/* ── Light Toggle ────────────────────────────────────────────────────────────── */
function LightToggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string; }): JSX.Element {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", userSelect: "none" }}>
      <div onClick={() => onChange(!value)} style={{
        position: "relative", width: 36, height: 20, borderRadius: 10, flexShrink: 0,
        background: value ? "#3b82f6" : "#cbd5e1", border: value ? "1.5px solid #2563eb" : "1.5px solid #b0bec5", transition: "all 0.2s",
      }}>
        <div style={{ position: "absolute", top: 2, left: value ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.18)", transition: "left 0.2s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, color: value ? "#1d4ed8" : "#64748b", fontFamily: "'DM Sans',sans-serif" }}>{label}</span>
    </label>
  );
}

/* ── Global styles ───────────────────────────────────────────────────────────── */
const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  .lcp-root { --accent: #3b82f6; --accent-dark: #1d4ed8; --al: #eff6ff;
    --s: #fff; --s2: #f8fafc; --s3: #f1f5f9;
    --b: #e2e8f0; --bs: #cbd5e1;
    --t: #0f172a; --t2: #475569; --t3: #94a3b8;
    --mono: 'IBM Plex Mono',monospace; --sans: 'DM Sans',sans-serif;
  }
  .btn { display:inline-flex; align-items:center; gap:5px; padding:5px 11px; border-radius:7px;
    font-size:11px; font-weight:600; cursor:pointer; transition:all .15s;
    border:1.5px solid; font-family:'DM Sans',sans-serif; }
  .btn-p { background:#eff6ff; border-color:#93c5fd; color:#1d4ed8; }
  .btn-p:hover { background:#dbeafe; border-color:#3b82f6; }
  .btn-d { background:#fef2f2; border-color:#fca5a5; color:#b91c1c; }
  .btn-d:hover { background:#fee2e2; }
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
  .tag-y { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; padding:2px 7px; border-radius:4px; font-size:9px; font-weight:700; font-family:'IBM Plex Mono',monospace; }
  .tag-n { background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:2px 7px; border-radius:4px; font-size:9px; font-weight:700; font-family:'IBM Plex Mono',monospace; }
  .hud { background:rgba(255,255,255,0.97); border:1.5px solid #e2e8f0; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.08); backdrop-filter:blur(12px); }
  .pst { padding:4px 10px; border-radius:6px; font-size:10px; font-weight:700; cursor:pointer; transition:all .15s; border:1.5px solid; font-family:'IBM Plex Mono',monospace; }
  .pst.on { background:#dbeafe; border-color:#3b82f6; color:#1d4ed8; }
  .pst:not(.on) { background:#fff; border-color:#cbd5e1; color:#475569; }
  .pst:not(.on):hover { border-color:#3b82f6; color:#2563eb; background:#eff6ff; }
  ::-webkit-scrollbar { width:5px; height:5px; }
  ::-webkit-scrollbar-track { background:#f1f5f9; }
  ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }
`;

/* ── MAIN ────────────────────────────────────────────────────────────────────── */
export default function App(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [lineSegments, setLineSegments] = useState<LineSegment[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number>(-1);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [lastClicked, setLastClicked] = useState<number>(-1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const isPanning = useRef<boolean>(false);
  const panStart = useRef<{ mx: number; my: number; px: number; py: number }>({ mx: 0, my: 0, px: 0, py: 0 });
  const [confMin, setConfMin] = useState<number>(0);
  const [confMax, setConfMax] = useState<number>(1);
  const [showBboxes, setShowBboxes] = useState<boolean>(false);
  const [showLines, setShowLines] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"segments" | "data" | "grid">("segments");
  const [segInput, setSegInput] = useState<string>("");
  const [dataInput, setDataInput] = useState<string>("");
  const [tooltip, setTooltip] = useState<Tooltip>({ visible: false, x: 0, y: 0, point: null });

  const filteredPoints = useMemo<DataPoint[]>(
    () => dataPoints.filter((p) => p.confidence >= confMin && p.confidence <= confMax),
    [dataPoints, confMin, confMax]
  );

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    drawLightCanvas({ ctx, canvas, bgImage, dataPoints, lineSegments, confMin, confMax, showBboxes, showLines, showLabels, hoveredIdx, selectedRows, pan, activeIdx });
  }, [bgImage, dataPoints, lineSegments, confMin, confMax, showBboxes, showLines, showLabels, hoveredIdx, selectedRows, pan, activeIdx]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width) - pan.x;
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height) - pan.y;
    if (isPanning.current) { setPan({ x: panStart.current.px + e.clientX - panStart.current.mx, y: panStart.current.py + e.clientY - panStart.current.my }); return; }
    let found = -1;
    for (let i = filteredPoints.length - 1; i >= 0; i--) {
      const p = filteredPoints[i], dx = cx - p.center.x, dy = cy - p.center.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 9) { found = dataPoints.indexOf(p); break; }
    }
    setHoveredIdx(found);
    if (found >= 0) setTooltip({ visible: true, x: e.clientX, y: e.clientY, point: dataPoints[found] });
    else setTooltip((t) => ({ ...t, visible: false }));
  }, [dataPoints, filteredPoints, pan]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
      e.preventDefault();
    }
  };

  const navPoint = (dir: "up" | "down" | "left" | "right"): void => {
    if (!filteredPoints.length) {
      const s = 60;
      setPan((p) => ({ x: p.x + (dir === "left" ? s : dir === "right" ? -s : 0), y: p.y + (dir === "up" ? s : dir === "down" ? -s : 0) }));
      return;
    }
    const curFi = filteredPoints.findIndex((p) => dataPoints.indexOf(p) === activeIdx);
    const next = dir === "right" || dir === "down" ? Math.min(filteredPoints.length - 1, Math.max(curFi, 0) + 1) : Math.max(0, curFi <= 0 ? 0 : curFi - 1);
    const gi = dataPoints.indexOf(filteredPoints[next]);
    setActiveIdx(gi); setSelectedRows(new Set([gi]));
    const p = filteredPoints[next], canvas = canvasRef.current;
    if (canvas) setPan({ x: canvas.width / 2 - p.center.x, y: canvas.height / 2 - p.center.y });
  };

  const parseAndPlot = (): void => {
    const result = parseData(dataInput);
    if (result.errors.length) alert("Parsing errors:\n" + result.errors.join("\n"));
    if (!result.points.length) { alert("No valid data points found!"); return; }
    const base = result.points[0].timestampSec;
    result.points.forEach((p) => { p.relativeTime = p.timestampSec - base; });
    setDataPoints(result.points); setSelectedRows(new Set()); setActiveIdx(-1); setLastClicked(-1);
  };

  const clearData = (): void => { setDataInput(""); setDataPoints([]); setSelectedRows(new Set()); setHoveredIdx(-1); setActiveIdx(-1); };

  const plotSegments = (): void => {
    if (!segInput.trim()) { alert("Paste segment data first."); return; }
    try { setLineSegments(parseSegments(segInput)); } catch (e) { alert("Bad segments: " + (e as Error).message); }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const img = new Image(); img.onload = () => setBgImage(img); img.src = ev.target?.result as string; };
    reader.readAsDataURL(file);
  };

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, idx: number): void => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && lastClicked !== -1) {
        const lo = Math.min(lastClicked, idx), hi = Math.max(lastClicked, idx);
        if (!e.ctrlKey && !e.metaKey) next.clear();
        for (let i = lo; i <= hi; i++) next.add(i);
      } else if (e.ctrlKey || e.metaKey) { next.has(idx) ? next.delete(idx) : next.add(idx); }
      else { next.clear(); next.add(idx); }
      return next;
    });
    setLastClicked(idx); setActiveIdx(idx);
  };

  const toggleSelectAll = (checked: boolean): void => setSelectedRows(checked ? new Set(dataPoints.map((_, i) => i)) : new Set());
  const stats = useMemo<Stats | null>(() => computeStats(dataPoints, filteredPoints), [dataPoints, filteredPoints]);
  const selSize = selectedRows.size;
  const allChecked = dataPoints.length > 0 && selSize === dataPoints.length;
  const someChecked = selSize > 0 && selSize < dataPoints.length;
  const activePoint: DataPoint | null = activeIdx >= 0 ? dataPoints[activeIdx] : null;

  const PRESETS: [number, number, string][] = [[0, 1, "ALL"], [0, 0.5, "LOW"], [0.5, 1, "HIGH"], [0.8, 1, "TOP"]];

  // ── shared style tokens ──────────────────────────────────────────────────────
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono',monospace" };
  const sans: React.CSSProperties = { fontFamily: "'DM Sans',sans-serif" };
  const divider = <div style={{ width: 1, height: 22, background: "#e2e8f0", flexShrink: 0 }} />;

  return (
    <div className="lcp-root" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#f1f5f9", ...sans, color: "#0f172a" }}>
      <style>{CSS}</style>
      <LightFontLink />

      {/* ── HEADER ── */}
      <header style={{ flexShrink: 0, display: "flex", alignItems: "center", padding: "0 20px", height: 52, background: "#fff", borderBottom: "1.5px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#3b82f6,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(59,130,246,0.32)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.8" fill="white" fillOpacity="0.95" />
              <circle cx="3" cy="4" r="1.8" fill="white" fillOpacity="0.6" />
              <circle cx="13" cy="12" r="1.8" fill="white" fillOpacity="0.6" />
              <line x1="3" y1="4" x2="13" y2="12" stroke="white" strokeOpacity="0.35" strokeWidth="1" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", letterSpacing: "0.01em" }}>Coordinate Plotter</div>
            <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.1em", ...mono }}>DETECTION VISUALIZER</div>
          </div>
          <span style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, ...mono, letterSpacing: "0.06em", marginLeft: 4 }}>v2</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {dataPoints.length > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 6, ...mono, fontSize: 10 }}>
              <span style={{ color: "#2563eb", fontWeight: 700 }}>{filteredPoints.length}</span>
              <span style={{ color: "#cbd5e1" }}>/</span>
              <span style={{ color: "#64748b", fontWeight: 600 }}>{dataPoints.length}</span>
              <span style={{ color: "#94a3b8", fontSize: 9 }}>pts</span>
            </div>
          )}
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>Alt + drag to pan</span>
        </div>
      </header>

      {/* ── CANVAS SECTION ── */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#f8fafc", cursor: "crosshair" }}
          onMouseMove={handleMouseMove} onMouseDown={handleMouseDown}
          onMouseUp={() => { isPanning.current = false; }}
          onMouseLeave={() => { setHoveredIdx(-1); setTooltip((t) => ({ ...t, visible: false })); isPanning.current = false; }}
        >
          <canvas ref={canvasRef} width={1200} height={500} style={{ display: "block", width: "100%", height: "100%", objectFit: "fill" }} />

          {/* Legend */}
          <div className="hud" style={{ position: "absolute", top: 12, left: 12, padding: "10px 14px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 8, ...mono }}>LEGEND</div>
            {([["#16a34a", "Accepted"], ["#dc2626", "Rejected"]] as [string, string][]).map(([c, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: c, boxShadow: `0 0 0 2px white, 0 0 0 3.5px ${c}55`, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>{l}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
              <div style={{ width: 16, height: 2.5, borderRadius: 2, background: "#f59e0b" }} />
              <span style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>Selected BBox</span>
            </div>
          </div>

          {/* Active Point HUD */}
          {activePoint && (
            <div className="hud" style={{ position: "absolute", top: 12, right: 12, padding: "10px 16px", minWidth: 168 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#2563eb", letterSpacing: "0.1em", marginBottom: 9, ...mono }}>ACTIVE POINT</div>
              {([["Frame", activePoint.frameNumber, "#0f172a"], ["Position", `(${activePoint.center.x},${activePoint.center.y})`, "#475569"], ["Confidence", activePoint.confidence.toFixed(4), "#2563eb"]] as [string, string, string][]).map(([k, v, c]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{k}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: c, ...mono }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid #f1f5f9", fontSize: 11, fontWeight: 700, textAlign: "center", color: activePoint.status === "N" ? "#15803d" : "#b91c1c", ...mono }}>
                {activePoint.status === "N" ? "✓ ACCEPTED" : "✗ REJECTED"}
              </div>
            </div>
          )}

          {/* DPad */}
          <div style={{ position: "absolute", bottom: 14, right: 14 }}>
            <div style={{ textAlign: "center", fontSize: 9, color: "#94a3b8", fontWeight: 600, marginBottom: 5, letterSpacing: "0.06em", ...mono }}>
              {filteredPoints.length ? "NAV PTS" : "PAN"}
            </div>
            <LightDPad onUp={() => navPoint("up")} onDown={() => navPoint("down")} onLeft={() => navPoint("left")} onRight={() => navPoint("right")} />
          </div>

          {(pan.x !== 0 || pan.y !== 0) && (
            <button className="btn btn-g" onClick={() => setPan({ x: 0, y: 0 })} style={{ position: "absolute", bottom: 14, left: 12, fontSize: 10 }}>⌖ Reset Pan</button>
          )}
        </div>

        {/* ── CONTROLS BAR ── */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 14, padding: "8px 16px", flexWrap: "wrap", background: "#fff", borderTop: "1.5px solid #e2e8f0", boxShadow: "0 -1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button className="btn btn-g" onClick={() => fileRef.current?.click()}>📁 BG Image</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBgUpload} />
            {bgImage && <button className="btn btn-d" onClick={() => setBgImage(null)}>🗑 Remove</button>}
          </div>

          {divider}

          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 220, maxWidth: 320 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "0.07em", ...mono }}>CONF</span>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <LightDualRangeSlider min={0} max={1} step={0.01} valueMin={confMin} valueMax={confMax}
                onChange={(lo, hi) => { setConfMin(+lo.toFixed(2)); setConfMax(+hi.toFixed(2)); }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6", ...mono }}>{confMin.toFixed(2)}</span>
                <span style={{ fontSize: 10, color: "#cbd5e1", ...mono }}>—</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#0ea5e9", ...mono }}>{confMax.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {PRESETS.map(([lo, hi, lbl]) => {
              const on = Math.abs(confMin - lo) < 0.001 && Math.abs(confMax - hi) < 0.001;
              return <button key={lbl} className={`pst ${on ? "on" : ""}`} onClick={() => { setConfMin(lo); setConfMax(hi); }}>{lbl}</button>;
            })}
          </div>

          {divider}

          <div style={{ display: "flex", gap: 16 }}>
            <LightToggle value={showBboxes} onChange={setShowBboxes} label="Bounding Boxes" />
            <LightToggle value={showLines} onChange={setShowLines} label="Trail Lines" />
            <LightToggle value={showLabels} onChange={setShowLabels} label="Frame Labels" />
          </div>
        </div>
      </div>

      {/* ── BOTTOM PANEL ── */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", borderTop: "1.5px solid #e2e8f0", height: 268, background: "#f8fafc" }}>
        <div style={{ display: "flex", flexShrink: 0, alignItems: "center", background: "#fff", borderBottom: "1.5px solid #e2e8f0", paddingLeft: 4 }}>
          {[["segments", "📐 Segments"], ["data", "📋 Data Input"], ["grid", `📊 Grid${dataPoints.length ? ` · ${dataPoints.length}` : ""}`]].map(([key, label]) => (
            <button key={key} className={`cp-tab ${activeTab === key ? "on" : ""}`} onClick={() => setActiveTab(key as "segments" | "data" | "grid")}>{label}</button>
          ))}
        </div>

        {/* SEGMENTS TAB */}
        {activeTab === "segments" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px", flexShrink: 0, background: "#fff", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {([["#059669", "Entry"], ["#d97706", "Middle"], ["#dc2626", "Exit"]] as [string, string][]).map(([c, l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 18, height: 2.5, borderRadius: 2, background: c }} />
                    <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{l}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-s" onClick={plotSegments}>▶ Plot</button>
                <button className="btn btn-d" onClick={() => { setLineSegments([]); setSegInput(""); }}>🗑 Clear</button>
              </div>
            </div>
            <div style={{ flex: 1, padding: 12, minHeight: 0 }}>
              <textarea className="cp-ta" value={segInput} onChange={(e) => setSegInput(e.target.value)}
                placeholder="[[(x1,y1),(x2,y2)], [(x1,y1),(x2,y2)], ...]" />
            </div>
          </div>
        )}

        {/* DATA INPUT TAB */}
        {activeTab === "data" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px", flexShrink: 0, background: "#fff", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em", ...mono }}>PIPE-DELIMITED TABLE</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-s" onClick={parseAndPlot}>▶ Plot Data</button>
                <button className="btn btn-d" onClick={clearData}>🗑 Clear</button>
              </div>
            </div>
            <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
              <textarea className="cp-ta" style={{ flex: 1, borderRadius: 0, border: "none", borderRight: "1.5px solid #f1f5f9" }}
                value={dataInput} onChange={(e) => setDataInput(e.target.value)}
                placeholder="| # | FRAME NO | TIMESTAMP | REJECTED | CENTRE | BOUNDING BOX | CONFIDENCE | CLASS ID | SOURCE | MASK AREA | REJECT REASON |" />
              <div style={{ width: 176, padding: 12, overflowY: "auto", flexShrink: 0, background: "#fff", borderLeft: "1px solid #f1f5f9" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.07em", marginBottom: 10, ...mono }}>STATISTICS</div>
                {stats ? (
                  <>
                    <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                      {([["Shown", `${stats.shown}/${stats.total}`, "#2563eb"], ["Accepted", stats.acc, "#15803d"], ["Rejected", stats.rej, "#b91c1c"]] as [string, string | number, string][]).map(([k, v, c]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0" }}>
                          <span style={{ color: "#94a3b8", fontWeight: 500 }}>{k}</span>
                          <span style={{ color: c, fontWeight: 700, ...mono }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
                      {([["Avg", stats.avg, "#7c3aed"], ["Min", stats.mn, "#0369a1"], ["Max", stats.mx, "#0369a1"]] as [string, string, string][]).map(([k, v, c]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0" }}>
                          <span style={{ color: "#94a3b8", fontWeight: 500 }}>{k}</span>
                          <span style={{ color: c, fontWeight: 700, ...mono }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.7, ...mono }}>
                      <div>{stats.t0}</div><div style={{ color: "#e2e8f0" }}>↓</div><div>{stats.t1}</div>
                    </div>
                  </>
                ) : <div style={{ fontSize: 11, color: "#cbd5e1", fontStyle: "italic" }}>No data loaded</div>}
              </div>
            </div>
          </div>
        )}

        {/* GRID TAB */}
        {activeTab === "grid" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", flexShrink: 0, background: "#fff", borderBottom: "1px solid #f1f5f9" }}>
              <button className="btn btn-g" style={{ fontSize: 10 }} onClick={() => setSelectedRows(new Set())}>✕ Clear</button>
              <button className="btn btn-p" style={{ fontSize: 10 }} onClick={() => toggleSelectAll(true)}>☑ All</button>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 6, ...mono, fontSize: 10, marginLeft: 4 }}>
                <span style={{ color: "#94a3b8" }}>conf</span>
                <span style={{ color: "#2563eb", fontWeight: 700 }}>{confMin.toFixed(2)}</span>
                <span style={{ color: "#cbd5e1" }}>–</span>
                <span style={{ color: "#0ea5e9", fontWeight: 700 }}>{confMax.toFixed(2)}</span>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
                {!dataPoints.length ? "No data loaded" : selSize === 0 ? `${filteredPoints.length} visible / ${dataPoints.length} total` : `${selSize} of ${dataPoints.length} selected`}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {!dataPoints.length ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>
                  Paste data in <span style={{ color: "#2563eb", fontWeight: 600, margin: "0 4px" }}>Data Input</span> then click ▶ Plot Data
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                    <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                      <th style={{ width: 36, padding: "7px 10px", textAlign: "center", borderRight: "1px solid #f1f5f9" }}>
                        <input type="checkbox" checked={allChecked}
                          ref={(el) => { if (el) el.indeterminate = someChecked; }}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          style={{ accentColor: "#3b82f6", cursor: "pointer" }} />
                      </th>
                      {["Frame", "Timestamp", "Center", "BBox", "Confidence", "Class", "Source", "Area", "Rejected?", "Reason"].map((h) => (
                        <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap", borderRight: "1px solid #f1f5f9", ...mono }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataPoints.map((p, idx) => {
                      const isSel = selectedRows.has(idx);
                      const isActive = idx === activeIdx;
                      const inRange = p.confidence >= confMin && p.confidence <= confMax;
                      const bboxStr = p.bbox ? `[${p.bbox.x1},${p.bbox.y1},${p.bbox.x2},${p.bbox.y2}]` : "—";
                      const rowBg = isActive ? "#eff6ff" : isSel ? "#dbeafe" : !inRange ? undefined : idx % 2 === 0 ? "#fff" : "#fafbfc";
                      return (
                        <tr key={idx} className="trow" onClick={(e) => handleRowClick(e, idx)}
                          style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: rowBg, opacity: !inRange ? 0.3 : 1, outline: isActive ? "2px solid #bfdbfe" : "none", outlineOffset: -2 }}>
                          <td style={{ padding: "5px 10px", textAlign: "center", borderRight: "1px solid #f1f5f9" }}>
                            <input type="checkbox" checked={isSel}
                              onChange={(e) => { e.stopPropagation(); setSelectedRows((prev) => { const n = new Set(prev); e.target.checked ? n.add(idx) : n.delete(idx); return n; }); }}
                              onClick={(e) => e.stopPropagation()} style={{ accentColor: "#3b82f6", cursor: "pointer" }} />
                          </td>
                          <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9", fontWeight: 600, color: "#0f172a", ...mono }}>{p.frameNumber}</td>
                          <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9", color: "#64748b", fontSize: 10, whiteSpace: "nowrap", ...mono }}>{p.timestamp}</td>
                          <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9", color: "#0f172a", whiteSpace: "nowrap", ...mono }}>({p.center.x},{p.center.y})</td>
                          <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9", color: "#64748b", fontSize: 9.5, whiteSpace: "nowrap", ...mono }}>{bboxStr}</td>
                          <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9" }}>
                            <span style={{ fontWeight: 700, color: p.confidence < 0.5 ? "#d97706" : p.confidence >= 0.8 ? "#2563eb" : "#475569", ...mono }}>{p.confidence.toFixed(4)}</span>
                          </td>
                          <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9", color: "#64748b", ...mono }}>{p.classId ?? "—"}</td>
                          <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9", color: "#64748b" }}>{p.source}</td>
                          <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9", color: "#64748b", ...mono }}>{p.area ?? "—"}</td>
                          <td style={{ padding: "5px 10px", borderRight: "1px solid #f1f5f9" }}>
                            <span className={p.status === "Y" ? "tag-y" : "tag-n"}>{p.status === "Y" ? "YES" : "NO"}</span>
                          </td>
                          <td style={{ padding: "5px 10px", color: "#94a3b8", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.description}>{p.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── TOOLTIP ── */}
      {tooltip.visible && tooltip.point && (
        <div style={{ position: "fixed", zIndex: 50, left: tooltip.x + 16, top: tooltip.y - 10, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "12px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)", pointerEvents: "none", minWidth: 180, ...sans }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#2563eb", letterSpacing: "0.1em", marginBottom: 10, ...mono }}>DETECTION INFO</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {([["Area",tooltip.point.area, "#0f172a"],["Frame", tooltip.point.frameNumber, "#0f172a"], ["Position", `(${tooltip.point.center.x}, ${tooltip.point.center.y})`, "#475569"], ["Confidence", tooltip.point.confidence.toFixed(4), "#2563eb"], ["Timestamp", tooltip.point.timestamp, "#64748b"], ["Δt", `+${(tooltip.point.relativeTime || 0).toFixed(3)}s`, "#94a3b8"]] as [string, string, string][]).map(([k, v, c]) => (
              <div key={k} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, width: 72, flexShrink: 0 }}>{k}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: c, ...mono }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: tooltip.point.status === "N" ? "#15803d" : "#b91c1c", ...mono }}>
              {tooltip.point.status === "N" ? "✓ ACCEPTED" : "✗ REJECTED"}
            </span>
          </div>
          {tooltip.point.description !== "-" && (
            <div style={{ marginTop: 5, fontSize: 10, color: "#d97706", fontWeight: 500 }}>{tooltip.point.description}</div>
          )}
        </div>
      )}
    </div>
  );
}