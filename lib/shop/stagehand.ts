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

// Helper to validate if a URL looks like a product page
function isValidProductUrl(url: string): boolean {
    const lower = url.toLowerCase();
    const badPatterns = [
        "/collections/",
        "/category/",
        "/categories/",
        "/pages/",
        "/blog/",
        "/articles/",
        "/search"
    ];

    // 1. Reject explicit bad patterns
    if (badPatterns.some(p => lower.includes(p))) {
        // Exception: /collections/name/products/product-name is valid
        if (lower.includes("/collections/") && lower.includes("/products/")) {
            return true;
        }
        return false;
    }

    // 2. Reject root shop/store pages or generic listings (e.g. /shop/mens-shoes/)
    if (/\/shop\/?$/.test(lower)) return false;
    if (/\/store\/?$/.test(lower)) return false;

    // 3. Heuristic: Product pages usually have deep paths or IDs
    // e.g. /product/123 or /shoes/nike-air-max-90
    // Category pages often are just one level deep after the domain or 'shop'
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(Boolean);

    // If it ends in "shoes", "clothing", "mens", "womens", it's likely a category
    const lastSegment = segments[segments.length - 1];
    if (["shoes", "clothing", "apparel", "gear", "accessories", "mens", "womens", "kids", "sale", "new"].includes(lastSegment)) {
        return false;
    }

    return true;
}

export async function processWithStagehand(url: string): Promise<ShopResult | null> {
    if (!isValidProductUrl(url)) {
        console.log(`Skipping non-product URL: ${url}`);
        return null;
    }

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

        // 1. Try to extract Schema.org JSON-LD
        let schemaOrgData: any = null;
        const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
        if (jsonLdMatch) {
            for (const match of jsonLdMatch) {
                try {
                    const jsonContent = match.replace(/<\/?script[^>]*>/gi, "");
                    const parsed = JSON.parse(jsonContent);

                    // Reject known list types
                    const type = parsed["@type"];
                    if (type === "ItemList" || type === "CollectionPage" || type === "SearchResultsPage") {
                        console.log(`Rejecting Schema type: ${type} for ${url}`);
                        return null;
                    }

                    // Handle arrays (graph or just list of items)
                    const items = Array.isArray(parsed) ? parsed : (parsed["@graph"] || [parsed]);

                    // Look for Product type
                    const products = items.filter((p: any) =>
                        p["@type"] === "Product" || p["@type"] === "https://schema.org/Product"
                    );

                    if (products.length > 0) {
                        // Use the first product found
                        schemaOrgData = products[0];
                        break;
                    }
                } catch (e) { /* ignore parse errors */ }
            }
        }

        // 2. Extract Data (Schema > OG > Meta)
        const title = schemaOrgData?.name || extractTitle(html);
        if (!title) return null; // Mandatory

        let image = schemaOrgData?.image;
        if (Array.isArray(image)) image = image[0];
        if (typeof image === 'object') image = image.url; // ImageObject
        if (!image) image = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image');

        const description = schemaOrgData?.description || extractMeta(html, 'og:description') || extractMeta(html, 'description');
        const siteName = extractMeta(html, 'og:site_name');

        // Price Extraction
        let priceAmount: number | null = null;
        let priceCurrency = "USD";

        if (schemaOrgData?.offers) {
            const offers = Array.isArray(schemaOrgData.offers) ? schemaOrgData.offers : [schemaOrgData.offers];
            const offer = offers.find((o: any) => o.price);
            if (offer) {
                priceAmount = parseFloat(offer.price);
                if (offer.priceCurrency) priceCurrency = offer.priceCurrency;
            }
        }

        if (priceAmount === null) {
            const priceAmountStr = extractMeta(html, 'og:price:amount') || extractMeta(html, 'product:price:amount');
            if (priceAmountStr) {
                const parsed = parseFloat(priceAmountStr);
                if (!isNaN(parsed)) priceAmount = parsed;
            }
            priceCurrency = extractMeta(html, 'og:price:currency') || extractMeta(html, 'product:price:currency') || 'USD';
        }

        // Regex fallback for price if still null (look for $XX.XX near "price")
        if (priceAmount === null) {
            const priceRegex = /\$[\s]?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;
            const bodyMatch = html.match(priceRegex);
            if (bodyMatch) {
                priceAmount = parseFloat(bodyMatch[1].replace(/,/g, ''));
            }
        }

        const result: ShopResult = {
            title: title.trim(),
            url: url,
            image_url: image || null,
            description: description?.trim() || null,
            price: {
                amount: priceAmount,
                currency: "USD",
                raw: priceAmount ? `${priceCurrency} ${priceAmount}` : null
            },
            merchant: siteName || new URL(url).hostname.replace("www.", ""),
            availability: schemaOrgData?.offers?.availability?.includes("InStock") ? "in_stock" : "unknown",
            key_features: [],
            shipping_summary: null,
            rating_summary: {
                rating: schemaOrgData?.aggregateRating?.ratingValue ? parseFloat(schemaOrgData.aggregateRating.ratingValue) : null,
                count: schemaOrgData?.aggregateRating?.reviewCount ? parseInt(schemaOrgData.aggregateRating.reviewCount) : null
            },
            evidence: [{ type: "dom", source: url, snippet: description || "Extracted via OpenGraph/Schema" }]
        };

        return validateShopResult(result);

    } catch (error) {
        console.error(`Metadata extraction error for ${url}:`, error);
        return null;
    } finally {
        activePages--;
    }
}
