import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Center {
  x: number;
  y: number;
}

export interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DataPoint {
  frameNumber: string;
  timestamp: string;
  timestampSec: number;
  status: string;
  center: Center;
  bbox: BBox | null;
  confidence: number;
  classId: number | null;
  source: string;
  area: number | null;
  description: string;
  relativeTime: number;
}

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ParseResult {
  points: DataPoint[];
  errors: string[];
}

export interface Pan {
  x: number;
  y: number;
}

export interface Tooltip {
  visible: boolean;
  x: number;
  y: number;
  point: DataPoint | null;
}

export interface DrawCanvasParams {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  bgImage: HTMLImageElement | null;
  dataPoints: DataPoint[];
  lineSegments: LineSegment[];
  confMin: number;
  confMax: number;
  showBboxes: boolean;
  showLines: boolean;
  showLabels: boolean;
  hoveredIdx: number;
  selectedRows: Set<number>;
  pan: Pan;
  activeIdx: number;
}

export interface Stats {
  total: number;
  shown: number;
  acc: number;
  rej: number;
  avg: string;
  mn: string;
  mx: string;
  t0: string;
  t1: string;
}

export interface DualRangeSliderProps {
  min?: number;
  max?: number;
  step?: number;
  valueMin: number;
  valueMax: number;
  onChange: (lo: number, hi: number) => void;
}

export interface DPadProps {
  onUp: () => void;
  onDown: () => void;
  onLeft: () => void;
  onRight: () => void;
}

export interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

// ── Utility Functions ──────────────────────────────────────────────────────────

export function tsToSec(ts: string): number {
  const m = ts.match(/(\d+):(\d+):(\d+)[.,](\d+)/);
  if (!m) return 0;
  return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4].padEnd(3, "0").slice(0, 3) / 1000;
}

export function parseData(text: string): ParseResult {
  const lines = text.trim().split("\n");
  const points: DataPoint[] = [];
  const errors: string[] = [];

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("+")) return;
    if (/FRAME\s*NO|TIMESTAMP|REJECTED|CENTRE|BOUNDING/i.test(line)) return;
    if (!line.startsWith("|")) return;

    try {
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter((_, j, a) => j > 0 && j < a.length - 1);

      if (cells.length < 11) {
        errors.push(`Line ${i + 1}: only ${cells.length} columns`);
        return;
      }

      const [
        ,
        frameNumber,
        timestamp,
        status,
        centreStr,
        bboxStr,
        confStr,
        classStr,
        source,
        areaStr,
        description,
      ] = cells;

      const cM = centreStr.match(/\((\d+),\s*(\d+)\)/);
      if (!cM) {
        errors.push(`Line ${i + 1}: bad CENTRE`);
        return;
      }

      const bM = bboxStr.match(/\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]/);
      const confidence = parseFloat(confStr);
      if (isNaN(confidence)) {
        errors.push(`Line ${i + 1}: bad confidence`);
        return;
      }

      points.push({
        frameNumber,
        timestamp,
        timestampSec: tsToSec(timestamp),
        status: status.trim(),
        center: { x: +cM[1], y: +cM[2] },
        bbox: bM
          ? { x1: +bM[1], y1: +bM[2], x2: +bM[3], y2: +bM[4] }
          : null,
        confidence,
        classId: parseInt(classStr) || null,
        source: source.trim(),
        area: parseInt(areaStr) || null,
        description: (description || "-").trim() || "-",
        relativeTime: 0,
      });
    } catch (e) {
      errors.push(`Line ${i + 1}: ${(e as Error).message}`);
    }
  });

  return { points, errors };
}

export function parseSegments(raw: string): LineSegment[] {
  const json = raw.replace(/\(/g, "[").replace(/\)/g, "]");
  const parsed = JSON.parse(json) as unknown[][];

  if (!Array.isArray(parsed)) throw new Error("Expected array");

  return parsed.map((seg) => {
    if (!Array.isArray(seg) || seg.length < 2) throw new Error("Bad segment");
    const s = seg as number[][];
    return { x1: s[0][0], y1: s[0][1], x2: s[1][0], y2: s[1][1] };
  });
}

