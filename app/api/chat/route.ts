import { createAgent } from "@/lib/agent";
import { getSolarSystemSpec } from "@/lib/solar-system-spec";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { pipeJsonRender } from "@json-render/core";

export const maxDuration = 120;

const SOLAR_SYSTEM_INTENT =
  /\b(solar\s+system|diagram\s+of\s+(the\s+)?solar\s+system|show\s+me\s+.*solar|solar\s+system\s+diagram)\b/i;

function getLastUserMessageText(messages: UIMessage[]): string {
  const userMessages = messages.filter((m) => m.role === "user");
  const last = userMessages[userMessages.length - 1];
  if (!last) return "";
  const parts = (last as { parts?: Array<{ type?: string; text?: string }> }).parts;
  if (Array.isArray(parts)) {
    const textPart = parts.find((p) => p.type === "text");
    if (textPart && typeof textPart.text === "string") return textPart.text;
  }
  return "";
}

export async function POST(req: Request) {
  const body = await req.json();
  const uiMessages: UIMessage[] = body.messages;

  if (!uiMessages || !Array.isArray(uiMessages) || uiMessages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const lastUserText = getLastUserMessageText(uiMessages);
  const useSolarShortcut = SOLAR_SYSTEM_INTENT.test(lastUserText.trim());

  if (useSolarShortcut) {
    const flatSpec = getSolarSystemSpec();
    const textId = crypto.randomUUID?.() ?? `text-${Date.now()}`;
    const intro =
      "Here's an interactive solar system diagram. Hover over planets to see info.\n\n";

    const stream = createUIMessageStream({
      originalMessages: uiMessages,
      execute: async ({ writer }) => {
        writer.write({ type: "text-start", id: textId });
        writer.write({ type: "text-delta", id: textId, delta: intro });
        writer.write({ type: "text-end", id: textId });
        writer.write({
          type: "data-spec",
          data: { type: "flat", spec: flatSpec },
        });
      },
    });

    return createUIMessageStreamResponse({ stream });
  }

  const agent = await createAgent();
  const modelMessages = await convertToModelMessages(uiMessages);
  const result = await agent.stream({ messages: modelMessages });

  const stream = createUIMessageStream({
    originalMessages: uiMessages,
    execute: async ({ writer }) => {
      writer.merge(pipeJsonRender(result.toUIMessageStream()));
    },
  });

  return createUIMessageStreamResponse({ stream });
}