import { useCallback, useReducer } from "react";

// Undo/redo history for a piece of state.
// Consecutive changes made while typing in the same field merge into one step, so Undo
// reverts a whole edit instead of one character at a time.

const LIMIT = 100;
const MERGE_MS = 1000;

type Updater<T> = T | ((prev: T) => T);

interface History<T> {
  past: T[];
  present: T;
  future: T[];
  // Field that made the last change and when, for merging typing into one step
  lastKey: unknown;
  lastAt: number;
}

type Action<T> =
  | { type: "set"; next: Updater<T>; key: unknown; at: number }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; value: T };

// Pure reducer: React may call it twice in development, so it never has side effects
function reducer<T>(h: History<T>, a: Action<T>): History<T> {
  switch (a.type) {
    case "set": {
      const next = typeof a.next === "function" ? (a.next as (p: T) => T)(h.present) : a.next;
      if (Object.is(next, h.present)) return h;
      const merge = a.key != null && a.key === h.lastKey && a.at - h.lastAt < MERGE_MS && h.past.length > 0;
      return {
        past: merge ? h.past : [...h.past, h.present].slice(-LIMIT),
        present: next,
        future: [],
        lastKey: a.key,
        lastAt: a.at,
      };
    }
    case "undo": {
      if (h.past.length === 0) return h;
      return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], lastKey: null, lastAt: 0 };
    }
    case "redo": {
      if (h.future.length === 0) return h;
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), lastKey: null, lastAt: 0 };
    }
    case "reset":
      return { past: [], present: a.value, future: [], lastKey: null, lastAt: 0 };
  }
}

// Typing in a text box/area: merge with the previous change from the same element. Buttons, checkboxes,
// selects and drag-and-drop are separate steps.
function typingKey(): unknown {
  const el = document.activeElement;
  if (el instanceof HTMLTextAreaElement) return el;
  if (el instanceof HTMLInputElement && !["checkbox", "radio", "file", "button", "submit", "color", "range"].includes(el.type)) return el;
  return null;
}

export function useUndoable<T>(init: () => T) {
  const [h, dispatch] = useReducer(reducer<T>, undefined, () => ({ past: [], present: init(), future: [], lastKey: null, lastAt: 0 }));
  const set = useCallback((next: Updater<T>) => dispatch({ type: "set", next, key: typingKey(), at: Date.now() }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  // Replace the state without history (e.g. loading a saved copy): becomes the new starting point
  const reset = useCallback((value: T) => dispatch({ type: "reset", value }), []);
  return { state: h.present, set, undo, redo, reset, canUndo: h.past.length > 0, canRedo: h.future.length > 0, undoCount: h.past.length, redoCount: h.future.length };
}
