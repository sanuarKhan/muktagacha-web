"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Leaflet's default marker icons reference image files via relative
// paths that break under bundlers (webpack/Turbopack) unless manually
// re-pointed at the CDN - this is the standard, documented workaround
// (react-leaflet's own docs point to this exact fix).
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Free map picker - OpenStreetMap tiles via Leaflet, zero API key, zero
// cost. Tap/click anywhere on the map to drop a pin there. Defaults to
// Muktagacha town center if no initial position is given.
export default function LocationPicker({
  lat,
  lng,
  onChange,
  height = 280,
}: {
  lat?: number | null;
  lng?: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
}) {
  const defaultCenter: [number, number] = [24.7636, 90.2347]; // Muktagacha, Mymensingh
  const center: [number, number] = lat != null && lng != null ? [lat, lng] : defaultCenter;

  return (
    <div
      style={{ height }}
      className="rounded-[14px] overflow-hidden border border-[var(--color-border)]"
    >
      <MapContainer
        center={center}
        zoom={lat != null ? 15 : 13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onChange} />
        {lat != null && lng != null && <Marker position={[lat, lng]} icon={markerIcon} />}
      </MapContainer>
    </div>
  );
}
