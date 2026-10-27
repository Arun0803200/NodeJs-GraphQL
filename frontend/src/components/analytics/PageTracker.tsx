import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { client } from "../../api/client";
import { TRACK_PAGE_VIEW } from "../../api/queries";

const VISITOR_KEY = "pv_visitor";
const SESSION_KEY = "pv_session";
// A visit ends after 30 minutes without a page view
const SESSION_IDLE_MS = 30 * 60 * 1000;

const newId = () => (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

// Storage can be blocked (private mode, cookies disabled); fall back to an id that lives for this page load
let memoryVisitor: string | null = null;
let memorySession: { id: string; at: number } | null = null;
// document.referrer never changes during in-app navigation, so only the first view of a page load carries it
let referrerSent = false;

function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) { id = newId(); localStorage.setItem(VISITOR_KEY, id); }
    return id;
  } catch {
    return (memoryVisitor ??= newId());
  }
}

function sessionId(): string {
  const now = Date.now();
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null") as { id: string; at: number } | null;
    const session = saved && now - saved.at < SESSION_IDLE_MS ? { id: saved.id, at: now } : { id: newId(), at: now };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session.id;
  } catch {
    memorySession = memorySession && now - memorySession.at < SESSION_IDLE_MS ? { ...memorySession, at: now } : { id: newId(), at: now };
    return memorySession.id;
  }
}

// Reports each route change to the analytics API. Respects the browser's Do Not Track setting.
export function PageTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (navigator.doNotTrack === "1") return;
    const referrer = referrerSent ? null : document.referrer || null;
    referrerSent = true;
    client.mutate({
      mutation: TRACK_PAGE_VIEW,
      variables: {
        input: {
          visitorId: visitorId(),
          sessionId: sessionId(),
          path: pathname,
          referrer,
          siteHost: window.location.hostname,
        },
      },
    }).catch(() => { /* analytics must never break the page */ });
  }, [pathname]);

  return null;
}
