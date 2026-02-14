"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  SPEC_DATA_PART,
  SPEC_DATA_PART_TYPE,
  type SpecDataPart,
} from "@json-render/core";
import { useJsonRenderMessage } from "@json-render/react";
import { ExplorerRenderer } from "@/lib/render/renderer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";

// =============================================================================
// Types
// =============================================================================

type AppDataParts = { [SPEC_DATA_PART]: SpecDataPart };
type AppMessage = UIMessage<unknown, AppDataParts>;

// =============================================================================
// Transport
// =============================================================================

const transport = new DefaultChatTransport({ api: "/api/chat" });

// =============================================================================
// Suggestions (shown in empty state)
// =============================================================================

const SUGGESTIONS = [
  {
    label: "Weather comparison",
    prompt: "Compare the weather in New York, London, and Tokyo",
  },
  {
    label: "GitHub repo stats",
    prompt: "Show me stats for the vercel/next.js and vercel/ai GitHub repos",
  },
  {
    label: "Crypto dashboard",
    prompt: "Build a crypto dashboard for Bitcoin, Ethereum, and Solana",
  },
  {
    label: "Hacker News top stories",
    prompt: "Show me the top 15 Hacker News stories right now",
  },
];

// =============================================================================
// Tool Call Display
// =============================================================================

/** Readable labels for tool names: [loading, done] */
const TOOL_LABELS: Record<string, [string, string]> = {
  getWeather: ["Getting weather data", "Got weather data"],
  getGitHubRepo: ["Fetching GitHub repo", "Fetched GitHub repo"],
  getGitHubPullRequests: ["Fetching pull requests", "Fetched pull requests"],
  getCryptoPrice: ["Looking up crypto price", "Looked up crypto price"],
  getCryptoPriceHistory: ["Fetching price history", "Fetched price history"],
  getHackerNewsTop: ["Loading Hacker News", "Loaded Hacker News"],
  webSearch: ["Searching the web", "Searched the web"],
};

