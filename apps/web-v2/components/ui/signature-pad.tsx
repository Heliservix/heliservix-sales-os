"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

type SignaturePadProps = {
  // Name of the hidden <input> this writes the signature into (as a PNG
  // data URL) — meant to sit inside the same <form> that already submits
  // to a Server Action, so no separate upload/fetch call is needed. The
  // action reads it with `formData.get(name)` and decodes+uploads it
  // server-side, same as any other form field.
  name: string;
  label?: string;
  height?: number;
};

// Zero-dependency signature capture: a <canvas> plus the Pointer Events API
// (works with a finger, a mouse, or a pressure-sensitive stylus like Apple
// Pencil on an iPad — no library needed). Deliberately built without
// signature_pad or any other npm package so this feature doesn't need an
// `npm install` (and the lockfile update / build verification that comes
// with it) to ship.
export function SignaturePad({ name, label = "Firma", height = 140 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2.25;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0A1F33";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && inputRef.current) {
      inputRef.current.value = canvas.toDataURL("image/png");
      setHasDrawn(true);
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (inputRef.current) inputRef.current.value = "";
    setHasDrawn(false);
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-subtle">{label}</span>
        <button type="button" onClick={clear} className="hsv-ghost-button !px-2 !py-0.5 text-[11px]">
          <Eraser className="h-3 w-3" aria-hidden="true" />
          Borrar
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={500}
        height={height}
        className="w-full cursor-crosshair rounded-md border border-line bg-white"
        style={{ touchAction: "none" }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <input ref={inputRef} type="hidden" name={name} defaultValue="" />
      {!hasDrawn ? <p className="text-[10px] text-ink-subtle">Firma aquí con el dedo o el lápiz (opcional).</p> : null}
    </div>
  );
}
