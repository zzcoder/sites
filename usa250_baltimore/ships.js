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

const officialShipSource = "https://www.sail250md.org/copy-of-visiting-ships";

const tallShipNames = new Set([
  "ARA Libertad",
  "ARC Gloria",
  "BAE Guayas",
  "BAP Unión",
  "Belle Poule",
  "Gazela Primeiro",
  "Gorch Fock",
  "HMS Gladan",
  "INS Sudarshini",
  "Juan Sebastián de Elcano",
  "Lady Maryland",
  "Lynx",
  "Maryland Dove",
  "NMS Mircea",
  "NRP Sagres",
  "Pride of Baltimore II",
  "ROU Capitán Miranda",
  "Skipjack Sigsbee",
  "USCGC Eagle",
  "USS Constellation"
]);

const shipDetails = {
  "ARA Libertad": {
    country: "Argentina",
    type: "Full-rigged Class A sail training ship",
    stats: "340.4 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/FragataLibertad-1920w.jpg",
    description: "A steel-hulled Argentine Navy school ship and one of the largest Class A tall ships in the Sail250 fleet."
  },
  "Amerigo Vespucci": {
    country: "Italy",
    type: "Full-rigged naval training ship",
    stats: "329 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/Amerigo+Vespucci-1920w.PNG",
    description: "The Italian Navy's iconic three-masted training vessel, homeported in La Spezia and used to train naval cadets."
  },
  "ARC Gloria": {
    country: "Colombia",
    type: "Three-masted steel barque",
    stats: "212 ft 3 in sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/Buque-ARC-Gloria-marruecos-flat-1920w.jpg",
    description: "The Colombian Navy's sail training ship and official flagship, serving as a maritime ambassador for Colombia."
  },
  "BAE Guayas": {
    country: "Ecuador",
    type: "Three-masted barque",
    stats: "257 ft 2 in sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/class-a-guayas-800x530-1920w.jpg",
    description: "Ecuador's sail training vessel, commissioned in 1977 and used for naval cadet training and international goodwill voyages."
  },
  "BAP Unión": {
    country: "Peru",
    type: "Four-masted Class A barque",
    stats: "378 ft 11 in sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/Union-5-1920w.jpg",
    description: "A modern Peruvian Navy training ship built in Peru and used for long-distance training cruises and diplomacy."
  },
  "Belle Poule": {
    country: "France",
    type: "French Navy schooner",
    stats: "123 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/Belle-poule11-1920w.jpg",
    description: "A French Navy training schooner built in 1932 as a replica of an Icelandic cod-fishing vessel."
  },
  "Gazela Primeiro": {
    country: "United States",
    type: "Wooden tall ship",
    stats: "177 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/gazela-primeiro-1920w.png",
    description: "A 1901 wooden tall ship from Philadelphia, formerly a commercial fishing vessel and now a maritime goodwill ambassador."
  },
  "Gorch Fock": {
    country: "Germany",
    type: "German Navy training barque",
    stats: "293 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/gorch_fock_unter-segeln_bundeswehr-ricarda-schoenbrodt-1920w.png",
    description: "The German Navy's 1958 sail training ship, the second vessel to carry the Gorch Fock name."
  },
  "HMS Gladan": {
    country: "Sweden",
    type: "Swedish Navy schooner",
    stats: "132 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/Gladan-1920w.jpg",
    description: "A Swedish Navy training schooner used to teach seamanship in Sweden's long sail-training tradition."
  },
  "HMCS William Hall": {
    country: "Canada",
    type: "Arctic and offshore patrol vessel",
    stats: "339 ft 11 in length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/F2SJeLyXsAAsE8W-scaled-1920w.png",
    description: "Canada's Arctic and Offshore Patrol Vessel visiting Broadway Pier alongside the sailing fleet."
  },
  "INS Sudarshini": {
    country: "India",
    type: "Three-masted barque",
    stats: "177 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/INS-Sudarshina-1920w.png",
    description: "An Indian Navy sail training ship built by Goa Shipyard and named Sudarshini, meaning beautiful lady Sundari."
  },
  "Juan Sebastián de Elcano": {
    country: "Spain",
    type: "Four-masted topsail schooner",
    stats: "371 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/1777638154026-e2508645-3ed5-45f7-a934-3c4f9d076dd6_1-1920w.png",
    description: "The Spanish Navy's 1927 sail training ship, named for the navigator associated with the first circumnavigation."
  },
  "Lady Maryland": {
    country: "United States",
    type: "Chesapeake Bay pungy schooner reproduction",
    stats: "104 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/Lady-Maryland-Image-1920w.png",
    description: "A reproduction of a fast Chesapeake Bay pungy schooner used for hands-on maritime and environmental education."
  },
  "Lightship 116 Chesapeake": {
    country: "United States",
    type: "Historic lightship",
    stats: "133 ft length on deck",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/chesapeake+web-1920w.jpg",
    description: "A 1930 lightship from the U.S. Lighthouse Service era, preserved as part of Baltimore's Historic Ships collection."
  },
  "Lynx": {
    country: "United States",
    type: "Square topsail schooner",
    stats: "122 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/_DSC8341-lynx-chamber-ad-1cfc9dc15056a36_1cfca157-5056-a36a-0bbb9936737686f6-1920w.jpg",
    description: "A War of 1812 privateer-style schooner built to interpret Baltimore Clipper design and operation."
  },
  "Maryland Dove": {
    country: "United States",
    type: "17th-century trading ship reproduction",
    stats: "84.2 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/HSMCC_Dove-CreditJennDorsey+%281%29-1920w.jpg",
    description: "Historic St. Mary's City's floating ambassador, based on the Dove that sailed to establish the Maryland colony in 1634."
  },
  "Mildred Belle": {
    country: "United States",
    type: "Chesapeake Bay buyboat",
    stats: "54 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/Mildred+Belle%281%29+%281%29-1920w.jpg",
    description: "An authentic Chesapeake Bay buyboat built in 1948 and now used as a living classroom with Living Classrooms Foundation."
  },
  "NMS Mircea": {
    country: "Romania",
    type: "Training barque",
    stats: "292 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/vessel-mircea-2-1920w.jpg",
    description: "A Romanian Navy training barque built at Blohm and Voss in Hamburg in 1938."
  },
  "NRP Sagres": {
    country: "Portugal",
    type: "Portuguese Navy training barque",
    stats: "292 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/vessel-sagres-2-1920w.jpg",
    description: "Portugal's school ship since 1961, a steel three-masted barque sometimes referred to as Sagres III."
  },
  "NS Savannah": {
    country: "United States",
    type: "Historic nuclear-powered merchant ship",
    stats: "596 ft length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/ns-savannah-1920w.png",
    description: "The world's first nuclear-powered merchant ship, launched in 1959 for the Atoms for Peace program."
  },
  "Pride of Baltimore II": {
    country: "United States",
    type: "Baltimore Clipper reproduction",
    stats: "157 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/vessel-pride-of-baltimore-II-1-1920w.jpg",
    description: "Maryland's globally recognized sailing ambassador, built in 1988 as a sharp-built Baltimore Clipper reproduction."
  },
  "ROU Capitán Miranda": {
    country: "Uruguay",
    type: "Three-masted schooner",
    stats: "198 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/CAPITANMIRANDA-2009-STITallShipsAtlanticChallenge-Bermuda-race-1024x683+%281%29-1920w.webp",
    description: "Uruguay's sail training vessel, originally a survey ship and converted for naval training service."
  },
  "Skipjack Sigsbee": {
    country: "United States",
    type: "Chesapeake Bay skipjack",
    stats: "75 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/Sigsbee-near-Fort-McHenry-282-29-1920w.png",
    description: "A Chesapeake Bay oyster-dredging skipjack, representing one of North America's last sailing commercial fleets."
  },
  "SS John W. Brown": {
    country: "United States",
    type: "World War II Liberty ship",
    stats: "441 ft 6 in length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/SS_John_W_Brown-1920w.jpg",
    description: "One of only two remaining operational Liberty ships from World War II, now serving as a Baltimore museum ship."
  },
  "Tug Boat Kings Point": {
    country: "United States",
    type: "Tug boat",
    stats: "90.2 ft length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/Vane-NMD-IMG_0893-1920w.JPG",
    description: "A working tug listed by Sail250 at Pier 1 in the Inner Harbor."
  },
  "U.S. Coast Guard Cutter WHEC-37": {
    country: "United States",
    type: "Historic Coast Guard cutter",
    stats: "337 ft length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/CGC-37+Port+Bow+Aerial-1920w.jpg",
    description: "A Secretary of the Treasury-class cutter commissioned in 1936, decommissioned in 1986, and later designated a National Historic Landmark."
  },
  "U.S. Navy Yard Patrol Craft": {
    country: "United States",
    type: "Naval Academy training craft",
    stats: "Training craft",
    image: "",
    description: "Small U.S. Navy and U.S. Naval Academy training vessels used for seamanship, navigation, leadership, and ship-handling practice."
  },
  "USCGC Eagle": {
    country: "United States",
    type: "Coast Guard training barque",
    stats: "295 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/USCG_Barque_EAGLE+%281%29-1920w.jpg",
    description: "The U.S. Coast Guard Academy training ship, built in 1936 and now one of the marquee tall ships visiting Baltimore."
  },
  "USS Arlington": {
    country: "United States",
    type: "San Antonio-class amphibious transport dock",
    stats: "684 ft length on deck",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/LPD+24+2-1920w.jpg",
    description: "A U.S. Navy amphibious transport dock named in commemoration of Arlington, Virginia, and the Pentagon on September 11, 2001."
  },
  "USS Constellation": {
    country: "United States",
    type: "Historic sail-only sloop-of-war",
    stats: "199 ft sparred length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/USS+Constellation+Photo+cropped-1920w.JPG",
    description: "The last sail-only warship designed and built by the U.S. Navy, now preserved as a National Historic Landmark in Baltimore."
  },
  "USS Marinette": {
    country: "United States",
    type: "Freedom-class littoral combat ship",
    stats: "378 ft length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/LCS+25+2-1920w.jpg",
    description: "A U.S. Navy littoral combat ship built for agile near-shore operations and mission-adaptable coastal service."
  },
  "USS Torsk": {
    country: "United States",
    type: "Historic Tench-class submarine",
    stats: "311 ft 8 in length",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/TORSK-1920w.JPG",
    description: "A World War II-era submarine that arrived in Baltimore as a museum and memorial in 1972."
  },
  "Jolly Dolphin": {
    country: "United States",
    type: "Two-masted wooden sailing vessel",
    stats: "42 ft length on deck",
    image: "https://lirp.cdn-website.com/8e247546/dms3rep/multi/opt/jollydolphin_20160924-1920w.jpg",
    description: "A Maryland-style two-masted wooden sailing vessel modeled on Chesapeake Bay oyster dredgers."
  }
};

