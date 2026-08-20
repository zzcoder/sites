function apiUrl(path) {
  return new URL(path.replace(/^\//, ""), document.baseURI).toString();
}

async function getJson(path) {
  const response = await fetch(apiUrl(path), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

export const fetchTrackerStatus = () => getJson("api/status");
export const fetchPublicConfig = () => getJson("api/config");
