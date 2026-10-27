import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Route preview: pickup (green), drop (red), toll plazas (amber). Loaded lazily with the fare result.
export default function RouteMap({ path, tolls, color }: {
  path: number[][]; tolls: { name: string; lat: number; lon: number }[]; color: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || path.length < 2) return;
    const map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(map);

    // SVG attributes can't read CSS variables, so resolve a var(--x) theme colour first
    const varName = color.match(/^var\((--[\w-]+)\)$/)?.[1];
    const stroke = (varName && getComputedStyle(ref.current).getPropertyValue(varName).trim()) || (varName ? "#2563eb" : color);
    const line = path.map(([lat, lon]) => [lat, lon] as [number, number]);
    // White casing under the route keeps it readable over any map colours
    L.polyline(line, { color: "#ffffff", weight: 7, opacity: 0.9 }).addTo(map);
    const route = L.polyline(line, { color: stroke, weight: 4, opacity: 0.95 }).addTo(map);
    const dot = (p: [number, number], fill: string, r: number) =>
      L.circleMarker(p, { radius: r, color: "#ffffff", weight: 2, fillColor: fill, fillOpacity: 1 });
    dot(line[0], "#16a34a", 7).addTo(map);
    dot(line[line.length - 1], "#dc2626", 7).addTo(map);
    for (const t of tolls) dot([t.lat, t.lon], "#f59e0b", 5).bindTooltip(t.name || "Toll plaza").addTo(map);

    map.fitBounds(route.getBounds(), { padding: [24, 24] });
    return () => { map.remove(); };
  }, [path, tolls, color]);

  return <div ref={ref} className="trv-map" role="img" aria-label="Route map" />;
}
