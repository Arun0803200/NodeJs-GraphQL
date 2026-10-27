import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { MY_TRIP_BOOKINGS, NAV_COUNTS, UPDATE_MY_TRIP_BOOKING } from "../../api/queries";
import { Alert } from "../../components/ui/Alert";
import { Icon } from "../../components/ui/Icon";
import { timeAgo } from "../../components/charts/format";
import { downloadCsv } from "../../lib/analytics";
import { formatDuration, inr } from "../../lib/travel";

interface Booking {
  id: number; bookingRef: string; status: string; customerName: string; customerPhone: string; customerEmail: string | null;
  tripType: string; fromLabel: string; fromLat: number; fromLon: number; toLabel: string; toLat: number; toLon: number;
  pickupAt: string; returnAt: string | null; passengers: number; vehicleName: string | null; driverName: string | null; driverPhone: string | null;
  distanceKm: number; durationMin: number; tollCount: number; tollAmount: number; chargeableKm: number; ratePerKm: number; kmFare: number;
  driverBata: number; days: number; totalFare: number; notes: string | null; ownerNote: string | null; lang: string; createdAt: string;
}

const TABS = [
  { key: "new", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "", label: "All" },
] as const;

const TRIP: Record<string, string> = { city: "City ride", oneway: "One-way drop", round: "Round trip" };
const STATUS_TONE: Record<string, string> = { new: "warn", confirmed: "on", completed: "off", cancelled: "bad" };

// Dates come back as JS Date strings (ISO); show them in the owner's local time
const fmt = (s: string, withTime = true) => new Date(s).toLocaleString("en-IN", withTime
  ? { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }
  : { weekday: "short", day: "numeric", month: "short" });

function customerWhatsapp(b: Booking) {
  const text = b.lang === "ta"
    ? `வணக்கம் ${b.customerName}, உங்கள் முன்பதிவு ${b.bookingRef} (${b.fromLabel} → ${b.toLabel}, ${fmt(b.pickupAt)}) உறுதிசெய்யப்பட்டது.${b.driverName ? ` டிரைவர்: ${b.driverName}${b.driverPhone ? ` (${b.driverPhone})` : ""}.` : ""} நன்றி!`
    : `Hi ${b.customerName}, your booking ${b.bookingRef} (${b.fromLabel} → ${b.toLabel}, ${fmt(b.pickupAt)}) is confirmed.${b.driverName ? ` Driver: ${b.driverName}${b.driverPhone ? ` (${b.driverPhone})` : ""}.` : ""} Thank you!`;
  return `https://api.whatsapp.com/send?phone=91${b.customerPhone}&text=${encodeURIComponent(text)}`;
}

