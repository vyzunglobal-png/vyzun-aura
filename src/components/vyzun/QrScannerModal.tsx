import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Camera, QrCode, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inviteLink } from "@/lib/vyzun-links";
import { useVyzun } from "@/lib/vyzun-store";
import { resolveScannedLink } from "@/lib/qr-links";

type Mode = "scan" | "mine";

/** Neon QR scanner: live camera decoding plus a "Show My QR Code" toggle. */
export function QrScannerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useVyzun();
  const navigate = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef<number | null>(null);
  const [mode, setMode] = useState<Mode>("scan");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [myLink, setMyLink] = useState("");

  useEffect(() => { setMyLink(inviteLink(window.location.origin, state.profile.username)); }, [state.profile.username]);

  useEffect(() => {
    if (!open || mode !== "scan" || result) return;
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled) { media.getTracks().forEach(t => t.stop()); return; }
        stream.current = media;
        if (video.current) { video.current.srcObject = media; await video.current.play(); }
        const { default: jsQR } = await import("jsqr");
        const tick = () => {
          if (cancelled) return;
          const v = video.current, c = canvas.current;
          if (v && c && v.readyState >= 2 && v.videoWidth) {
            const w = 360, h = Math.round((v.videoHeight / v.videoWidth) * w);
            c.width = w; c.height = h;
            const ctx = c.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(v, 0, 0, w, h);
              const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
              if (code?.data) { setResult(code.data); return; }
            }
          }
          frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setError("Allow camera access to scan a VYZUN QR code.");
      }
    })();
    return () => {
      cancelled = true;
      if (frame.current) cancelAnimationFrame(frame.current);
      stream.current?.getTracks().forEach(t => t.stop());
      stream.current = null;
    };
  }, [open, mode, result]);

  useEffect(() => { if (!open) { setResult(null); setMode("scan"); } }, [open]);

  if (!open) return null;
  const target = result ? resolveScannedLink(result, window.location.origin) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="QR scanner">
      <section className="qr-panel w-full max-w-sm rounded-3xl p-4">
        <header className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><QrCode className="h-5 w-5 text-cyan" />VYZUN QR</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close QR scanner"><X /></Button>
        </header>
        <div className="qr-toggle mt-3 grid grid-cols-2 gap-1 rounded-full p-1" role="tablist">
          <button role="tab" aria-selected={mode === "scan"} onClick={() => { setMode("scan"); setResult(null); }} className="qr-toggle-btn flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold"><ScanLine className="h-4 w-4" />Scan QR</button>
          <button role="tab" aria-selected={mode === "mine"} onClick={() => setMode("mine")} className="qr-toggle-btn flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold"><QrCode className="h-4 w-4" />Show My QR Code</button>
        </div>

        {mode === "scan" ? (
          <div className="mt-4">
            <div className="qr-viewfinder relative mx-auto aspect-square w-full overflow-hidden rounded-2xl">
              <video ref={video} muted playsInline className="h-full w-full object-cover" />
              <canvas ref={canvas} className="hidden" />
              {["left-3 top-3 border-l-4 border-t-4", "right-3 top-3 border-r-4 border-t-4", "left-3 bottom-3 border-b-4 border-l-4", "right-3 bottom-3 border-b-4 border-r-4"].map(pos => <span key={pos} aria-hidden className={`qr-corner absolute h-10 w-10 rounded-md ${pos}`} />)}
              {!result && !error && <span aria-hidden className="qr-laser absolute inset-x-6 h-0.5" />}
              {!stream.current && !error && !result && <Camera className="absolute inset-0 m-auto h-10 w-10 text-muted-foreground" />}
            </div>
            {error && <p role="alert" className="mt-3 text-center text-sm text-destructive">{error}</p>}
            {result ? (
              <div className="mt-3 space-y-2 text-center">
                <p className="text-xs text-muted-foreground">QR code found</p>
                <p className="truncate text-sm font-semibold">{result}</p>
                {target ? (
                  <Button className="w-full bg-gradient-vyzun text-primary-foreground" onClick={() => { onClose(); void navigate({ to: target }); }}>Open in VYZUN</Button>
                ) : (
                  <p className="text-xs text-muted-foreground">This isn't a VYZUN code, so it won't be opened.</p>
                )}
                <Button variant="outline" className="w-full" onClick={() => setResult(null)}>Scan again</Button>
              </div>
            ) : <p className="mt-3 text-center text-xs text-muted-foreground">Point at a friend's VYZUN QR to open their profile or Secret Drop.</p>}
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="qr-own rounded-2xl p-4">{myLink && <QRCodeSVG value={myLink} size={208} />}</div>
            <p className="text-gradient-secret text-sm font-bold">vyzun.app/invite/{state.profile.username}</p>
            <Button className="w-full bg-gradient-secret text-primary-foreground" onClick={async () => { try { await navigator.clipboard.writeText(myLink); setError(null); } catch { /* copy unavailable */ } }}>Copy my link</Button>
          </div>
        )}
      </section>
    </div>
  );
}
