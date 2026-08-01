const header = document.querySelector("[data-header]");
const menuButton = document.querySelector(".menu-button");
const siteNav = document.querySelector(".site-nav");
const lightbox = document.querySelector(".lightbox");
const lightboxImage = lightbox?.querySelector("img");
const lightboxCaption = lightbox?.querySelector("figcaption");
const mapElement = document.querySelector("#google-map");
const mapFallback = document.querySelector("#map-fallback");
const mapError = document.querySelector("#map-error");
const routeSummary = document.querySelector("#route-summary");
const routeDirections = document.querySelector("#route-directions");
const tripForecast = document.querySelector("[data-trip-forecast]");
const tripForecastStatus = document.querySelector("[data-weather-status]");

const tripForecastDates = ["2026-08-01", "2026-08-02"];
const nwsForecastEndpoint = "https://api.weather.gov/gridpoints/RLX/82,56/forecast";

const tripMapState = {
  map: null,
  route: null,
  polylines: [],
  markers: new Map(),
};

const routeDefinition = {
  color: "#0d5053",
  origin: "4700 Grandview Rd, Beaver, WV 25813",
  destination: "162 Visitor Center Rd, Lansing, WV 25862",
  intermediates: [
    "486 Babcock Road, Clifftop, WV 25831",
    "219 Chestnutburg Road, Lansing, WV 25862",
  ],
  markerLabels: ["1", "2", "3", "4"],
  stopNames: [
    "Grandview Visitor Center",
    "Babcock State Park",
    "Adventures on the Gorge",
    "Canyon Rim Visitor Center",
  ],
};

function formatRainChance(period) {
  const chance = period?.probabilityOfPrecipitation?.value;
  return Number.isFinite(chance) ? `${Math.round(chance)}%` : "—";
}

function updateForecastCard(date, dayPeriod, nightPeriod) {
  const card = tripForecast?.querySelector(`[data-weather-date="${date}"]`);
  if (!card || !dayPeriod) return;

  const high = card.querySelector("[data-weather-high]");
  const low = card.querySelector("[data-weather-low]");
  const summary = card.querySelector("[data-weather-summary]");
  const dayRain = card.querySelector("[data-weather-day-rain]");
  const nightRain = card.querySelector("[data-weather-night-rain]");
  const detail = card.querySelector("[data-weather-detail]");
  const temperatures = card.querySelector(".weather-temperatures");

  if (high) high.textContent = `${dayPeriod.temperature}°`;
  if (low && nightPeriod) low.textContent = `${nightPeriod.temperature}°`;
  if (summary) summary.textContent = dayPeriod.shortForecast;
  if (dayRain) dayRain.textContent = formatRainChance(dayPeriod);
  if (nightRain) nightRain.textContent = formatRainChance(nightPeriod);
  if (detail) {
    detail.textContent = [dayPeriod.detailedForecast, nightPeriod?.detailedForecast]
      .filter(Boolean)
      .join(" Overnight: ");
  }
  if (temperatures) {
    temperatures.setAttribute(
      "aria-label",
      `High ${dayPeriod.temperature} degrees${nightPeriod ? `, low ${nightPeriod.temperature} degrees` : ""} Fahrenheit`,
    );
  }
}

async function loadTripForecast() {
  if (!tripForecast) return;

  try {
    const response = await fetch(nwsForecastEndpoint, {
      headers: { Accept: "application/geo+json" },
    });
    if (!response.ok) throw new Error(`NWS forecast request failed with ${response.status}`);

    const forecast = await response.json();
    const periods = forecast?.properties?.periods || [];

    tripForecastDates.forEach((date) => {
      const matchingPeriods = periods.filter((period) => period.startTime?.startsWith(date));
      const dayPeriod = matchingPeriods.find((period) => period.isDaytime);
      const nightPeriod = matchingPeriods.find((period) => !period.isDaytime);
      updateForecastCard(date, dayPeriod, nightPeriod);
    });

    const generatedAt = forecast?.properties?.generatedAt;
    if (tripForecastStatus && generatedAt) {
      const formattedUpdate = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(generatedAt));
      tripForecastStatus.textContent = `Live NWS forecast · Updated ${formattedUpdate}`;
    }
  } catch {
    if (tripForecastStatus) {
      tripForecastStatus.textContent = "NWS forecast snapshot · Updated Jul 31, 7:56 PM EDT";
    }
  }
}

loadTripForecast();

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