export function BookingsPage() {
  const client = useApolloClient();
  const [status, setStatus] = useState<string>("new");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [alert, setAlert] = useState({ type: "success" as "success" | "error", message: "" });

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, previousData, loading, refetch } = useQuery<any>(MY_TRIP_BOOKINGS, {
    variables: { filter: { status: status || null, search: query || null, limit: 100 } },
    notifyOnNetworkStatusChange: true,
    pollInterval: 60_000,
  });
  const res = (data ?? previousData)?.myTripBookings;
  const bookings: Booking[] = res?.data ?? [];
  const counts = res?.counts ?? {};
  const [update] = useMutation<any>(UPDATE_MY_TRIP_BOOKING);

  const save = async (b: Booking, patch: { status?: string; ownerNote?: string }) => {
    const { data } = await update({ variables: { id: b.id, ...patch } });
    const r = data.updateMyTripBooking;
    setAlert({ type: r.status === 1 ? "success" : "error", message: r.message });
    await refetch();
    client.refetchQueries({ include: [NAV_COUNTS] });
  };

  const exportCsv = () => downloadCsv(`trip-bookings-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Booking", "Status", "Booked at", "Customer", "Phone", "Email", "Trip", "From", "To", "Pickup", "Return", "Passengers", "Vehicle", "Driver",
      "Distance km", "Chargeable km", "Rate/km", "Km fare", "Driver bata", "Toll plazas", "Tolls", "Total", "Customer notes", "My note"],
    bookings.map((b) => [b.bookingRef, b.status, b.createdAt, b.customerName, b.customerPhone, b.customerEmail, TRIP[b.tripType] ?? b.tripType,
      b.fromLabel, b.toLabel, b.pickupAt, b.returnAt, b.passengers, b.vehicleName, b.driverName, b.distanceKm, b.chargeableKm, b.ratePerKm,
      b.kmFare, b.driverBata, b.tollCount, b.tollAmount, b.totalFare, b.notes, b.ownerNote]));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Trip bookings</h1>
          <p className="text-muted">Bookings made on your website's fare calculator. Customers also send these details to you on WhatsApp.</p>
        </div>
        <div className="log-actions">
          <button className="btn btn-sm btn-secondary icon-btn-text" onClick={() => refetch()} disabled={loading}><Icon name="refresh" size={15} /> Refresh</button>
          <button className="btn btn-sm btn-secondary" onClick={exportCsv} disabled={bookings.length === 0}>Export CSV</button>
        </div>
      </div>
      <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ ...alert, message: "" })} />

      <div className="bk-toolbar">
        <div className="dash-tabs bk-tabs" role="tablist">
          {TABS.map((tab) => (
            <button key={tab.key} role="tab" aria-selected={status === tab.key} className={status === tab.key ? "active" : ""} onClick={() => setStatus(tab.key)}>
              {tab.label}{(counts[tab.key || "all"] ?? 0) > 0 && <span className="bk-count">{counts[tab.key || "all"]}</span>}
            </button>
          ))}
        </div>
        <div className="inbox-search bk-search">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Search booking ID, customer, phone or place" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search bookings" />
        </div>
      </div>

      {!res && loading ? <p className="text-muted">Loading bookings…</p> : bookings.length === 0 ? (
        <div className="inbox-empty bk-empty">
          <Icon name="briefcase" size={32} />
          <strong>{query ? "No bookings match your search" : status === "new" ? "No new bookings" : "Nothing here yet"}</strong>
          <span>Turn on online booking in your website builder (travels templates) to receive trip requests here. <Link to="/user/website">My website →</Link></span>
        </div>
      ) : (
        <ul className={`bk-list${loading ? " dash-stale" : ""}`}>
          {bookings.map((b) => {
            const expanded = open === b.id;
            const directions = `https://www.google.com/maps/dir/?api=1&origin=${b.fromLat},${b.fromLon}&destination=${b.toLat},${b.toLon}&travelmode=driving`;
            return (
              <li key={b.id} className={`bk-card bk-${b.status}`}>
                <div className="bk-top">
                  <div className="bk-ref">
                    <code>{b.bookingRef}</code>
                    <span className={`state state-${STATUS_TONE[b.status] ?? "off"}`}><span className="state-dot" />{b.status[0].toUpperCase() + b.status.slice(1)}</span>
                    <span className="text-muted bk-ago">booked {timeAgo(b.createdAt)}</span>
                  </div>
                  <strong className="bk-fare">{inr(b.totalFare)}</strong>
                </div>

                <div className="bk-route">
                  <span className="bk-dot bk-dot-from" aria-hidden="true" /><span>{b.fromLabel}</span>
                  <span className="bk-dot bk-dot-to" aria-hidden="true" /><span>{b.toLabel}</span>
                </div>

                <dl className="bk-facts">
                  <div><dt>Pickup</dt><dd>{fmt(b.pickupAt)}</dd></div>
                  {b.returnAt && <div><dt>Return</dt><dd>{fmt(b.returnAt, false)}</dd></div>}
                  <div><dt>Trip</dt><dd>{TRIP[b.tripType] ?? b.tripType}</dd></div>
                  <div><dt>Distance</dt><dd>{b.distanceKm} km · {formatDuration(b.durationMin, "en")}</dd></div>
                  <div><dt>Vehicle</dt><dd>{b.vehicleName ?? "Any"} · {b.passengers} pax</dd></div>
                  {b.driverName && <div><dt>Driver asked</dt><dd>{b.driverName}</dd></div>}
                </dl>

                <div className="bk-customer">
                  <div>
                    <strong>{b.customerName}</strong>
                    <span className="text-muted"> · +91 {b.customerPhone}{b.customerEmail ? ` · ${b.customerEmail}` : ""}</span>
                  </div>
                  <div className="bk-actions">
                    <a className="btn btn-sm btn-secondary icon-btn-text" href={`tel:+91${b.customerPhone}`}>Call</a>
                    <a className="btn btn-sm btn-wa" href={customerWhatsapp(b)} target="_blank" rel="noreferrer">WhatsApp</a>
                    <a className="btn btn-sm btn-secondary" href={directions} target="_blank" rel="noreferrer">Directions ↗</a>
                  </div>
                </div>
                {b.notes && <p className="bk-notes">“{b.notes}”</p>}

                <button type="button" className="bk-toggle" onClick={() => setOpen(expanded ? null : b.id)} aria-expanded={expanded}>
                  {expanded ? "Hide fare & notes" : "Fare breakdown & notes"}
                </button>
                {expanded && (
                  <div className="bk-details">
                    <dl className="bk-breakdown">
                      <div><dt>Km charge ({b.chargeableKm} km × {inr(b.ratePerKm)})</dt><dd>{inr(b.kmFare)}</dd></div>
                      <div><dt>Driver bata{b.days > 1 ? ` (${b.days} days)` : ""}</dt><dd>{inr(b.driverBata)}</dd></div>
                      <div><dt>Tolls ({b.tollCount} plazas, estimate)</dt><dd>{inr(b.tollAmount)}</dd></div>
                      <div className="bk-total"><dt>Total estimate</dt><dd>{inr(b.totalFare)}</dd></div>
                    </dl>
                    <div className="form-group">
                      <label>Private note (driver assigned, advance received…)</label>
                      <textarea rows={2} value={notes[b.id] ?? b.ownerNote ?? ""} onChange={(e) => setNotes({ ...notes, [b.id]: e.target.value })} />
                      <button className="btn btn-sm btn-secondary" onClick={() => save(b, { ownerNote: notes[b.id] ?? b.ownerNote ?? "" })}>Save note</button>
                    </div>
                  </div>
                )}

                <div className="bk-status-actions">
                  {b.status === "new" && <button className="btn btn-sm btn-primary" onClick={() => save(b, { status: "confirmed" })}>Confirm booking</button>}
                  {b.status === "confirmed" && <button className="btn btn-sm btn-primary" onClick={() => save(b, { status: "completed" })}>Mark completed</button>}
                  {(b.status === "new" || b.status === "confirmed") && <button className="btn btn-sm btn-secondary" onClick={() => window.confirm(`Cancel booking ${b.bookingRef}?`) && save(b, { status: "cancelled" })}>Cancel</button>}
                  {(b.status === "cancelled" || b.status === "completed") && <button className="btn btn-sm btn-secondary" onClick={() => save(b, { status: "new" })}>Reopen</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
