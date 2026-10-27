import { useId } from "react";
import type { MasterOption } from "../../lib/masters";

interface SingleProps {
  value: string;
  onChange: (value: string) => void;
  options: MasterOption[];
  required?: boolean;
  placeholder?: string;
}

// Text input that suggests master values but still accepts anything typed
export function MasterTextInput({ value, onChange, options, required, placeholder }: SingleProps) {
  const listId = useId();
  return (
    <>
      <input value={value} onChange={(e) => onChange(e.target.value)} list={listId} required={required} placeholder={placeholder} autoComplete="off" />
      <datalist id={listId}>
        {options.map((o) => <option key={o.id} value={o.label} />)}
      </datalist>
    </>
  );
}

interface MultiProps {
  value: string;
  onChange: (value: string) => void;
  options: MasterOption[];
  required?: boolean;
  placeholder?: string;
  maxSuggestions?: number;
}

const splitList = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

// Comma-separated input with clickable master suggestions filtered by the word being typed
export function MasterMultiInput({ value, onChange, options, required, placeholder, maxSuggestions = 14 }: MultiProps) {
  const parts = value.split(",");
  const typing = parts[parts.length - 1].trim().toLowerCase();
  const chosen = new Set(splitList(value).map((s) => s.toLowerCase()));
  const suggestions = options
    .filter((o) => !chosen.has(o.label.toLowerCase()) && (!typing || o.label.toLowerCase().includes(typing)))
    .slice(0, maxSuggestions);

  const add = (label: string) => {
    // Replace the partial word being typed, otherwise append
    const kept = typing ? parts.slice(0, -1) : parts;
    onChange([...splitList(kept.join(",")), label].join(", ") + ", ");
  };

  return (
    <>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} autoComplete="off" />
      {suggestions.length > 0 && (
        <div className="master-suggestions">
          {suggestions.map((o) => (
            <button type="button" key={o.id} className="master-suggestion" onClick={() => add(o.label)}>+ {o.label}</button>
          ))}
        </div>
      )}
    </>
  );
}