const todoInputs = [...document.querySelectorAll("[data-trip-todo]")];
const todoProgress = document.querySelector("[data-todo-progress]");
const todoStorageKey = "rafting2026-trip-todos";

function updateTodoProgress() {
  const completed = todoInputs.filter((input) => input.checked).length;
  if (todoProgress) {
    todoProgress.textContent = `${completed} of ${todoInputs.length} done`;
  }
}

function restoreTodoProgress() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(todoStorageKey) || "{}");
    todoInputs.forEach((input) => {
      input.checked = saved[input.dataset.tripTodo] === true;
    });
  } catch {
    // The checklist still works when storage is unavailable or contains invalid data.
  }
  updateTodoProgress();
}

todoInputs.forEach((input) => {
  input.addEventListener("change", () => {
    const saved = Object.fromEntries(
      todoInputs.map((todo) => [todo.dataset.tripTodo, todo.checked]),
    );
    try {
      window.localStorage.setItem(todoStorageKey, JSON.stringify(saved));
    } catch {
      // Keep the in-page state even when persistence is unavailable.
    }
    updateTodoProgress();
  });
});

restoreTodoProgress();

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

function makeMarkerContent(label) {
  const marker = document.createElement("div");
  marker.className = "trip-marker";
  marker.textContent = label;
  return marker;
}

function formatDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) return "";
  const miles = distanceMeters / 1609.344;
  if (miles < 0.1) return `${Math.max(50, Math.round((distanceMeters * 3.28084) / 50) * 50)} ft`;
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}

