"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { previewMarkdown } from "@/app/admin/actions";
import { uploadImage } from "./upload-client";
import { btn, errorCls, field, hintCls, labelCls } from "./styles";
import { wordCount } from "@/lib/admin/seo-check";

interface Props {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

type Preview = { html: string } | { error: string } | null;
type ToolId = "h2" | "h3" | "bold" | "italic" | "link" | "ul" | "ol" | "quote";
const TOOLS: { id: ToolId; label: string; text: string }[] = [
  { id: "h2", label: "Section heading (H2)", text: "H2" },
  { id: "h3", label: "Sub-heading (H3)", text: "H3" },
  { id: "bold", label: "Bold", text: "B" },
  { id: "italic", label: "Italic", text: "I" },
  { id: "link", label: "Link", text: "Link" },
  { id: "ul", label: "Bulleted list", text: "• List" },
  { id: "ol", label: "Numbered list", text: "1. List" },
  { id: "quote", label: "Quote", text: "Quote" },
];

/**
 * Markdown writing surface: toolbar that inserts Markdown syntax, a Write/Preview toggle, and a preview
 * produced by the SAME server pipeline the public site uses (sanitised), so what you see is what is published.
 */
export function MarkdownEditor({ value, onChange, error }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [preview, setPreview] = useState<Preview>(null);
  const [rendering, startRender] = useTransition();
  const [imageStatus, setImageStatus] = useState<{ busy: boolean; message?: string; error?: boolean }>({ busy: false });

  // Re-render the preview (debounced) whenever it is visible and the text changes.
  useEffect(() => {
    if (tab !== "preview") return;
    const t = setTimeout(() => {
      startRender(async () => {
        try {
          setPreview(await previewMarkdown(value));
        } catch {
          setPreview({ error: "The preview could not be generated. Your session may have expired — save and sign in again." });
        }
      });
    }, 250);
    return () => clearTimeout(t);
  }, [tab, value]);

  const edit = useCallback(
    (fn: (sel: { before: string; selected: string; after: string }) => { text: string; selStart: number; selEnd: number }) => {
      const el = ref.current;
      if (!el) return;
      const { selectionStart: s, selectionEnd: e } = el;
      const out = fn({ before: value.slice(0, s), selected: value.slice(s, e), after: value.slice(e) });
      onChange(out.text);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(out.selStart, out.selEnd);
      });
    },
    [value, onChange],
  );

  const wrap = (mark: string, placeholder: string) =>
    edit(({ before, selected, after }) => {
      const inner = selected || placeholder;
      return { text: `${before}${mark}${inner}${mark}${after}`, selStart: before.length + mark.length, selEnd: before.length + mark.length + inner.length };
    });

  const linePrefix = (prefix: string, placeholder: string) =>
    edit(({ before, selected, after }) => {
      const lineStart = before.lastIndexOf("\n") + 1;
      const head = before.slice(0, lineStart);
      const lead = before.slice(lineStart);
      const body = selected || placeholder;
      const lines = (lead + body).split("\n").map((l) => (l.startsWith(prefix) ? l : prefix + l));
      const joined = lines.join("\n");
      const pad = head && !head.endsWith("\n\n") ? (head.endsWith("\n") ? "\n" : "\n\n") : "";
      return { text: `${head}${pad}${joined}${after}`, selStart: head.length + pad.length, selEnd: head.length + pad.length + joined.length };
    });

  const link = () =>
    edit(({ before, selected, after }) => {
      const label = selected || "link text";
      const url = "https://";
      const text = `${before}[${label}](${url})${after}`;
      const urlStart = before.length + label.length + 3;
      return { text, selStart: urlStart, selEnd: urlStart + url.length };
    });

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    setImageStatus({ busy: true, message: "Uploading image…" });
    const result = await uploadImage(file);
    if ("error" in result) {
      setImageStatus({ busy: false, message: result.error, error: true });
      return;
    }
    edit(({ before, after }) => {
      const alt = "Describe the image";
      const md = `![${alt}](${result.url})`;
      return { text: `${before}${md}${after}`, selStart: before.length + 2, selEnd: before.length + 2 + alt.length };
    });
    setImageStatus({ busy: false, message: "Image inserted. Replace “Describe the image” with real alt text." });
  }

  const runTool = (id: ToolId) => {
    switch (id) {
      case "h2": return linePrefix("## ", "Section heading");
      case "h3": return linePrefix("### ", "Sub-heading");
      case "bold": return wrap("**", "bold text");
      case "italic": return wrap("*", "italic text");
      case "link": return link();
      case "ul": return linePrefix("- ", "List item");
      case "ol": return linePrefix("1. ", "List item");
      case "quote": return linePrefix("> ", "Quote");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label htmlFor="content" className={labelCls}>
          Article content (Markdown)
        </label>
        <div role="tablist" aria-label="Editor view" className="mb-1.5 inline-flex rounded-control border border-ink/25 bg-white p-0.5">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`tab-${t}`}
              aria-selected={tab === t}
              aria-controls={`panel-${t}`}
              onClick={() => setTab(t)}
              className={`min-h-9 rounded-[0.45rem] px-4 text-sm font-semibold ${tab === t ? "bg-ink text-white" : "text-ink hover:bg-ink/[0.06]"}`}
            >
              {t === "write" ? "Write" : "Preview"}
            </button>
          ))}
        </div>
      </div>

      <div id="panel-write" role="tabpanel" aria-labelledby="tab-write" hidden={tab !== "write"}>
        <div className="flex flex-wrap gap-1.5 rounded-t-control border border-b-0 border-ink/25 bg-light p-2" role="toolbar" aria-label="Formatting">
          {TOOLS.map((t) => (
            <button key={t.id} type="button" onClick={() => runTool(t.id)} aria-label={t.label} title={t.label} className={`${btn.outline} !min-h-9 !px-3 text-xs`}>
              {t.text}
            </button>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={imageStatus.busy} className={`${btn.outline} !min-h-9 !px-3 text-xs`}>
            {imageStatus.busy ? "Uploading…" : "Image"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose an image to insert"
            onChange={(e) => {
              void onPickImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <textarea
          ref={ref}
          id="content"
          name="content"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={24}
          spellCheck
          aria-invalid={Boolean(error)}
          aria-describedby="content-hint content-error"
          className={`${field} min-h-[28rem] rounded-t-none font-mono text-[0.95rem] leading-relaxed`}
        />
      </div>

      <div id="panel-preview" role="tabpanel" aria-labelledby="tab-preview" hidden={tab !== "preview"}>
        <div className="min-h-[28rem] rounded-control border border-ink/25 bg-white p-5 sm:p-8" aria-live="polite" aria-busy={rendering}>
          {preview === null ? (
            <p className="text-slate">Rendering preview…</p>
          ) : "error" in preview ? (
            <p role="alert" className="text-red-700">
              {preview.error}
            </p>
          ) : preview.html.trim() ? (
            // The HTML comes from the server-side sanitiser (same pipeline as the public article).
            <div className="prose-article" dangerouslySetInnerHTML={{ __html: preview.html }} />
          ) : (
            <p className="text-slate">Nothing to preview yet.</p>
          )}
        </div>
      </div>

      <p id="content-hint" className={hintCls}>
        {wordCount(value)} words · Use ## for sections and ### for sub-sections (the article title is already the page heading). Link related
        articles with /blog/their-slug.
      </p>
      {imageStatus.message && (
        <p role={imageStatus.error ? "alert" : "status"} className={imageStatus.error ? errorCls : hintCls}>
          {imageStatus.message}
        </p>
      )}
      <p id="content-error" className={errorCls} role={error ? "alert" : undefined}>
        {error}
      </p>
    </div>
  );
}
