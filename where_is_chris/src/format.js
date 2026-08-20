export function relativeTime(value) {
  if (!value) return "No report yet";
  const deltaSeconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (deltaSeconds < 60) return "Just now";
  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export function formatCourse(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const degrees = Math.round(Number(value));
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return `${degrees}° ${points[Math.round(degrees / 45) % 8]}`;
}

export function formatCoordinate(value, positive, negative) {
  if (value === null || value === undefined) return "—";
  return `${Math.abs(Number(value)).toFixed(4)}°${Number(value) >= 0 ? positive : negative}`;
}

export function formatDate(value, options = {}) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", ...options }).format(new Date(value));
}
