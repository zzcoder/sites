const stops = [
  {
    label: "Parking",
    name: "West Street Garage",
    detail: "40 E West St. About 10-minute walk to Federal Hill.",
    coords: [39.27685, -76.61348],
    color: "#b4322d"
  },
  {
    label: "Meet",
    name: "Federal Hill Park",
    detail: "10:00 AM meeting point. Return by 1:30 PM for airshow positioning.",
    coords: [39.27963, -76.60865],
    color: "#113f7a"
  },
  {
    label: "Tall Ships",
    name: "Inner Harbor",
    detail: "11:00 AM tall ships and dockside experience.",
    coords: [39.28503, -76.61076],
    color: "#d4a642"
  },
  {
    label: "Lunch",
    name: "Fells Point",
    detail: "12:30 PM lunch and waterfront street photography.",
    coords: [39.28238, -76.59375],
    color: "#113f7a"
  },
  {
    label: "History",
    name: "Fort McHenry",
    detail: "5:30 PM USA 250 history and Star-Spangled Banner site.",
    coords: [39.26308, -76.57996],
    color: "#b4322d"
  }
];

const route = [
  stops[0].coords,
  stops[1].coords,
  stops[2].coords,
  stops[3].coords,
  stops[4].coords,
  stops[1].coords
];

function createMarkerIcon(stop, index) {
  return L.divIcon({
    className: "custom-marker",
    html: `<span style="background:${stop.color}">${index + 1}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14]
  });
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

  L.polyline([stops[0].coords, stops[1].coords], {
    color: "#b4322d",
    weight: 4,
    opacity: 0.9,
    dashArray: "8 8"
  }).addTo(map).bindTooltip("Parking walk to Federal Hill");

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
