import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let configuredKey = null;

export async function loadGoogleMaps(apiKey) {
  if (!apiKey) throw new Error("Google Maps key is not configured");
  if (!configuredKey) {
    configuredKey = apiKey;
    setOptions({ key: apiKey, v: "weekly", authReferrerPolicy: "origin" });
  }
  if (configuredKey !== apiKey) throw new Error("Google Maps was initialized with a different key");
  return importLibrary("maps");
}
