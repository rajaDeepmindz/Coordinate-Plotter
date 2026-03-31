import { useRef, useState, type JSX } from "react";
import { Toggle } from "./ui/Toggle";
import { DualRangeSlider } from "./ui/DualRangeSlider";
import { convertToH264 } from "../service/Cordicate-service";

interface Props {
  /* bg image */
  bgImage: HTMLImageElement | null;
  setBgImage: (img: HTMLImageElement | null) => void;

  /* confidence filter */
  confMin: number;
  confMax: number;
  setConfMin: (v: number) => void;
  setConfMax: (v: number) => void;

  /* area filter */
  areaMin: number;
  areaMax: number;
  areaAbsMin: number;
  areaAbsMax: number;
  setAreaMin: (v: number) => void;
  setAreaMax: (v: number) => void;

  /* visibility toggles */
  showBboxes: boolean;
  setShowBboxes: (v: boolean) => void;
  showLines: boolean;
  setShowLines: (v: boolean) => void;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
  showOnlyRejected: boolean;
  setShowOnlyRejected: (v: boolean) => void;
}

const numInput = (extra?: React.CSSProperties): React.CSSProperties => ({
  width: 64,
  fontSize: 12,
  padding: "2px 4px",
  background: "#000",
  border: "1.5px solid #1e293b",
  fontWeight: 700,
  borderRadius: 4,
  textAlign: "center",
  fontFamily: "'IBM Plex Mono',monospace",
  outline: "none",
  ...extra,
});

const Divider = () => (
  <div style={{ width: 1, height: 22, background: "#e2e8f0", flexShrink: 0 }} />
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

    // ✅ IMAGE UPLOAD (CLEAN + SAFE)
    const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      console.log("Selected image file:", file);

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

  // 🔥 COVER CALCULATION
  const scale = Math.max(
    canvas.width / img.width,
    canvas.height / img.height
  );

  const x = (canvas.width - img.width * scale) / 2;
  const y = (canvas.height - img.height * scale) / 2;

  ctx.drawImage(
    img,
    0,
    0,
    img.width,
    img.height,
    x,
    y,
    img.width * scale,
    img.height * scale
  );

  const finalImg = new Image();
  finalImg.src = canvas.toDataURL("image/png");

  finalImg.onload = () => {
    setBgImage(finalImg);
  };
};

        img.onerror = () => {
          console.error("Image load failed");
          alert("Failed to load image");
        };

        img.src = (ev.target?.result as string) || "";
      };

      reader.onerror = () => {
        console.error("FileReader failed");
      };

      reader.readAsDataURL(file);
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      console.log("Original file:", file);

      let processedFile: File | Blob = file;

      try {
        const testVideo = document.createElement("video");
        testVideo.src = URL.createObjectURL(file);

        await new Promise((resolve, reject) => {
          testVideo.onloadeddata = resolve;
          testVideo.onerror = reject;
        });

        console.log("✅ Video supported, no conversion needed");
      } catch {
        console.warn("⚠️ Unsupported video, converting...");

        // 🔥 START LOADER
        setIsConverting(true);

        try {
          processedFile = await convertToH264(file);
        } catch (err) {
          console.error("Conversion failed:", err);
          alert("Video conversion failed");
          setIsConverting(false);
          return;
        }

        // 🔥 STOP LOADER
        setIsConverting(false);
      }

     const video = document.createElement("video");
video.src = URL.createObjectURL(processedFile as Blob);
video.muted = true;
video.playsInline = true;

// ✅ STEP 1: wait for metadata
video.onloadedmetadata = () => {
  // 🔥 seek to 3 sec (or max duration safe)
  const seekTime = Math.min(3, video.duration || 3);
  video.currentTime = seekTime;
};

