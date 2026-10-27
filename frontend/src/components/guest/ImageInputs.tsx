import { useRef, useState } from "react";
import type { AlbumItem } from "../../templates/types";
import { ACCEPTED_IMAGES, MAX_FILES_PER_REQUEST, MAX_UPLOAD_MB, uploadImage, uploadImages } from "../../lib/upload";
import { imageVariant } from "../../templates/media";
import { useUiLang } from "../../i18n/UiLang";

interface AuthGate {
  isAuthenticated: boolean;
  onRequireAuth: () => void;
}

// Single image picker (profile photo, cover, certificate, project screenshot)
export function ImageField({ label, value, onChange, shape = "square", hint, isAuthenticated, onRequireAuth }: AuthGate & {
  label: string; value: string; onChange: (url: string) => void; shape?: "square" | "round" | "wide"; hint?: string;
}) {
  const { t } = useUiLang();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showUrl, setShowUrl] = useState(false);

  const pick = () => (isAuthenticated ? inputRef.current?.click() : onRequireAuth());

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className={`image-field image-field-${shape}`}>
        <button type="button" className="image-field-preview" onClick={pick} disabled={busy} aria-label={value ? `Replace ${label}` : `Upload ${label}`}>
          {value ? <img src={imageVariant(value, 400)} alt="" /> : <span className="image-field-empty">＋</span>}
          {busy && <span className="image-field-busy"><span className="spinner" /></span>}
        </button>
        <div className="image-field-actions">
          <div className="image-field-buttons">
            <button type="button" className="btn btn-sm btn-secondary" onClick={pick} disabled={busy}>{busy ? t("img.uploading") : value ? t("img.replace") : t("img.upload")}</button>
            {value && <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange("")}>{t("img.remove")}</button>}
          </div>
          <button type="button" className="link-button image-url-toggle" onClick={() => setShowUrl((s) => !s)}>{showUrl ? t("img.hideUrl") : t("img.useUrl")}</button>
        </div>
      </div>
      {showUrl && <input type="url" className="image-url-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" />}
      <small className="field-hint">{hint ?? t("img.formats", { mb: MAX_UPLOAD_MB })}{!isAuthenticated && ` · ${t("img.signIn")}`}</small>
      {error && <small className="field-error">{error}</small>}
      <input ref={inputRef} type="file" accept={ACCEPTED_IMAGES} hidden onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}

// Photo album: multi-upload, captions, reorder and remove
export function AlbumEditor({ items, onChange, isAuthenticated, onRequireAuth }: AuthGate & {
  items: AlbumItem[]; onChange: (items: AlbumItem[]) => void;
}) {
  const { t } = useUiLang();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const latest = useRef(items);
  latest.current = items;

  const pick = () => (isAuthenticated ? inputRef.current?.click() : onRequireAuth());

  const uploadAll = async (files: File[]) => {
    if (!files.length) return;
    if (!isAuthenticated) return onRequireAuth();
    setErrors([]);
    setProgress({ done: 0, total: files.length });
    const failed: string[] = [];
    // Batches keep requests small while still showing progress
    for (let start = 0; start < files.length; start += MAX_FILES_PER_REQUEST) {
      const batch = files.slice(start, start + MAX_FILES_PER_REQUEST);
      try {
        const results = await uploadImages(batch);
        const added = results.filter((r) => r.status === 1 && r.data).map((r) => ({ url: r.data!.url, caption: "" }));
        results.filter((r) => r.status !== 1).forEach((r) => failed.push(`${r.fileName}: ${r.message}`));
        if (added.length) onChange([...latest.current, ...added]);
      } catch (err: any) {
        batch.forEach((f) => failed.push(`${f.name}: ${err.message}`));
      }
      setProgress({ done: Math.min(start + batch.length, files.length), total: files.length });
    }
    setErrors(failed);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  return (
    <div className="album-editor">
      <div
        className={`album-drop${dragOver ? " drag-over" : ""}`}
        onClick={pick}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadAll(Array.from(e.dataTransfer.files)); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick()}
      >
        <span className="album-drop-icon">🖼</span>
        <strong>{progress ? t("img.albumUploading", { done: progress.done, total: progress.total }) : t("img.albumAdd")}</strong>
        <span className="text-muted small">{isAuthenticated ? t("img.albumHint", { mb: MAX_UPLOAD_MB }) : t("img.albumSignIn")}</span>
      </div>
      {errors.map((e) => <small key={e} className="field-error">{e}</small>)}

      {items.length > 0 && (
        <div className="album-grid">
          {items.map((item, i) => (
            <div key={`${item.url}-${i}`} className="album-tile">
              <img src={imageVariant(item.url, 400)} alt={item.caption} loading="lazy" decoding="async" />
              <div className="album-tile-tools">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("img.earlier")}>←</button>
                <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={t("img.later")}>→</button>
                <button type="button" className="danger" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={t("img.remove")}>✕</button>
              </div>
              <input value={item.caption} placeholder={t("img.caption")}
                onChange={(e) => onChange(items.map((it, j) => (j === i ? { ...it, caption: e.target.value } : it)))} />
            </div>
          ))}
        </div>
      )}
      <input ref={inputRef} type="file" accept={ACCEPTED_IMAGES} multiple hidden onChange={(e) => uploadAll(Array.from(e.target.files ?? []))} />
    </div>
  );
}
