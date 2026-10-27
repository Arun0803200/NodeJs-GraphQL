import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { CREATE_TRIP_BOOKING, TRIP_QUOTE } from "../../api/queries";
import type { Lang, PortfolioContent, TravelDriver } from "../types";
import { formatDuration, inr, maskLicense } from "../../lib/travel";
import { travelText, type TravelT } from "./labels";
import { LocationInput } from "./LocationInput";
import { placeText, type Place } from "./place";

const RouteMap = lazy(() => import("./RouteMap"));

type TripType = "city" | "oneway" | "round";

interface Quote {
  tripType: TripType; requestedType: TripType; distanceKm: number; durationMin: number; tollCount: number; tollNames: string[];
  tollPerPlaza: number; tollAmount: number; days: number; chargeableKm: number; ratePerKm: number; kmFare: number; driverBata: number;
  totalFare: number; vehicleName: string; notes: string[]; approximate: boolean; tolls: { name: string; lat: number; lon: number }[]; path: number[][];
}

const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return dateStr(d); };
const mapsLink = (p: Place) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`;
const normalizePhone = (raw: string) => {
  let d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
};

function noteText(note: string, t: TravelT): string {
  const [key, value] = note.split(":");
  switch (key) {
    case "beyond_city_limit": return t("beyondCity", { km: value });
    case "city_min_fare": return t("cityMinFare", { amount: inr(+value) });
    case "oneway_min_km": return t("onewayMin", { km: value });
    case "min_km_per_day": return t("minPerDay", { km: value });
    case "approximate_distance": return t("approx");
    default: return "";
  }
}

// Message the customer sends to the owner on WhatsApp (in the page language)
function whatsappMessage(o: {
  lang: Lang; t: TravelT; ref: string; name: string; phone: string; email: string; tripType: TripType; from: Place; to: Place;
  pickup: Date; returnDate: string; passengers: number; vehicle: string; driver: TravelDriver | null; quote: Quote; notes: string;
}) {
  const { t, quote: q } = o;
  const ta = o.lang === "ta";
  const when = o.pickup.toLocaleString(ta ? "ta-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  const lines = [
    `*${ta ? "புதிய பயண முன்பதிவு" : "New trip booking"}* — ${o.ref}`,
    "",
    `• ${t("waCustomer")}: ${o.name}`,
    `• ${t("waMobile")}: +91 ${o.phone}`,
    o.email ? `• ${o.email}` : null,
    "",
    `• ${t(q.tripType)}`,
    `• ${t("from")}: ${placeText(o.from)}`,
    `   ${mapsLink(o.from)}`,
    `• ${t("to")}: ${placeText(o.to)}`,
    `   ${mapsLink(o.to)}`,
    `• ${t("pickupDate")}: ${when}`,
    o.tripType === "round" && o.returnDate ? `• ${t("returnDate")}: ${new Date(`${o.returnDate}T00:00`).toLocaleDateString(ta ? "ta-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" })}` : null,
    `• ${t("passengers")}: ${o.passengers}`,
    o.vehicle ? `• ${t("vehicle")}: ${o.vehicle}` : null,
    o.driver ? `• ${t("waDriver")}: ${o.driver.name}${o.driver.phone ? ` (${o.driver.phone})` : ""}${o.driver.licenseNumber ? `, ${t("licence")} ${maskLicense(o.driver.licenseNumber)}` : ""}` : null,
    "",
    `• ${t("distance")}: ${q.distanceKm} km (~${formatDuration(q.durationMin, o.lang)})`,
    `• ${t("kmCharge")}: ${q.chargeableKm} km × ${inr(q.ratePerKm)} = ${inr(q.kmFare)}`,
    q.driverBata ? `• ${t("driverBata")}: ${inr(q.driverBata)}${q.days > 1 ? ` (${q.days} ${t("days")})` : ""}` : null,
    `• ${t("tolls")}: ${q.tollCount}${q.tollAmount ? ` (≈ ${inr(q.tollAmount)})` : ""}`,
    `• *${t("total")}: ${inr(q.totalFare)}*`,
    o.notes ? `\n• ${o.notes}` : null,
  ];
  // Optional lines are null (dropped); "" lines are intentional paragraph breaks
  return lines.filter((l): l is string => l !== null).join("\n").trim();
}

export function BookingWidget({ content, lang, owner, compact = false }: { content: PortfolioContent; lang: Lang; owner?: string; compact?: boolean }) {
  const t = useMemo(() => travelText(lang), [lang]);
  const cfg = content.travel;
  const client = useApolloClient();
  const [tripType, setTripType] = useState<TripType>("oneway");
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("07:00");
  const [returnDate, setReturnDate] = useState(tomorrow);
  const [passengers, setPassengers] = useState(1);
  const [vehicleIndex, setVehicleIndex] = useState<number | null>(cfg.vehicles.length ? 0 : null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [step, setStep] = useState<"trip" | "details" | "done">("trip");
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", company: "" });
  const [driverIndex, setDriverIndex] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState<{ ref: string; waUrl: string } | null>(null);
  const [book, { loading: booking }] = useMutation<any>(CREATE_TRIP_BOOKING);

  const vehicle = vehicleIndex !== null ? cfg.vehicles[vehicleIndex] : undefined;
  const configJson = useMemo(() => (owner ? null : JSON.stringify(cfg)), [owner, cfg]);
  const showDriverChoice = cfg.showDrivers && cfg.allowDriverChoice && cfg.drivers.some((d) => d.name);

  // Re-quote whenever the trip changes
  useEffect(() => {
    if (!from || !to) { setQuote(null); setQuoteError(""); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const { data } = await client.query<any>({
          query: TRIP_QUOTE, fetchPolicy: "network-only",
          variables: { input: {
            userName: owner ?? null, configJson, tripType,
            fromLat: from.lat, fromLon: from.lon, toLat: to.lat, toLon: to.lon, vehicleIndex,
            pickupAt: `${date}T${time}`, returnAt: tripType === "round" ? `${returnDate}T23:59` : null,
          } },
        });
        if (cancelled) return;
        const res = data?.tripQuote;
        if (res?.status === 1) { setQuote(res.data); setQuoteError(""); } else { setQuote(null); setQuoteError(res?.message ?? "Could not calculate the fare"); }
      } catch (err: any) {
        if (!cancelled) { setQuote(null); setQuoteError(err.message); }
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [from, to, tripType, vehicleIndex, date, time, returnDate, owner, configJson, client]);

  const swap = () => { setFrom(to); setTo(from); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!owner) return;
    const phone = normalizePhone(form.phone);
    if (form.name.trim().length < 2) { setFormError(t("errName")); return; }
    if (!phone) { setFormError(t("errPhone")); return; }
    const pickup = new Date(`${date}T${time}`);
    if (pickup.getTime() < Date.now() - 30 * 60_000) { setFormError(t("errPickupPast")); return; }
    if (vehicle && passengers > vehicle.seats) { setFormError(t("errSeats", { vehicle: vehicle.name, seats: vehicle.seats })); return; }
    if (!from || !to || !quote) return;

    const { data } = await book({ variables: { input: {
      userName: owner, tripType, fromLabel: placeText(from), fromLat: from.lat, fromLon: from.lon,
      toLabel: placeText(to), toLat: to.lat, toLon: to.lon, pickupAt: `${date}T${time}`,
      returnAt: tripType === "round" ? `${returnDate}T23:59` : null, passengers, vehicleIndex, driverIndex: showDriverChoice ? driverIndex : null,
      customerName: form.name.trim(), customerPhone: phone, customerEmail: form.email.trim() || null, notes: form.notes.trim() || null,
      lang, company: form.company,
    } } });
    const res = data?.createTripBooking;
    if (res?.status !== 1) { setFormError(res?.message ?? "Could not save your booking"); return; }

    const driver = driverIndex !== null ? cfg.drivers[driverIndex] : null;
    const text = whatsappMessage({
      lang, t, ref: res.bookingRef, name: form.name.trim(), phone, email: form.email.trim(), tripType: res.quote.tripType, from, to,
      pickup, returnDate, passengers, vehicle: vehicle?.name ?? "", driver, quote: res.quote, notes: form.notes.trim(),
    });
    // api.whatsapp.com directly: the wa.me redirect garbles emoji in the prefilled text
    const waUrl = res.whatsapp ? `https://api.whatsapp.com/send?phone=${res.whatsapp}&text=${encodeURIComponent(text)}` : "";
    setDone({ ref: res.bookingRef, waUrl });
    setStep("done");
    // Hand the details straight to the owner on WhatsApp
    if (waUrl) setTimeout(() => { window.location.href = waUrl; }, 1200);
  };

  const reset = () => { setStep("trip"); setDone(null); setForm({ name: "", phone: "", email: "", notes: "", company: "" }); setFrom(null); setTo(null); };
  const ownerName = content.fullName || "us";
  const callHref = content.phone ? `tel:${content.phone.replace(/[^\d+]/g, "")}` : "";

  return (
    <div className={`trv-book${compact ? " trv-book-compact" : ""}`} id="book">
      <div className="trv-book-head">
        <h2>{t("bookRide")}</h2>
        <p>{t("bookRideSub")}</p>
      </div>

      {step === "done" && done ? (
        <div className="trv-done" role="status">
          <span className="trv-done-icon" aria-hidden="true">✓</span>
          <h3>{t("bookedTitle")}</h3>
          <p>{done.waUrl ? t("bookedText", { ref: done.ref, name: ownerName }) : `${done.ref} · ${t("noWhatsapp", { phone: form.phone })}`}</p>
          <div className="trv-done-actions">
            {done.waUrl && <a className="trv-btn trv-btn-wa" href={done.waUrl}>{t("openWhatsapp")}</a>}
            {callHref && <a className="trv-btn trv-btn-ghost" href={callHref}>{t("callNow")}</a>}
          </div>
          <button type="button" className="trv-link" onClick={reset}>{t("newBooking")}</button>
        </div>
      ) : step === "details" && quote && from && to ? (
        <form className="trv-form" onSubmit={submit}>
          <div className="trv-summary">
            <div><strong>{placeText(from)}</strong><span aria-hidden="true"> → </span><strong>{placeText(to)}</strong></div>
            <span>{t(quote.tripType)} · {quote.distanceKm} km · <b>{inr(quote.totalFare)}</b></span>
          </div>
          <h3 className="trv-subhead">{t("yourDetails")}</h3>
          <div className="trv-grid-2">
            <label className="trv-field"><span className="trv-label">{t("name")}</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoComplete="name" maxLength={120} /></label>
            <label className="trv-field"><span className="trv-label">{t("phone")}</span><input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required autoComplete="tel" placeholder="98765 43210" /></label>
          </div>
          <label className="trv-field"><span className="trv-label">{t("emailOpt")}</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></label>
          <label className="trv-field"><span className="trv-label">{t("notes")}</span><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("notesPlaceholder")} maxLength={1000} /></label>
          <input className="trv-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />

          {showDriverChoice && (
            <fieldset className="trv-drivers-pick">
              <legend className="trv-label">{t("chooseDriver")}</legend>
              <label className={`trv-driver-opt${driverIndex === null ? " on" : ""}`}>
                <input type="radio" name="driver" checked={driverIndex === null} onChange={() => setDriverIndex(null)} />
                <span className="trv-driver-avatar trv-driver-any" aria-hidden="true">✦</span>
                <span><strong>{t("noPreference")}</strong></span>
              </label>
              {cfg.drivers.map((d, i) => d.name && (
                <label key={i} className={`trv-driver-opt${driverIndex === i ? " on" : ""}`}>
                  <input type="radio" name="driver" checked={driverIndex === i} onChange={() => setDriverIndex(i)} />
                  {d.photoUrl ? <img className="trv-driver-avatar" src={d.photoUrl} alt="" /> : <span className="trv-driver-avatar" aria-hidden="true">{d.name[0]}</span>}
                  <span>
                    <strong>{d.name}</strong>
                    <small>{[d.experienceYears ? t("experience", { n: d.experienceYears }) : "", d.licenseNumber ? `${t("licence")} ${maskLicense(d.licenseNumber)}` : ""].filter(Boolean).join(" · ")}</small>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {formError && <p className="trv-error" role="alert">{formError}</p>}
          {!owner && <p className="trv-preview-note">{t("previewOnly")}</p>}
          <div className="trv-actions">
            <button type="button" className="trv-btn trv-btn-ghost" onClick={() => setStep("trip")}>{t("back")}</button>
            <button type="submit" className="trv-btn trv-btn-wa" disabled={booking || !owner}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.7.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.5.3-.5v-.5l-1-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 6 6 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.2 4.6c1.9.8 2.7.9 3.6.7a3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3zM12 21.8a9.9 9.9 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.3-.4a9.8 9.8 0 1 1 8.4 4.6zm8.4-18.2A11.8 11.8 0 0 0 1.9 17.9L.2 24l6.3-1.6a11.8 11.8 0 0 0 5.6 1.4 11.8 11.8 0 0 0 8.3-20.2z"/></svg>
              {booking ? t("booking") : t("confirmBook")}
            </button>
          </div>
        </form>
      ) : (
        <div className="trv-form">
          <div className="trv-tabs" role="tablist">
            {(["city", "oneway", "round"] as TripType[]).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tripType === k} className={tripType === k ? "on" : ""} onClick={() => setTripType(k)}>{t(k)}</button>
            ))}
          </div>

          <div className="trv-route">
            <LocationInput label={t("from")} placeholder={t("fromPlaceholder")} value={from} onChange={setFrom} lang={lang} t={t} tone="from" locate />
            <button type="button" className="trv-swap" onClick={swap} aria-label={t("swap")} title={t("swap")}>⇅</button>
            <LocationInput label={t("to")} placeholder={t("toPlaceholder")} value={to} onChange={setTo} lang={lang} t={t} tone="to" />
          </div>

          <div className={tripType === "round" ? "trv-grid-3" : "trv-grid-2"}>
            <label className="trv-field"><span className="trv-label">{t("pickupDate")}</span><input type="date" value={date} min={dateStr(new Date())} onChange={(e) => { setDate(e.target.value); if (returnDate < e.target.value) setReturnDate(e.target.value); }} /></label>
            <label className="trv-field"><span className="trv-label">{t("pickupTime")}</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
            {tripType === "round" && <label className="trv-field"><span className="trv-label">{t("returnDate")}</span><input type="date" value={returnDate} min={date} onChange={(e) => setReturnDate(e.target.value)} /></label>}
          </div>

          <div className="trv-grid-2 trv-grid-vehicle">
            <label className="trv-field">
              <span className="trv-label">{t("vehicle")}</span>
              <select value={vehicleIndex ?? ""} onChange={(e) => setVehicleIndex(e.target.value === "" ? null : +e.target.value)}>
                {cfg.vehicles.length === 0 && <option value="">{t("anyVehicle")}</option>}
                {cfg.vehicles.map((v, i) => (
                  <option key={i} value={i}>{v.name}{v.seats ? ` · ${v.seats} ${t("seats")}` : ""} · {inr(v.longPerKm || cfg.longPerKm)}{t("perKm")}</option>
                ))}
              </select>
            </label>
            <label className="trv-field">
              <span className="trv-label">{t("passengers")}</span>
              <input type="number" min={1} max={vehicle?.seats || 60} value={passengers} onChange={(e) => setPassengers(Math.max(1, +e.target.value || 1))} />
            </label>
          </div>

          <div className="trv-quote" aria-live="polite">
            {!from || !to ? <p className="trv-quote-empty">{t("enterBoth")}</p>
              : quoting && !quote ? <p className="trv-quote-empty"><span className="trv-spinner" aria-hidden="true" /> {t("calculating")}</p>
              : quoteError ? <p className="trv-error" role="alert">{quoteError}</p>
              : quote && (
                <div className={quoting ? "trv-stale" : ""}>
                  <div className="trv-quote-stats">
                    <div><span>{t("distance")}</span><strong>{quote.distanceKm} km</strong></div>
                    <div><span>{t("duration")}</span><strong>{formatDuration(quote.durationMin, lang)}</strong></div>
                    <div><span>{t("tolls")}</span><strong>{quote.tollCount}</strong></div>
                  </div>
                  <Suspense fallback={<div className="trv-map" />}>
                    <RouteMap path={quote.path} tolls={quote.tolls} color="var(--tpl-primary)" />
                  </Suspense>
                  <dl className="trv-breakdown">
                    <div><dt>{t("kmCharge")} <small>{quote.chargeableKm} km × {inr(quote.ratePerKm)}</small></dt><dd>{inr(quote.kmFare)}</dd></div>
                    {quote.driverBata > 0 && <div><dt>{t("driverBata")} {quote.days > 1 && <small>{quote.days} {t("days")}</small>}</dt><dd>{inr(quote.driverBata)}</dd></div>}
                    <div>
                      <dt>{t("tollCharges")} <small>{quote.tollCount ? `${quote.tollCount} × ≈${inr(quote.tollPerPlaza)}` : t("noTolls")}</small></dt>
                      <dd>{inr(quote.tollAmount)}</dd>
                    </div>
                    <div className="trv-total"><dt>{t("total")}</dt><dd>{inr(quote.totalFare)}</dd></div>
                  </dl>
                  {quote.tollNames.length > 0 && <p className="trv-toll-names">🛣 {quote.tollNames.slice(0, 8).join(" · ")}{quote.tollNames.length > 8 ? " …" : ""}</p>}
                  <ul className="trv-notes">
                    {quote.notes.map((n) => noteText(n, t)).filter(Boolean).map((n) => <li key={n}>{n}</li>)}
                    {quote.tollCount > 0 && <li>{t("tollNote", { amount: inr(quote.tollPerPlaza) })}</li>}
                  </ul>
                  <button type="button" className="trv-btn trv-btn-primary trv-btn-full" onClick={() => setStep("details")}>{t("continue")} →</button>
                  <p className="trv-credit">{t("mapCredit")}</p>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
