const header = document.querySelector("[data-header]");
const menuButton = document.querySelector(".menu-button");
const siteNav = document.querySelector(".site-nav");
const lightbox = document.querySelector(".lightbox");
const lightboxImage = lightbox?.querySelector("img");
const lightboxCaption = lightbox?.querySelector("figcaption");
const mapElement = document.querySelector("#google-map");
const mapFallback = document.querySelector("#map-fallback");
const mapError = document.querySelector("#map-error");
const staticMapImage = document.querySelector("#static-route-map");
const routeButtons = [...document.querySelectorAll("[data-route-filter]")];

const staticMapViews = {
  all: {
    src: "assets/images/google-route-map.png?v=20260728b",
    alt: "Google road map showing the complete two-day route from Great Falls, Virginia to New River Gorge, West Virginia",
  },
  day1: {
    src: "assets/images/google-route-map-day1.png?v=20260728b",
    alt: "Google road map showing the Day 1 route from Great Falls, Virginia through the planned stops to New River Gorge, West Virginia",
  },
  day2: {
    src: "assets/images/google-route-map-day2.png?v=20260728b",
    alt: "Google road map showing the Day 2 route around New River Gorge and the return to Great Falls, Virginia",
  },
};

const tripMapState = {
  map: null,
  currentFilter: "all",
  routes: {},
  markers: {},
  primaryMarkers: new Map(),
};

const routeDefinitions = {
  day1: {
    color: "#0d5053",
    origin: "12003 Holly Leaf Ct, Great Falls, VA 22066",
    destination: "219 Chestnutburg Road, Lansing, WV 25862",
    intermediates: [
      "6500 Buc-ee's Blvd, Mount Crawford, VA 22841",
      "4700 Grandview Rd, Beaver, WV 25813",
      "486 Babcock Road, Clifftop, WV 25831",
      "219 Chestnutburg Road, Lansing, WV 25862",
      "219 W Maple Ave, Fayetteville, WV 25840",
      "162 Visitor Center Rd, Lansing, WV 25862",
    ],
    markerLabels: ["1", "2", "3", "4", "5", "6", "7", "L"],
    markerTitles: [
      "Great Falls · departure",
      "Buc-ee’s · Mount Crawford",
      "Grandview Visitor Center",
      "Babcock State Park",
      "Adventures on the Gorge · check-in",
      "Pies & Pints",
      "Canyon Rim Visitor Center",
      "Adventures on the Gorge · lodge return",
    ],
  },
  day2: {
    color: "#d7a14d",
    origin: "219 Chestnutburg Road, Lansing, WV 25862",
    destination: "12003 Holly Leaf Ct, Great Falls, VA 22066",
    intermediates: [
      "162 Visitor Center Rd, Lansing, WV 25862",
      "219 Chestnutburg Road, Lansing, WV 25862",
    ],
    markerLabels: ["A", "B", "C", "H"],
    markerTitles: [
      "Adventures on the Gorge · lodge",
      "Canyon Rim · morning fog",
      "Adventures on the Gorge · rafting",
      "Great Falls · home",
    ],
  },
};

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 32);
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

function closeMenu() {
  document.body.classList.remove("menu-open");
  siteNav?.classList.remove("is-open");
  menuButton?.setAttribute("aria-expanded", "false");
  menuButton?.setAttribute("aria-label", "Open navigation");
}

menuButton?.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  document.body.classList.toggle("menu-open", !isOpen);
  siteNav?.classList.toggle("is-open", !isOpen);
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
});

siteNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

function openLightbox(button) {
  if (!lightbox || !lightboxImage || !lightboxCaption) return;
  const source = button.dataset.lightbox;
  const caption = button.dataset.caption || button.querySelector("img")?.alt || "";
  lightboxImage.src = source;
  lightboxImage.alt = caption;
  lightboxCaption.textContent = caption;
  document.body.classList.add("lightbox-open");
  lightbox.showModal();
}

document.querySelectorAll("[data-lightbox]").forEach((button) => {
  button.addEventListener("click", () => openLightbox(button));
});

function closeLightbox() {
  if (!lightbox?.open) return;
  lightbox.close();
  document.body.classList.remove("lightbox-open");
  if (lightboxImage) {
    lightboxImage.src = "";
    lightboxImage.alt = "";
  }
}

