"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Mic, Paperclip, ChevronDown, User, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ parts: [{ type: 'text', text: input }] });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <header className="fixed top-0 w-full z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="text-lg font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-transparent hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 pl-0"
            >
              ChatGPT 5.2 <ChevronDown className="w-4 h-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>GPT-4o</DropdownMenuItem>
            <DropdownMenuItem>GPT-4 Turbo</DropdownMenuItem>
            <DropdownMenuItem>GPT-3.5</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </header>

      {/* Scrollable Messages Area */}
      <main className="flex-1 overflow-y-auto pt-16 pb-44">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full w-full px-4 text-center">
            <h1 className="text-3xl font-semibold mb-8">Where should we begin?</h1>
          </div>
        ) : (
          <div className="w-full max-w-3xl mx-auto px-4">
            <div className="space-y-6">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-4 ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.role !== "user" && (
                     <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white shrink-0">
                        <span className="text-xs">AI</span>
                     </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      m.role === "user"
                        ? "bg-zinc-100 dark:bg-zinc-800"
                        : "prose dark:prose-invert"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">
                      {m.parts.map((part, i) => (
                        part.type === 'text' ? <span key={i}>{part.text}</span> : null
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                  <div className="flex gap-4 justify-start">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white shrink-0">
                        <span className="text-xs">AI</span>
                     </div>
                     <div className="max-w-[80%] rounded-2xl px-4 py-2">
                        <span className="animate-pulse">Thinking...</span>
                     </div>
                  </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Fixed Input Area Overlay */}
      <div className="fixed bottom-0 left-0 right-0 z-10">
        <div className="pointer-events-none h-8 bg-gradient-to-t from-white dark:from-zinc-950 to-transparent" />
        <div className="bg-white dark:bg-zinc-950 px-4 pb-4 pt-2">
          <div className="w-full max-w-3xl mx-auto">
            <div className={`relative flex flex-col bg-zinc-50 dark:bg-zinc-800 rounded-3xl border border-transparent focus-within:border-zinc-300 dark:focus-within:border-zinc-600 transition-all duration-200 overflow-hidden shadow-sm ${isFocused ? 'ring-1 ring-zinc-200 dark:ring-zinc-700' : ''}`}>
               
               <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Ask anything"
                className="min-h-[44px] w-full resize-none bg-transparent border-0 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4 pt-3 pb-1 text-base max-h-[200px] overflow-y-auto"
                rows={1}
              />

              <div className="flex justify-between items-center px-2 pb-2">
                 <div className="flex items-center gap-1">
                   <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                             <Plus className="w-5 h-5" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>Attach file</TooltipContent>
                   </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                             <Mic className="w-5 h-5" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>Voice input</TooltipContent>
                   </Tooltip>
                 </div>
                 
                 <Button 
                  onClick={(e) => handleSubmit(e)}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className={`h-8 w-8 rounded-full transition-all duration-200 ${input.trim() ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500 cursor-not-allowed'}`}
                 >
                   <ArrowUp className="w-4 h-4" />
                 </Button>
              </div>
            </div>
            {!isEmpty && (
               <div className="text-xs text-center text-zinc-400 mt-2">
                  ChatGPT can make mistakes. Check important info.
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
