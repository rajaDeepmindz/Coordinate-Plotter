import { useRef, useState, type JSX } from "react";
import { Toggle } from "./ui/Toggle";
import { DualRangeSlider } from "./ui/DualRangeSlider";
import { convertToH264 } from "../service/Cordicate-service";

interface Props {
  bgImage: HTMLImageElement | null;
  setBgImage: (img: HTMLImageElement | null) => void;
  confMin: number;
  confMax: number;
  setConfMin: (v: number) => void;
  setConfMax: (v: number) => void;
  areaMin: number;
  areaMax: number;
  areaAbsMin: number;
  areaAbsMax: number;
  setAreaMin: (v: number) => void;
  setAreaMax: (v: number) => void;
  bboxSizeMin?: number;
  bboxSizeMax?: number;
  bboxSizeAbsMin?: number;
  bboxSizeAbsMax?: number;
  setBBoxSizeMin?: (v: number) => void;
  setBBoxSizeMax?: (v: number) => void;
  showBboxes: boolean;
  setShowBboxes: (v: boolean) => void;
  showLines: boolean;
  setShowLines: (v: boolean) => void;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
  showOnlyRejected: boolean;
  setShowOnlyRejected: (v: boolean) => void;
}

const Divider = () => (
  <div className="w-px h-5 bg-slate-200 flex-shrink-0" />
);