lightbox?.querySelector(".lightbox-close")?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
lightbox?.addEventListener("cancel", () => {
  document.body.classList.remove("lightbox-open");
});

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    window.__raftingMapReady = resolve;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&v=weekly&callback=__raftingMapReady`;
    script.async = true;
    script.onerror = () => reject(new Error("The Google Maps script could not be loaded."));
    document.head.append(script);
  });
}

function makeMarkerContent(label, routeKey) {
  const marker = document.createElement("div");
  marker.className = `trip-marker ${routeKey}`;
  marker.textContent = label;
  return marker;
}

async function computeAndDrawRoute(Route, AdvancedMarkerElement, routeKey) {
  const definition = routeDefinitions[routeKey];
  const request = {
    origin: definition.origin,
    destination: definition.destination,
    intermediates: definition.intermediates.map((location) => ({ location })),
    travelMode: "DRIVING",
    routingPreference: "TRAFFIC_UNAWARE",
    fields: ["path", "legs", "distanceMeters", "durationMillis"],
  };

  const { routes } = await Route.computeRoutes(request);
  const route = routes?.[0];
  if (!route) throw new Error(`No ${routeKey} route was returned.`);

  const polylines = route.createPolylines();
  polylines.forEach((polyline) => {
    polyline.setOptions({
      strokeColor: definition.color,
      strokeOpacity: 0.9,
      strokeWeight: routeKey === "day1" ? 6 : 5,
      zIndex: routeKey === "day1" ? 2 : 3,
    });
    polyline.setMap(tripMapState.map);
  });

  const locations = [route.legs[0].startLocation, ...route.legs.map((leg) => leg.endLocation)];
  const markers = locations.map((position, index) => {
    const marker = new AdvancedMarkerElement({
      map: tripMapState.map,
      position,
      title: definition.markerTitles[index] || `Route stop ${index + 1}`,
      content: makeMarkerContent(definition.markerLabels[index] || String(index + 1), routeKey),
    });

    if (routeKey === "day1" && index < 7) {
      tripMapState.primaryMarkers.set(index + 1, marker);
    }
    return marker;
  });

  tripMapState.routes[routeKey] = { route, polylines };
  tripMapState.markers[routeKey] = markers;
  return route;
}

async function fitRoutes(routeKeys = ["day1", "day2"]) {
  if (!tripMapState.map || !window.google?.maps) return;
  const { LatLngBounds } = await google.maps.importLibrary("core");
  const bounds = new LatLngBounds();
  routeKeys.forEach((key) => {
    tripMapState.routes[key]?.route.path?.forEach((point) => bounds.extend(point));
  });
  if (!bounds.isEmpty()) tripMapState.map.fitBounds(bounds, 54);
}

function applyRouteFilter(filter) {
  tripMapState.currentFilter = filter;
  const staticView = staticMapViews[filter] || staticMapViews.all;
  if (staticMapImage) {
    staticMapImage.src = staticView.src;
    staticMapImage.alt = staticView.alt;
    mapFallback.dataset.routeView = filter;
  }
  routeButtons.forEach((button) => {
    const isActive = button.dataset.routeFilter === filter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  const showDay1 = filter === "all" || filter === "day1";
  const showDay2 = filter === "all" || filter === "day2";
  const visibility = { day1: showDay1, day2: showDay2 };

  Object.entries(visibility).forEach(([key, visible]) => {
    tripMapState.routes[key]?.polylines.forEach((polyline) => {
      polyline.setMap(visible ? tripMapState.map : null);
    });
    tripMapState.markers[key]?.forEach((marker) => {
      marker.map = visible ? tripMapState.map : null;
    });
  });

  document.querySelector(".map-route-day1")?.classList.toggle("is-hidden", !showDay1);
  document.querySelector(".map-route-day2")?.classList.toggle("is-hidden", !showDay2);

  if (tripMapState.map) {
    const keys = filter === "all" ? ["day1", "day2"] : [filter];
    fitRoutes(keys);
  }
}

routeButtons.forEach((button) => {
  button.addEventListener("click", () => applyRouteFilter(button.dataset.routeFilter));
});

document.querySelectorAll("[data-map-stop]").forEach((row) => {
  row.addEventListener("mouseenter", () => row.classList.add("is-focused"));
  row.addEventListener("mouseleave", () => row.classList.remove("is-focused"));
  row.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    const stop = Number(row.dataset.mapStop);
    const marker = tripMapState.primaryMarkers.get(stop);
    applyRouteFilter("day1");
    row.classList.add("is-focused");
    if (!tripMapState.map || !marker?.position) return;
    tripMapState.map.panTo(marker.position);
    tripMapState.map.setZoom(stop === 1 ? 10 : 11);
  });
});

async function initTripMap() {
  const apiKey = window.RAFTING_CONFIG?.googleMapsApiKey?.trim();
  if (!apiKey || !mapElement) {
    applyRouteFilter("all");
    return;
  }

  try {
    await loadGoogleMaps(apiKey);
    const [{ Map }, { Route }, { AdvancedMarkerElement }] = await Promise.all([
      google.maps.importLibrary("maps"),
      google.maps.importLibrary("routes"),
      google.maps.importLibrary("marker"),
    ]);

    tripMapState.map = new Map(mapElement, {
      center: { lat: 38.1, lng: -79.6 },
      zoom: 7,
      mapId: "DEMO_MAP_ID",
      mapTypeId: "terrain",
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: "cooperative",
    });

    await Promise.all([
      computeAndDrawRoute(Route, AdvancedMarkerElement, "day1"),
      computeAndDrawRoute(Route, AdvancedMarkerElement, "day2"),
    ]);

    mapFallback.hidden = true;
    await fitRoutes();
    applyRouteFilter(tripMapState.currentFilter);
  } catch (error) {
    mapFallback.hidden = false;
    mapError.hidden = false;
    mapError.textContent = `${error.message} Check that Maps JavaScript API and Routes API are enabled and that this site is allowed by the key’s HTTP-referrer restriction.`;
  }
}

initTripMap();
