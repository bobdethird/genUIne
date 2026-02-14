
import { useState, useEffect, useCallback } from "react";
import { type UIMessage } from "ai";

export type ChatSession = {
    id: string;
    title: string;
    messages: UIMessage[];
    updatedAt: number;
};

const STORAGE_KEY = "chatgpt-v2-chats";

export function useLocalChat() {
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

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

    // Save to localStorage whenever chats change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
        }
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

    return {
        chats,
        currentChatId,
        setCurrentChatId,
        createChat,
        selectChat,
        deleteChat,
        saveMessages,
        updateChatTitle,
        isLoaded,
        currentChat: chats.find((c) => c.id === currentChatId) || null,
    };
}