export function ControlsBar({
  bgImage,
  setBgImage,
  confMin,
  confMax,
  setConfMin,
  setConfMax,
  areaMin,
  areaMax,
  areaAbsMin,
  areaAbsMax,
  setAreaMin,
  setAreaMax,
  bboxSizeMin,
  bboxSizeMax,
  bboxSizeAbsMin,
  bboxSizeAbsMax,
  setBBoxSizeMin,
  setBBoxSizeMax,
  showBboxes,
  setShowBboxes,
  showLines,
  setShowLines,
  showLabels,
  setShowLabels,
  showOnlyRejected,
  setShowOnlyRejected,
}: Props): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 500;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height, x, y, img.width * scale, img.height * scale);
        const finalImg = new Image();
        finalImg.src = canvas.toDataURL("image/png");
        finalImg.onload = () => setBgImage(finalImg);
      };
      img.onerror = () => alert("Failed to load image");
      img.src = (ev.target?.result as string) || "";
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let processedFile: File | Blob = file;
    try {
      const testVideo = document.createElement("video");
      testVideo.src = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        testVideo.onloadeddata = resolve;
        testVideo.onerror = reject;
      });
    } catch {
      setIsConverting(true);
      try {
        processedFile = await convertToH264(file);
      } catch (err) {
        alert("Video conversion failed");
        setIsConverting(false);
        return;
      }
      setIsConverting(false);
    }
    const video = document.createElement("video");
    video.src = URL.createObjectURL(processedFile as Blob);
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(3, video.duration || 3);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 500;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
      const x = (canvas.width - video.videoWidth * scale) / 2;
      const y = (canvas.height - video.videoHeight * scale) / 2;
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, x, y, video.videoWidth * scale, video.videoHeight * scale);
      const img = new Image();
      img.src = canvas.toDataURL("image/png");
      img.onload = () => setBgImage(img);
    };
  };

  return (
    <div
      className="flex-shrink-0 border-t border-slate-200 shadow-[0_-1px_4px_rgba(0,0,0,0.04)]"
      style={{ background: "#d3d9f3" }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-2 flex-wrap">

        {/* BG controls */}
        <div className="flex gap-1.5 flex-shrink-0">
          <button className="btn btn-g" onClick={() => fileRef.current?.click()}>
            📁 BG Image
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />

          <button
            className="btn btn-g"
            onClick={() => videoRef.current?.click()}
            disabled={isConverting}
          >
            {isConverting ? "⏳ Converting..." : "📹 BG Video"}
          </button>
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />

          {bgImage && (
            <button className="btn btn-d" onClick={() => setBgImage(null)}>
              🗑 Remove
            </button>
          )}
        </div>

        <Divider />

        {/* Filters toggle button */}
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold transition-all duration-200 cursor-pointer select-none"
          style={{
            background: filtersOpen ? "#fef3c7" : "#fff",
            borderColor: filtersOpen ? "#f59e0b" : "#cbd5e1",
            color: filtersOpen ? "#92400e" : "#475569",
          }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 5a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm3 5a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          Filters
          {/* active dot */}
          <span
            className="w-1.5 h-1.5 rounded-full ml-0.5"
            style={{ background: filtersOpen ? "#f59e0b" : "#94a3b8" }}
          />
          <svg
            className="w-3 h-3 transition-transform duration-200"
            style={{ transform: filtersOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <Divider />

        {/* Visibility toggles — always visible */}
        <div className="flex gap-3 flex-wrap items-center">
          <Toggle value={showBboxes} onChange={setShowBboxes} label="Bounding Boxes" />
          <Toggle value={showLines} onChange={setShowLines} label="Trail Lines" />
          <Toggle value={showLabels} onChange={setShowLabels} label="Frame Labels" />
          <Toggle
            value={showOnlyRejected}
            onChange={setShowOnlyRejected}
            label="Rejected Only"
            activeColor="#dc2626"
            activeLabelColor="#b91c1c"
          />
        </div>
      </div>

      {/* ── Collapsible filter drawer ── */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: filtersOpen ? 400 : 0, opacity: filtersOpen ? 1 : 0 }}
      >
        <div
          className="flex flex-wrap gap-3 px-4 py-3 border-t border-slate-200"
          style={{ background: "#eef1fb" }}
        >

          {/* CONF card */}
          <FilterSliderCard
            label="CONF"
            labelColor="#2563eb"
            colorStart="#3b82f6"
            colorEnd="#0ea5e9"
            valueInputColor="#38bdf8"
            badgeBg="#eff6ff"
            badgeText="#1d4ed8"
            min={0}
            max={1}
            step={0.01}
            valueMin={confMin}
            valueMax={confMax}
            onChange={(lo, hi) => {
              setConfMin(+lo.toFixed(2));
              setConfMax(+hi.toFixed(2));
            }}
            formatVal={(v) => v.toFixed(2)}
            parseVal={(s) => parseFloat(s)}
          />

          {/* AREA card */}
          {areaAbsMax > 0 ? (
            <FilterSliderCard
              label="AREA"
              labelColor="#15803d"
              colorStart="#22c55e"
              colorEnd="#16a34a"
              valueInputColor="#4ade80"
              badgeBg="#f0fdf4"
              badgeText="#15803d"
              min={areaAbsMin}
              max={areaAbsMax}
              step={1}
              valueMin={areaMin}
              valueMax={areaMax}
              onChange={(lo, hi) => {
                setAreaMin(Math.round(lo));
                setAreaMax(Math.round(hi));
              }}
              formatVal={(v) => String(Math.round(v))}
              parseVal={(s) => parseInt(s)}
            />
          ) : (
            <div className="flex items-center px-3 py-2 rounded-xl border border-slate-200 bg-white">
              <span className="text-xs text-slate-400 font-mono">No area data</span>
            </div>
          )}

          {/* SIZE card */}
          {typeof bboxSizeAbsMax === "number" &&
            bboxSizeAbsMax > 0 &&
            setBBoxSizeMin &&
            setBBoxSizeMax && (
              <FilterSliderCard
                label="SIZE"
                labelColor="#d97706"
                colorStart="#fb923c"
                colorEnd="#f97316"
                valueInputColor="#fb923c"
                badgeBg="#fffbeb"
                badgeText="#d97706"
                min={bboxSizeAbsMin ?? 0}
                max={bboxSizeAbsMax ?? 0}
                step={1}
                valueMin={bboxSizeMin ?? 0}
                valueMax={bboxSizeMax ?? 0}
                onChange={(lo, hi) => {
                  setBBoxSizeMin?.(Math.round(lo));
                  setBBoxSizeMax?.(Math.round(hi));
                }}
                formatVal={(v) => String(Math.round(v))}
                parseVal={(s) => parseInt(s)}
              />
            )}
        </div>
      </div>
    </div>
  );
}

/* ── Filter slider card ─────────────────────────────────────────────────────── */
interface FilterSliderCardProps {
  label: string;
  labelColor: string;
  colorStart: string;
  colorEnd: string;
  valueInputColor: string;
  badgeBg: string;
  badgeText: string;
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChange: (lo: number, hi: number) => void;
  formatVal: (v: number) => string;
  parseVal: (s: string) => number;
}

function FilterSliderCard({
  label,
  labelColor,
  colorStart,
  colorEnd,
  badgeBg,
  badgeText,
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChange,
  formatVal,
  parseVal,
}: FilterSliderCardProps): JSX.Element {
  return (
    <div
      className="flex flex-col gap-2 px-3 py-2.5 rounded-xl border bg-white"
      style={{ borderColor: `${colorStart}55`, minWidth: 220 }}
    >
      {/* Header: label + value badges */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs font-bold tracking-widest font-mono"
          style={{ color: labelColor }}
        >
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {/* Min value input */}
          <input
            type="number"
            step={step}
            min={min}
            max={valueMax}
            value={formatVal(valueMin)}
            onChange={(e) => {
              const v = Math.min(valueMax - step, Math.max(min, parseVal(e.target.value)));
              onChange(isNaN(v) ? valueMin : v, valueMax);
            }}
            className="w-16 text-center text-xs font-bold font-mono rounded px-1 py-0.5 border-0 outline-none"
            style={{ background: badgeBg, color: badgeText }}
          />
          <span className="text-xs text-slate-400">—</span>
          {/* Max value input */}
          <input
            type="number"
            step={step}
            min={valueMin}
            max={max}
            value={formatVal(valueMax)}
            onChange={(e) => {
              const v = Math.max(valueMin + step, Math.min(max, parseVal(e.target.value)));
              onChange(valueMin, isNaN(v) ? valueMax : v);
            }}
            className="w-16 text-center text-xs font-bold font-mono rounded px-1 py-0.5 border-0 outline-none"
            style={{ background: badgeBg, color: badgeText }}
          />
        </div>
      </div>

      {/* Dual range slider */}
      <div className="w-full">
        <DualRangeSlider
          min={min}
          max={max}
          step={step}
          valueMin={valueMin}
          valueMax={valueMax}
          onChange={onChange}
          colorStart={colorStart}
          colorEnd={colorEnd}
        />
      </div>
    </div>
  );
}