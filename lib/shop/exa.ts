export interface ExaResult {
    title: string;
    url: string;
    id: string;
    score?: number;
    snippet?: string;
    price?: number; // Sometimes available
}

export async function searchExa(query: string, limit: number = 10): Promise<ExaResult[]> {
    const apiKey = process.env.EXA_API_KEY;

    if (!apiKey) {
        console.warn("EXA_API_KEY not set. Using mock Exa results.");
        return mockExaResults(query, limit);
    }

    try {
        const response = await fetch("https://api.exa.ai/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
            },
            body: JSON.stringify({
                query: `${query} buy shopping product`,
                numResults: limit,
                useAutoprompt: true,
                contents: {
                    text: true,
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`Exa API failed: ${response.statusText}`);
        }

        const data = await response.json();
        return (data.results || []).map((r: any) => ({
            title: r.title,
            url: r.url,
            id: r.id,
            score: r.score,
            snippet: r.text?.slice(0, 200),
        }));

    } catch (error) {
        console.error("Exa search error:", error);
        return [];
    }
}

function mockExaResults(query: string, limit: number): ExaResult[] {
    // Simple deterministic mock based on query length to vary results slightly
    return Array.from({ length: limit }, (_, i) => ({
        id: `mock-exa-${i}`,
        title: `${query} Product ${i + 1} (Exa Candidate)`,
        url: `https://example.com/product/${i}`,
        score: 0.9 - (i * 0.05),
        snippet: `This is a search result for ${query}. It seems like a great product to buy.`,
    }));
}
