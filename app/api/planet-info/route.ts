import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";

const MODEL = process.env.AI_GATEWAY_MODEL || "anthropic/claude-haiku-4.5";

const PLANET_SYSTEM = `You are a concise astronomy assistant. Given a planet (or Sun/Moon), output 4–5 short factual bullets.

RULES:
- Start with distance from Sun in km or AU (for Moon: distance from Earth).
- Include: orbital period or day length, radius/size, one distinctive fact.
- One line per bullet. No headers, no numbering, no markdown.
- Max 80 characters per line. Be accurate and scannable.`;

export const maxDuration = 10;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const planet = searchParams.get("planet")?.trim();
  if (!planet) {
    return Response.json({ error: "planet query required" }, { status: 400 });
  }

  try {
    const { text } = await generateText({
      model: gateway(MODEL),
      system: PLANET_SYSTEM,
      prompt: `Planet (or body): ${planet}\n\nBullet facts:`,
      temperature: 0.2,
    });

    const facts = text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    return Response.json({ name: planet, facts });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate planet info",
      },
      { status: 500 }
    );
  }
}
