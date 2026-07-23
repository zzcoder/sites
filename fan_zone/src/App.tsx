import {
  Accessibility,
  CalendarDays,
  ChevronDown,
  DoorOpen,
  Footprints,
  Info,
  KeyRound,
  LocateFixed,
  Map,
  MonitorPlay,
  Navigation,
  ParkingCircle,
  TrainFront,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Google3DMap } from "./Google3DMap";
import { MAP_POINTS, type FocusMode } from "./mapData";

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";

const panelRows = [
  { id: "zone", icon: Map, eyebrow: "Fan Zone", value: "National Mall · 3rd–4th St" },
  { id: "screen", icon: MonitorPlay, eyebrow: "Big screen", value: "Mall axis · Capitol behind" },
  { id: "entrance", icon: DoorOpen, eyebrow: "Suggested entrance", value: "West edge · planning assumption" },
  { id: "metro", icon: TrainFront, eyebrow: "Closest Metro", value: "Federal Center SW" },
  { id: "parking", icon: ParkingCircle, eyebrow: "Limited parking", value: "Metered · Madison Drive NW" },
] as const;

const focusCopy: Record<FocusMode, { kicker: string; title: string; body: string }> = {
  overview: {
    kicker: "Overview",
    title: "The lawn in context",
    body: "The highlighted block sits between 3rd and 4th Streets, with the Capitol east of the viewing lawn.",
  },
  metro: {
    kicker: "From Metro",
    title: "Walk north from Federal Center SW",
    body: "Use the marked route from 401 3rd Street SW. Allow extra time for event-day pedestrian controls.",
  },
  accessibility: {
    kicker: "Accessibility",
    title: "Prefer the level south approach",
    body: "The route is an orientation aid. Confirm ADA gates, security queues and closures with event staff on arrival.",
  },
};

export default function App() {
  const [focus, setFocus] = useState<FocusMode>("overview");
  const [activePoint, setActivePoint] = useState("zone");
  const [mapError, setMapError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const useLiveMap = Boolean(apiKey) && !mapError;
  const activeData = useMemo(
    () => MAP_POINTS.find((point) => point.id === activePoint) ?? MAP_POINTS[0],
    [activePoint],
  );
  const onMapError = useCallback((message: string) => setMapError(message), []);
  const onPointSelect = useCallback((id: string) => setActivePoint(id), []);

  const selectFocus = (next: FocusMode) => {
    setFocus(next);
    if (next === "metro") setActivePoint("metro");
    if (next === "accessibility") setActivePoint("entrance");
    if (next === "overview") setActivePoint("zone");
  };

  return (
    <main className="app-shell">
      <section className="map-stage" aria-label="FIFA Fan Zone map">
        {useLiveMap ? (
          <Google3DMap
            apiKey={apiKey}
            focus={focus}
            activePoint={activePoint}
            onPointSelect={onPointSelect}
            onError={onMapError}
          />
        ) : <MapConfigurationRequired error={mapError} />}
        <div className="map-shade" aria-hidden="true" />
      </section>

      <header className="brand-bar">
        <div className="brand-lockup">
          <img src="/hh-logo.png" alt="Healthy Hikers" className="brand-lockup__logo" />
          <div>
            <p className="brand-lockup__name">Healthy Hikers</p>
            <p className="brand-lockup__sub">Field guide · Washington, DC</p>
          </div>
        </div>
        <div className="event-chip">
          <CalendarDays aria-hidden="true" />
          <div>
            <span>Final day</span>
            <strong>Jul 19 · 2–6 PM</strong>
          </div>
        </div>
      </header>

      <aside
        className={`info-rail${detailsOpen ? " is-expanded" : ""}`}
        aria-label="Fan Zone visitor information"
      >
        <div className="info-rail__heading">
          <div>
            <p className="eyebrow">FIFA World Cup 2026</p>
            <h1>Fan Zone · DC</h1>
          </div>
          <div className="info-rail__actions">
            <LocateFixed aria-hidden="true" />
            <button
              type="button"
              className="info-rail__toggle"
              aria-label={detailsOpen ? "Hide map details" : "Show map details"}
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen((open) => !open)}
            >
              <ChevronDown aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="focus-summary" aria-live="polite">
          <span>{focusCopy[focus].kicker}</span>
          <strong>{focusCopy[focus].title}</strong>
          <p>{focusCopy[focus].body}</p>
        </div>

        <div className="info-list">
          {panelRows.map(({ id, icon: Icon, eyebrow, value }) => (
            <button
              key={id}
              type="button"
              className={`info-row${activePoint === id ? " is-active" : ""}`}
              onClick={() => setActivePoint(id)}
            >
              <span className="info-row__icon"><Icon aria-hidden="true" /></span>
              <span>
                <small>{eyebrow}</small>
                <strong>{value}</strong>
              </span>
              <Navigation aria-hidden="true" className="info-row__arrow" />
            </button>
          ))}
        </div>

        <div className="selected-detail">
          <span className={`selected-detail__dot selected-detail__dot--${activeData.tone}`} />
          <div>
            <strong>{activeData.label}</strong>
            <p>{activeData.detail}</p>
          </div>
        </div>
      </aside>

      <div className="map-legend" aria-label="Map legend">
        <span><i className="legend-swatch legend-swatch--zone" />Event lawn</span>
        <span><i className="legend-swatch legend-swatch--axis" />TV–Capitol axis</span>
        <span><i className="legend-swatch legend-swatch--route" />Suggested walk</span>
        <span><i className="legend-swatch legend-swatch--parking" />Limited parking</span>
      </div>

      <div className="axis-guide" aria-label="National Mall orientation">
        <span>West · Washington Monument</span>
        <i aria-hidden="true" />
        <strong>East · U.S. Capitol</strong>
      </div>

      <nav className="view-controls" aria-label="Map views">
        <button
          type="button"
          className={focus === "overview" ? "is-active" : ""}
          onClick={() => selectFocus("overview")}
        >
          <Map aria-hidden="true" /><span>Overview</span>
        </button>
        <button
          type="button"
          className={focus === "metro" ? "is-active" : ""}
          onClick={() => selectFocus("metro")}
        >
          <Footprints aria-hidden="true" /><span>From Metro</span>
        </button>
        <button
          type="button"
          className={focus === "accessibility" ? "is-active" : ""}
          onClick={() => selectFocus("accessibility")}
        >
          <Accessibility aria-hidden="true" /><span>Accessibility</span>
        </button>
      </nav>

      <div className="disclosure">
        <Info aria-hidden="true" />
        <span>Official gate and event-day parking restrictions may change.</span>
      </div>

      {useLiveMap && <div className="live-badge"><span /> Google Photorealistic 3D</div>}
    </main>
  );
}

function MapConfigurationRequired({ error }: { error: string }) {
  return (
    <div className="map-configuration" role="status">
      <div className="map-configuration__card">
        <span className="map-configuration__icon"><KeyRound aria-hidden="true" /></span>
        <p className="eyebrow">Google Maps required</p>
        <h2>{error ? "The 3D map could not load" : "Connect the real 3D map"}</h2>
        <p>
          {error || "Add a browser-restricted Google Maps API key to render the actual National Mall and Capitol."}
        </p>
        <code>VITE_GOOGLE_MAPS_API_KEY=your_key</code>
        <small>Enable Maps JavaScript API and 3D Maps, then restart Vite.</small>
      </div>
    </div>
  );
}
