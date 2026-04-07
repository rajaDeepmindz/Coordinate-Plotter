import { useRef, useEffect, useCallback, useState, type JSX } from "react";

type Tool = "pen" | "brush" | "eraser" | "line" | "rect" | "circle" | "arrow" | "text" | "fill";

const PALETTE = ["#1e293b","#e24b4a","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#ffffff","#94a3b8"];

export function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const drawingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const historyRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  const [tool, setToolState] = useState<Tool>("pen");
  const [color, setColorState] = useState("#1e293b");
  const [size, setSize] = useState(4);
  const [opacity, setOpacity] = useState(100);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const saveState = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    historyRef.current.push(c.toDataURL());
    if (historyRef.current.length > 40) historyRef.current.shift();
    futureRef.current = [];
  }, []);

  const restoreFromDataURL = (url: string) => {
    const ctx = getCtx(); if (!ctx || !canvasRef.current) return;
    const img = new Image(); img.src = url;
    img.onload = () => ctx.drawImage(img, 0, 0);
  };

  const undo = () => {
    if (!historyRef.current.length) return;
    futureRef.current.push(canvasRef.current!.toDataURL());
    restoreFromDataURL(historyRef.current.pop()!);
  };

  const redo = () => {
    if (!futureRef.current.length) return;
    historyRef.current.push(canvasRef.current!.toDataURL());
    restoreFromDataURL(futureRef.current.pop()!);
  };

  const clearCanvas = () => {
    const ctx = getCtx(); const c = canvasRef.current; if (!ctx || !c) return;
    saveState();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  };

  const downloadCanvas = () => {
    const a = document.createElement("a");
    a.download = "drawing.png";
    a.href = canvasRef.current!.toDataURL();
    a.click();
  };

  const floodFill = (x: number, y: number) => {
    const c = canvasRef.current; const ctx = getCtx(); if (!c || !ctx) return;
    const w = c.width, h = c.height;
    const data = ctx.getImageData(0, 0, w, h);
    const d = data.data;
    const idx = (Math.round(y) * w + Math.round(x)) * 4;
    const [tr, tg, tb] = [d[idx], d[idx+1], d[idx+2]];
    const fr = parseInt(color.slice(1,3),16);
    const fg = parseInt(color.slice(3,5),16);
    const fb = parseInt(color.slice(5,7),16);
    if (tr===fr && tg===fg && tb===fb) return;
    const stack: [number,number][] = [[Math.round(x), Math.round(y)]];
    const visited = new Uint8Array(w * h);
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      if (cx<0||cy<0||cx>=w||cy>=h) continue;
      const i = cy*w+cx; if (visited[i]) continue; visited[i]=1;
      const pi = i*4;
      if (Math.abs(d[pi]-tr)>30||Math.abs(d[pi+1]-tg)>30||Math.abs(d[pi+2]-tb)>30) continue;
      d[pi]=fr; d[pi+1]=fg; d[pi+2]=fb; d[pi+3]=255;
      stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
    }
    ctx.putImageData(data, 0, 0);
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const angle = Math.atan2(y2-y1, x2-x1);
    const headLen = Math.max(12, size * 3);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2 - headLen*Math.cos(angle - Math.PI/6), y2 - headLen*Math.sin(angle - Math.PI/6));
    ctx.moveTo(x2,y2);
    ctx.lineTo(x2 - headLen*Math.cos(angle + Math.PI/6), y2 - headLen*Math.sin(angle + Math.PI/6));
    ctx.stroke();
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const src = "touches" in e ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const applyCtxStyle = (ctx: CanvasRenderingContext2D, overrideSize?: number) => {
    ctx.globalAlpha = opacity / 100;
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.fillStyle = color;
    ctx.lineWidth = overrideSize ?? size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getPos(e);
    const ctx = getCtx(); if (!ctx) return;

    if (tool === "fill") { saveState(); floodFill(x, y); return; }

    if (tool === "text") {
      if (textInputRef.current) { textInputRef.current.blur(); return; }
      const inp = document.createElement("input");
      const r = canvasRef.current!.getBoundingClientRect();
      inp.style.cssText = `position:fixed;left:${r.left+x}px;top:${r.top+y}px;font-size:${Math.max(14,size*3)}px;border:1.5px dashed #6366f1;background:transparent;outline:none;color:${color};font-family:system-ui;min-width:80px;z-index:9999;padding:2px 4px;border-radius:4px;`;
      document.body.appendChild(inp);
      inp.focus();
      textInputRef.current = inp;
      const tx = x, ty = y;
      inp.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === "Escape") {
          if (inp.value) {
            saveState();
            ctx.font = `${Math.max(14,size*3)}px system-ui,sans-serif`;
            ctx.fillStyle = color;
            ctx.globalAlpha = opacity / 100;
            ctx.fillText(inp.value, tx, ty + Math.max(14,size*3)*0.8);
            ctx.globalAlpha = 1;
          }
          document.body.removeChild(inp);
          textInputRef.current = null;
        }
      });
      return;
    }

    drawingRef.current = true;
    startRef.current = { x, y };
    snapshotRef.current = ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    applyCtxStyle(ctx);

    if (tool === "pen" || tool === "brush" || tool === "eraser") {
      ctx.beginPath(); ctx.moveTo(x, y);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getPos(e);
    setPos({ x: Math.round(x), y: Math.round(y) });
    if (!drawingRef.current) return;
    const ctx = getCtx(); if (!ctx) return;

    if (tool === "pen" || tool === "eraser") {
      applyCtxStyle(ctx);
      ctx.lineTo(x, y); ctx.stroke();
    } else if (tool === "brush") {
      ctx.globalAlpha = (opacity/100) * 0.35;
      ctx.strokeStyle = color; ctx.lineWidth = size * 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = opacity/100; ctx.lineWidth = size;
      ctx.lineTo(x, y); ctx.stroke();
    } else {
      ctx.putImageData(snapshotRef.current!, 0, 0);
      applyCtxStyle(ctx);
      ctx.beginPath();
      const { x: sx, y: sy } = startRef.current;
      if (tool === "line") { ctx.moveTo(sx,sy); ctx.lineTo(x,y); ctx.stroke(); }
      else if (tool === "rect") { ctx.strokeRect(sx, sy, x-sx, y-sy); }
      else if (tool === "circle") {
        const rx = Math.abs(x-sx)/2, ry = Math.abs(y-sy)/2;
        ctx.ellipse(sx+(x-sx)/2, sy+(y-sy)/2, rx, ry, 0, 0, Math.PI*2); ctx.stroke();
      }
      else if (tool === "arrow") { drawArrow(ctx, sx, sy, x, y); }
    }
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    getCtx()!.globalAlpha = 1;
    saveState();
  };

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    c.width = c.offsetWidth;
    c.height = c.offsetHeight;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  const tools: { id: Tool; icon: JSX.Element; title: string }[] = [
    { id: "pen", title: "Pen", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg> },
    { id: "brush", title: "Brush", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.07"/><path d="M7.07 14.94C5.79 16.2 4 16.5 2.14 17.29c-.38.16-.5.64-.24.96l.34.4c.2.24.55.29.82.13C4.4 17.6 6.1 17.17 7 16c.8-1 .8-2.23.07-1.06z"/></svg> },
    { id: "eraser", title: "Eraser", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg> },
    { id: "line", title: "Line", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="5" y1="19" x2="19" y2="5"/></svg> },
    { id: "rect", title: "Rectangle", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> },
    { id: "circle", title: "Circle", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/></svg> },
    { id: "arrow", title: "Arrow", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/></svg> },
    { id: "text", title: "Text", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg> },
    { id: "fill", title: "Fill", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m19 11-8-8-8.5 8.5a5.5 5.5 0 0 0 7.78 7.78L19 11z"/><path d="m19 11 2 2a2.5 2.5 0 0 1 0 3.5l-.94.94a2.5 2.5 0 0 1-3.53 0L15 16"/></svg> },
  ];

  return (
    <div ref={containerRef} className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white" style={{ height: 580 }}>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2.5 py-2 bg-slate-50 border-b border-slate-200 flex-wrap">
        {tools.map(t => (
          <button
            key={t.id}
            title={t.title}
            onClick={() => setToolState(t.id)}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all text-slate-600 ${
              tool === t.id
                ? "bg-white border-indigo-400 shadow-[0_0_0_2px_#6366f122] text-indigo-600"
                : "border-transparent hover:bg-white hover:border-slate-200"
            }`}
          >
            {t.icon}
          </button>
        ))}

        <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0" />

        <span className="text-xs text-slate-500">Size</span>
        <input type="range" min={1} max={40} step={1} value={size}
          onChange={e => setSize(Number(e.target.value))}
          className="w-18 accent-indigo-500" style={{ width: 72 }} />
        <span className="text-xs text-slate-500 w-4">{size}</span>

        <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0" />

        <span className="text-xs text-slate-500">Opacity</span>
        <input type="range" min={10} max={100} step={5} value={opacity}
          onChange={e => setOpacity(Number(e.target.value))}
          className="accent-indigo-500" style={{ width: 64 }} />

        <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0" />

        <input type="color" value={color} onChange={e => setColorState(e.target.value)}
          className="w-7 h-7 rounded-md border border-slate-200 cursor-pointer p-0.5 bg-transparent" />

        <div className="flex gap-1 flex-wrap" style={{ maxWidth: 160 }}>
          {PALETTE.map(c => (
            <div key={c} onClick={() => setColorState(c)}
              className={`w-5 h-5 rounded-full border-2 cursor-pointer flex-shrink-0 transition-transform hover:scale-110 ${
                color === c ? "border-indigo-500 scale-110" : "border-slate-300"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0" />

        {[
          { title: "Undo", action: undo, icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg> },
          { title: "Redo", action: redo, icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg> },
          { title: "Clear", action: clearCanvas, icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> },
          { title: "Download", action: downloadCanvas, icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> },
        ].map(btn => (
          <button key={btn.title} title={btn.title} onClick={btn.action}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-transparent hover:bg-white hover:border-slate-200 text-slate-500 transition-all">
            {btn.icon}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 block w-full"
        style={{ cursor: tool === "eraser" ? "cell" : tool === "text" ? "text" : "crosshair" }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />

      {/* Status bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-400 font-mono">
        <span className="text-indigo-500 font-medium">{tool}</span>
        <span>|</span>
        <span>x: {pos.x}  y: {pos.y}</span>
        <span>|</span>
        <span>size: {size}</span>
        <span>|</span>
        <span>opacity: {opacity}%</span>
      </div>
    </div>
  );
}