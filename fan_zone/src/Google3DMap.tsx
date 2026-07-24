import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useEffect, useRef } from "react";
import {
  CAMERAS,
  FAN_ZONE_POLYGON,
  MALL_AXIS,
  MAP_POINTS,
  PARKING_CORRIDOR,
  WALKING_ROUTE,
  type FocusMode,
  type MapPoint,
} from "./mapData";

type Google3DMapProps = {
  apiKey: string;
  focus: FocusMode;
  activePoint: string;
  onPointSelect: (id: string) => void;
  onError: (message: string) => void;
};

type Dynamic3DElement = HTMLElement & Record<string, unknown>;

let googleLoaderConfigured = false;

const markerGlyph: Record<MapPoint["id"], string> = {
  zone: "1",
  screen: "▰",
  entrance: "3",
  metro: "M",
  parking: "P",
  capitol: "★",
};

function addHtmlMarker(
  map: Dynamic3DElement,
  point: MapPoint,
  activePoint: string,
  onPointSelect: (id: string) => void,
) {
  const marker = document.createElement("gmp-marker") as unknown as Dynamic3DElement;
  marker.position = { lat: point.lat, lng: point.lng, altitude: point.id === "screen" ? 4 : 8 };
  marker.altitudeMode = "RELATIVE_TO_GROUND";
  marker.anchorLeft = "-50%";
  marker.anchorTop = "-100%";
  marker.title = point.label;

  const button = document.createElement("button");
  button.type = "button";
  button.className = `live-map-marker live-map-marker--${point.tone}${
    activePoint === point.id ? " is-active" : ""
  }${point.id === "screen" ? " live-map-marker--screen" : ""}`;
  button.setAttribute("aria-label", `${point.label}: ${point.detail}`);
  button.dataset.pointId = point.id;
  button.innerHTML = point.id === "screen"
    ? `<span class="live-map-screen"><i>LIVE</i><b>⚽</b></span><span>${point.shortLabel}</span>`
    : `<span class="live-map-marker__glyph">${markerGlyph[point.id]}</span><span>${point.shortLabel}</span>`;
  button.addEventListener("click", () => onPointSelect(point.id));
  marker.append(button);
  map.append(marker);
}

export function Google3DMap({
  apiKey,
  focus,
  activePoint,
  onPointSelect,
  onError,
}: Google3DMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Dynamic3DElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function mountMap() {
      try {
        if (!googleLoaderConfigured) {
          setOptions({ key: apiKey, v: "weekly" });
          googleLoaderConfigured = true;
        }
        const maps3d = (await importLibrary("maps3d")) as unknown as Record<
          string,
          new (options: Record<string, unknown>) => Dynamic3DElement
        >;
        if (cancelled || !containerRef.current) return;

        const camera = CAMERAS[focus];
        const Map3DElement = maps3d.Map3DElement;
        const Polygon3DElement = maps3d.Polygon3DElement;
        const Polyline3DElement = maps3d.Polyline3DElement;
        const map = new Map3DElement({
          center: {
            lat: camera.centerLat,
            lng: camera.centerLng,
            altitude: camera.centerAltitude,
          },
          range: camera.range,
          tilt: camera.tilt,
          heading: camera.heading,
          mode: "HYBRID",
          defaultUIHidden: false,
          gestureHandling: "GREEDY",
        });
        map.className = "google-map-3d";
        map.setAttribute("aria-label", "Google Photorealistic 3D map of the National Mall");
        map.addEventListener("gmp-error", (event) => {
          const detail = (event as CustomEvent<{ message?: string }>).detail;
          onError(detail?.message || "Google Maps reported a rendering error.");
        });

        const zone = new Polygon3DElement({
          altitudeMode: "CLAMP_TO_GROUND",
          fillColor: "#0d5a38aa",
          strokeColor: "#f7f4e9",
          strokeWidth: 5,
          drawsOccludedSegments: true,
          path: FAN_ZONE_POLYGON,
        });
        map.append(zone);

        const route = new Polyline3DElement({
          altitudeMode: "RELATIVE_TO_GROUND",
          strokeColor: "#f7f4e9",
          strokeWidth: 10,
          drawsOccludedSegments: true,
          path: WALKING_ROUTE,
        });
        map.append(route);

        const routeInner = new Polyline3DElement({
          altitudeMode: "RELATIVE_TO_GROUND",
          strokeColor: "#0d5a38",
          strokeWidth: 5,
          drawsOccludedSegments: true,
          path: WALKING_ROUTE,
        });
        map.append(routeInner);

        const parking = new Polyline3DElement({
          altitudeMode: "RELATIVE_TO_GROUND",
          strokeColor: "#d99a2b",
          strokeWidth: 8,
          drawsOccludedSegments: true,
          path: PARKING_CORRIDOR,
        });
        map.append(parking);

        const mallAxis = new Polyline3DElement({
          altitudeMode: "RELATIVE_TO_GROUND",
          strokeColor: "#f1c96dcc",
          strokeWidth: 3,
          drawsOccludedSegments: false,
          path: MALL_AXIS,
        });
        map.append(mallAxis);

        MAP_POINTS.forEach((point) =>
          addHtmlMarker(map, point, activePoint, onPointSelect),
        );

        containerRef.current.replaceChildren(map);
        mapRef.current = map;
      } catch (error) {
        if (!cancelled) {
          onError(error instanceof Error ? error.message : "Google Maps could not load.");
        }
      }
    }

    void mountMap();
    return () => {
      cancelled = true;
      mapRef.current = null;
      containerRef.current?.replaceChildren();
    };
  }, [apiKey, onError, onPointSelect]);

  useEffect(() => {
    const markerButtons = containerRef.current?.querySelectorAll<HTMLButtonElement>(
      ".live-map-marker[data-point-id]",
    );
    markerButtons?.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.pointId === activePoint);
    });
  }, [activePoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const camera = CAMERAS[focus];
    const endCamera = {
      center: {
        lat: camera.centerLat,
        lng: camera.centerLng,
        altitude: camera.centerAltitude,
      },
      range: camera.range,
      tilt: camera.tilt,
      heading: camera.heading,
    };
    const flyCameraTo = map.flyCameraTo;
    if (typeof flyCameraTo === "function") {
      flyCameraTo.call(map, { endCamera, durationMillis: 850 });
    } else {
      Object.assign(map, endCamera);
    }
  }, [focus]);

  return (
    <div
      className="google-map-shell"
      ref={containerRef}
      aria-label="Live Google Photorealistic 3D map"
      data-map-provider="google-maps-3d"
    />
  );
}
