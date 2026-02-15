import { createAgent } from "@/lib/agent";
import { startSwarm } from "@/lib/swarm/runner";
import { getSolarSystemSpec } from "@/lib/solar-system-spec";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { pipeJsonRender } from "@json-render/core";

// Increase timeout for full stall
export const maxDuration = 300; // 5 minutes

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

  // 1. Force Fixed Session
  const sessionId = "demo-heng-yang";

  // 2. Handle Swarm Triggers
  // Extract the latest user query to start/update the swarm
  // DEBUG: Log the raw messages length
  console.log(`[Route] Received ${uiMessages.length} messages.`);

  // Find the last message that is strictly from the user
  const lastUserMessage = [...uiMessages].reverse().find(m => m.role === 'user');

  // LOG THE MESSAGE OBJECT TO SEE STRUCTURE
  if (lastUserMessage) {
    console.log(`[Route] Last User Message Object:`, JSON.stringify(lastUserMessage).slice(0, 200));
  } else {
    console.log(`[Route] No user message found in history.`);
  }

  // Handle both possible structures (direct content property or nested parts)
  let query: string | null = null;

  if (lastUserMessage) {
    const messageDetails = lastUserMessage as any;
    if (typeof messageDetails.content === 'string') {
      query = messageDetails.content;
    } else if (Array.isArray(messageDetails.content)) {
      // Vercel AI SDK Core Message format
      query = messageDetails.content.map((c: any) => c.type === 'text' ? c.text : '').join('');
    } else if ('parts' in messageDetails && Array.isArray(messageDetails.parts)) {
      // Vercel AI SDK UI Message format (sometimes)
      query = messageDetails.parts.map((p: any) => p.text || '').join('');
    } else {
      // Fallback
      query = JSON.stringify(messageDetails.content || messageDetails);
    }
  }

  console.log(`[Route] Extracted Query: "${query}"`);

  // FULL STALL MODE: Trigger Swarm and WAIT for completion
  if (query) {
    console.log(`[Route] Triggering Swarm for ${sessionId} and WAITING for completion...`);
    try {
      // Deconstruct the execution promise from the runner
      // explicit cast to any as the runner was updated in a separate turn
      const swarmResult = startSwarm(sessionId, query as string) as any;
      const executionPromise = swarmResult.executionPromise;

      if (executionPromise) {
        console.log(`[Route] Execution promise found. Awaiting...`);
        await executionPromise;
        console.log(`[Route] Swarm finished execution. Proceeding to UI Agent.`);
      } else {
        console.warn(`[Route] Swarm started but no execution promise returned.`);
      }

    } catch (e) {
      console.error(`[Route] FAILED to run swarm:`, e);
    }
  } else {
    console.warn(`[Route] No user query found, skipping swarm trigger.`);
  }

  // 3. CONTEXT INJECTION
  // Read the swarm buffer to get the latest status
  const { getSwarmBuffer } = await import("@/lib/swarm/buffers");
  const buffer = getSwarmBuffer(sessionId);

  // We inject a SYSTEM message at the end of the history (before the new user message ideally, or just as context)
  // AI SDK Core doesn't strictly enforce message order for 'system' messages, but usually they go first.
  // BUT we want this to be "fresh" context. So we can add it as a 'system' message right before the last user message.

  let injectedSystemMessage: any = null;
  if (buffer) {
    const recentLogs = buffer.logs.slice(-5).join("\n");
    const recentArtifacts = buffer.artifacts.slice(-3).map(a =>
      `TYPE: ${a.type}\nTITLE: ${a.title}\nCONTENT: ${JSON.stringify(a.content).slice(0, 500)}...`
    ).join("\n---\n");

    const statusMsg = `
[BACKGROUND SWARM STATUS]
Status: ${buffer.status}
Recent Activity:
${recentLogs}

[FOUND DATA/ARTIFACTS]
${recentArtifacts}

INSTRUCTION: Uses the above data to answer the user's request. If there are structured artifacts (products, lists), RENDER THEM AS UI COMPONENTS (Tables, Cards).
`;
    injectedSystemMessage = { role: "system", content: statusMsg };
  }

  // 4. Create the Agent
  const agent = createAgent(sessionId);

  let modelMessages = await convertToModelMessages(uiMessages);

  // Inject the context
  if (injectedSystemMessage) {
    modelMessages = [...modelMessages, injectedSystemMessage];
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


  const result = await agent.stream({ messages: modelMessages });

  const stream = createUIMessageStream({
    originalMessages: uiMessages,
    execute: async ({ writer }) => {
      writer.merge(pipeJsonRender(result.toUIMessageStream()));
    },
  });

  return createUIMessageStreamResponse({ stream });
}