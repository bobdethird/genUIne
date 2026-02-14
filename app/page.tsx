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
  ArrowUp,
  ChevronRight,
  Code2,
  Loader2,
  Sparkles,
  AlertCircle,
  MoreVertical,
  Clock,
  MessageSquarePlus,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useLocalChat } from "@/lib/hooks/use-local-chat";
import { MessageSquare, Plus } from "lucide-react";
import { PromptPill } from "@/components/prompt-pill";


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
// Helpers
// =============================================================================

function extractPromptFromMessage(m: AppMessage): string {
  const msg = m as { content?: string; parts?: Array<{ type?: string; text?: string }> };
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.parts)) {
    const textPart = msg.parts.find((p) => p.type === "text");
    if (textPart && typeof textPart.text === "string") return textPart.text;
  }
  return "";
}

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
    label: "Stock prices",
    prompt: "Check the stock price of TQQQ, Nvidia, and Apple",
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

function SpecWithDebug({
  spec,
  loading,
}: {
  spec: Parameters<typeof ExplorerRenderer>[0]["spec"];
  loading: boolean;
}) {
  const [showJson, setShowJson] = useState(false);
  return (
    <div className="w-full flex flex-col gap-2">
      <ExplorerRenderer spec={spec} loading={loading} />
      <button
        type="button"
        className="self-end inline-flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        onClick={() => setShowJson((v) => !v)}
      >
        <Code2 className="h-3 w-3" />
        {showJson ? "Hide JSON" : "Show JSON"}
      </button>
      {showJson && (
        <pre className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 max-h-96 overflow-auto whitespace-pre-wrap break-all">
          {JSON.stringify(spec, null, 2)}
        </pre>
      )}
    </div>
  );
}

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
// Output Block (assistant content + prompt pill header)
// =============================================================================

