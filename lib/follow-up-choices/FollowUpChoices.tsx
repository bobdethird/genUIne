"use client";

import { useState, useCallback } from "react";
import {
  Check,
  UtensilsCrossed,
  Wine,
  Cake,
  Sparkles,
  Mountain,
  Palmtree,
  Building2,
  Trees,
  Gift,
  Laptop,
  HandMetal,
  Coffee,
  type LucideIcon,
} from "lucide-react";
import { useSendFollowUp } from "./context";
import { cn } from "@/lib/utils";

const ICON_POOL: LucideIcon[] = [
  UtensilsCrossed,
  Wine,
  Cake,
  Sparkles,
  Mountain,
  Palmtree,
  Building2,
  Trees,
  Gift,
  Laptop,
  Coffee,
  HandMetal,
];

/** Map icon keys (from AI) to Lucide icons. Use these exact keys in the spec. */
const ICON_BY_KEY: Record<string, LucideIcon> = {
  utensils: UtensilsCrossed,
  wine: Wine,
  cake: Cake,
  sparkles: Sparkles,
  mountain: Mountain,
  palmtree: Palmtree,
  building2: Building2,
  trees: Trees,
  gift: Gift,
  laptop: Laptop,
  coffee: Coffee,
  handmetal: HandMetal,
};

/** Picks a minimalistic icon for a category: prefers AI-provided icon, else id/label keywords. */
function getCategoryIcon(cat: FollowUpChoiceCategory): LucideIcon {
  const key = (cat.icon || "").trim().toLowerCase();
  if (key && ICON_BY_KEY[key]) return ICON_BY_KEY[key];
  // Fallback: keyword match on id/label
  const id = cat.id.toLowerCase();
  const label = (cat.label || "").toLowerCase();
  const combined = `${id} ${label}`;
  if (combined.includes("dinner") || combined.includes("meal") || combined.includes("food") || combined.includes("eat")) return UtensilsCrossed;
  if (combined.includes("drink") || combined.includes("wine") || combined.includes("bar") || combined.includes("cocktail")) return Wine;
  if (combined.includes("dessert") || combined.includes("sweet") || combined.includes("cake")) return Cake;
  if (combined.includes("coffee") || combined.includes("cafe")) return Coffee;
  if (combined.includes("spa") || combined.includes("wellness") || combined.includes("relaxation") || combined.includes("retreat")) return Sparkles;
  if (combined.includes("adventure") || combined.includes("hike") || combined.includes("outdoor") || combined.includes("exploration") || combined.includes("mountain")) return Mountain;
  if (combined.includes("activity") || combined.includes("experience") || combined.includes("event") || combined.includes("do")) return Sparkles;
  if (combined.includes("beach") || combined.includes("sea") || combined.includes("sun")) return Palmtree;
  if (combined.includes("city") || combined.includes("urban") || combined.includes("town")) return Building2;
  if (combined.includes("country") || combined.includes("nature") || combined.includes("rural")) return Trees;
  if (combined.includes("gift") || combined.includes("present")) return Gift;
  if (combined.includes("tech") || combined.includes("digital") || combined.includes("electronic")) return Laptop;
  if (combined.includes("handmade") || combined.includes("craft") || combined.includes("art")) return HandMetal;
  return Sparkles;
}

/** Assigns each category a different icon from the pool; prefers category-relevant when possible. */
function getDistinctIconsForCategories(cats: FollowUpChoiceCategory[]): LucideIcon[] {
  const result: LucideIcon[] = [];
  const used = new Set<number>();
  for (const cat of cats) {
    const preferred = getCategoryIcon(cat);
    let idx = ICON_POOL.indexOf(preferred);
    if (idx === -1) idx = 0;
    while (used.has(idx)) {
      idx = (idx + 1) % ICON_POOL.length;
    }
    used.add(idx);
    result.push(ICON_POOL[idx]);
  }
  return result;
}

export type FollowUpChoiceCategory = {
  id: string;
  label: string;
  description?: string | null;
  /** Icon key from the AI (e.g. "utensils", "wine") so the card shows a matching symbol. */
  icon?: string | null;
};

export type FollowUpChoicesProps = {
  title?: string | null;
  categories: Array<FollowUpChoiceCategory>;
  multiSelect?: boolean | null;
  confirmLabel?: string | null;
};

const MAX_OPTIONS = 4;

