import type { DataPoint, LineSegment, Pan } from "../service/Cordicate-service";

export interface DrawParams {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  bgImage: HTMLImageElement | null;
  dataPoints: DataPoint[];
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
  hoveredIdx: number;
  selectedRows: Set<number>;
  pan: Pan;
  activeIdx: number;
}

export function drawLightCanvas(p: DrawParams): void {
  const {
    ctx, canvas, bgImage, dataPoints, lineSegments,
    confMin, confMax, areaMin, areaMax, areaAbsMax,
    bboxSizeMin, bboxSizeMax, bboxSizeAbsMax,
    showBboxes, showLines, showLabels, showOnlyRejected,
    hoveredIdx, selectedRows, pan, activeIdx,
  } = p;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(pan.x, pan.y);

  /* ── Background ── */
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

  /* ── Filter points ── */
  const fp = dataPoints.filter((pt) => {
    const withinConf = pt.confidence >= confMin && pt.confidence <= confMax;
    const withinArea = areaAbsMax === 0 || pt.area === null || (pt.area >= areaMin && pt.area <= areaMax);
    const s = pt.bbox ? Math.hypot(Math.abs(pt.bbox.x2 - pt.bbox.x1), Math.abs(pt.bbox.y2 - pt.bbox.y1)) : null;
    const withinSize = bboxSizeAbsMax === 0 || pt.bbox === null || (s !== null && s >= bboxSizeMin && s <= bboxSizeMax);
    const withinRejected = !showOnlyRejected || pt.status === "Y";
    return withinConf && withinArea && withinSize && withinRejected;
  });

  /* ── Trail lines ── */
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

  /* ── Bounding boxes ── */
  if (showBboxes) {
    fp.forEach(pt => {
      if (!pt.bbox) return;
      ctx.strokeStyle = pt.status === "Y" ? "rgba(220,38,38,0.5)" : "rgba(22,163,74,0.5)";
      ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.strokeRect(pt.bbox.x1, pt.bbox.y1, pt.bbox.x2 - pt.bbox.x1, pt.bbox.y2 - pt.bbox.y1);
      ctx.setLineDash([]);
    });
  }

  /* ── Selected highlight bboxes ── */
  if (selectedRows.size > 0) {
    const fpIdx = new Set(fp.map((p) => dataPoints.indexOf(p)));
    selectedRows.forEach((idx) => {
      if (!fpIdx.has(idx)) return;
      const pt = dataPoints[idx];
      if (!pt?.bbox) return;
      ctx.strokeStyle = "rgba(245,158,11,0.9)"; ctx.lineWidth = 2;
      ctx.strokeRect(pt.bbox.x1, pt.bbox.y1, pt.bbox.x2 - pt.bbox.x1, pt.bbox.y2 - pt.bbox.y1);
      ctx.fillStyle = "rgba(245,158,11,0.9)";
      ctx.font = "bold 9px 'IBM Plex Mono',monospace";
      ctx.fillText(`F${pt.frameNumber}`, pt.bbox.x1 + 2, pt.bbox.y1 - 4);
    });
  }

  /* ── Data point dots ── */
  fp.forEach(pt => {
    const gi = dataPoints.indexOf(pt);
    const isHov = gi === hoveredIdx, isSel = selectedRows.has(gi), isActive = gi === activeIdx;
    const r = isHov || isActive ? 7 : isSel ? 5.5 : 4;
    const accepted = pt.status === "N";
    const color = accepted ? "#16a34a" : "#dc2626";
    const glowColor = accepted ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.15)";

    if (isHov || isActive) {
      ctx.beginPath(); ctx.arc(pt.center.x, pt.center.y, r + 7, 0, 2 * Math.PI);
      ctx.fillStyle = glowColor; ctx.fill();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(pt.center.x, pt.center.y, r + 1.5, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(pt.center.x, pt.center.y, r, 0, 2 * Math.PI); ctx.fill();

    if (isActive) {
      ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pt.center.x, pt.center.y, r + 4, 0, 2 * Math.PI); ctx.stroke();
    } else if (isHov || isSel) {
      ctx.strokeStyle = isSel ? "#f59e0b" : "#64748b"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(pt.center.x, pt.center.y, r + 2, 0, 2 * Math.PI); ctx.stroke();
    }

    if (showLabels) {
      ctx.fillStyle = "rgba(15,23,42,0.8)";
      ctx.font = "9px 'IBM Plex Mono',monospace";
      ctx.fillText(`F${pt.frameNumber}`, pt.center.x + 9, pt.center.y - 8);
    }
  });

  /* ── Line segments ── */
  if (lineSegments.length) {
    const n = lineSegments.length;
    lineSegments.forEach((seg, i) => {
      ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2);
      ctx.strokeStyle =
        i === 0 ? "rgba(5,150,105,0.85)" :
        i === n - 1 ? "rgba(220,38,38,0.85)" :
        "rgba(217,119,6,0.8)";
      ctx.lineWidth = 2.5; ctx.stroke();
    });
  }

  ctx.restore();
}
