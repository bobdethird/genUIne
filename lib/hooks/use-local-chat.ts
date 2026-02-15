
import { useState, useEffect, useCallback, useRef } from "react";
import { type UIMessage } from "ai";

export type ChatSession = {
    id: string;
    title: string;
    messages: UIMessage[];
    updatedAt: number;
    aiTitles?: Record<string, string>;
};

const STORAGE_KEY = "chatgpt-v2-chats";
const SAVE_DEBOUNCE_MS = 2000; // only persist every 2s at most

export function useLocalChat() {
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const chatsRef = useRef(chats);
    chatsRef.current = chats;

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setChats(parsed);
            } catch (e) {
                console.error("Failed to parse chats", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Debounced save to localStorage — avoids serializing on every streaming chunk
    useEffect(() => {
        if (!isLoaded) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(chatsRef.current));
            } catch (e) {
                // localStorage quota exceeded — silently fail
                console.warn("Failed to save chats to localStorage:", e);
            }
        }, SAVE_DEBOUNCE_MS);
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [chats, isLoaded]);

    const createChat = useCallback(() => {
        const newId = crypto.randomUUID();
        const newChat: ChatSession = {
            id: newId,
            title: "New Chat",
            messages: [],
            updatedAt: Date.now(),
        };
        setChats((prev) => [newChat, ...prev]);
        setCurrentChatId(newId);
        return newId;
    }, []);

    const selectChat = useCallback((id: string) => {
        setCurrentChatId(id);
    }, []);

    const deleteChat = useCallback((id: string) => {
        setChats((prev) => prev.filter((c) => c.id !== id));
        if (currentChatId === id) {
            setCurrentChatId(null);
        }
    }, [currentChatId]);

    const saveMessages = useCallback(
        (chatId: string, messages: UIMessage[]) => {
            setChats((prev) =>
                prev.map((chat) => {
                    if (chat.id === chatId) {
                        return {
                            ...chat,
                            messages,
                            updatedAt: Date.now(),
                        };
                    }
                    return chat;
                })
            );
        },
        []
    );

    const updateChatTitle = useCallback(
        (chatId: string, title: string) => {
            setChats((prev) =>
                prev.map((chat) =>
                    chat.id === chatId ? { ...chat, title } : chat
                )
            );
        },
        []
    );

    const updateChatAiTitles = useCallback(
        (chatId: string, updates: Record<string, string>) => {
            setChats((prev) =>
                prev.map((chat) => {
                    if (chat.id !== chatId) return chat;
                    const merged = { ...(chat.aiTitles ?? {}), ...updates };
                    return { ...chat, aiTitles: merged };
                })
            );
        },
        []
    );

    return {
        chats,
        currentChatId,
        setCurrentChatId,
        createChat,
        selectChat,
        deleteChat,
        saveMessages,
        updateChatTitle,
        updateChatAiTitles,
        isLoaded,
        currentChat: chats.find((c) => c.id === currentChatId) || null,
    };
}
