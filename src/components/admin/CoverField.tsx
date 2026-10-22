"use client";

import { useRef, useState } from "react";
import { uploadImage } from "./upload-client";
import { btn, errorCls, field, hintCls, labelCls } from "./styles";

export interface LegacyCover {
  name: string;
  src: string;
}

interface Props {
  cover: string;
  width: string;
  height: string;
  alt: string;
  legacy: LegacyCover[];
  /** Public base URL of the blog-covers bucket, e.g. https://xyz.supabase.co/storage/v1/object/public/blog-covers/ */
  bucketBase: string;
  onCover: (c: { cover: string; width: string; height: string }) => void;
  onAlt: (v: string) => void;
  errors: { cover?: string; alt?: string };
}

export function CoverField({ cover, width, height, alt, legacy, bucketBase, onCover, onAlt, errors }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);

  const legacyHit = legacy.find((l) => l.name === cover);
  const previewSrc = cover ? (legacyHit ? legacyHit.src : `${bucketBase}${encodeURIComponent(cover)}`) : "";

  async function onFile(file: File | undefined) {
    if (!file) return;
    setStatus(null);
    setProgress(0);
    const result = await uploadImage(file, setProgress);
    setProgress(null);
    if ("error" in result) {
      setStatus({ text: result.error, error: true });
      return;
    }
    onCover({ cover: result.name, width: String(result.width), height: String(result.height) });
    setStatus({ text: result.reused ? "This image was already uploaded; it has been reused." : "Image uploaded. Save the article to keep it." });
  }

  return (
    <fieldset className="space-y-3">
      <legend className={labelCls}>Cover image</legend>
      <input type="hidden" name="cover" value={cover} />
      <input type="hidden" name="cover_width" value={width} />
      <input type="hidden" name="cover_height" value={height} />

      {previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-only preview of an already-optimised image
        <img src={previewSrc} alt={alt || "Cover image preview"} className="aspect-[16/10] w-full rounded-control border border-ink/15 object-cover" />
      ) : (
        <div className="flex aspect-[16/10] w-full items-center justify-center rounded-control border border-dashed border-ink/30 bg-light text-sm text-slate">
          No cover image (the default is used)
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={progress !== null} className={btn.outline}>
          {cover ? "Replace image" : "Upload image"}
        </button>
        {cover && (
          <button type="button" onClick={() => onCover({ cover: "", width: "", height: "" })} className={btn.outline}>
            Remove
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a cover image file"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {progress !== null && (
        <div>
          <progress value={progress} max={1} className="h-2 w-full accent-[var(--color-accent-deep)]" aria-label="Upload progress" />
          <p className={hintCls}>Uploading… {Math.round(progress * 100)}%</p>
        </div>
      )}
      {status && (
        <p role={status.error ? "alert" : "status"} className={status.error ? errorCls : hintCls}>
          {status.text}
        </p>
      )}
      <p className={hintCls}>JPEG, PNG, WebP or AVIF, up to 4 MB and at least 600 px wide. Images are converted to WebP and stripped of location data.</p>
      {errors.cover && <p role="alert" className={errorCls}>{errors.cover}</p>}

      {legacy.length > 0 && (
        <div>
          <label htmlFor="legacy-cover" className="mb-1 block text-sm font-semibold text-ink">
            …or use a bundled image
          </label>
          <select
            id="legacy-cover"
            className={field}
            value={legacyHit ? cover : ""}
            onChange={(e) => e.target.value && onCover({ cover: e.target.value, width: "", height: "" })}
          >
            <option value="">Choose…</option>
            {legacy.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="cover_alt" className={labelCls}>
          Cover image alt text
        </label>
        <input
          id="cover_alt"
          name="cover_alt"
          type="text"
          value={alt}
          onChange={(e) => onAlt(e.target.value)}
          aria-invalid={Boolean(errors.alt)}
          aria-describedby="cover_alt-hint"
          className={field}
        />
        <p id="cover_alt-hint" className={hintCls}>
          Describe what the image shows, for screen-reader users and image search. Required before publishing when a cover is set.
        </p>
        {errors.alt && <p role="alert" className={errorCls}>{errors.alt}</p>}
      </div>
    </fieldset>
  );
}