function slugifyShipName(ship) {
  return ship
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getShipRecord(ship, port) {
  const details = shipDetails[ship] || {};
  const isTallShip = tallShipNames.has(ship);
  return {
    id: `ship-${slugifyShipName(ship)}`,
    name: ship,
    berth: port.name,
    area: port.area,
    category: details.category || (isTallShip ? "Tall ship" : "Visiting / historic vessel"),
    country: details.country || "Listed by Sail250",
    type: details.type || "Visiting vessel",
    stats: details.stats || "See official listing",
    image: details.image || "",
    description: details.description || "Listed by Sail250 for this berth. Check the official ship page before event-day travel because berth assignments can change.",
    source: details.source || officialShipSource
  };
}

function getAllShipRecords() {
  return shipPorts.flatMap((port) => port.ships.map((ship) => getShipRecord(ship, port)));
}

function renderShipImage(ship) {
  if (ship.image) {
    return `
      <img
        src="${ship.image}"
        alt="${ship.name}"
        loading="lazy"
        onerror="this.closest('.ship-photo').classList.add('is-missing'); this.remove();"
      >
      <span class="ship-photo-fallback">${ship.name}</span>
    `;
  }

  return `<span class="ship-photo-fallback">${ship.name}<small>Photo not available from official page</small></span>`;
}

function renderShipCard(ship) {
  return `
    <article class="ship-detail-card" id="${ship.id}">
      <figure class="ship-photo${ship.image ? "" : " is-missing"}">
        ${renderShipImage(ship)}
      </figure>
      <div class="ship-detail-body">
        <span class="ship-category">${ship.category}</span>
        <h3>${ship.name}</h3>
        <p>${ship.description}</p>
        <dl>
          <div>
            <dt>Country</dt>
            <dd>${ship.country}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>${ship.type}</dd>
          </div>
          <div>
            <dt>Berth</dt>
            <dd>${ship.berth}</dd>
          </div>
          <div>
            <dt>Basic size</dt>
            <dd>${ship.stats}</dd>
          </div>
        </dl>
        <a href="${ship.source}" target="_blank" rel="noreferrer">Official listing</a>
      </div>
    </article>
  `;
}

function renderShipDirectory() {
  const container = document.querySelector("#shipDirectory");
  if (!container) {
    return;
  }

  const ships = getAllShipRecords();
  const tallShips = ships.filter((ship) => ship.category === "Tall ship");
  const otherShips = ships.filter((ship) => ship.category !== "Tall ship");

  container.innerHTML = `
    <section class="ship-directory-group" aria-labelledby="tall-ships-title">
      <div class="ship-directory-heading">
        <h3 id="tall-ships-title">Tall Ships</h3>
        <span>${tallShips.length} vessels</span>
      </div>
      <div class="ship-card-grid">
        ${tallShips.map(renderShipCard).join("")}
      </div>
    </section>
    <section class="ship-directory-group" aria-labelledby="other-ships-title">
      <div class="ship-directory-heading">
        <h3 id="other-ships-title">Other Visiting & Historic Vessels</h3>
        <span>${otherShips.length} vessels</span>
      </div>
      <div class="ship-card-grid">
        ${otherShips.map(renderShipCard).join("")}
      </div>
    </section>
  `;
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
  return `<ul>${ships.map((ship) => `<li><a href="#ship-${slugifyShipName(ship)}">${ship}</a></li>`).join("")}</ul>`;
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
          ${port.ships.map((ship) => `<a href="#ship-${slugifyShipName(ship)}">${ship}</a>`).join("")}
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
  renderShipDirectory();
  renderShipList();
  initShipsMap();
});
