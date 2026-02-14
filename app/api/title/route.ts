import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";

const MODEL = process.env.AI_GATEWAY_TITLE_MODEL || "openai/gpt-5-nano";

const TITLE_SYSTEM = `Generate a clean, short topic title for a user prompt.

RULES:
- 5–8 words. Be specific, not generic. Include the main verb + object.
- No filler words (a, the, please, could you, etc.).
- No quotes, punctuation, or markdown.
- Single line, title case, max 60 characters, no trailing period.
- Must be readable out of context.

Output ONLY the title, nothing else.`;

export const maxDuration = 10;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return Response.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const { text } = await generateText({
      model: gateway(MODEL),
      system: TITLE_SYSTEM,
      prompt: `User prompt:\n"${prompt}"\n\nTitle:`,
      temperature: 0.2,
    });

    const title = sanitizeTitle(text);
    return Response.json({ title });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate title" },
      { status: 500 }
    );
  }
}

function sanitizeTitle(raw: string): string {
  let s = raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[#*_`\[\](){}]/g, "")
    .replace(/\.+$/, "")
    .replace(/\s+/g, " ");
  if (s.length > 60) s = s.slice(0, 60).trim();
  return toTitleCase(s);
}

function toTitleCase(s: string): string {
  return s.replace(
    /\b\w+/g,
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );
}