function ToolCallDisplay({
  toolName,
  state,
  result,
}: {
  toolName: string;
  state: string;
  result: unknown;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLoading =
    state !== "output-available" &&
    state !== "output-error" &&
    state !== "output-denied";
  const labels = TOOL_LABELS[toolName];
  const label = labels ? (isLoading ? labels[0] : labels[1]) : toolName;

  return (
    <div className="text-sm group">
      <Button
        variant="ghost"
        size="sm"
        className="h-auto px-0 py-0 gap-1.5 font-normal hover:bg-transparent"
        onClick={() => setExpanded((e) => !e)}
      >
        <span
          className={`text-muted-foreground ${isLoading ? "animate-shimmer" : ""}`}
        >
          {label}
        </span>
        {!isLoading && (
          <ChevronRight
            className={`h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-all ${expanded ? "rotate-90" : ""}`}
          />
        )}
      </Button>
      {expanded && !isLoading && result != null && (
        <div className="mt-1 max-h-64 overflow-auto">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
            {typeof result === "string"
              ? result
              : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Message Bubble
// =============================================================================

function MessageBubble({
  message,
  isLast,
  isStreaming,
}: {
  message: AppMessage;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";
  const { spec, text, hasSpec } = useJsonRenderMessage(message.parts);

  // Build ordered segments from parts, collapsing adjacent text and adjacent tools.
  // Spec data parts are tracked so the rendered UI appears inline where the AI
  // placed it rather than always at the bottom.
  const segments: Array<
    | { kind: "text"; text: string }
    | {
        kind: "tools";
        tools: Array<{
          toolCallId: string;
          toolName: string;
          state: string;
          output?: unknown;
        }>;
      }
    | { kind: "spec" }
  > = [];

  let specInserted = false;

  for (const part of message.parts) {
    if (part.type === "text") {
      if (!part.text.trim()) continue;
      const last = segments[segments.length - 1];
      if (last?.kind === "text") {
        last.text += part.text;
      } else {
        segments.push({ kind: "text", text: part.text });
      }
    } else if (part.type.startsWith("tool-")) {
      const tp = part as {
        type: string;
        toolCallId: string;
        state: string;
        output?: unknown;
      };
      const last = segments[segments.length - 1];
      if (last?.kind === "tools") {
        last.tools.push({
          toolCallId: tp.toolCallId,
          toolName: tp.type.replace(/^tool-/, ""),
          state: tp.state,
          output: tp.output,
        });
      } else {
        segments.push({
          kind: "tools",
          tools: [
            {
              toolCallId: tp.toolCallId,
              toolName: tp.type.replace(/^tool-/, ""),
              state: tp.state,
              output: tp.output,
            },
          ],
        });
      }
    } else if (part.type === SPEC_DATA_PART_TYPE && !specInserted) {
      // First spec data part — mark where the rendered UI should appear
      segments.push({ kind: "spec" });
      specInserted = true;
    }
  }

  const hasAnything = segments.length > 0 || hasSpec;
  const showLoader =
    isLast && isStreaming && message.role === "assistant" && !hasAnything;

  if (isUser) {
    return (
      <div className="flex justify-end">
        {text && (
          <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-primary text-primary-foreground rounded-tr-md">
            {text}
          </div>
        )}
      </div>
    );
  }

  // If there's a spec but no spec segment was inserted (edge case),
  // append it so it still renders.
  const specRenderedInline = specInserted;
  const showSpecAtEnd = hasSpec && !specRenderedInline;

  return (
    <div className="w-full flex flex-col gap-3">
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          // Never render raw text — the spec UI already shows all data.
          return null;
        }
        if (seg.kind === "spec") {
          if (!hasSpec) return null;
          return (
            <div key="spec" className="w-full">
              <ExplorerRenderer spec={spec} loading={isLast && isStreaming} />
            </div>
          );
        }
        return (
          <div
            key={`tools-${i}`}
            className={`flex flex-col gap-1 ${hasSpec ? "animate-fade-out-collapse" : ""}`}
          >
            {seg.tools.map((t) => (
              <ToolCallDisplay
                key={t.toolCallId}
                toolName={t.toolName}
                state={t.state}
                result={t.output}
              />
            ))}
          </div>
        );
      })}

      {/* Loading indicator */}
      {showLoader && (
        <div className="text-sm text-muted-foreground animate-shimmer">
          Thinking...
        </div>
      )}

      {/* Fallback: render spec at end if no inline position was found */}
      {showSpecAtEnd && (
        <div className="w-full">
          <ExplorerRenderer spec={spec} loading={isLast && isStreaming} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function ChatPage() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isStickToBottom = useRef(true);
  const isAutoScrolling = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputHovered, setInputHovered] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const { messages, sendMessage, setMessages, status, error } =
    useChat<AppMessage>({ transport });

  const isStreaming = status === "streaming" || status === "submitted";

  // Track whether the user has scrolled away from the bottom.
  // During programmatic scrolling, suppress button updates until we arrive.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const THRESHOLD = 80;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollTop + clientHeight >= scrollHeight - THRESHOLD;

      if (isAutoScrolling.current) {
        // Wait for the programmatic scroll to reach the bottom before
        // handing control back to the user-scroll tracker.
        if (atBottom) {
          isAutoScrolling.current = false;
        }
        return;
      }

      isStickToBottom.current = atBottom;
      setShowScrollButton(!atBottom);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll to bottom on new messages, unless user scrolled up.
  // Uses instant scrollTop assignment (no smooth animation) to avoid
  // an ongoing animation that fights user scroll input.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isStickToBottom.current) return;
    isAutoScrolling.current = true;
    container.scrollTop = container.scrollHeight;
    requestAnimationFrame(() => {
      isAutoScrolling.current = false;
    });
  }, [messages, isStreaming]);

  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    isStickToBottom.current = true;
    setShowScrollButton(false);
    isAutoScrolling.current = true;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    // isAutoScrolling is cleared by the scroll handler once it reaches bottom
  }, []);

  const handleSubmit = useCallback(
    async (text?: string) => {
      const message = text || input;
      if (!message.trim() || isStreaming) return;
      setInput("");
      await sendMessage({ text: message.trim() });
    },
    [input, isStreaming, sendMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }, [setMessages]);

  const isEmpty = messages.length === 0;
  const inputExpanded = inputHovered || input.length > 0 || isEmpty;

  // Auto-focus textarea when pill expands
  useEffect(() => {
    if (inputExpanded) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [inputExpanded]);

  return (
    <TooltipProvider>
    <div className="h-screen flex flex-col overflow-hidden relative">
      {/* Header */}
      <header className="border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">ChatGPT V2</h1>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Start Over
            </Button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Messages area */}
      <main ref={scrollContainerRef} className="flex-1 overflow-auto">
        {isEmpty ? (
          /* Empty state */
          <div className="h-full flex flex-col items-center justify-center px-6 py-0">
            <div className="max-w-2xl w-full space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  What would you like to explore?
                </h2>
                <p className="text-muted-foreground">
                  Ask about weather, GitHub repos, crypto prices, or Hacker News
                  -- the agent will fetch real data and build a dashboard.
                </p>
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s.label}
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => handleSubmit(s.prompt)}
                  >
                    <Sparkles className="h-3 w-3" />
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Message thread */
          <div className="max-w-7xl mx-auto px-10 py-6 pb-24 space-y-6">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                isStreaming={isStreaming}
              />
            ))}

            {/* Error display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input bar - overlays bottom of chat area */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-10 bg-gradient-to-t from-background/60 to-transparent pointer-events-none z-10">
        {/* Scroll to bottom button */}
        {showScrollButton && !isEmpty && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="absolute left-1/2 -translate-x-1/2 -top-10 z-10 shadow-md pointer-events-auto"
                onClick={scrollToBottom}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Scroll to bottom</TooltipContent>
          </Tooltip>
        )}
        <div
          className="mx-auto relative pointer-events-auto transition-all duration-300 ease-in-out"
          style={{ maxWidth: inputExpanded ? "32rem" : "12rem" }}
          onMouseEnter={() => setInputHovered(true)}
          onMouseLeave={() => setInputHovered(false)}
        >
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={
              isEmpty
                ? "e.g., Compare weather in NYC, London, and Tokyo..."
                : "Ask a follow-up..."
            }
            rows={inputExpanded ? 2 : 1}
            className={[
              "resize-none bg-card shadow-sm focus-visible:ring-0 focus-visible:border-input min-h-0 transition-all duration-300 ease-in-out",
              inputExpanded ? "cursor-text" : "cursor-default caret-transparent",
              inputExpanded ? "text-lg" : "text-sm",
            ].join(" ")}
            style={{
              height: inputExpanded ? "82px" : "48px",
              overflow: inputExpanded ? undefined : "hidden",
              borderRadius: inputExpanded ? "1rem" : "9999px",
              paddingLeft: inputExpanded ? "1rem" : "2.5rem",
              paddingRight: inputExpanded ? "3rem" : "1.5rem",
              paddingTop: inputExpanded ? "13px" : "12px",
              paddingBottom: inputExpanded ? "13px" : "12px",
            }}
            autoFocus
          />
          <div
            className="absolute right-2 bottom-2 transition-all duration-200"
            style={{
              opacity: inputExpanded ? 1 : 0,
              pointerEvents: inputExpanded ? "auto" : "none",
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || isStreaming}
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send message</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}