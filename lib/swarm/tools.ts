/**
 * Tools for the Local Swarm (GSD Agent).
 * Wraps Exa (Search) and Stagehand (Browser Action).
 */
import Exa from "exa-js";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

// Initialize Exa
// Exa initialized lazily inside the tool

/**
 * Exa Search Tool
 * Best for high-quality "Deep Research" discovery.
 */
export const exaSearchTool = tool(
    async ({ query, category, num_results = 5 }: { query: string; category?: string; num_results?: number }) => {
        try {
            console.log(`[Swarm] Exa searching: ${query}`);
            const exa = new Exa(process.env.EXA_API_KEY || "skiploading");

            const result = await exa.searchAndContents(query, {
                type: "auto",
                numResults: num_results,
                category: category as any,
                contents: {
                    // text: false, // Omitted to avoid TS error, implies false if highlights is present
                    highlights: {
                        numSentences: 6,
                        query: query
                    },
                    extras: {
                        imageLinks: 3
                    }
                }
            });
            return JSON.stringify(result.results);
        } catch (e: any) {
            return `Error searching Exa: ${e.message}`;
        }
    },
    {
        name: "exa_search",
        description: "Perform a broad web search to find information, articles, or relevant URLs. Returns highlights and images. Use this to discover WHICH pages to visit.",
        schema: z.object({
            query: z.string().describe("The natural language search query"),
            category: z.enum(["company", "research paper", "news", "github", "tweet", "personal"]).optional().describe("Optional category to filter results"),
            num_results: z.number().optional().default(5).describe("Number of results to return"),
        }),
    }
);

/**
 * Stagehand Tool
 * Best for "Doing things" or "Extracting structured data" from specific URLs.
 * Connects to Browserbase for reliable execution.
 */
import { z as z3 } from "zod-v3"; // Import Zod v3 for Stagehand

export const stagehandActTool = tool(
    async ({ url, instructions, action = "extract", model_name = "gpt-4o" }: { url: string; instructions: string; action?: "extract" | "act" | "observe"; model_name?: string }) => {
        console.log(`[Swarm] Stagehand starting: ${action} on ${url}`);

        // Initialize Stagehand connected to Browserbase
        const stagehand = new Stagehand({
            env: "BROWSERBASE",
            apiKey: process.env.BROWSERBASE_API_KEY,
            projectId: process.env.BROWSERBASE_PROJECT_ID,
            verbose: 1,
            // Just pass the string. The SDK will now use the Env Vars we set above.
            model: "openai/gpt-4o",
        });

        try {
            await stagehand.init();
            console.log("[Swarm] Stagehand initialized.");

            // Cookie Import (if available)
            const cookieStr = process.env.BROWSER_COOKIES;
            // Access page via Stagehand's context API (Known-good pattern)
            const page = stagehand.context.pages()[0];

            if (cookieStr) {
                try {
                    const cookies = JSON.parse(cookieStr);
                    await page.context().addCookies(cookies);
                    console.log(`[Swarm] Imported ${cookies.length} cookies.`);
                } catch (e) {
                    console.warn("[Swarm] Failed to parse cookies from env.");
                }
            }

            console.log(`[Swarm] Navigating to ${url}...`);
            await page.goto(url);

            let result;

            if (action === "extract") {
                result = await stagehand.extract(
                    instructions,
                    z3.object({
                        summary: z3.string(),
                        items: z3.array(z3.object({
                            name: z3.string(),
                            content: z3.string().optional(),
                            url: z3.string().optional()
                        })).describe("List of items found (e.g. PRs, emails, products)"),
                        details: z3.string().optional()
                    })
                );
            } else if (action === "act") {
                // Autonomous Action
                await stagehand.act(instructions);
                const currentUrl = page.url();
                result = {
                    message: "Action completed successfully.",
                    action: instructions,
                    current_url: currentUrl
                };
            } else {
                // Observe
                result = await stagehand.extract(
                    `Look at the page and summarize what you see regarding: ${instructions}`,
                    z3.object({ summary: z3.string() })
                );
            }

            await stagehand.close();
            return JSON.stringify(result);

        } catch (e: any) {
            await stagehand.close();
            return `Error using Stagehand: ${e.message}`;
        }
    },
    {
        name: "stagehand_browser",
        description: "A full browser agent. Use 'extract' to get structured data, or 'act' to perform clicks, typing, and complex interactions (e.g. 'add to cart', 'login').",
        schema: z.object({
            url: z.string().describe("The URL to visit"),
            instructions: z.string().describe("Instructions for extraction OR action (e.g. 'Find PRs' or 'Click Buy Now')"),
            action: z.enum(["extract", "act", "observe"]).default("extract").describe("Mode: 'extract' for data, 'act' for clicking/typing"),
            model_name: z.string().optional().describe("Model to use (default: gpt-4o)"),
        }),
    }
);
