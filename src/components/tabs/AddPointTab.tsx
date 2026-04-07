import { useState, type JSX } from "react";
import type { ManualPoint, ManualLine } from "../../service/Cordicate-service";
import { Trash2, Plus, Info, Eye } from "lucide-react"; // Optional: Icons make it pop!

interface Props {
  manualPoints?: ManualPoint[];
  manualLines?: ManualLine[];
  setManualPoints?: (pts: ManualPoint[]) => void;
  setManualLines?: (lines: ManualLine[]) => void;
}

const CLAMP_X = (v: number) => Math.max(0, Math.min(1200, Math.round(v)));
const CLAMP_Y = (v: number) => Math.max(0, Math.min(500, Math.round(v)));

export function AddPointTab({
  manualPoints = [],
  manualLines = [],
  setManualPoints,
  setManualLines,
}: Props): JSX.Element {
  const [pointText, setPointText] = useState("");
  const [pointColor, setPointColor] = useState("#6366f1");
  const [lineText, setLineText] = useState("");
  const [lineColor, setLineColor] = useState("#10b981");

  const makeId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const addPoint = () => {
    const m = pointText.match(/\(?\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*\)?/);
    if (!m) return;
    const x = CLAMP_X(Number(m[1]));
    const y = CLAMP_Y(Number(m[2]));
    setManualPoints?.([
      ...manualPoints,
      { id: makeId(), x, y, color: pointColor, visible: true },
    ]);
    setPointText("");
  };

  const addLine = () => {
    const matches = [
      ...lineText.matchAll(/\(?\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*\)?/g),
    ];
    if (matches.length < 2) return;
    const x1 = CLAMP_X(Number(matches[0][1]));
    const y1 = CLAMP_Y(Number(matches[0][2]));
    const x2 = CLAMP_X(Number(matches[1][1]));
    const y2 = CLAMP_Y(Number(matches[1][2]));
    setManualLines?.([
      ...manualLines,
      { id: makeId(), x1, y1, x2, y2, color: lineColor, visible: true },
    ]);
    setLineText("");
  };

  return (
    <div className="flex h-full w-full gap-6 p-4 bg-slate-50">
      {/* LEFT HALF: INPUT BOXES */}
      <div className="flex-1 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Plus size={16} /> Create Geometry
        </h3>

        {/* Point Input */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <label className="block text-xs font-semibold text-slate-500 mb-2">
            ADD NEW POINT
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="(x, y)"
              value={pointText}
              onChange={(e) => setPointText(e.target.value)}
            />
            <input
              type="color"
              className="w-10 h-10 rounded cursor-pointer border-none"
              value={pointColor}
              onChange={(e) => setPointColor(e.target.value)}
            />
            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              onClick={addPoint}
            >
              Add
            </button>
          </div>
        </div>

        {/* Line Input */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <label className="block text-xs font-semibold text-slate-500 mb-2">
            ADD NEW LINE
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="(x1,y1)(x2,y2)"
              value={lineText}
              onChange={(e) => setLineText(e.target.value)}
            />
            <input
              type="color"
              className="w-10 h-10 rounded cursor-pointer border-none"
              value={lineColor}
              onChange={(e) => setLineColor(e.target.value)}
            />
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              onClick={addLine}
            >
              Add
            </button>
          </div>
        </div>

        {/* Help Box */}
        <div className="mt-auto p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700">
          <div className="flex items-center gap-2 font-bold text-xs mb-1">
            <Info size={14} /> COORDINATE SYSTEM
          </div>
          <p className="text-[11px] leading-relaxed">
            Canvas bounds: <b>1200 × 500</b>. Formatting: Use parentheses or
            just numbers separated by commas.
          </p>
        </div>
      </div>

      {/* RIGHT HALF: LIST MANAGEMENT */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Eye size={16} /> Active Elements
        </h3>

        <div className="bg-white flex justify-between rounded-xl shadow-sm border border-slate-200 flex-1 overflow-y-auto">
          {/* Points Section */}
          <div className="w-1/2">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 sticky top-0 font-bold text-[10px] text-slate-400 uppercase">
              Points
            </div>
            <div className="p-2 space-y-1">
              {manualPoints.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg group transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={p.visible !== false}
                    onChange={() =>
                      setManualPoints?.(
                        manualPoints.map((item) =>
                          item.id === p.id
                            ? { ...item, visible: !item.visible }
                            : item,
                        ),
                      )
                    }
                    className="rounded text-indigo-600"
                  />
                  <div
                    className="w-3 h-3 rounded-full border border-white shadow-sm"
                    style={{ background: p.color }}
                  />
                  <span className="flex-1 font-mono text-xs text-slate-600">
                    ({p.x}, {p.y})
                  </span>
                  <button
                    onClick={() =>
                      setManualPoints?.(
                        manualPoints.filter((i) => i.id !== p.id),
                      )
                    }
                    className="text-red-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Lines Section */}
          <div className="w-1/2">
            <div className="p-3 border-y border-slate-100 bg-slate-50/50 sticky top-0 font-bold text-[10px] text-slate-400 uppercase">
              Lines
            </div>
            <div className="p-2 space-y-1">
              {manualLines.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg group transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={l.visible !== false}
                    onChange={() =>
                      setManualLines?.(
                        manualLines.map((item) =>
                          item.id === l.id
                            ? { ...item, visible: !item.visible }
                            : item,
                        ),
                      )
                    }
                    className="rounded text-emerald-600"
                  />
                  <div
                    className="w-6 h-1 rounded-full shadow-sm"
                    style={{ background: l.color }}
                  />
                  <span className="flex-1 font-mono text-[10px] text-slate-600">
                    ({l.x1},{l.y1}) → ({l.x2},{l.y2})
                  </span>
                  <button
                    onClick={() =>
                      setManualLines?.(manualLines.filter((i) => i.id !== l.id))
                    }
                    className="text-red-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
