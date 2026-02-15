/**
 * Continuity payload: compact summary of the current UI spec for cross-turn
 * context. Sent to the model so it can reuse IDs and mutate existing structure
 * instead of rebuilding from scratch.
 */

import {
  SPEC_DATA_PART_TYPE,
  parseSpecStreamLine,
  applySpecPatch,
} from "@json-render/core";

export type ContinuityPayload = {
  root: string;
  rootType: string;
  elementIds: string[];
  structure: Record<string, string[]>;
  statePaths: string[];
};

/**
 * Extract $state and $bindState paths from a value (recursively).
 */
function collectStatePaths(value: unknown, paths: Set<string>): void {
  if (value == null || typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  if (obj.$state && typeof obj.$state === "string") {
    paths.add(obj.$state);
  }
  if (obj.$bindState && typeof obj.$bindState === "string") {
    paths.add(obj.$bindState);
  }
  for (const v of Object.values(obj)) {
    collectStatePaths(v, paths);
  }
}

/**
 * Build a compact continuity payload from a spec for cross-turn context.
 * Used to tell the model which element IDs and structure exist so it can
 * reuse them instead of regenerating.
 */
type SpecLike = {
  root?: string;
  elements?: Record<string, { type?: string; props?: Record<string, unknown>; children?: string[] } | unknown>;
  state?: Record<string, unknown>;
};

export function buildContinuityPayload(spec: SpecLike): ContinuityPayload | null {
  if (!spec?.root || !spec.elements) return null;
  const rootEl = spec.elements[spec.root] as { type?: string } | undefined;
  if (!rootEl) return null;

  const elementIds = Object.keys(spec.elements);
  const structure: Record<string, string[]> = {};
  const statePaths = new Set<string>();

  for (const [id, el] of Object.entries(spec.elements)) {
    const elTyped = el as { children?: unknown; props?: Record<string, unknown> };
    const children = Array.isArray(elTyped?.children) ? (elTyped.children as string[]) : [];
    structure[id] = children;
    const props = elTyped?.props;
    if (props) collectStatePaths(props, statePaths);
  }

  return {
    root: spec.root,
    rootType: rootEl.type ?? "unknown",
    elementIds,
    structure,
    statePaths: Array.from(statePaths),
  };
}

type MessagePart = { type?: string; [key: string]: unknown };

/**
 * Extract merged spec from assistant message parts (spec data parts).
 * Handles both full-spec and JSONL patch formats.
 */
function extractSpecFromParts(parts: MessagePart[]): {
  root?: string;
  elements?: Record<string, unknown>;
  state?: Record<string, unknown>;
} | null {
  if (!Array.isArray(parts)) return null;
  let spec: { root?: string; elements?: Record<string, unknown>; state?: Record<string, unknown> } | null = null;

  for (const p of parts) {
    if (p?.type !== SPEC_DATA_PART_TYPE) continue;

    // Part may have a pre-merged spec (from useJsonRenderMessage)
    const partSpec = p.spec as { root?: string; elements?: Record<string, unknown>; state?: Record<string, unknown> } | undefined;
    if (partSpec?.root && partSpec?.elements) {
      spec = partSpec;
      continue;
    }

    // Part may have chunks (JSONL lines) or a single line to apply as patches
    const raw = (p.spec ?? p.chunks ?? p.data ?? p.text) as string[] | string | undefined;
    const lines = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
        ? raw.split("\n").filter(Boolean)
        : [];
    for (const line of lines) {
      try {
        const patch = parseSpecStreamLine(line);
        if (patch) {
          const base = spec ?? ({ root: "", elements: {}, state: {} } as SpecLike);
          spec = applySpecPatch(base as never, patch) as typeof spec;
        }
      } catch {
        // Skip invalid lines
      }
    }
  }
  return spec;
}

/**
 * Build continuity payload from the last assistant message that has spec data.
 * Returns null if no such message exists.
 */
export function buildContinuityFromMessages(
  messages: Array<{ role?: string; parts?: MessagePart[] }>
): ContinuityPayload | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "assistant" || !Array.isArray(m.parts)) continue;
    const spec = extractSpecFromParts(m.parts);
    if (spec && spec.root && spec.elements) return buildContinuityPayload(spec);
  }
  return null;
}
