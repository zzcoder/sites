const stops = [
  {
    id: "south-baltimore-park-ride",
    label: "Free Parking",
    name: "South Baltimore Park & Ride",
    detail: "1000 Hull St. 8:45 AM; about a 15-minute walk to Federal Hill Park.",
    coords: [39.2747585, -76.5907319],
    color: "#b4322d"
  },
  {
    id: "triangle-lot",
    label: "Paid Parking",
    name: "Triangle Lot",
    detail: "1113 Hull St. 8:50 AM; about a 10-minute walk to Federal Hill Park.",
    coords: [39.2732713, -76.5910609],
    color: "#7b5bb0"
  },
  {
    id: "west-street-garage",
    label: "Paid Parking",
    name: "West Street Garage",
    detail: "40 E West St. 9:00 AM; about a 5-minute walk to Federal Hill Park.",
    coords: [39.2761706, -76.6132987],
    color: "#b4322d"
  },
  {
    id: "federal-hill",
    label: "Meet",
    name: "Federal Hill Park",
    detail: "300 Warren Ave. 9:30 AM gathering, group photo, introductions, and harbor panorama photography.",
    coords: [39.2796148, -76.6084642],
    color: "#113f7a"
  },
  {
    id: "visitor-center",
    label: "Tall Ships",
    name: "Baltimore Visitor Center",
    detail: "401 Light St. 10:00 AM start for the waterfront walk into Sail250.",
    coords: [39.2839019, -76.6122999],
    color: "#d4a642"
  },
  {
    id: "harborplace",
    label: "Sail250",
    name: "Harborplace",
    detail: "Inner Harbor festival area, tall ships, waterfront exhibits, and harbor photography.",
    coords: [39.286555, -76.610989],
    color: "#113f7a"
  },
  {
    id: "historic-ships",
    label: "Historic Ships",
    name: "Historic Ships in Baltimore",
    detail: "USS Constellation area and nearby Sail250 dockside activity.",
    coords: [39.2851107, -76.6117824],
    color: "#d4a642"
  },
  {
    id: "harbor-east",
    label: "Waterfront Walk",
    name: "Harbor East",
    detail: "Waterfront route segment between Inner Harbor and Fells Point.",
    coords: [39.2834572, -76.599964],
    color: "#113f7a"
  },
  {
    id: "broadway-square",
    label: "Lunch",
    name: "Broadway Square / Fells Point",
    detail: "1637 Thames St. 12:00 PM lunch area and Fells Point waterfront photography.",
    coords: [39.2815048, -76.5937752],
    color: "#d4a642"
  },
  {
    id: "canton",
    label: "Official Viewing",
    name: "Canton Waterfront Park",
    detail: "3001 Boston St. 12:30 PM walk destination and Blue Angels viewing area.",
    coords: [39.2771962, -76.5727014],
    color: "#d4a642"
  },
  {
    id: "harbor-point",
    label: "Moon Option",
    name: "Harbor Point",
    detail: "Optional moon photography area along the harbor after dinner.",
    coords: [39.2805596, -76.598348],
    color: "#7b5bb0"
  },
  {
    id: "domino-sugar",
    label: "Moon Option",
    name: "Domino Sugar Overlook",
    detail: "Optional moon photography area near the Domino Sugar waterfront.",
    coords: [39.2753127, -76.5953103],
    color: "#7b5bb0"
  },
  {
    id: "baltimore-peninsula",
    label: "Optional Viewing",
    name: "Baltimore Peninsula",
    detail: "Official land viewing area for Airshow Baltimore if the group changes viewing location.",
    coords: [39.2640487, -76.6077287],
    color: "#d4a642"
  },
  {
    id: "fort-mchenry",
    label: "Optional Viewing",
    name: "Fort McHenry",
    detail: "Official airshow guidance area and history stop; use transit or walk access.",
    coords: [39.2637084, -76.5803328],
    color: "#b4322d"
  }
];

const stopById = Object.fromEntries(stops.map((stop) => [stop.id, stop]));

const route = [
  stopById["south-baltimore-park-ride"].coords,
  stopById["federal-hill"].coords,
  stopById["visitor-center"].coords,
  stopById.harborplace.coords,
  stopById["historic-ships"].coords,
  stopById["harbor-east"].coords,
  stopById["broadway-square"].coords,
  stopById.canton.coords,
  stopById["harbor-point"].coords,
  stopById["domino-sugar"].coords
];

const parkingWalkRoutes = [
  {
    name: "South Baltimore Park & Ride walk to Federal Hill",
    coords: [stopById["south-baltimore-park-ride"].coords, stopById["federal-hill"].coords],
    color: "#b4322d",
    dashArray: "8 8"
  },
  {
    name: "Triangle Lot walk to Federal Hill",
    coords: [stopById["triangle-lot"].coords, stopById["federal-hill"].coords],
    color: "#7b5bb0",
    dashArray: "3 8"
  },
  {
    name: "West Street Garage walk to Federal Hill",
    coords: [stopById["west-street-garage"].coords, stopById["federal-hill"].coords],
    color: "#d4a642",
    dashArray: "3 8"
  }
];

