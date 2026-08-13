"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Phase = "idle" | "ready" | "working" | "done" | "error";

interface GenerateResponse {
  previewUrl?: string;
  downloadToken?: string;
  error?: string;
}

export default function Uploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enlarged, setEnlarged] = useState(false);

  function resizeToDataUrl(file: File, maxDim = 1600): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const original = reader.result as string;
        const img = new window.Image();
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          if (scale === 1 && file.size < 1024 * 1024) {
            resolve(original);
            return;
          }
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(original);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.88));
        };
        img.onerror = () => reject(new Error("Could not read this image."));
        img.src = original;
      };
      reader.onerror = () => reject(new Error("Could not read this file."));
      reader.readAsDataURL(file);
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      setPhase("error");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("Image is too large — please keep it under 25MB.");
      setPhase("error");
      return;
    }
    try {
      const resized = await resizeToDataUrl(file);
      setDataUrl(resized);
      setResult(null);
      setError(null);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this image.");
      setPhase("error");
    }
  }

  async function generate() {
    if (!dataUrl) return;
    setPhase("working");
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const text = await res.text();
      let data: GenerateResponse;
      try {
        data = JSON.parse(text) as GenerateResponse;
      } catch {
        throw new Error(
          res.status === 413
            ? "This photo is too large — please try a smaller one."
            : "The server had a hiccup — please try again in a moment."
        );
      }
      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      setResult(data);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    }
  }

  function reset() {
    setResult(null);
    setEnlarged(false);
    setPhase("ready");
  }

  return (
    <div className="uploader" id="try">
      {phase !== "done" && (
        <>
          <div
            className={`dropzone${dataUrl ? " has-file" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files[0]);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            {dataUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="preview"
                  src={dataUrl}
                  alt="Your uploaded photo"
                />
                <p className="change">Change photo</p>
              </>
            ) : (
              <p className="hint">
                Drop a childhood photo here, or click to browse
              </p>
            )}
          </div>

          <button
            className="go"
            onClick={generate}
            disabled={phase === "working" || !dataUrl}
          >
            {phase === "working" ? "Restoring…" : "Create my portrait"}
          </button>
        </>
      )}

      {phase !== "working" && phase !== "done" && (
        <p className="fineprint">
          Photos are deleted within 10 minutes and never used for training.
          &nbsp;<Link href="/privacy">Privacy</Link>
        </p>
      )}
      {phase === "working" && (
        <p className="status">
          Studying your photo, then painting. About half a minute.
        </p>
      )}
      {phase === "error" && <p className="status error">{error}</p>}

      {phase === "done" && result?.previewUrl && dataUrl && (
        <div className="result">
          <div className="compare">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="compare-original"
              src={dataUrl}
              alt="Your original photo"
            />
            <span className="compare-arrow-box" aria-hidden="true">
              <svg className="compare-arrow" viewBox="0 0 100 56" fill="none">
                <path
                  d="M8 40 C 30 16, 62 14, 90 28"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M76 16 L 91 28.5 L 72 33"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <button
              className="compare-avatar-btn"
              onClick={() => setEnlarged(true)}
              title="Click to enlarge"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="compare-avatar"
                src={result.previewUrl}
                alt="Preview of your restored portrait — click to enlarge"
              />
            </button>
          </div>
          {enlarged && (
            <div className="lightbox" onClick={() => setEnlarged(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.previewUrl} alt="Your restored portrait" />
            </div>
          )}
          {result.downloadToken && (
            <a
              className="go download-link"
              href={`/api/download/${result.downloadToken}`}
            >
              Download without watermark &middot; $1.99
            </a>
          )}
          <p className="fineprint">
            One-time purchase &middot; high-resolution JPEG &middot; available
            for 10 minutes, then erased.
          </p>
          <p className="fineprint">
            <button className="linklike" onClick={reset}>
              Try another photo
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
