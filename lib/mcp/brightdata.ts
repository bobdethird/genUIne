import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";

const BRIGHTDATA_MCP_URL =
  "https://mcp.brightdata.com/sse?token=3fae7a86-7c40-4efc-8294-17416d702a4a&groups=advanced_scraping,ecommerce,travel";

let _client: MCPClient | null = null;
let _clientPromise: Promise<MCPClient> | null = null;

/**
 * Returns a cached Brightdata MCP client (singleton).
 * The client connects via SSE to the Brightdata hosted MCP server,
 * which provides tools for web scraping, e-commerce data, and travel data.
 */
async function getClient(): Promise<MCPClient> {
  if (_client) return _client;

  if (!_clientPromise) {
    _clientPromise = createMCPClient({
      transport: {
        type: "sse",
        url: BRIGHTDATA_MCP_URL,
      },
    }).then((client) => {
      _client = client;
      return client;
    });
  }

  return _clientPromise;
}

/**
 * Returns all tools exposed by the Brightdata MCP server.
 * Tools include advanced scraping, e-commerce, and travel capabilities.
 */
export async function getBrightdataTools() {
  const client = await getClient();
  return client.tools();
}
