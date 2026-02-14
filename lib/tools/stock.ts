import { tool } from "ai";
import { z } from "zod";
import YahooFinance from "yahoo-finance2";

// =============================================================================
// Helpers
// =============================================================================

const yahooFinance = new YahooFinance();

function getChartOptionsForRange(range: string): {
  interval: "5m" | "15m" | "1d" | "1wk";
  period1: Date;
  period2: Date;
} | null {
  const period2 = new Date();
  const period1 = new Date(period2);
  switch (range) {
    case "1d":
      period1.setDate(period1.getDate() - 1);
      return { interval: "15m", period1, period2 };
    case "5d":
      period1.setDate(period1.getDate() - 5);
      return { interval: "1d", period1, period2 };
    case "1mo":
      period1.setMonth(period1.getMonth() - 1);
      return { interval: "1d", period1, period2 };
    case "6mo":
      period1.setMonth(period1.getMonth() - 6);
      return { interval: "1d", period1, period2 };
    case "ytd":
      return {
        interval: "1d",
        period1: new Date(period2.getFullYear(), 0, 1),
        period2,
      };
    case "1y":
      period1.setFullYear(period1.getFullYear() - 1);
      return { interval: "1d", period1, period2 };
    case "5y":
      period1.setFullYear(period1.getFullYear() - 5);
      return { interval: "1d", period1, period2 };
    default:
      return null;
  }
}

/**
 * Sample a time series down to `maxPoints` evenly-spaced entries.
 * Input: array of quotes with date and close (or price).
 * Output: sampled array sorted oldest-first (chart-friendly).
 */
function sampleTimeSeries(
  quotes: Array<{ date: Date; open: number | null; high: number | null; low: number | null; close: number | null; volume: number | null }>,
  maxPoints: number,
): Array<{ date: string; price: number; open: number; high: number; low: number; volume: number }> {
  const valid = quotes.filter(
    (q) =>
      q.close != null &&
      q.open != null &&
      q.high != null &&
      q.low != null &&
      q.volume != null,
  );
  if (valid.length === 0) return [];
  const step = Math.max(1, Math.floor(valid.length / maxPoints));
  return valid
    .filter((_, i) => i % step === 0)
    .map((q) => ({
      date: q.date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      price: Math.round((q.close ?? 0) * 100) / 100,
      open: q.open ?? 0,
      high: q.high ?? 0,
      low: q.low ?? 0,
      volume: q.volume ?? 0,
    }));
}

// =============================================================================
// getStockQuote — current market data
// =============================================================================

/**
 * Get current stock quote from Yahoo Finance.
 * https://github.com/gadicc/yahoo-finance2
 */
export const getStockQuote = tool({
  description:
    "Get the current stock price, open, high, low, volume, previous close, daily change, market cap, 52-week range, and PE ratio for a stock ticker symbol (e.g. AAPL, MSFT, TSLA).",
  inputSchema: z.object({
    symbol: z
      .string()
      .describe("Stock ticker symbol (e.g. 'AAPL', 'MSFT', 'TSLA', 'GOOG')"),
  }),
  execute: async ({ symbol }) => {
    try {
      const quote = await yahooFinance.quote(symbol);

      if (
        quote.regularMarketPrice == null ||
        Number.isNaN(quote.regularMarketPrice)
      ) {
        return { error: `No quote data found for symbol: ${symbol}` };
      }

      return {
        symbol: quote.symbol,
        shortName: quote.shortName ?? quote.longName ?? quote.symbol,
        price: quote.regularMarketPrice,
        open: quote.regularMarketOpen ?? undefined,
        dayHigh: quote.regularMarketDayHigh ?? quote.dayHigh ?? undefined,
        dayLow: quote.regularMarketDayLow ?? quote.dayLow ?? undefined,
        volume: quote.regularMarketVolume ?? quote.volume ?? undefined,
        previousClose: quote.regularMarketPreviousClose ?? undefined,
        change: quote.regularMarketChange ?? undefined,
        changePercent: quote.regularMarketChangePercent ?? undefined,
        marketCap: quote.marketCap ?? undefined,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? undefined,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? undefined,
        trailingPE: quote.trailingPE ?? undefined,
        currency: quote.currency ?? undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("No data") || message.includes("not found")) {
        return { error: `Stock not found: ${symbol}` };
      }
      return { error: `Failed to fetch stock quote: ${message}` };
    }
  },
});

// =============================================================================
// getStockPriceHistory — price history for charting
// =============================================================================

/**
 * Get historical price data for a stock from Yahoo Finance chart API.
 * Supports multiple ranges (1d, 5d, 1mo, 6mo, ytd, 1y, 5y) for time-range tabs.
 */
export const getStockPriceHistory = tool({
  description:
    "Get historical price data for a stock ticker symbol over a specified range. Returns date-labeled data points suitable for charting. Use range '1d' or '5d' for short-term, '1mo'/'6mo'/'1y'/'5y' or 'ytd' for longer periods. Aligns with time-range tabs (1D, 5D, 1M, 6M, YTD, 1Y).",
  inputSchema: z.object({
    symbol: z
      .string()
      .describe("Stock ticker symbol (e.g. 'AAPL', 'MSFT', 'TSLA')"),
    range: z
      .enum(["1d", "5d", "1mo", "6mo", "ytd", "1y", "5y"])
      .default("1y")
      .describe(
        "Time range: 1d, 5d, 1mo, 6mo, ytd (year-to-date), 1y, 5y",
      ),
  }),
  execute: async ({ symbol, range }) => {
    try {
      const opts = getChartOptionsForRange(range);
      if (!opts) {
        return { error: `Invalid range: ${range}. Use 1d, 5d, 1mo, 6mo, ytd, 1y, or 5y.` };
      }

      const result = await yahooFinance.chart(symbol, {
        period1: opts.period1,
        period2: opts.period2,
        interval: opts.interval,
      });

      if (!result.quotes || result.quotes.length === 0) {
        return { error: `No historical data found for symbol: ${symbol} over ${range}` };
      }

      const priceHistory = sampleTimeSeries(result.quotes, 30);

      return {
        symbol: result.meta?.symbol ?? symbol,
        range,
        lastRefreshed: result.meta?.regularMarketTime?.toISOString?.() ?? "",
        totalPoints: result.quotes.length,
        priceHistory,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("No data") || message.includes("not found")) {
        return { error: `Stock not found or no history: ${symbol}` };
      }
      return { error: `Failed to fetch stock history: ${message}` };
    }
  },
});
