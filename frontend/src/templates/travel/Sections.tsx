import type { PortfolioContent } from "../types";
import { useLightbox } from "../layouts/context";
import { responsiveImageProps, IMAGE_SIZES } from "../media";
import { inr, maskLicense } from "../../lib/travel";
import type { TravelT } from "./labels";
import { EntityRating } from "./Reviews";

const CarIcon = () => (
  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 17h14M3 13l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5v4a1 1 0 0 1-1 1h-1M4 18H3a1 1 0 0 1-1-1v-4h20" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
  </svg>
);

export function FleetGrid({ content, t }: { content: PortfolioContent; t: TravelT }) {
  const cfg = content.travel;
  const vehicles = cfg.vehicles.filter((v) => v.name);
  if (vehicles.length === 0) return null;
  return (
    <ul className="trv-fleet">
      {vehicles.map((v, i) => (
        <li key={i} className="trv-vehicle">
          <div className="trv-vehicle-img">
            {v.imageUrl ? <img {...responsiveImageProps(v.imageUrl, IMAGE_SIZES.card)} alt={v.name} loading="lazy" /> : <CarIcon />}
            {v.type && <span className="trv-vehicle-type">{v.type}</span>}
          </div>
          <div className="trv-vehicle-body">
            <h3>{v.name}</h3>
            <p className="trv-vehicle-meta">
              <span>👥 {v.seats} {t("seats")}</span>
              <span>{v.ac ? `❄️ ${t("ac")}` : t("nonAc")}</span>
            </p>
            {v.features && (
              <ul className="trv-chips">{v.features.split(",").map((f) => f.trim()).filter(Boolean).map((f) => <li key={f}>{f}</li>)}</ul>
            )}
            <EntityRating target="vehicle" targetId={v.id} />
            <div className="trv-vehicle-rates">
              <div><small>{t("cityRate")}</small><strong>{inr(v.cityPerKm || cfg.cityPerKm)}<span>{t("perKm")}</span></strong></div>
              <div><small>{t("longRate")}</small><strong>{inr(v.longPerKm || cfg.longPerKm)}<span>{t("perKm")}</span></strong></div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DriverGrid({ content, t }: { content: PortfolioContent; t: TravelT }) {
  const openLightbox = useLightbox();
  const drivers = content.travel.drivers.filter((d) => d.name);
  if (!content.travel.showDrivers || drivers.length === 0) return null;
  return (
    <ul className="trv-drivers">
      {drivers.map((d, i) => (
        <li key={i} className="trv-driver">
          <div className="trv-driver-photo">
            {d.photoUrl ? <img {...responsiveImageProps(d.photoUrl, IMAGE_SIZES.avatar)} alt={d.name} loading="lazy" /> : <span aria-hidden="true">{d.name[0]}</span>}
          </div>
          <div className="trv-driver-body">
            <h3>{d.name}</h3>
            {d.experienceYears > 0 && <p className="trv-driver-exp">{t("experience", { n: d.experienceYears })}</p>}
            {d.languages && <p className="trv-driver-line"><small>{t("speaks")}</small> {d.languages}</p>}
            {d.licenseNumber && (
              <p className="trv-driver-line trv-licence">
                <span className="trv-verified" title={t("verified")}>✓</span>
                <small>{t("licence")}</small> {maskLicense(d.licenseNumber)}
                {d.licenseValidTill && <small> · {t("validTill")} {d.licenseValidTill}</small>}
              </p>
            )}
            <EntityRating target="driver" targetId={d.id} />
            <div className="trv-driver-actions">
              {d.phone && <a className="trv-btn trv-btn-ghost trv-btn-sm" href={`tel:${d.phone.replace(/[^\d+]/g, "")}`}>📞 {d.phone}</a>}
              {d.showLicenseImage && d.licenseImageUrl && (
                <button type="button" className="trv-btn trv-btn-ghost trv-btn-sm" onClick={() => openLightbox([{ url: d.licenseImageUrl, caption: `${t("licence")} · ${d.name}` }], 0)}>
                  🪪 {t("viewLicence")}
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RateCards({ content, t }: { content: PortfolioContent; t: TravelT }) {
  const c = content.travel;
  return (
    <div className="trv-rates">
      <div className="trv-rate">
        <span className="trv-rate-ico" aria-hidden="true">🏙️</span>
        <h3>{t("cityRides")}</h3>
        <p className="trv-rate-price">{inr(c.cityPerKm)}<span>{t("perKm")}</span></p>
        <ul>
          <li>{t("withinKm", { km: c.cityLimitKm })}</li>
          {c.cityMinFare > 0 && <li>{t("minFare", { amount: inr(c.cityMinFare) })}</li>}
        </ul>
      </div>
      <div className="trv-rate trv-rate-featured">
        <span className="trv-rate-ico" aria-hidden="true">🛣️</span>
        <h3>{t("outstation")}</h3>
        <p className="trv-rate-price">{inr(c.longPerKm)}<span>{t("perKm")}</span></p>
        <ul>
          {c.driverBataPerDay > 0 && <li>{t("bataPerDay", { amount: inr(c.driverBataPerDay) })}</li>}
          {c.minKmPerDay > 0 && <li>{t("minKmDay", { km: c.minKmPerDay })}</li>}
          {c.tollPerPlaza > 0 && <li>{t("tollPerPlaza", { amount: inr(c.tollPerPlaza) })}</li>}
        </ul>
      </div>
    </div>
  );
}

export function WhyUs({ t }: { t: TravelT }) {
  const items: [string, Parameters<TravelT>[0]][] = [["🛡️", "safe"], ["🧾", "transparent"], ["🕒", "allDay"], ["✨", "clean"]];
  return (
    <ul className="trv-why">
      {items.map(([icon, key]) => <li key={key}><span aria-hidden="true">{icon}</span>{t(key)}</li>)}
    </ul>
  );
}