export function drawCanvas({
  ctx,
  canvas,
  bgImage,
  dataPoints,
  lineSegments,
  confMin,
  confMax,
  showBboxes,
  showLines,
  showLabels,
  hoveredIdx,
  selectedRows,
  pan,
  activeIdx,
}: DrawCanvasParams): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(pan.x, pan.y);

  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#080c12";
    ctx.fillRect(-pan.x, -pan.y, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(56,189,248,0.05)";
    ctx.lineWidth = 1;
    const step = 40;
    for (
      let x = (-pan.x % step) - step;
      x < canvas.width - pan.x + step;
      x += step
    ) {
      ctx.beginPath();
      ctx.moveTo(x, -pan.y);
      ctx.lineTo(x, canvas.height - pan.y);
      ctx.stroke();
    }
    for (
      let y = (-pan.y % step) - step;
      y < canvas.height - pan.y + step;
      y += step
    ) {
      ctx.beginPath();
      ctx.moveTo(-pan.x, y);
      ctx.lineTo(canvas.width - pan.x, y);
      ctx.stroke();
    }
  }

  const fp = dataPoints.filter(
    (p) => p.confidence >= confMin && p.confidence <= confMax
  );

  if (showLines && fp.length > 1) {
    for (let i = 0; i < fp.length - 1; i++) {
      const f = fp[i].center;
      const t = fp[i + 1].center;
      const angle = Math.atan2(t.y - f.y, t.x - f.x);
      const hL = 9;
      const grad = ctx.createLinearGradient(f.x, f.y, t.x, t.y);
      grad.addColorStop(0, "rgba(56,189,248,0.5)");
      grad.addColorStop(1, "rgba(99,102,241,0.85)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
      ctx.fillStyle = "rgba(99,102,241,0.9)";
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(
        t.x - hL * Math.cos(angle - Math.PI / 7),
        t.y - hL * Math.sin(angle - Math.PI / 7)
      );
      ctx.lineTo(
        t.x - hL * Math.cos(angle + Math.PI / 7),
        t.y - hL * Math.sin(angle + Math.PI / 7)
      );
      ctx.closePath();
      ctx.fill();
    }
  }

  if (showBboxes) {
    fp.forEach((p) => {
      if (!p.bbox) return;
      ctx.strokeStyle =
        p.status === "Y"
          ? "rgba(239,68,68,0.55)"
          : "rgba(34,197,94,0.55)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(
        p.bbox.x1,
        p.bbox.y1,
        p.bbox.x2 - p.bbox.x1,
        p.bbox.y2 - p.bbox.y1
      );
      ctx.setLineDash([]);
    });
  }

  if (selectedRows.size > 0) {
    selectedRows.forEach((idx) => {
      const p = dataPoints[idx];
      if (!p?.bbox) return;
      ctx.strokeStyle = "rgba(251,146,60,0.95)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(
        p.bbox.x1,
        p.bbox.y1,
        p.bbox.x2 - p.bbox.x1,
        p.bbox.y2 - p.bbox.y1
      );
      ctx.fillStyle = "rgba(251,146,60,0.95)";
      ctx.font = "bold 10px 'JetBrains Mono',monospace";
      ctx.fillText(`F${p.frameNumber}`, p.bbox.x1 + 2, p.bbox.y1 - 4);
    });
  }

  fp.forEach((p) => {
    const gi = dataPoints.indexOf(p);
    const isHov = gi === hoveredIdx;
    const isSel = selectedRows.has(gi);
    const isActive = gi === activeIdx;
    const r = isHov || isActive ? 8 : isSel ? 6 : 4;
    const accepted = p.status === "N";
    const color = accepted ? "#22c55e" : "#ef4444";
    const glow = accepted ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)";

    if (isHov || isActive) {
      ctx.beginPath();
      ctx.arc(p.center.x, p.center.y, r + 6, 0, 2 * Math.PI);
      ctx.fillStyle = glow;
      ctx.fill();
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.center.x, p.center.y, r, 0, 2 * Math.PI);
    ctx.fill();

    if (isActive) {
      ctx.strokeStyle = "#f0f9ff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.center.x, p.center.y, r + 3, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (isHov || isSel) {
      ctx.strokeStyle = isSel ? "#fb923c" : "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (showLabels) {
      ctx.fillStyle = "rgba(226,232,240,0.9)";
      ctx.font = "10px 'JetBrains Mono',monospace";
      ctx.fillText(`F${p.frameNumber}`, p.center.x + 9, p.center.y - 9);
    }
  });

  if (lineSegments.length) {
    const n = lineSegments.length;
    lineSegments.forEach((seg, i) => {
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.strokeStyle =
        i === 0
          ? "rgba(0,230,118,0.9)"
          : i === n - 1
            ? "rgba(255,100,100,0.9)"
            : "rgba(250,204,21,0.85)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });
  }

  ctx.restore();
}

export function computeStats(
  dataPoints: DataPoint[],
  filteredPoints: DataPoint[]
): Stats | null {
  if (!dataPoints.length) return null;

  const acc = filteredPoints.filter((p) => p.status === "N").length;
  const rej = filteredPoints.filter((p) => p.status === "Y").length;
  const confs = filteredPoints.map((p) => p.confidence);
  const avg = confs.length
    ? (confs.reduce((a, b) => a + b, 0) / confs.length).toFixed(3)
    : "—";

  return {
    total: dataPoints.length,
    shown: filteredPoints.length,
    acc,
    rej,
    avg,
    mn: confs.length ? Math.min(...confs).toFixed(3) : "—",
    mx: confs.length ? Math.max(...confs).toFixed(3) : "—",
    t0: dataPoints[0].timestamp,
    t1: dataPoints[dataPoints.length - 1].timestamp,
  };
}

const ffmpeg = new FFmpeg();
export const convertToH264 = async (file : any) => {
  if (!ffmpeg.loaded) {
    await ffmpeg.load();
  }

  const inputName = "input.mp4";
  const outputName = "output.mp4";

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // ✅ FIXED COMMAND
  await ffmpeg.exec([
    "-i", inputName,

    // 🔥 VERY IMPORTANT
    "-vcodec", "libx264",
    "-pix_fmt", "yuv420p",     // ✅ browser compatible
    "-movflags", "+faststart", // ✅ improves playback
    "-preset", "ultrafast",

    "-acodec", "aac",

    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);

  return new Blob([new Uint8Array(data as unknown as ArrayBuffer)], { type: "video/mp4" });
};