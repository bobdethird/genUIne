import { tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY);

/**
 * Web search tool using Exa AI.
 *
 * Returns structured search results with text content, highlights,
 * favicons, and images for each result — enabling rich UI rendering.
 */
export const webSearch = tool({
  description:
    "Search the web for current information on any topic. Use this when the user asks about something not covered by the specialized tools (weather, crypto, GitHub, Hacker News). Returns structured search results with text, images, and favicons.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The search query — be specific and include relevant context for better results",
      ),
  }),
  execute: async ({ query }) => {
    try {
      const response = await exa.search(query, {
        type: "auto",
        numResults: 5,
        contents: {
          text: { maxCharacters: 3000 },
          highlights: { maxCharacters: 500 },
          extras: {
            imageLinks: 1,
          },
        },
      });

      const results = (response.results ?? []).map((r) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        favicon: r.favicon ?? null,
        image: r.image ?? null,
        imageLinks: r.extras?.imageLinks ?? [],
        publishedDate: r.publishedDate ?? null,
        author: r.author ?? null,
        text: r.text ?? "",
        highlights: r.highlights ?? [],
      }));

      return { results };
    } catch (error) {
      return {
        error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
