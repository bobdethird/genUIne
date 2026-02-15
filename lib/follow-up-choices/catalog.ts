import { z } from "zod-v4";

/**
 * Catalog entry for FollowUpChoices only.
 * Merge this into the main explorer catalog so the AI can output this component.
 */
const categorySchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  /** Icon key so the card shows a matching symbol. One of: utensils, wine, cake, sparkles, mountain, palmtree, building2, trees, gift, laptop, coffee, handmetal */
  icon: z.string().nullable(),
});

export const followUpChoicesCatalogEntry = {
  FollowUpChoices: {
    props: z.object({
      title: z.string().nullable(),
      categories: z.array(categorySchema),
      multiSelect: z.boolean().nullable(),
      confirmLabel: z.string().nullable(),
    }),
    slots: [] as string[],
    description:
      "Interactive multi-select choices to gather user preferences. Use when you need personal input. Exactly 4 categories. Each category: id (lowercase), label, description (1–2 sentences), and icon (one of: utensils, wine, cake, sparkles, mountain, palmtree, building2, trees, gift, laptop, coffee, handmetal — e.g. mountain for adventure/outdoor, sparkles for spa/wellness, so the card shows the right symbol). multiSelect: true.",
    example: {
      title: "What are you interested in?",
      categories: [
        { id: "dinner", label: "Dinner", description: "A full sit-down meal — great for conversation and a relaxed pace. Think cozy bistros or a special tasting menu.", icon: "utensils" },
        { id: "activity", label: "Activity", description: "Something to do before or after: a walk, a show, or an experience. Adds variety and makes it feel like an event.", icon: "sparkles" },
        { id: "drinks", label: "Drinks", description: "A bar, wine bar, or cocktail spot. Lower commitment; ideal for a first stop or a nightcap.", icon: "wine" },
        { id: "dessert", label: "Dessert", description: "Something sweet to end the night — dessert bar, gelato, or a place known for pastries. Keeps the vibe light.", icon: "cake" },
      ],
      multiSelect: true,
      confirmLabel: "Continue",
    },
  },
};
