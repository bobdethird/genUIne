import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UIEditorProps {
    initialPrompt?: string;
    onSubmit: (prompt: string) => Promise<void>;
    onCancel: () => void;
    className?: string;
    style?: React.CSSProperties;
}

export function UIEditor({
    initialPrompt = "",
    onSubmit,
    onCancel,
    className,
    style,
}: UIEditorProps) {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleSubmit = async () => {
        if (!prompt.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onSubmit(prompt);
            setPrompt("");
        } catch (error) {
            console.error("Failed to update UI:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
        }
        if (e.key === "Escape") {
            onCancel();
        }
    };

    return (
        <div
            className={cn(
                "fixed z-50 flex items-center justify-center animate-in fade-in zoom-in-95 duration-200",
                className
            )}
            style={style}
        >
            <div className="relative flex items-center bg-background/80 backdrop-blur-sm border rounded-full shadow-lg px-4 py-2 w-[300px]">
                <input
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Edit UI..."
                    className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground mr-2"
                />
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSubmit}
                    disabled={!prompt.trim() || isSubmitting}
                    className="h-6 w-6 rounded-full hover:bg-muted"
                >
                    {isSubmitting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <ArrowRight className="h-3 w-3" />
                    )}
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={onCancel}
                    className="h-6 w-6 rounded-full hover:bg-muted ml-1"
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}
