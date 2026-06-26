const stops = [
  {
    id: "parking",
    label: "Parking",
    name: "West Street Garage",
    detail: "40 E West St. About 10-minute walk to Federal Hill.",
    coords: [39.27685, -76.61348],
    color: "#b4322d"
  },
  {
    id: "south-baltimore-parking",
    label: "Backup Parking",
    name: "South Baltimore Parking",
    detail: "First-come Sail250 public lots near Key Highway and Hull Street: free Cherry, Tide, Dawn, and Joy lots; paid Triangle Lot.",
    coords: [39.27022, -76.60012],
    color: "#7b5bb0"
  },
  {
    id: "federal-hill",
    label: "Meet",
    name: "Federal Hill Park",
    detail: "10:00 AM meeting point. Return by 1:30 PM or move to an official viewing area.",
    coords: [39.27963, -76.60865],
    color: "#113f7a"
  },
  {
    id: "inner-harbor",
    label: "Tall Ships",
    name: "Inner Harbor",
    detail: "11:00 AM tall ships and dockside experience.",
    coords: [39.28503, -76.61076],
    color: "#d4a642"
  },
  {
    id: "fells-point",
    label: "Lunch",
    name: "Fells Point",
    detail: "12:30 PM lunch and waterfront street photography.",
    coords: [39.28238, -76.59375],
    color: "#113f7a"
  },
  {
    id: "baltimore-peninsula",
    label: "Official Viewing",
    name: "Baltimore Peninsula",
    detail: "Official land viewing area for Airshow Baltimore.",
    coords: [39.26798, -76.60294],
    color: "#d4a642"
  },
  {
    id: "fort-mchenry",
    label: "History",
    name: "Fort McHenry",
    detail: "History stop and airshow viewing guidance area. Use transit or walk; no public parking.",
    coords: [39.26308, -76.57996],
    color: "#b4322d"
  },
  {
    id: "canton",
    label: "Official Viewing",
    name: "Canton Waterfront Park",
    detail: "Official land viewing area for the Blue Angels and Airshow Baltimore.",
    coords: [39.27865, -76.57277],
    color: "#d4a642"
  }
];

const stopById = Object.fromEntries(stops.map((stop) => [stop.id, stop]));

const route = [
  stopById.parking.coords,
  stopById["federal-hill"].coords,
  stopById["inner-harbor"].coords,
  stopById["fells-point"].coords,
  stopById["federal-hill"].coords,
  stopById["fort-mchenry"].coords,
  stopById["federal-hill"].coords
];

const backupParkingRoute = [
  stopById["south-baltimore-parking"].coords,
  stopById["federal-hill"].coords
];

const officialViewingRoute = [
  stopById["baltimore-peninsula"].coords,
  stopById["fort-mchenry"].coords,
  stopById.canton.coords
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

  L.polyline([stopById.parking.coords, stopById["federal-hill"].coords], {
    color: "#b4322d",
    weight: 4,
    opacity: 0.9,
    dashArray: "8 8"
  }).addTo(map).bindTooltip("Parking walk to Federal Hill");

  L.polyline(backupParkingRoute, {
    color: "#7b5bb0",
    weight: 4,
    opacity: 0.9,
    dashArray: "2 8"
  }).addTo(map).bindTooltip("Backup parking walk to Federal Hill");

  L.polyline(officialViewingRoute, {
    color: "#d4a642",
    weight: 3,
    opacity: 0.8,
    dashArray: "5 10"
  }).addTo(map).bindTooltip("Official airshow viewing corridor");

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

  map.fitBounds(route, {
    padding: [28, 28]
  });

  setTimeout(() => map.invalidateSize(), 250);
}

document.addEventListener("DOMContentLoaded", initMap);
