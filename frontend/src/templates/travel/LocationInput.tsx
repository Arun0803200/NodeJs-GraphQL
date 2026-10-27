import { useEffect, useId, useRef, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { PLACE_REVERSE, PLACE_SEARCH } from "../../api/queries";
import type { Lang } from "../types";
import type { TravelT } from "./labels";

import { placeText, type Place } from "./place";

// Search-as-you-type location field (accessible combobox) with optional "use my location"
export function LocationInput({ label, placeholder, value, onChange, lang, t, tone, locate = false }: {
  label: string; placeholder: string; value: Place | null; onChange: (p: Place | null) => void;
  lang: Lang; t: TravelT; tone: "from" | "to"; locate?: boolean;
}) {
  const client = useApolloClient();
  const id = useId();
  const [text, setText] = useState(value ? placeText(value) : "");
  const [options, setOptions] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lastQuery = useRef("");

  // Reflect outside changes (swap, reset) in the text box
  useEffect(() => { setText(value ? placeText(value) : ""); }, [value]);

  useEffect(() => {
    const q = text.trim();
    if (!open || q.length < 3 || (value && q === placeText(value))) { setOptions([]); return; }
    const timer = setTimeout(async () => {
      lastQuery.current = q;
      setBusy(true);
      try {
        const { data } = await client.query<any>({ query: PLACE_SEARCH, variables: { query: q, lang }, fetchPolicy: "cache-first" });
        if (lastQuery.current !== q) return;
        const res = data?.placeSearch;
        setOptions(res?.data ?? []);
        setError(res?.status === 1 ? "" : res?.message ?? "");
        setActive(-1);
      } catch {
        setOptions([]);
      } finally {
        setBusy(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [text, open, lang, client, value]);

  const pick = (p: Place) => {
    onChange(p);
    setText(placeText(p));
    setOptions([]);
    setOpen(false);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const lat = +pos.coords.latitude.toFixed(6), lon = +pos.coords.longitude.toFixed(6);
        const { data } = await client.query<any>({ query: PLACE_REVERSE, variables: { lat, lon, lang } });
        const p: Place = data?.placeReverse?.data?.[0] ?? { label: `${lat}, ${lon}`, detail: "", lat, lon };
        pick({ ...p, lat, lon });
      } finally {
        setBusy(false);
      }
    }, () => { setBusy(false); setError(lang === "ta" ? "இடத்தை அறிய அனுமதி தேவை" : "Allow location access to use this"); }, { enableHighAccuracy: true, timeout: 10_000 });
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!options.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % options.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? options.length - 1 : a - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(options[active]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="trv-loc">
      <label htmlFor={id} className="trv-label">{label}</label>
      <div className={`trv-loc-box trv-loc-${tone}`}>
        <span className="trv-loc-dot" aria-hidden="true" />
        <input
          id={id} role="combobox" aria-expanded={open && options.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          value={text} placeholder={placeholder} autoComplete="off"
          onChange={(e) => { setText(e.target.value); setOpen(true); if (value) onChange(null); }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={onKey}
        />
        {busy && <span className="trv-spinner" aria-hidden="true" />}
      </div>
      {open && options.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="trv-options">
          {options.map((p, i) => (
            <li key={`${p.lat},${p.lon}`} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}
              className={i === active ? "active" : ""} onMouseDown={(e) => { e.preventDefault(); pick(p); }}>
              <strong>{p.label}</strong>
              {p.detail && <small>{p.detail}</small>}
            </li>
          ))}
        </ul>
      )}
      {locate && (
        <button type="button" className="trv-locate" onClick={useMyLocation} disabled={busy}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></svg>
          {busy ? t("locating") : t("useMyLocation")}
        </button>
      )}
      {error && <small className="trv-field-error">{error}</small>}
    </div>
  );
}
