import { ShopResult } from "./types";
import { validateShopResult } from "./schema";

// We'll use a semaphore to limit concurrency
let activePages = 0;
const MAX_CONCURRENT_PAGES = 2;

// Helper to extract meta tags
function extractMeta(html: string, property: string): string | null {
    const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
    const match = html.match(regex);
    return match ? match[1] : null;
}

function extractTitle(html: string): string | null {
    const ogTitle = extractMeta(html, 'og:title');
    if (ogTitle) return ogTitle;
    const match = html.match(/<title>([^<]+)<\/title>/i);
    return match ? match[1] : null;
}

export async function processWithStagehand(url: string): Promise<ShopResult | null> {
    // Wait if too many pages are open
    while (activePages >= MAX_CONCURRENT_PAGES) {
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    activePages++;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; ChatGPT-v2/1.0; +http://localhost:3000)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(`Failed to fetch ${url}: ${response.status}`);
            return null;
        }

        const html = await response.text();
        const title = extractTitle(html);

        if (!title) {
            // If we can't even get a title, it's not worth returning
            return null;
        }

        const image = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image');
        const description = extractMeta(html, 'og:description') || extractMeta(html, 'description');
        const siteName = extractMeta(html, 'og:site_name');

        // Try to extract price
        const priceAmountStr = extractMeta(html, 'og:price:amount') || extractMeta(html, 'product:price:amount');
        const priceCurrency = extractMeta(html, 'og:price:currency') || extractMeta(html, 'product:price:currency') || 'USD';

        let priceAmount: number | null = null;
        if (priceAmountStr) {
            const parsed = parseFloat(priceAmountStr);
            if (!isNaN(parsed)) priceAmount = parsed;
        }

        const result: ShopResult = {
            title: title.trim(),
            url: url,
            image_url: image || null,
            description: description?.trim() || null, // Add description to type if needed, or put in key_features?
            // We'll put description in evidence for now or key_features if short
            price: {
                amount: priceAmount,
                currency: "USD", // Simplification: assume/force USD for now or handle conversion later
                raw: priceAmount ? `${priceCurrency} ${priceAmount}` : null
            },
            merchant: siteName || new URL(url).hostname.replace("www.", ""),
            availability: "unknown", // Hard to extract reliably without specific selectors
            key_features: [],
            shipping_summary: null,
            rating_summary: { rating: null, count: null },
            evidence: [{ type: "dom", source: url, snippet: description || "Extracted via OpenGraph" }]
        };

        return validateShopResult(result);

    } catch (error) {
        console.error(`Metadata extraction error for ${url}:`, error);
        return null;
    } finally {
        activePages--;
    }
}