const officialViewingRoute = [
  stopById["baltimore-peninsula"].coords,
  stopById["fort-mchenry"].coords,
  stopById.canton.coords
];

const moonrise = {
  label: "Moonrise Photo Line",
  bearingDegrees: 127.6572,
  lineDistanceKm: 2.25,
  riseTime: "8:07 PM EDT",
  date: "June 28, 2026"
};

const moonPhotoPorts = [
  {
    name: "Inner Harbor Piers",
    coords: stopById["historic-ships"].coords
  },
  {
    name: "Fells Point / Broadway Square",
    coords: stopById["broadway-square"].coords
  },
  {
    name: "Baltimore Peninsula",
    coords: stopById["baltimore-peninsula"].coords
  },
  {
    name: "Fort McHenry Channel",
    coords: stopById["fort-mchenry"].coords
  },
  {
    name: "Canton Waterfront / Pier 13",
    coords: stopById.canton.coords
  },
  {
    name: "Harbor Point",
    coords: stopById["harbor-point"].coords
  },
  {
    name: "Domino Sugar Overlook",
    coords: stopById["domino-sugar"].coords
  },
  {
    name: "Tide Point",
    coords: [39.27306, -76.59114]
  },
  {
    name: "Locust Point",
    coords: [39.26862, -76.59835]
  }
];

const transitRouteService =
  "https://services3.arcgis.com/ZTvQ9NuONePFYofE/arcgis/rest/services/ccchcNetwork/FeatureServer/1/query";

const transitRouteGroups = [
  {
    name: "Free Charm City Circulator",
    where: "RouteName NOT IN ('Harbor Connector 1','Harbor Connector 2','Harbor Connector 3')",
    fallbackColor: "#1f7a5a",
    dashArray: null
  },
  {
    name: "Free Harbor Connector",
    where: "RouteName IN ('Harbor Connector 1','Harbor Connector 2','Harbor Connector 3')",
    fallbackColor: "#1b8cc8",
    dashArray: "10 8"
  }
];

const transitRouteColors = {
  Orange: "#f47b20",
  Banner: "#113f7a",
  Purple: "#7b5bb0",
  Cherry: "#d23b40",
  Green: "#2f8f5b",
  "Harbor Connector 1": "#1b8cc8",
  "Harbor Connector 2": "#40a9e0",
  "Harbor Connector 3": "#76c9f2"
};