function formatDuration(durationMillis) {
  if (!Number.isFinite(durationMillis)) return "";
  const totalMinutes = Math.max(1, Math.round(durationMillis / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} min`;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function makeElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function focusRouteLeg(legIndex) {
  const leg = tripMapState.route?.legs?.[legIndex];
  if (!tripMapState.map || !leg || !window.google?.maps) return;

  document.querySelectorAll(".direction-leg").forEach((element, index) => {
    element.classList.toggle("is-active", index === legIndex);
  });

  const bounds = new google.maps.LatLngBounds();
  const points = leg.path?.length ? leg.path : [leg.startLocation, leg.endLocation];
  points.filter(Boolean).forEach((point) => bounds.extend(point));
  if (!bounds.isEmpty()) tripMapState.map.fitBounds(bounds, 72);
}

function renderRouteDirections(route) {
  if (!routeDirections || !routeSummary) return;

  const totalDistance = formatDistance(route.distanceMeters);
  const totalDuration = formatDuration(route.durationMillis);
  routeSummary.textContent = [totalDistance, totalDuration, "4 stops"].filter(Boolean).join(" · ");
  routeDirections.replaceChildren();

  route.legs?.forEach((leg, legIndex) => {
    const details = makeElement("details", "direction-leg");
    details.open = legIndex === 0;
    details.dataset.legIndex = String(legIndex);

    const summary = makeElement("summary", "direction-leg-summary");
    summary.append(makeElement("span", "direction-leg-number", String(legIndex + 1)));

    const title = makeElement("span", "direction-leg-title");
    title.append(
      makeElement(
        "strong",
        "",
        `${routeDefinition.stopNames[legIndex]} → ${routeDefinition.stopNames[legIndex + 1]}`,
      ),
      makeElement(
        "small",
        "",
        [
          leg.localizedValues?.distance || formatDistance(leg.distanceMeters),
          leg.localizedValues?.duration || formatDuration(leg.durationMillis),
        ]
          .filter(Boolean)
          .join(" · "),
      ),
    );
    summary.append(title, makeElement("span", "direction-leg-toggle", "＋"));

    const stepList = makeElement("ol", "direction-steps");
    leg.steps?.forEach((step, stepIndex) => {
      const item = makeElement("li", "direction-step");
      item.append(
        makeElement("span", "direction-step-number", String(stepIndex + 1)),
        makeElement("span", "direction-step-instruction", step.instructions || "Continue"),
      );

      const stepMeta = [
        step.localizedValues?.distance || formatDistance(step.distanceMeters),
        step.localizedValues?.staticDuration || formatDuration(step.staticDurationMillis),
      ]
        .filter(Boolean)
        .join(" · ");
      if (stepMeta) item.append(makeElement("small", "direction-step-meta", stepMeta));
      stepList.append(item);
    });

    if (!leg.steps?.length) {
      stepList.append(makeElement("li", "directions-empty", "No step details were returned for this leg."));
    }

    details.append(summary, stepList);
    summary.addEventListener("click", () => {
      window.requestAnimationFrame(() => {
        if (details.open) focusRouteLeg(legIndex);
      });
    });
    routeDirections.append(details);
  });

  routeDirections.setAttribute("aria-busy", "false");
  routeDirections.querySelector(".direction-leg")?.classList.add("is-active");
}

function renderDirectionsFailure(message) {
  if (routeSummary) routeSummary.textContent = "Live directions unavailable";
  if (!routeDirections) return;
  routeDirections.replaceChildren(
    makeElement(
      "p",
      "directions-empty",
      `${message} Use “Open in Google Maps” above for the same four-stop driving route.`,
    ),
  );
  routeDirections.setAttribute("aria-busy", "false");
}

async function computeAndDrawRoute(Route, AdvancedMarkerElement) {
  const request = {
    origin: routeDefinition.origin,
    destination: routeDefinition.destination,
    intermediates: routeDefinition.intermediates.map((location) => ({ location })),
    travelMode: "DRIVING",
    routingPreference: "TRAFFIC_UNAWARE",
    fields: ["path", "legs", "distanceMeters", "durationMillis"],
    language: "en-US",
  };

  const { routes } = await Route.computeRoutes(request);
  const route = routes?.[0];
  if (!route) throw new Error("No driving route was returned.");

  const polylines = route.createPolylines();
  polylines.forEach((polyline) => {
    polyline.setOptions({
      strokeColor: routeDefinition.color,
      strokeOpacity: 0.92,
      strokeWeight: 6,
      zIndex: 2,
    });
    polyline.setMap(tripMapState.map);
  });

  const locations = [route.legs[0].startLocation, ...route.legs.map((leg) => leg.endLocation)];
  const markers = locations.map((position, index) => {
    const marker = new AdvancedMarkerElement({
      map: tripMapState.map,
      position,
      title: routeDefinition.stopNames[index] || `Route stop ${index + 1}`,
      content: makeMarkerContent(routeDefinition.markerLabels[index] || String(index + 1)),
    });
    tripMapState.markers.set(index + 1, marker);
    return marker;
  });

  tripMapState.route = route;
  tripMapState.polylines = polylines;
  renderRouteDirections(route);
  return route;
}

async function fitRoute() {
  if (!tripMapState.map || !window.google?.maps) return;
  const { LatLngBounds } = await google.maps.importLibrary("core");
  const bounds = new LatLngBounds();
  tripMapState.route?.path?.forEach((point) => bounds.extend(point));
  tripMapState.route?.legs?.forEach((leg) => {
    if (leg.startLocation) bounds.extend(leg.startLocation);
    if (leg.endLocation) bounds.extend(leg.endLocation);
    leg.path?.forEach((point) => bounds.extend(point));
  });
  if (!bounds.isEmpty()) tripMapState.map.fitBounds(bounds, 54);
}

document.querySelectorAll("[data-map-stop]").forEach((row) => {
  row.addEventListener("mouseenter", () => row.classList.add("is-focused"));
  row.addEventListener("mouseleave", () => row.classList.remove("is-focused"));
  row.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    const stop = Number(row.dataset.mapStop);
    const marker = tripMapState.markers.get(stop);
    document.querySelectorAll("[data-map-stop]").forEach((stopRow) => {
      stopRow.classList.toggle("is-active", stopRow === row);
    });
    if (!tripMapState.map || !marker?.position) return;
    tripMapState.map.panTo(marker.position);
    tripMapState.map.setZoom(13);
  });
});

async function initTripMap() {
  const apiKey = window.RAFTING_CONFIG?.googleMapsApiKey?.trim();
  if (!apiKey || !mapElement) {
    renderDirectionsFailure("The Google Maps key is not configured.");
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
      center: { lat: 38.02, lng: -81.03 },
      zoom: 9,
      mapId: "DEMO_MAP_ID",
      mapTypeId: "terrain",
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: "cooperative",
    });

    await computeAndDrawRoute(Route, AdvancedMarkerElement);

    mapFallback.hidden = true;
    await fitRoute();
  } catch (error) {
    mapFallback.hidden = false;
    mapError.hidden = false;
    mapError.textContent =
      "The live Google route could not load. The four-stop itinerary and Google Maps link remain available.";
    renderDirectionsFailure(error.message || "The Google route could not load.");
  }
}

initTripMap();
