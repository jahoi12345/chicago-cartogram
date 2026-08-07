// Cloudflare Worker: proxies point-to-point walk/bike/drive routing to
// OpenRouteService, keeping the API key server-side and returning only the
// numbers the client needs. Deploy with `npm run deploy` after setting the
// ORS_API_KEY secret (`npx wrangler secret put ORS_API_KEY`).

const ORS_PROFILES = new Set(["foot-walking", "cycling-regular", "driving-car"]);
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/route") {
      return jsonResponse({ error: "not found" }, 404);
    }

    const profile = url.searchParams.get("profile");
    const start = parseCoord(url.searchParams.get("start"));
    const end = parseCoord(url.searchParams.get("end"));
    if (!ORS_PROFILES.has(profile) || !start || !end) {
      return jsonResponse({ error: "invalid request" }, 400);
    }

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    if (!env.ORS_API_KEY) {
      return jsonResponse({ error: "server not configured" }, 500);
    }

    const orsUrl =
      `https://api.openrouteservice.org/v2/directions/${profile}` +
      `?api_key=${encodeURIComponent(env.ORS_API_KEY)}&start=${start.join(",")}&end=${end.join(",")}`;

    let orsResponse;
    try {
      orsResponse = await fetch(orsUrl, { headers: { Accept: "application/json" } });
    } catch (error) {
      return jsonResponse({ error: "upstream request failed" }, 502);
    }
    if (!orsResponse.ok) {
      return jsonResponse({ error: "upstream error", status: orsResponse.status }, 502);
    }

    const data = await orsResponse.json();
    const summary = data?.features?.[0]?.properties?.summary;
    if (!summary) {
      return jsonResponse({ error: "no route found" }, 404);
    }

    const result = jsonResponse({
      minutes: summary.duration / 60,
      meters: summary.distance,
    });
    result.headers.set("Cache-Control", "public, max-age=86400");
    await cache.put(cacheKey, result.clone());
    return result;
  },
};

function parseCoord(value) {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
