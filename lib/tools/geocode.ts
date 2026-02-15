import { tool } from "ai";
import { z } from "zod";

/**
 * Geocoding tool using Mapbox Geocoding API v5.
 *
 * Converts place names, addresses, or business names into geographic coordinates.
 * Use this BEFORE generating Map markers to get accurate lat/lng values.
 * Supports biasing results near a specific location (proximity).
 */
export const geocodePlaces = tool({
  description:
    "Look up geographic coordinates (latitude/longitude) for one or more places, addresses, or business names. ALWAYS use this before creating Map markers to get accurate coordinates instead of guessing. Supports batch lookups of up to 10 places. Optionally provide a proximity coordinate to bias results toward a specific area (e.g. if the user asked about restaurants in San Francisco, pass SF's coordinates as proximity).",
  inputSchema: z.object({
    queries: z
      .array(z.string())
      .min(1)
      .max(10)
      .describe(
        "Array of place names, addresses, or business names to geocode (e.g. ['House of Prime Rib, San Francisco', '1600 Amphitheatre Parkway, Mountain View, CA'])",
      ),
    proximityLatitude: z
      .number()
      .nullable()
      .describe(
        "Optional latitude to bias results toward (e.g. 37.7749 for San Francisco)",
      ),
    proximityLongitude: z
      .number()
      .nullable()
      .describe(
        "Optional longitude to bias results toward (e.g. -122.4194 for San Francisco)",
      ),
  }),
  execute: async ({ queries, proximityLatitude, proximityLongitude }) => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
    if (!token) {
      return { error: "Mapbox API key not configured" };
    }

    const proximity =
      proximityLatitude != null && proximityLongitude != null
        ? `${proximityLongitude},${proximityLatitude}`
        : undefined;

    const results = await Promise.all(
      queries.map(async (query) => {
        try {
          const params = new URLSearchParams({
            access_token: token,
            limit: "1",
            language: "en",
          });
          if (proximity) {
            params.set("proximity", proximity);
          }

          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`;
          const res = await fetch(url);
          if (!res.ok) {
            return {
              query,
              error: `Geocoding failed: ${res.status}`,
              latitude: null,
              longitude: null,
              address: null,
              category: null,
            };
          }

          const data = await res.json();
          const feature = data.features?.[0];

          if (!feature) {
            return {
              query,
              error: "No results found",
              latitude: null,
              longitude: null,
              address: null,
              category: null,
            };
          }

          const [lng, lat] = feature.center;

          // Extract category from the feature's properties
          const categories = feature.properties?.category
            ? String(feature.properties.category).split(",").map((s: string) => s.trim())
            : [];

          return {
            query,
            latitude: lat as number,
            longitude: lng as number,
            label: feature.text ?? query,
            address: feature.place_name ?? null,
            category: categories[0] ?? null,
            error: null,
          };
        } catch (err) {
          return {
            query,
            error: `Geocoding failed: ${err instanceof Error ? err.message : "Unknown error"}`,
            latitude: null,
            longitude: null,
            address: null,
            category: null,
          };
        }
      }),
    );

    return { results };
  },
});
