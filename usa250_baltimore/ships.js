const moonrise = {
  bearingDegrees: 127.6572,
  reverseBearingDegrees: 307.6572,
  lineDistanceKm: 2.2,
  riseTime: "8:07 PM EDT",
  date: "June 28, 2026"
};

const shipPorts = [
  {
    name: "Inner Harbor Pier 1",
    area: "Inner Harbor",
    coords: [39.28514, -76.61162],
    ships: [
      "ARC Gloria",
      "USS Constellation",
      "Tug Boat Kings Point"
    ]
  },
  {
    name: "Inner Harbor Pier 3",
    area: "Inner Harbor",
    coords: [39.28528, -76.61002],
    ships: [
      "BAE Guayas",
      "Lightship 116 Chesapeake",
      "USS Torsk"
    ]
  },
  {
    name: "Inner Harbor Pier 4",
    area: "Inner Harbor",
    coords: [39.28508, -76.60903],
    ships: [
      "Belle Poule",
      "ROU Capitán Miranda",
      "USCGC Eagle"
    ]
  },
  {
    name: "Inner Harbor Pier 5",
    area: "Inner Harbor",
    coords: [39.28558, -76.60802],
    ships: [
      "Gorch Fock",
      "NRP Sagres",
      "Gazela Primeiro",
      "U.S. Coast Guard Cutter WHEC-37"
    ]
  },
  {
    name: "Inner Harbor Pier 6",
    area: "Inner Harbor",
    coords: [39.28562, -76.6071],
    ships: [
      "NMS Mircea",
      "U.S. Navy Yard Patrol Craft"
    ]
  },
  {
    name: "Inner Harbor West Wall",
    area: "Inner Harbor",
    coords: [39.28422, -76.61134],
    ships: [
      "INS Sudarshini",
      "BAP Unión"
    ]
  },
  {
    name: "Inner Harbor Finger Pier",
    area: "Inner Harbor",
    coords: [39.28463, -76.61048],
    ships: [
      "HMS Gladan"
    ]
  },
  {
    name: "Tide Point",
    area: "Locust Point / Tide Point",
    coords: [39.27306, -76.59114],
    ships: [
      "ARA Libertad",
      "Amerigo Vespucci",
      "Juan Sebastián de Elcano"
    ]
  },
  {
    name: "Baltimore Peninsula",
    area: "Port Covington / Baltimore Peninsula",
    coords: [39.26798, -76.60294],
    ships: [
      "USS Arlington",
      "USS Marinette"
    ]
  },
  {
    name: "Broadway Pier",
    area: "Fells Point",
    coords: [39.28158, -76.59282],
    ships: [
      "Pride of Baltimore II",
      "HMCS William Hall",
      "Jolly Dolphin"
    ]
  },
  {
    name: "Bond Street Wharf",
    area: "Fells Point",
    coords: [39.28176, -76.59107],
    ships: [
      "Lynx"
    ]
  },
  {
    name: "Cardin Pier",
    area: "Frederick Douglass-Isaac Myers Maritime Park",
    coords: [39.28008, -76.58934],
    ships: [
      "Lady Maryland",
      "Maryland Dove",
      "Mildred Belle",
      "Skipjack Sigsbee"
    ]
  },
  {
    name: "Pier 13",
    area: "Canton",
    coords: [39.26496, -76.56983],
    ships: [
      "NS Savannah",
      "SS John W. Brown"
    ]
  }
];

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

function createBerthIcon(index) {
  return L.divIcon({
    className: "berth-marker",
    html: `<span>${index + 1}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -15]
  });
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

function shipListHtml(ships) {
  return `<ul>${ships.map((ship) => `<li>${ship}</li>`).join("")}</ul>`;
}

function addMoonPhotoNote(map) {
  const note = L.control({
    position: "bottomleft"
  });

  note.onAdd = () => {
    const element = L.DomUtil.create("div", "moon-photo-map-note");
    element.innerHTML = "<strong>Moon photo lines</strong><span>Stand northwest on a purple dashed line and face the berth.</span>";
    return element;
  };

  note.addTo(map);
}

function renderShipList() {
  const container = document.querySelector("#shipPortList");
  if (!container) {
    return;
  }

  container.innerHTML = shipPorts.map((port, index) => `
    <article class="ship-port-card">
      <div class="ship-port-number">${index + 1}</div>
      <div>
        <span>${port.area}</span>
        <h3>${port.name}</h3>
        <div class="ship-pill-list">
          ${port.ships.map((ship) => `<strong>${ship}</strong>`).join("")}
        </div>
      </div>
    </article>
  `).join("");

  const shipPortCount = document.querySelector("#shipPortCount");
  const shipCount = document.querySelector("#shipCount");
  if (shipPortCount) {
    shipPortCount.textContent = String(shipPorts.length);
  }
  if (shipCount) {
    shipCount.textContent = String(shipPorts.reduce((total, port) => total + port.ships.length, 0));
  }
}

function initShipsMap() {
  const mapElement = document.querySelector("#shipsMap");
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

  const allBounds = [];

  shipPorts.forEach((port, index) => {
    const photoLineEnd = destinationPoint(port.coords, moonrise.reverseBearingDegrees, moonrise.lineDistanceKm);
    allBounds.push(port.coords, photoLineEnd);

    const photoLine = L.polyline([port.coords, photoLineEnd], {
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
      <br>Stand northwest on this line and face the berth.
      <br>${moonrise.date}, ${moonrise.riseTime}; moon azimuth ${Math.round(moonrise.bearingDegrees)} deg
    `);

    L.marker(port.coords, {
      icon: createPhotoPortIcon()
    }).addTo(map).bindTooltip(`${port.name}: moonrise alignment source`);

    const marker = L.marker(port.coords, {
      icon: createBerthIcon(index)
    }).addTo(map);

    marker.bindPopup(`
      <strong>${port.name}</strong>
      <br><span>${port.area}</span>
      ${shipListHtml(port.ships)}
    `);
  });

  addMoonPhotoNote(map);
  map.fitBounds(allBounds, {
    padding: [30, 30]
  });

  setTimeout(() => map.invalidateSize(), 250);
}

document.addEventListener("DOMContentLoaded", () => {
  renderShipList();
  initShipsMap();
});
