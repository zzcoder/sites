import { useEffect, useRef, useState } from "react";
import { LoaderCircle, MapPinned } from "lucide-react";
import { loadGoogleMaps } from "./mapLoader";
import { formatCoordinate, relativeTime } from "./format";

const AMERICAS_CENTER = { lat: 12, lng: -100 };
const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#0b2d4b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#b9cad7" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b263f" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#597189" }, { weight: 0.7 }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#e0e8ee" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#425d75" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#526a7d" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a3355" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#8daabd" }] },
];

function createVesselMarker(maps, map, position, title) {
  const element = document.createElement("button");
  element.className = "vessel-marker";
  element.type = "button";
  element.setAttribute("aria-label", title);
  element.innerHTML = '<span class="vessel-sail vessel-sail--left"></span><span class="vessel-sail vessel-sail--right"></span><span class="vessel-hull"></span>';

  class VesselOverlay extends maps.OverlayView {
    onAdd() {
      this.getPanes().overlayMouseTarget.appendChild(element);
    }
    draw() {
      const point = this.getProjection().fromLatLngToDivPixel(position);
      if (!point) return;
      element.style.left = `${point.x}px`;
      element.style.top = `${point.y}px`;
    }
    onRemove() {
      element.remove();
    }
  }

  const overlay = new VesselOverlay();
  overlay.setMap(map);
  return { overlay, element };
}

export default function MapView({ apiKey, mode, positions, latest }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const mapsRef = useRef(null);
  const drawingsRef = useRef([]);
  const [state, setState] = useState(apiKey ? "loading" : "unconfigured");

  useEffect(() => {
    let cancelled = false;
    if (!apiKey || !hostRef.current) {
      setState("unconfigured");
      return undefined;
    }

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !hostRef.current) return;
        mapsRef.current = maps;
        mapRef.current = new maps.Map(hostRef.current, {
          center: AMERICAS_CENTER,
          zoom: 3,
          minZoom: 2,
          styles: MAP_STYLES,
          backgroundColor: "#0a3355",
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: false,
          gestureHandling: "greedy",
          clickableIcons: false,
        });
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));

    return () => {
      cancelled = true;
      drawingsRef.current.forEach((item) => item.setMap?.(null) || item.overlay?.setMap?.(null));
      drawingsRef.current = [];
      mapRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (state !== "ready" || !map || !maps) return;

    drawingsRef.current.forEach((item) => item.setMap?.(null) || item.overlay?.setMap?.(null));
    drawingsRef.current = [];

    const path = positions.map((point) => ({ lat: Number(point.latitude), lng: Number(point.longitude) }));
    if (path.length) {
      const polyline = new maps.Polyline({
        map,
        path,
        geodesic: true,
        strokeColor: "#ff7d61",
        strokeOpacity: 1,
        strokeWeight: 4,
        icons: [{ icon: { path: "M 0,0 m -1,0 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0", fillColor: "#ff7d61", fillOpacity: 1, strokeWeight: 0, scale: 3.5 }, offset: "0", repeat: "10%" }],
      });
      drawingsRef.current.push(polyline);
    }

    if (latest) {
      const position = { lat: Number(latest.latitude), lng: Number(latest.longitude) };
      const marker = createVesselMarker(maps, map, position, `${latest.ship_name || "Chris's sailboat"} latest position`);
      const infoWindow = new maps.InfoWindow({
        content: `<div class="map-tooltip"><strong>${latest.ship_name || "Ship ID 447122"}</strong><span>${relativeTime(latest.ais_timestamp)}</span><span>${formatCoordinate(latest.latitude, "N", "S")} · ${formatCoordinate(latest.longitude, "E", "W")}</span></div>`,
        pixelOffset: new window.google.maps.Size(0, -32),
      });
      marker.element.addEventListener("click", () => infoWindow.open({ map, position }));
      drawingsRef.current.push(marker, infoWindow);
    }

    if (mode === "americas") {
      map.setCenter(AMERICAS_CENTER);
      map.setZoom(3);
    } else if (latest) {
      map.setCenter({ lat: Number(latest.latitude), lng: Number(latest.longitude) });
      map.setZoom(11);
    }
  }, [latest, mode, positions, state]);

  return (
    <div className="map-frame">
      <div ref={hostRef} className="map-host" aria-label={`${mode === "americas" ? "Americas" : "Local detail"} vessel map`} />
      <div className="chart-grid" aria-hidden="true" />
      <div className="compass" aria-hidden="true"><span>N</span><i /></div>
      {state !== "ready" && (
        <div className="map-state" role="status">
          {state === "loading" ? <LoaderCircle className="spin" /> : <MapPinned />}
          <strong>{state === "loading" ? "Loading Google Maps" : "Google Maps unavailable"}</strong>
          <span>{state === "unconfigured" ? "Map key is not configured" : state === "error" ? "The map could not be loaded" : ""}</span>
        </div>
      )}
    </div>
  );
}