function OutputBlock({
  rawPrompt,
  aiTitle,
  children,
}: {
  rawPrompt: string;
  aiTitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full flex flex-col">
      {aiTitle && (
        <div className="sticky top-0 z-10 shrink-0 py-2 mb-2 bg-gradient-to-b from-background via-background/95 to-transparent">
          <PromptPill gistTitle={aiTitle} rawPrompt={rawPrompt || undefined} />
        </div>
      )}
      <div className="min-h-0 flex-1">{children}</div>
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

  // Assign a step number to each segment. A new step starts with each text
  // segment; tools inherit the step of their preceding text. Spec segments
  // are excluded (always shown). This lets text + its tool calls fade as one unit.
  const stepOf: number[] = [];
  let step = -1;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].kind === "text") step++;
    stepOf[i] = segments[i].kind === "spec" ? -1 : Math.max(0, step);
  }
  const lastStep = Math.max(0, step);

  const hasAnything = segments.length > 0 || hasSpec;
  const showLoader =
    isLast && isStreaming && message.role === "assistant" && !hasAnything;

  // User prompts are not shown as bubbles; the prompt pill on the assistant block serves as the label
  if (isUser) return null;

  // If there's a spec but no spec segment was inserted (edge case),
  // append it so it still renders.
  const specRenderedInline = specInserted;
  const showSpecAtEnd = hasSpec && !specRenderedInline;

  return (
    <div className="w-full flex flex-col gap-3">
      {segments.map((seg, i) => {
        // For non-spec segments, determine if this step is active or fading.
        // A step fades when a newer step exists, or when the spec has appeared.
        const isActiveStep =
          seg.kind !== "spec" && stepOf[i] === lastStep && !hasSpec;
        const isFading = seg.kind !== "spec" && !isActiveStep;

        if (seg.kind === "text") {
          return (
            <div
              key={`text-${i}`}
              className={`text-sm leading-relaxed text-muted-foreground [&_p+p]:mt-3 ${isFading ? "animate-fade-out-collapse" : ""
                }`}
            >
              <Streamdown
                plugins={{ code }}
                animated={isLast && isStreaming && isActiveStep}
              >
                {seg.text}
              </Streamdown>
            </div>
          );
        }
        if (seg.kind === "spec") {
          if (!hasSpec) return null;
          return (
            <div key="spec" className="w-full">
              <SpecWithDebug spec={spec} loading={isLast && isStreaming} />
            </div>
          );
        }
        return (
          <div
            key={`tools-${i}`}
            className={`flex flex-col gap-1 ${isFading ? "animate-fade-out-collapse" : ""}`}
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
          <SpecWithDebug spec={spec} loading={isLast && isStreaming} />
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
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputHovered, setInputHovered] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Focus Mode State
  // null = Showing latest interaction (live mode)
  // number = Index of 'user' message to show history for
  const [viewedIndex, setViewedIndex] = useState<number | null>(null);
  // When set, we stay on this turn when pointer leaves the session list (click-to-pin)
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  // When true, main area shows full session as one scrollable document; hover history scrolls to anchor
  const [previewMode, setPreviewMode] = useState(false);
  const returnToLiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHoveredIndexRef = useRef<number | null>(null);

  const {
    chats,
    currentChatId,
    createChat,
    selectChat,
    saveMessages,
    updateChatTitle,
    deleteChat,
    currentChat
  } = useLocalChat();

  const { messages, sendMessage, setMessages, status, error } =
    useChat<AppMessage>({
      transport,
      onFinish: () => {
        if (currentChatId) {
          // We need to wait for the messages state to update, or pass the new messages directly.
          // useChat doesn't pass the new messages to onFinish in all versions, 
          // but we can rely on the effect below to sync.
        }
      }
    });

  // Sync messages to local storage whenever they change
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      saveMessages(currentChatId, messages);
    }
  }, [messages, currentChatId, saveMessages]);

  // --- AI title generation for sidebar chat name ---
  const titleGenRef = useRef<Set<string>>(new Set()); // chat IDs already sent for title gen

  useEffect(() => {
    if (!currentChatId || !currentChat) return;
    if (currentChat.title !== "New Chat") return; // already titled
    if (titleGenRef.current.has(currentChatId)) return; // already in-flight

    const firstUserMsg = messages.find((m) => m.role === "user");
    if (!firstUserMsg) return;

    let prompt = "";
    if (typeof (firstUserMsg as any).content === "string") {
      prompt = (firstUserMsg as any).content;
    } else if (Array.isArray(firstUserMsg.parts)) {
      const tp = firstUserMsg.parts.find((p: any) => p.type === "text");
      if (tp) prompt = (tp as any).text;
    }
    if (!prompt.trim()) return;

    titleGenRef.current.add(currentChatId);
    const chatId = currentChatId; // capture for async closure
    fetch("/api/title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.title) updateChatTitle(chatId, data.title);
      })
      .catch(() => {
        // fallback: keep "New Chat" — will retry next render cycle
        titleGenRef.current.delete(chatId);
      });
  }, [messages, currentChatId, currentChat, updateChatTitle]);

  // --- AI title generation for per-exchange prompt pills ---
  const [aiTitles, setAiTitles] = useState<Record<string, string>>({});
  const titleFetchingRef = useRef<Set<string>>(new Set()); // prompts already in-flight

  useEffect(() => {
    // Find user messages whose prompt text doesn't have an AI title yet
    const userMsgs = messages.filter((m) => m.role === "user");
    for (const m of userMsgs) {
      let prompt = "";
      if (typeof (m as any).content === "string") {
        prompt = (m as any).content;
      } else if (Array.isArray(m.parts)) {
        const tp = m.parts.find((p: any) => p.type === "text");
        if (tp) prompt = (tp as any).text;
      }
      if (!prompt.trim()) continue;
      const key = prompt.trim();
      if (aiTitles[key] || titleFetchingRef.current.has(key)) continue;

      titleFetchingRef.current.add(key);
      fetch("/api/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: key }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.title) {
            setAiTitles((prev) => ({ ...prev, [key]: data.title }));
          }
        })
        .catch(() => {
          titleFetchingRef.current.delete(key);
        });
    }
  }, [messages]); // intentionally exclude aiTitles to avoid re-triggering

  // Load messages when switching chats
  useEffect(() => {
    if (currentChat) {
      setMessages(currentChat.messages as AppMessage[]);
      setViewedIndex(null);
    } else if (currentChatId === null && chats.length > 0) {
      // If no chat selected but we have chats, maybe select the first one?
      // Or keep it empty for "New Chat" state if we want explicit "New Chat" button press.
      // For this app, let's say if no ID is selected, we are in a "New Chat" limbo 
      // until the user sends a message or clicks "Add Chat".
      // But "Add Chat" creates an ID immediately.
      // Let's assume start = new chat.
    }
  }, [currentChatId, setMessages]); // removed chats dependency to avoid loops

  const handleAddChat = useCallback(() => {
    const newId = createChat();
    setMessages([]); // Clear current view
    setInput("");
    inputRef.current?.focus();
    setViewedIndex(null);
  }, [createChat, setMessages]);


  const isStreaming = status === "streaming" || status === "submitted";

  // All exchanges (user index + messages) for the full-document view and history list
  const exchangeIndices = messages
    .map((m, i) => ({ role: m.role, index: i }))
    .filter((x) => x.role === "user")
    .map((x) => x.index);

  // Oldest at top, newest at bottom — matches main document scroll order
  const historyItems = exchangeIndices.map((idx) => {
    const m = messages[idx];
    let userText = "";
    if (typeof (m as any).content === "string") {
      userText = (m as any).content;
    } else if (Array.isArray(m.parts)) {
      const textPart = m.parts.find((p: any) => p.type === "text");
      if (textPart) userText = (textPart as any).text;
    }
    const key = userText.trim();
    return {
      index: idx,
      summary: aiTitles[key] || (userText ? userText.slice(0, 50) : "Complex Input"),
    };
  });

  // Scroll main container so the start of this exchange's answer is at the top
  const scrollToExchangeAnchor = useCallback((userIndex: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    // Prefer answer-start anchor so the beginning of the assistant reply is at top
    const answerStart = document.getElementById(`exchange-${userIndex}-start`);
    const fallback = document.getElementById(`exchange-${userIndex}`);
    const el = answerStart ?? fallback;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);


  // Determine what to display
  let displayedMessages: AppMessage[] = [];

  if (viewedIndex !== null) {
    // History Mode: Show the user message at viewedIndex and the following assistant message (if exists)
    const userMsg = messages[viewedIndex];
    const assistantMsg = messages[viewedIndex + 1];
    if (userMsg) {
      displayedMessages.push(userMsg);
      if (assistantMsg && assistantMsg.role === "assistant") {
        displayedMessages.push(assistantMsg);
      }
    }
  } else {
    // Live Mode (Focus Mode):
    // Show the *latest* exchange. 
    // Usually the last 2 messages (User + Assistant).
    // If only User message exists (waiting for AI), show last 1.
    // However, we want to ensure we're showing a complete turn if possible.

    if (messages.length > 0) {
      // Find the last user message
      const lastUserIndex = messages.findLastIndex(m => m.role === 'user');
      if (lastUserIndex !== -1) {
        displayedMessages = messages.slice(lastUserIndex);
      } else {
        // Fallback (e.g. system message only?)
        displayedMessages = messages.slice(-2);
      }
    }
  }

  // Auto-switch back to live mode when a new message is added (while not viewing history)
  useEffect(() => {
    if (status === 'submitted' || status === 'streaming') {
      setViewedIndex(null);
      setPinnedIndex(null);
    }
  }, [status]);

  // When entering preview mode, show pinned or latest exchange and scroll to it
  useEffect(() => {
    if (!previewMode) return;
    const target =
      pinnedIndex ??
      (exchangeIndices.length > 0 ? exchangeIndices[exchangeIndices.length - 1]! : null);
    if (target !== null) {
      setViewedIndex(target);
      lastHoveredIndexRef.current = target;
    }
  }, [previewMode]);

  // In preview mode, smooth-scroll main container to the hovered exchange anchor
  useEffect(() => {
    if (!previewMode || viewedIndex == null) return;
    if (lastHoveredIndexRef.current === viewedIndex) return;
    lastHoveredIndexRef.current = viewedIndex;
    const t = requestAnimationFrame(() => {
      scrollToExchangeAnchor(viewedIndex);
    });
    return () => cancelAnimationFrame(t);
  }, [previewMode, viewedIndex, scrollToExchangeAnchor]);


  

  const handleSubmit = useCallback(
    async (text?: string) => {
      const message = text || input;
      if (!message.trim() || isStreaming) return;

      // Ensure we have a chat ID. If not, create one.
      let activeId = currentChatId;
      if (!activeId) {
        activeId = createChat();
      }

      // Clear view index to ensure we see the new message interaction
      setViewedIndex(null);

      setInput("");
      await sendMessage({ text: message.trim() });
    },
    [input, isStreaming, sendMessage, currentChatId, createChat],
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

  // Removed old handleNewChat


  const isEmpty = messages.length === 0;
  const inputExpanded = inputHovered || input.length > 0 || isEmpty;

  // Auto-resize textarea height based on content
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea && inputExpanded) {
      textarea.style.height = "auto";
      const scrollH = textarea.scrollHeight;
      // min 48px (matches pill), max 200px
      textarea.style.height = `${Math.min(Math.max(scrollH, 48), 200)}px`;
    }
  }, [input, inputExpanded]);

  // Auto-focus textarea when pill expands
  useEffect(() => {
    if (inputExpanded) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [inputExpanded]);

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        <Sidebar collapsible="offcanvas" side="left">
          <SidebarHeader />
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleAddChat} className="gap-2">
                      <Plus className="h-4 w-4" />
                      New Chat
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {chats.map(chat => (
                    <SidebarMenuItem key={chat.id}>
                      <SidebarMenuButton
                        isActive={currentChatId === chat.id}
                        onClick={() => selectChat(chat.id)}
                      >
                        <span className="truncate">{chat.title || "Untitled"}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {chats.length === 0 && (
              <div className="px-2 py-3 text-sm text-muted-foreground">No past chats</div>
            )}
          </SidebarContent>
          <SidebarFooter>
            <ThemeToggle />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <div className="h-screen flex flex-col overflow-hidden relative">
            {/* Sidebar trigger — top-left, no overlay; main content stays in focus */}
            <div className="absolute top-4 left-4 z-20">
              <SidebarTrigger
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                title="Toggle sidebar"
              />
            </div>

        {/* Current Conversation History Bubble — hover to enter preview: one long document, scroll to exchange */}
        {!isEmpty && (
          <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            <div className="group flex flex-col items-end pointer-events-auto">
              <div
                className="mb-2 w-72 max-h-[60vh] overflow-y-auto overflow-x-hidden bg-popover border rounded-xl shadow-xl p-2 opacity-0 scale-95 origin-bottom-right transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 hidden group-hover:flex flex-col gap-0.5"
                onMouseEnter={() => {
                  if (returnToLiveTimeoutRef.current) {
                    clearTimeout(returnToLiveTimeoutRef.current);
                    returnToLiveTimeoutRef.current = null;
                  }
                  setPreviewMode(true);
                }}
                onMouseLeave={() => {
                  setPreviewMode(false);
                  lastHoveredIndexRef.current = null;
                  if (pinnedIndex !== null) {
                    setViewedIndex(pinnedIndex);
                    return;
                  }
                  returnToLiveTimeoutRef.current = setTimeout(() => {
                    setViewedIndex(null);
                    returnToLiveTimeoutRef.current = null;
                  }, 400);
                }}
                onWheel={(e) => {
                  if (!previewMode) return;
                  const main = scrollContainerRef.current;
                  if (!main) return;
                  e.preventDefault();
                  main.scrollTop += e.deltaY;
                }}
              >
                <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 sticky top-0 bg-popover">
                  Current Session{previewMode ? " · scroll" : pinnedIndex !== null ? " · pinned" : ""}
                </div>
                {historyItems.map((item) => (
                  <div
                    key={item.index}
                    role="button"
                    tabIndex={0}
                    className={`text-sm p-2.5 rounded-lg transition-all duration-150 select-none ${viewedIndex === item.index ? "bg-muted ring-1 ring-border/50" : "hover:bg-muted/60"} ${pinnedIndex === item.index ? "ring-1 ring-primary/40" : ""} cursor-pointer`}
                    onMouseEnter={() => setViewedIndex(item.index)}
                    onFocus={() => setViewedIndex(item.index)}
                    onClick={() => {
                      setViewedIndex(item.index);
                      setPinnedIndex(item.index);
                    }}
                  >
                    <div className="font-medium truncate">{item.summary}</div>
                  </div>
                ))}
              </div>

              <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-lg bg-background">
                <MessageSquare className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

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
          ) : previewMode ? (
            /* Preview: one long document with answer-start anchors; hover history scrolls to anchor */
            <div className="max-w-6xl mx-auto px-10 py-6 pb-24 space-y-8">
              {exchangeIndices.map((userIdx) => {
                const userMsg = messages[userIdx];
                const assistantMsg = messages[userIdx + 1];
                const isLastExchange = userIdx === exchangeIndices[exchangeIndices.length - 1];
                const rawPrompt = extractPromptFromMessage(userMsg);
                return (
                  <div
                    key={userIdx}
                    id={`exchange-${userIdx}`}
                    className="space-y-4"
                  >
                    {assistantMsg && assistantMsg.role === "assistant" ? (
                      <div
                        id={`exchange-${userIdx}-start`}
                        className="scroll-mt-4"
                      >
                        <OutputBlock rawPrompt={rawPrompt} aiTitle={aiTitles[rawPrompt.trim()]}>
                          <MessageBubble
                            message={assistantMsg}
                            isLast={isLastExchange && !isStreaming}
                            isStreaming={isLastExchange && isStreaming}
                          />
                        </OutputBlock>
                      </div>
                    ) : (
                      <OutputBlock rawPrompt={rawPrompt} aiTitle={aiTitles[rawPrompt.trim()]}>
                        <div className="text-sm text-muted-foreground animate-shimmer">Thinking...</div>
                      </OutputBlock>
                    )}
                  </div>
                );
              })}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            /* Single-exchange view (latest or pinned) */
            <div
              key={viewedIndex ?? "live"}
              className="max-w-6xl mx-auto px-10 py-6 pb-24 space-y-6 animate-in fade-in-0 duration-200"
            >
              {viewedIndex !== null && (
                <div className="flex justify-center mb-4">
                  <Button
                    variant="secondary"
                    size="xs"
                    className="text-xs h-7 gap-1"
                    onClick={() => {
                      setViewedIndex(null);
                      setPinnedIndex(null);
                    }}
                  >
                    {pinnedIndex !== null ? "Unpin and return to latest" : "Return to latest"}
                  </Button>
                </div>
              )}

              {displayedMessages.map((message, index) => {
                if (message.role === "user") {
                  const isLast = index === displayedMessages.length - 1;
                  if (!isLast) return null;
                  const rawPrompt = extractPromptFromMessage(message);
                  return (
                    <OutputBlock key={message.id} rawPrompt={rawPrompt} aiTitle={aiTitles[rawPrompt.trim()]}>
                      <div className="text-sm text-muted-foreground animate-shimmer">Thinking...</div>
                    </OutputBlock>
                  );
                }
                const userMsg = displayedMessages[index - 1];
                const rawPrompt = userMsg && userMsg.role === "user"
                  ? extractPromptFromMessage(userMsg)
                  : "";
                return (
                  <OutputBlock key={message.id} rawPrompt={rawPrompt} aiTitle={aiTitles[rawPrompt.trim()]}>
                    <MessageBubble
                      message={message}
                      isLast={index === displayedMessages.length - 1}
                      isStreaming={isStreaming && viewedIndex === null && index === displayedMessages.length - 1}
                    />
                  </OutputBlock>
                );
              })}

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
              rows={1}
              className={[
                "resize-none bg-card shadow-sm focus-visible:ring-0 focus-visible:border-input min-h-0 transition-all duration-300 ease-in-out",
                inputExpanded ? "cursor-text" : "cursor-default caret-transparent",
                inputExpanded ? "text-lg" : "text-sm",
              ].join(" ")}
              style={{
                height: inputExpanded ? undefined : "48px",
                minHeight: inputExpanded ? "48px" : undefined,
                maxHeight: inputExpanded ? "200px" : undefined,
                overflow: inputExpanded ? "auto" : "hidden",
                borderRadius: inputExpanded ? "1.5rem" : "9999px",
                paddingLeft: inputExpanded ? "1rem" : "2.5rem",
                paddingRight: inputExpanded ? "3rem" : "1.5rem",
                paddingTop: "12px",
                paddingBottom: "12px",
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
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}