function createMarkerIcon(stop, index) {
  return L.divIcon({
    className: "custom-marker",
    html: `<span style="background:${stop.color}">${index + 1}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14]
  });
}

function destinationPoint([lat, lon], bearingDegrees, distanceKm) {
  const earthRadiusKm = 6371.0088;
  const bearing = bearingDegrees * Math.PI / 180;
  const angularDistance = distanceKm / earthRadiusKm;
  const lat1 = lat * Math.PI / 180;
  const lon1 = lon * Math.PI / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );

  return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
}

function createPhotoPortIcon() {
  return L.divIcon({
    className: "photo-port-marker",
    html: "<span></span>",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
}

function addMoonPhotoNote(map) {
  const note = L.control({
    position: "bottomleft"
  });

  note.onAdd = () => {
    const element = L.DomUtil.create("div", "moon-photo-map-note");
    element.innerHTML = "<strong>Moon photo lines</strong><span>Stand on a purple dashed line and face the matching port.</span>";
    return element;
  };

  note.addTo(map);
}

function buildTransitRouteUrl(where) {
  const params = new URLSearchParams({
    f: "geojson",
    where,
    outFields: "RouteName",
    returnGeometry: "true",
    outSR: "4326",
    geometryPrecision: "5"
  });
  return `${transitRouteService}?${params.toString()}`;
}

async function loadTransitRoutes(map) {
  await Promise.all(transitRouteGroups.map(async (group) => {
    const response = await fetch(buildTransitRouteUrl(group.where));
    if (!response.ok) {
      throw new Error(`${group.name} route request failed: ${response.status}`);
    }
    const data = await response.json();
    const layer = L.geoJSON(data, {
      style: (feature) => {
        const routeName = feature?.properties?.RouteName;
        return {
          color: transitRouteColors[routeName] || group.fallbackColor,
          weight: 4,
          opacity: 0.86,
          dashArray: group.dashArray,
          lineCap: "round",
          lineJoin: "round"
        };
      },
      onEachFeature: (feature, featureLayer) => {
        const routeName = feature?.properties?.RouteName || group.name;
        featureLayer.bindTooltip(`${group.name}: ${routeName}`);
      }
    });
    layer.addTo(map);
  }));
}

function initMap() {
  const mapElement = document.querySelector("#eventMap");
  if (!mapElement || typeof L === "undefined") {
    return;
  }

  const map = L.map(mapElement, {
    scrollWheelZoom: false
  });

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  L.polyline(route, {
    color: "#113f7a",
    weight: 4,
    opacity: 0.78
  }).addTo(map);

  parkingWalkRoutes.forEach((parkingRoute) => {
    L.polyline(parkingRoute.coords, {
      color: parkingRoute.color,
      weight: 4,
      opacity: 0.9,
      dashArray: parkingRoute.dashArray
    }).addTo(map).bindTooltip(parkingRoute.name);
  });

  L.polyline(officialViewingRoute, {
    color: "#d4a642",
    weight: 3,
    opacity: 0.8,
    dashArray: "5 10"
  }).addTo(map).bindTooltip("Official airshow viewing corridor");

  const moonriseReverseBearing = (moonrise.bearingDegrees + 180) % 360;
  const moonPhotoLineEnds = moonPhotoPorts.map((port) => ({
    ...port,
    photoLineEnd: destinationPoint(port.coords, moonriseReverseBearing, moonrise.lineDistanceKm)
  }));

  moonPhotoLineEnds.forEach((port) => {
    const photoLine = L.polyline([port.coords, port.photoLineEnd], {
      color: "#7d4ac7",
      weight: 4,
      opacity: 0.95,
      dashArray: "12 8",
      lineCap: "round",
      lineJoin: "round"
    }).addTo(map);

    photoLine.bindPopup(`
      <strong>${port.name}</strong>
      <br>Moonrise photo line
      <br>Stand on this line northwest of the port and look back toward the boats.
      <br>${moonrise.date}, ${moonrise.riseTime}; moon azimuth ${Math.round(moonrise.bearingDegrees)} deg
    `);

    L.marker(port.coords, {
      icon: createPhotoPortIcon()
    }).addTo(map).bindTooltip(`${port.name}: moonrise photo alignment`);
  });

  addMoonPhotoNote(map);

  loadTransitRoutes(map).catch(() => {
    mapElement.dataset.transitRoutes = "unavailable";
  });

  stops.forEach((stop, index) => {
    const marker = L.marker(stop.coords, {
      icon: createMarkerIcon(stop, index)
    }).addTo(map);

    marker.bindPopup(`
      <strong>${stop.name}</strong>
      <br>${stop.label}
      <br>${stop.detail}
    `);
  });

  map.fitBounds([
    ...route,
    ...stops.map((stop) => stop.coords),
    ...moonPhotoLineEnds.flatMap((port) => [port.coords, port.photoLineEnd])
  ], {
    padding: [28, 28]
  });

  setTimeout(() => map.invalidateSize(), 250);
}

const pledgeCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

function formatPledgeAmount(amountCents) {
  return pledgeCurrency.format(Number(amountCents || 0) / 100);
}

function formatPledgeDate(createdAt) {
  if (!createdAt) {
    return "";
  }

  const isoDate = createdAt.includes("T")
    ? createdAt
    : `${createdAt.replace(" ", "T")}Z`;
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function renderPledgeSummary(data) {
  const total = document.querySelector("#pledgeTotal");
  const count = document.querySelector("#pledgeCount");
  const list = document.querySelector("#pledgeList");

  if (!total || !count || !list) {
    return;
  }

  const pledgeCount = Number(data.pledgeCount || 0);
  total.textContent = formatPledgeAmount(data.totalCents);
  count.textContent = `${pledgeCount.toLocaleString()} ${pledgeCount === 1 ? "pledge" : "pledges"}`;
  list.replaceChildren();

  if (!Array.isArray(data.recentPledges) || data.recentPledges.length === 0) {
    const empty = document.createElement("li");
    empty.className = "pledge-empty";
    empty.textContent = "Be the first to make a pledge.";
    list.append(empty);
    return;
  }

  data.recentPledges.forEach((pledge) => {
    const item = document.createElement("li");
    const supporter = document.createElement("span");
    const name = document.createElement("strong");
    const date = document.createElement("small");
    const amount = document.createElement("b");

    name.textContent = pledge.name;
    date.textContent = formatPledgeDate(pledge.createdAt);
    amount.textContent = formatPledgeAmount(pledge.amountCents);

    supporter.append(name);
    if (date.textContent) {
      supporter.append(date);
    }
    item.append(supporter, amount);
    list.append(item);
  });
}

async function loadPledgeSummary() {
  const response = await fetch("/api/pledges", {
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to load pledges.");
  }

  renderPledgeSummary(await response.json());
}

function initPledgeForm() {
  const form = document.querySelector("#pledgeForm");
  const status = document.querySelector("#pledgeStatus");

  if (!form || !status) {
    return;
  }

  loadPledgeSummary().catch(() => {
    status.dataset.state = "error";
    status.textContent = "The pledge tally is temporarily unavailable.";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submit = form.querySelector("button[type='submit']");
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const amount = String(data.get("amount") || "").trim();
    const website = String(data.get("website") || "");

    status.dataset.state = "loading";
    status.textContent = "Saving your pledge…";
    submit.disabled = true;

    try {
      const response = await fetch("/api/pledges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ name, amount, website })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to save your pledge.");
      }

      renderPledgeSummary(result);
      form.reset();
      status.dataset.state = "success";
      status.textContent = `Thank you, ${result.pledge.name}. Your pledge has been added.`;
    } catch (error) {
      status.dataset.state = "error";
      status.textContent = error instanceof Error
        ? error.message
        : "Unable to save your pledge.";
    } finally {
      submit.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initPledgeForm();
});
