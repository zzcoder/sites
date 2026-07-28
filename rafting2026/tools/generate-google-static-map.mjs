import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

if (!apiKey) {
  console.error(
    [
      "GOOGLE_MAPS_API_KEY is not set.",
      "Set it in the same Terminal session, then run this command again:",
      '  GOOGLE_MAPS_API_KEY="your-key" node tools/generate-google-static-map.mjs',
    ].join("\n"),
  );
  process.exit(1);
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPaths = {
  all: resolve(projectRoot, "assets/images/google-route-map.png"),
  day1: resolve(projectRoot, "assets/images/google-route-map-day1.png"),
  day2: resolve(projectRoot, "assets/images/google-route-map-day2.png"),
};

const stops = {
  home: "12003 Holly Leaf Ct, Great Falls, VA 22066",
  bucees: "6500 Buc-ee's Blvd, Mount Crawford, VA 22841",
  grandview: "4700 Grandview Rd, Beaver, WV 25813",
  babcock: "486 Babcock Road, Clifftop, WV 25831",
  lodge: "219 Chestnutburg Road, Lansing, WV 25862",
  dinner: "219 W Maple Ave, Fayetteville, WV 25840",
  canyonRim: "162 Visitor Center Rd, Lansing, WV 25862",
};

const routeRequests = {
  day1: {
    origin: stops.home,
    destination: stops.lodge,
    intermediates: [
      stops.bucees,
      stops.grandview,
      stops.babcock,
      stops.lodge,
      stops.dinner,
      stops.canyonRim,
    ],
  },
  day2: {
    origin: stops.lodge,
    destination: stops.home,
    intermediates: [stops.canyonRim, stops.lodge],
  },
};

async function computeRoute(definition) {
  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration",
    },
    body: JSON.stringify({
      origin: { address: definition.origin },
      destination: { address: definition.destination },
      intermediates: definition.intermediates.map((address) => ({ address })),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      polylineQuality: "OVERVIEW",
      polylineEncoding: "ENCODED_POLYLINE",
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Routes API returned ${response.status}: ${message.slice(0, 500)}`);
  }

  const payload = await response.json();
  const route = payload.routes?.[0];

  if (!route?.polyline?.encodedPolyline) {
    throw new Error("Routes API did not return an encoded route polyline.");
  }

  return route;
}

function marker(label, address, color = "0x0d5053") {
  return `color:${color}|label:${label}|${address}`;
}

function addMapStyle(params, style) {
  params.append("style", style);
}

function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    const deltas = [];
    for (let coordinate = 0; coordinate < 2; coordinate += 1) {
      let result = 0;
      let shift = 0;
      let byte;
      do {
        byte = encoded.charCodeAt(index) - 63;
        index += 1;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      deltas.push(result & 1 ? ~(result >> 1) : result >> 1);
    }
    latitude += deltas[0];
    longitude += deltas[1];
    points.push({ lat: latitude / 1e5, lng: longitude / 1e5 });
  }

  return points;
}

function encodeSigned(value) {
  let encodedValue = value < 0 ? ~(value << 1) : value << 1;
  let output = "";
  while (encodedValue >= 0x20) {
    output += String.fromCharCode((0x20 | (encodedValue & 0x1f)) + 63);
    encodedValue >>= 5;
  }
  return output + String.fromCharCode(encodedValue + 63);
}

function encodePolyline(points) {
  let previousLatitude = 0;
  let previousLongitude = 0;
  return points
    .map(({ lat, lng }) => {
      const latitude = Math.round(lat * 1e5);
      const longitude = Math.round(lng * 1e5);
      const segment =
        encodeSigned(latitude - previousLatitude) +
        encodeSigned(longitude - previousLongitude);
      previousLatitude = latitude;
      previousLongitude = longitude;
      return segment;
    })
    .join("");
}

function squaredDistanceToSegment(point, start, end) {
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  if (dx === 0 && dy === 0) {
    return (point.lng - start.lng) ** 2 + (point.lat - start.lat) ** 2;
  }
  const ratio = Math.max(
    0,
    Math.min(
      1,
      ((point.lng - start.lng) * dx + (point.lat - start.lat) * dy) /
        (dx * dx + dy * dy),
    ),
  );
  const projectedLongitude = start.lng + ratio * dx;
  const projectedLatitude = start.lat + ratio * dy;
  return (
    (point.lng - projectedLongitude) ** 2 +
    (point.lat - projectedLatitude) ** 2
  );
}

function simplifyPoints(points, tolerance) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  const squaredTolerance = tolerance ** 2;

  while (stack.length) {
    const [startIndex, endIndex] = stack.pop();
    let farthestIndex = -1;
    let farthestDistance = squaredTolerance;
    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distance = squaredDistanceToSegment(
        points[index],
        points[startIndex],
        points[endIndex],
      );
      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthestIndex = index;
      }
    }
    if (farthestIndex !== -1) {
      keep[farthestIndex] = 1;
      stack.push([startIndex, farthestIndex], [farthestIndex, endIndex]);
    }
  }

  return points.filter((_, index) => keep[index]);
}

function simplifyEncodedPolyline(encoded, maxLength = 2500) {
  const points = decodePolyline(encoded);
  let tolerance = 0.0002;
  let simplified = points;
  let simplifiedEncoded = encoded;

  while (simplifiedEncoded.length > maxLength && tolerance <= 0.05) {
    simplified = simplifyPoints(points, tolerance);
    simplifiedEncoded = encodePolyline(simplified);
    tolerance *= 1.5;
  }

  console.log(
    `Simplified route from ${points.length} to ${simplified.length} points (${simplifiedEncoded.length} encoded characters).`,
  );
  return simplifiedEncoded;
}

function mapParams() {
  const params = new URLSearchParams({
    size: "640x640",
    scale: "2",
    format: "png",
    maptype: "roadmap",
    language: "en",
    region: "US",
    key: apiKey,
  });

  addMapStyle(params, "feature:all|element:geometry|color:0xf1eee5");
  addMapStyle(params, "feature:water|element:geometry|color:0xb8d4d2");
  addMapStyle(params, "feature:landscape.natural|element:geometry|color:0xdce5d7");
  addMapStyle(params, "feature:poi.park|element:geometry|color:0xcbdcc7");
  addMapStyle(params, "feature:road|element:geometry|color:0xffffff");
  addMapStyle(params, "feature:road.highway|element:geometry|color:0xe7c984");
  addMapStyle(params, "element:labels.text.fill|color:0x274146");
  addMapStyle(params, "element:labels.text.stroke|color:0xf8f4eb");
  return params;
}

async function downloadMap(outputPath, paths, markers) {
  const params = mapParams();
  paths.forEach(({ color, weight, polyline }) => {
    params.append("path", `color:${color}|weight:${weight}|enc:${polyline}`);
  });
  markers.forEach(({ label, address, color }) => {
    params.append("markers", marker(label, address, color));
  });
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?${params}`;
  const response = await fetch(staticMapUrl);
  const contentType = response.headers.get("content-type") || "";
  const bytes = Buffer.from(await response.arrayBuffer());

  if (!response.ok || !contentType.startsWith("image/") || bytes.length < 10_000) {
    const detail = contentType.startsWith("text/")
      ? bytes.toString("utf8").replace(/\s+/g, " ").slice(0, 500)
      : "";
    throw new Error(
      `Maps Static API failed (${response.status}, ${contentType}, ${bytes.length} bytes, ${staticMapUrl.length} URL characters). ${detail}`,
    );
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, bytes);
  console.log(`Created ${outputPath}`);
}

async function main() {
  // Sequential calls are more reliable with API keys that have conservative quotas.
  const day1 = await computeRoute(routeRequests.day1);
  const day2 = await computeRoute(routeRequests.day2);
  const day1Path = {
    color: "0x0d5053ff",
    weight: 6,
    polyline: simplifyEncodedPolyline(day1.polyline.encodedPolyline),
  };
  const day2Path = {
    color: "0xd7a14dff",
    weight: 6,
    polyline: simplifyEncodedPolyline(day2.polyline.encodedPolyline),
  };
  const day1Markers = [
    { label: "1", address: stops.home },
    { label: "2", address: stops.bucees },
    { label: "3", address: stops.grandview },
    { label: "4", address: stops.babcock },
    { label: "5", address: stops.lodge },
    { label: "6", address: stops.dinner },
    { label: "7", address: stops.canyonRim, color: "0xd7a14d" },
  ];
  const day2Markers = [
    { label: "A", address: stops.lodge, color: "0xd7a14d" },
    { label: "B", address: stops.canyonRim, color: "0xd7a14d" },
    { label: "H", address: stops.home },
  ];

  await downloadMap(
    outputPaths.all,
    [
      { ...day2Path, weight: 10 },
      { ...day1Path, weight: 4 },
    ],
    day1Markers,
  );
  await downloadMap(outputPaths.day1, [day1Path], day1Markers);
  await downloadMap(outputPaths.day2, [day2Path], day2Markers);

  const miles = (meters) => (meters / 1609.344).toFixed(0);
  console.log(
    `Day 1: ${miles(day1.distanceMeters)} mi · Day 2: ${miles(day2.distanceMeters)} mi`,
  );
}

main().catch((error) => {
  console.error(error.message);
  if (error.cause?.message) console.error(error.cause.message);
  process.exit(1);
});