// ✅ STEP 2: wait for seek complete
video.onseeked = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 500;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 🔥 COVER CALCULATION
  const scale = Math.max(
    canvas.width / video.videoWidth,
    canvas.height / video.videoHeight
  );

  const x = (canvas.width - video.videoWidth * scale) / 2;
  const y = (canvas.height - video.videoHeight * scale) / 2;

  ctx.drawImage(
    video,
    0,
    0,
    video.videoWidth,
    video.videoHeight,
    x,
    y,
    video.videoWidth * scale,
    video.videoHeight * scale
  );

  const img = new Image();
  img.src = canvas.toDataURL("image/png");

  img.onload = () => {
    setBgImage(img);
  };
};
    };

  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px",
        flexWrap: "wrap",
        background: "#d3d9f3",
        borderTop: "1.5px solid #e2e8f0",
        boxShadow: "0 -1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* BG image + video */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {/* Image Upload */}
        <button className="btn btn-g" onClick={() => fileRef.current?.click()}>
          📁 BG Image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleBgUpload}
        />

        {/* 🎥 Video Upload */}
        <button
          className="btn btn-g"
          onClick={() => videoRef.current?.click()}
          disabled={isConverting}
        >
          {isConverting ? "⏳ Converting..." : "📹 BG Video"}
        </button>
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          style={{ display: "none" }}
          onChange={handleVideoUpload}
        />

        {/* Remove */}
        {bgImage && (
          <button className="btn btn-d" onClick={() => setBgImage(null)}>
            🗑 Remove
          </button>
        )}
      </div>

      <Divider />

      {/* Confidence filter */}
      <FilterSlider
        label="CONF"
        labelColor="#2563eb"
        colorStart="#3b82f6"
        colorEnd="#0ea5e9"
        valueInputColor="#38bdf8"
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

      <Divider />

      {/* Area filter — only shown when area data exists */}
      {areaAbsMax > 0 ? (
        <FilterSlider
          label="AREA"
          labelColor="#15803d"
          colorStart="#22c55e"
          colorEnd="#16a34a"
          valueInputColor="#4ade80"
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
        <span
          style={{
            fontSize: 10,
            color: "#94a3b8",
            fontFamily: "'IBM Plex Mono',monospace",
          }}
        >
          No area data
        </span>
      )}

      <Divider />

      {/* Visibility toggles */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Toggle
          value={showBboxes}
          onChange={setShowBboxes}
          label="Bounding Boxes"
        />
        <Toggle value={showLines} onChange={setShowLines} label="Trail Lines" />
        <Toggle
          value={showLabels}
          onChange={setShowLabels}
          label="Frame Labels"
        />
        <Toggle
          value={showOnlyRejected}
          onChange={setShowOnlyRejected}
          label="Rejected Only"
          activeColor="#dc2626"
          activeLabelColor="#b91c1c"
        />
      </div>
    </div>
  );
}

/* ── Reusable filter slider row ─────────────────────────────────────────────── */
interface FilterSliderProps {
  label: string;
  labelColor: string;
  colorStart: string;
  colorEnd: string;
  valueInputColor: string;
  min: number;
  max: number;
  step: number;
  valueMin: number;
  valueMax: number;
  onChange: (lo: number, hi: number) => void;
  formatVal: (v: number) => string;
  parseVal: (s: string) => number;
}

function FilterSlider({
  label,
  labelColor,
  colorStart,
  colorEnd,
  valueInputColor,
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChange,
  formatVal,
  parseVal,
}: FilterSliderProps): JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {/* Label badge */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: labelColor,
          fontFamily: "'IBM Plex Mono',monospace",
          background: "#fff",
          padding: "1px 5px",
          border: `1.5px solid ${colorStart}44`,
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        {label}
      </span>

      {/* Min input */}
      <input
        type="number"
        step={step}
        min={min}
        max={valueMax}
        value={formatVal(valueMin)}
        onChange={(e) => {
          const v = Math.min(
            valueMax - step,
            Math.max(min, parseVal(e.target.value)),
          );
          onChange(isNaN(v) ? valueMin : v, valueMax);
        }}
        style={numInput({ color: valueInputColor })}
      />

      {/* Dual range slider */}
      <div style={{ width: 240 }}>
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

      {/* Max input */}
      <input
        type="number"
        step={step}
        min={valueMin}
        max={max}
        value={formatVal(valueMax)}
        onChange={(e) => {
          const v = Math.max(
            valueMin + step,
            Math.min(max, parseVal(e.target.value)),
          );
          onChange(valueMin, isNaN(v) ? valueMax : v);
        }}
        style={numInput({
          color: colorEnd === "#0ea5e9" ? "#38bdf8" : "#4ade80",
        })}
      />
    </div>
  );
}