export function FollowUpChoicesComponent({
  props,
}: {
  props: FollowUpChoicesProps;
}) {
  const sendFollowUp = useSendFollowUp();
  const multiSelect = props.multiSelect !== false;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const toggle = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else if (multiSelect) next.add(id);
        else next.clear(), next.add(id);
        return next;
      });
    },
    [multiSelect]
  );

  const handleCheckpoint = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (selected.size === 0 || !sendFollowUp) return;
      const labels = props.categories
        .filter((c) => selected.has(c.id))
        .map((c) => c.label);
      const text =
        labels.length === 0
          ? ""
          : labels.length === 1
            ? `I'm interested in: ${labels[0]}.`
            : `I'm interested in: ${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}.`;
      if (text) {
        sendFollowUp(text);
        setSubmitted(true);
      }
    },
    [selected, props.categories, sendFollowUp]
  );

  const raw = Array.isArray(props.categories) ? props.categories : [];
  const categories = raw.slice(0, MAX_OPTIONS);
  const cardIcons = getDistinctIconsForCategories(categories);
  const canCheckpoint = selected.size > 0 && sendFollowUp != null;

  if (submitted) return null;

  return (
    <div className="flex flex-col gap-10 w-full max-w-6xl mx-auto relative pointer-events-auto z-10">
      {props.title && (
        <p className="text-sm font-medium text-foreground text-center text-balance">
          {props.title}
        </p>
      )}

      <div className="flex flex-col gap-6 items-center">
        {/* 2x2 grid: large tiles, multiselect clickable — only the checkmark below sends */}
        <div className="grid grid-cols-2 gap-8 min-w-0 max-w-5xl">
          {categories.map((cat, i) => {
            const isSelected = selected.has(cat.id);
            const Icon = cardIcons[i];
            return (
              <button
                key={cat.id}
                type="button"
                onClick={(e) => toggle(cat.id, e)}
                title="Select (multiselect). Click the checkmark below to send."
                aria-pressed={isSelected}
                aria-label={isSelected ? `${cat.label} selected. Click to deselect.` : `Select ${cat.label} (multiselect).`}
                tabIndex={0}
                className={cn(
                  "flex flex-col items-stretch rounded-2xl border p-8 min-h-[280px] min-w-[280px] w-full relative text-left",
                  "cursor-pointer select-none touch-manipulation",
                  "transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out",
                  "hover:scale-[1.02] origin-center active:scale-[0.99]",
                  "pointer-events-auto",
                  isSelected
                    ? "border-gray-200 dark:border-white/50 bg-primary/5 ring-2 ring-gray-200 dark:ring-white/20 shadow-sm"
                    : "border-gray-200 dark:border-white/30 bg-card/50 dark:bg-card/40 hover:border-gray-300 dark:hover:border-white/40 hover:bg-muted/15"
                )}
              >
                <div className="flex flex-1 flex-col gap-5 justify-between min-h-0">
                  <span
                    className={cn(
                      "text-xl font-semibold tracking-tight text-balance leading-snug",
                      isSelected ? "text-foreground" : "text-foreground/90"
                    )}
                  >
                    {cat.label}
                  </span>
                  {cat.description && (
                    <p className="text-[15px] text-muted-foreground leading-relaxed text-pretty line-clamp-5 flex-1 min-h-0 overflow-hidden">
                      {cat.description}
                    </p>
                  )}
                </div>
                <span className="absolute bottom-4 right-4 flex items-center justify-center text-muted-foreground/40" aria-hidden>
                  <Icon className="h-7 w-7" strokeWidth={1.5} />
                </span>
              </button>
            );
          })}
        </div>

        {/* Checkmark below grid, aligned with right column */}
        <div className="w-full max-w-5xl grid grid-cols-2 gap-8 min-w-0">
          <div />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCheckpoint}
              disabled={!canCheckpoint}
              title={canCheckpoint ? "Confirm selection and send" : "Select at least one option first"}
              aria-label={canCheckpoint ? "Confirm selection and send" : "Select at least one option to enable"}
              tabIndex={0}
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 cursor-pointer select-none touch-manipulation",
                canCheckpoint
                  ? "border-primary bg-primary text-primary-foreground hover:scale-105 hover:bg-primary/90"
                  : "border-muted-foreground/30 bg-muted/50 text-muted-foreground cursor-not-allowed"
              )}
            >
              <Check className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
