import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Database,
  Flag,
  Gauge,
  Globe2,
  MapPin,
  Navigation2,
  RefreshCw,
  Route,
  Sailboat,
} from "lucide-react";
import MapView from "./MapView";
import { fetchPublicConfig, fetchTrackerStatus } from "./api";
import { formatCourse, formatDate, relativeTime } from "./format";

const EMPTY_STATUS = { latest: null, positions: [], collector: null, stale: false, configured: false, history_days: 0 };

function StatRow({ icon: Icon, label, value, subvalue }) {
  return (
    <div className="stat-row">
      <Icon aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {subvalue && <small>{subvalue}</small>}
      </div>
    </div>
  );
}

function ViewSwitch({ mode, onChange }) {
  return (
    <div className="view-switch" role="group" aria-label="Map view">
      <button type="button" className={mode === "americas" ? "active" : ""} onClick={() => onChange("americas")} aria-pressed={mode === "americas"}>
        <Globe2 aria-hidden="true" /> Americas
      </button>
      <button type="button" className={mode === "local" ? "active" : ""} onClick={() => onChange("local")} aria-pressed={mode === "local"}>
        <MapPin aria-hidden="true" /> Local detail
      </button>
    </div>
  );
}

function Timeline({ positions }) {
  const samples = useMemo(() => {
    if (!positions.length) return [];
    const desired = Math.min(7, positions.length);
    return Array.from({ length: desired }, (_, index) => positions[Math.round((index * (positions.length - 1)) / Math.max(1, desired - 1))]);
  }, [positions]);

  return (
    <section className="timeline" aria-labelledby="timeline-heading">
      <div className="timeline-title">
        <Route aria-hidden="true" />
        <h2 id="timeline-heading">Track history</h2>
      </div>
      <div className="timeline-line" aria-label={`${positions.length} stored position reports`}>
        {samples.length ? samples.map((point, index) => (
          <div className={`timeline-point ${index === samples.length - 1 ? "latest" : ""}`} key={`${point.ais_timestamp}-${index}`}>
            <i />
            <span>{formatDate(point.ais_timestamp)}</span>
            {index === samples.length - 1 && <small>Now</small>}
          </div>
        )) : <span className="timeline-empty">Waiting for the first AIS report</span>}
      </div>
    </section>
  );
}

export default function App() {
  const [mode, setMode] = useState("americas");
  const [status, setStatus] = useState(EMPTY_STATUS);
  const [mapKey, setMapKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchTrackerStatus();
      setStatus(next);
      setRequestError(false);
    } catch {
      setRequestError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    fetchPublicConfig().then((value) => setMapKey(value.google_maps_api_key || "")).catch(() => setMapKey(""));
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const latest = status.latest;
  const isLive = Boolean(latest && !status.stale && !requestError);
  const stateLabel = loading ? "Connecting" : isLive ? "Live" : status.configured ? "Signal delayed" : "Awaiting setup";
  const latestAge = latest ? relativeTime(latest.ais_timestamp) : "No report yet";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Sailboat aria-hidden="true" />
          <h1>Where is Chris?</h1>
        </div>
        <div className={`top-status ${isLive ? "live" : "waiting"}`}>
          <i aria-hidden="true" />
          <strong>{stateLabel}</strong>
          <span />
          <small>Last AIS report</small>
          <b>{latestAge}</b>
          <button type="button" onClick={refresh} aria-label="Refresh tracking data" disabled={loading}>
            <RefreshCw className={loading ? "spin" : ""} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="dashboard">
        <aside className="sidebar" aria-label="Vessel status">
          <div className={`live-block ${isLive ? "live" : "waiting"}`}>
            <i aria-hidden="true" />
            <div><strong>{stateLabel}</strong><span>Live AIS with backup checks</span></div>
          </div>
          <div className="stats">
            <StatRow icon={Clock3} label="Last AIS report" value={latestAge} />
            <StatRow icon={Gauge} label="Speed" value={latest?.speed_knots != null ? `${Number(latest.speed_knots).toFixed(1)} kn` : "—"} />
            <StatRow icon={Navigation2} label="Course" value={formatCourse(latest?.course_deg)} />
            <StatRow icon={Flag} label="Destination" value={latest?.destination || "—"} subvalue={latest?.eta ? `ETA ${formatDate(latest.eta, { hour: "numeric", minute: "2-digit" })}` : null} />
            <StatRow icon={Route} label="Track history" value={status.history_days ? `${status.history_days} ${status.history_days === 1 ? "day" : "days"}` : "—"} />
          </div>
          <div className="source-block">
            <span><Database aria-hidden="true" /> Data: {latest?.source || "AISStream + MarineTraffic backup"}</span>
            <span><Sailboat aria-hidden="true" /> Ship ID 447122</span>
          </div>
        </aside>

        <div className="tracking-canvas">
          <ViewSwitch mode={mode} onChange={setMode} />
          <MapView apiKey={mapKey} mode={mode} positions={status.positions} latest={latest} />
          <Timeline positions={status.positions} />
        </div>
      </main>
    </div>
  );
}
