export type FocusMode = "overview" | "metro" | "accessibility";

export type MapPoint = {
  id: "zone" | "screen" | "entrance" | "metro" | "parking" | "capitol";
  label: string;
  shortLabel: string;
  detail: string;
  lat: number;
  lng: number;
  number?: number;
  tone: "green" | "amber" | "navy";
};

export const FAN_ZONE_POLYGON = [
  { lat: 38.89058, lng: -77.01786, altitude: 2 },
  { lat: 38.89058, lng: -77.01558, altitude: 2 },
  { lat: 38.88867, lng: -77.01558, altitude: 2 },
  { lat: 38.88867, lng: -77.01786, altitude: 2 },
];

export const WALKING_ROUTE = [
  { lat: 38.88496, lng: -77.01565, altitude: 3 },
  { lat: 38.88792, lng: -77.01565, altitude: 3 },
  { lat: 38.88843, lng: -77.01583, altitude: 3 },
  { lat: 38.88843, lng: -77.01778, altitude: 3 },
  { lat: 38.89018, lng: -77.01783, altitude: 3 },
];

export const PARKING_CORRIDOR = [
  { lat: 38.89066, lng: -77.02008, altitude: 3 },
  { lat: 38.89066, lng: -77.01818, altitude: 3 },
];

// Geographic sightline through the event lawn and TV toward the Capitol dome.
export const MALL_AXIS = [
  { lat: 38.88956, lng: -77.01832, altitude: 3 },
  { lat: 38.88967, lng: -77.01572, altitude: 3 },
  { lat: 38.88994, lng: -77.00905, altitude: 3 },
];

export const MAP_POINTS: MapPoint[] = [
  {
    id: "zone",
    label: "FIFA Fan Zone",
    shortLabel: "Fan Zone",
    detail: "National Mall lawn between 3rd and 4th Streets",
    lat: 38.88963,
    lng: -77.01672,
    number: 1,
    tone: "green",
  },
  {
    id: "screen",
    label: "Big screen",
    shortLabel: "Big screen",
    detail: "Illustrative placement on the Mall axis, with the Capitol behind it",
    lat: 38.88967,
    lng: -77.01572,
    number: 2,
    tone: "navy",
  },
  {
    id: "entrance",
    label: "Suggested entrance",
    shortLabel: "Suggested entrance",
    detail: "Planning assumption at the west edge near 4th Street",
    lat: 38.89018,
    lng: -77.01783,
    number: 3,
    tone: "green",
  },
  {
    id: "metro",
    label: "Federal Center SW",
    shortLabel: "Federal Center SW",
    detail: "401 3rd Street SW · Blue, Orange and Silver lines",
    lat: 38.88496,
    lng: -77.01565,
    number: 4,
    tone: "navy",
  },
  {
    id: "parking",
    label: "Limited metered parking",
    shortLabel: "Limited parking",
    detail: "Madison Drive NW · 3-hour maximum; restrictions may apply",
    lat: 38.89066,
    lng: -77.01935,
    number: 5,
    tone: "amber",
  },
  {
    id: "capitol",
    label: "U.S. Capitol",
    shortLabel: "U.S. Capitol",
    detail: "Landmark orientation · east of the Fan Zone",
    lat: 38.88994,
    lng: -77.00905,
    tone: "navy",
  },
];

export const CAMERAS: Record<FocusMode, Record<string, number>> = {
  overview: {
    centerLat: 38.88978,
    centerLng: -77.01335,
    centerAltitude: 0,
    range: 1750,
    tilt: 67.5,
    heading: 99,
  },
  metro: {
    centerLat: 38.88772,
    centerLng: -77.01612,
    centerAltitude: 0,
    range: 1080,
    tilt: 58,
    heading: 350,
  },
  accessibility: {
    centerLat: 38.88955,
    centerLng: -77.0167,
    centerAltitude: 0,
    range: 760,
    tilt: 54,
    heading: 87,
  },
};
