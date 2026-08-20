export default function handler(request, response) {
  response.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });
  return response.status(200).json({ google_maps_api_key: process.env.GOOGLE_MAPS_API_KEY || "" });
}
