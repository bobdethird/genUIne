/**
 * Validation prompts for continuity/morphing behavior.
 * Run these in sequence to verify smooth transitions and state preservation.
 *
 * Usage: Copy each prompt into the chat and observe:
 * - No full-page flash between turns
 * - Tab selection, form inputs, and sort order preserved when relevant
 * - Console shows [continuity] reconcile match rate (dev only)
 */

export const CONTINUITY_VALIDATION_PROMPTS = [
  "Compare the weather in New York, London, and Tokyo",
  "Add population data to each city card",
  "Sort the cities by temperature",
  "Show me only New York with a chart of the 5-day forecast",
  "Add a summary metric at the top for average humidity across all cities",
] as const;
