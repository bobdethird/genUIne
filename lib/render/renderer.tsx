"use client";

import { type ReactNode, useMemo } from "react";
import {
  Renderer,
  type ComponentRenderer,
  type Spec,
  StateProvider,
  VisibilityProvider,
  ActionProvider,
} from "@json-render/react";

import { registry, Fallback } from "./registry";

// =============================================================================
// Spec deduplication
// =============================================================================

/**
 * Sanitize a spec so that no children array or repeated state array contains
 * duplicates. The json-render Renderer uses element keys and repeat item keys
 * as React keys, so duplicates trigger React warnings.
 */
function deduplicateSpec(spec: Spec): Spec {
  const elements: Record<string, any> = {};
  let elementsDirty = false;

  for (const [key, element] of Object.entries(spec.elements)) {
    const el = element as any;

    // 1. Deduplicate children arrays (same element key listed twice)
    if (Array.isArray(el.children)) {
      const seen = new Set<string>();
      const unique: string[] = [];
      for (const child of el.children) {
        if (!seen.has(child)) {
          seen.add(child);
          unique.push(child);
        }
      }
      if (unique.length !== el.children.length) {
        elements[key] = { ...el, children: unique };
        elementsDirty = true;
        continue;
      }
    }

    elements[key] = el;
  }

  // 2. Deduplicate state arrays used by repeat elements
  let state = spec.state;
  let stateDirty = false;

  if (state) {
    for (const el of Object.values(elements)) {
      const repeat = (el as any).repeat;
      if (!repeat?.statePath || !repeat?.key) continue;

      const segments = (repeat.statePath as string)
        .split("/")
        .filter(Boolean);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let arr: any = state;
      for (const seg of segments) {
        if (arr && typeof arr === "object") arr = (arr as any)[seg];
        else {
          arr = undefined;
          break;
        }
      }

      if (!Array.isArray(arr)) continue;

      const keyField = repeat.key as string;
      const seen = new Set<string>();
      const unique: unknown[] = [];
      for (const item of arr) {
        if (item && typeof item === "object" && keyField in item) {
          const val = String((item as any)[keyField]);
          if (seen.has(val)) continue;
          seen.add(val);
        }
        unique.push(item);
      }

      if (unique.length !== arr.length) {
        // Deep-clone state once, then set the deduped array
        if (!stateDirty) {
          state = JSON.parse(JSON.stringify(state));
          stateDirty = true;
        }
        let parent: any = state;
        for (let i = 0; i < segments.length - 1; i++) {
          parent = parent[segments[i]];
        }
        parent[segments[segments.length - 1]] = unique;
      }
    }
  }

  // 3. Deduplicate state arrays referenced by data-bearing components (Table,
  //    BarChart, LineChart, PieChart). The LLM sometimes emits both a full
  //    state array AND individual "add" patches for the same items. Because
  //    JSON Patch "add" on arrays uses splice (insert), this creates duplicates.
  if (state) {
    // Collect all $state paths referenced by data-bearing component data props
    const dataStatePaths = new Set<string>();
    for (const el of Object.values(elements)) {
      const elAny = el as any;
      if (
        elAny.type === "Table" ||
        elAny.type === "BarChart" ||
        elAny.type === "LineChart" ||
        elAny.type === "PieChart"
      ) {
        const dataProp = elAny.props?.data;
        if (dataProp && typeof dataProp === "object" && "$state" in dataProp) {
          dataStatePaths.add(dataProp.$state as string);
        }
      }
    }

    for (const statePath of dataStatePaths) {
      const segments = statePath.split("/").filter(Boolean);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let arr: any = state;
      for (const seg of segments) {
        if (arr && typeof arr === "object") arr = (arr as any)[seg];
        else {
          arr = undefined;
          break;
        }
      }

      if (!Array.isArray(arr) || arr.length === 0) continue;

      // Deduplicate by JSON-stringified content
      const seen = new Set<string>();
      const unique: unknown[] = [];
      for (const item of arr) {
        const key =
          item && typeof item === "object"
            ? JSON.stringify(item)
            : String(item);
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
      }

      if (unique.length !== arr.length) {
        if (!stateDirty) {
          state = JSON.parse(JSON.stringify(state));
          stateDirty = true;
        }
        // Re-traverse in the (possibly cloned) state
        let parent: any = state;
        for (let i = 0; i < segments.length - 1; i++) {
          parent = parent[segments[i]];
        }
        parent[segments[segments.length - 1]] = unique;
      }
    }
  }

  if (!elementsDirty && !stateDirty) return spec;

  return {
    ...spec,
    elements: elementsDirty ? elements : spec.elements,
    ...(stateDirty ? { state } : {}),
  };
}

// =============================================================================
// Spec Repair — fix common LLM generation issues
// =============================================================================

type SpecElement = {
  type: string;
  props: Record<string, unknown>;
  children?: string[];
  [key: string]: unknown;
};

/**
 * Repairs a spec by fixing two systematic LLM generation issues:
 *
 * 1. **Naming mismatches**: A parent references "forecast-tabs" but the actual
 *    element is "forecast-tabs-container". We detect orphaned elements whose key
 *    starts with the missing key and swap the reference.
 *
 * 2. **Missing Card wrappers**: A Grid references "ny-card" which doesn't exist,
 *    but "ny-header", "ny-metrics", "ny-details" are orphaned. We auto-create a
 *    Card element with those top-level orphans as children.
 */
function repairSpec(spec: Spec): Spec {
  if (!spec?.root || !spec.elements) return spec;

  const elements: Record<string, SpecElement> = {};
  for (const [k, v] of Object.entries(spec.elements)) {
    elements[k] = v as SpecElement;
  }

  let changed = false;

  // ----- Table column normalization -----
  // LLMs sometimes emit TanStack-style columns (accessorKey, header); normalize to key, label
  for (const el of Object.values(elements)) {
    if (el.type !== "Table" || !Array.isArray(el.props?.columns)) continue;
    const columns = el.props.columns as Array<Record<string, unknown>>;
    const normalized = columns.map((col, i) => {
      const key =
        (col.key as string) ??
        (col.accessorKey as string) ??
        `col-${i}`;
      const label =
        (col.label as string) ??
        (col.header as string) ??
        (col.key as string) ??
        (col.accessorKey as string) ??
        "";
      return { key, label };
    });
    el.props = { ...el.props, columns: normalized };
    changed = true;
  }

  // ----- Tabs: normalize tab items to { value, label } -----
  for (const el of Object.values(elements)) {
    if (el.type !== "Tabs" || !Array.isArray(el.props?.tabs)) continue;
    const tabs = el.props.tabs as Array<Record<string, unknown>>;
    const normalized = tabs.map((tab, i) => ({
      value:
        (tab.value as string) ??
        (tab.id as string) ??
        (tab.key as string) ??
        `tab-${i}`,
      label:
        (tab.label as string) ??
        (tab.name as string) ??
        (tab.title as string) ??
        (tab.value as string) ??
        (tab.id as string) ??
        "",
    }));
    el.props = { ...el.props, tabs: normalized };
    changed = true;
  }

  // ----- Accordion: normalize items to { title, content } -----
  for (const el of Object.values(elements)) {
    if (el.type !== "Accordion" || !Array.isArray(el.props?.items)) continue;
    const items = el.props.items as Array<Record<string, unknown>>;
    const normalized = items.map((item) => ({
      title:
        (item.title as string) ??
        (item.heading as string) ??
        (item.label as string) ??
        "",
      content:
        (item.content as string) ??
        (item.body as string) ??
        (item.description as string) ??
        "",
    }));
    el.props = { ...el.props, items: normalized };
    changed = true;
  }

  // ----- Timeline: normalize items to { title, description?, date?, status? } -----
  for (const el of Object.values(elements)) {
    if (el.type !== "Timeline" || !Array.isArray(el.props?.items)) continue;
    const items = el.props.items as Array<Record<string, unknown>>;
    const normalized = items.map((item) => ({
      title:
        (item.title as string) ??
        (item.heading as string) ??
        (item.label as string) ??
        "",
      description:
        (item.description as string) ??
        (item.body as string) ??
        (item.detail as string) ??
        null,
      date:
        (item.date as string) ?? (item.dateLabel as string) ?? null,
      status: (item.status as string) ?? null,
    }));
    el.props = { ...el.props, items: normalized };
    changed = true;
  }

  // ----- RadioGroup / SelectInput: normalize options to { value, label } -----
  for (const el of Object.values(elements)) {
    if (
      (el.type !== "RadioGroup" && el.type !== "SelectInput") ||
      !Array.isArray(el.props?.options)
    )
      continue;
    const options = el.props.options as Array<Record<string, unknown>>;
    const normalized = options.map((opt, i) => ({
      value:
        (opt.value as string) ??
        (opt.id as string) ??
        (opt.key as string) ??
        `opt-${i}`,
      label:
        (opt.label as string) ??
        (opt.text as string) ??
        (opt.name as string) ??
        (opt.value as string) ??
        (opt.id as string) ??
        "",
    }));
    el.props = { ...el.props, options: normalized };
    changed = true;
  }

  // ----- Map: normalize lat/lng/style and marker prop variations -----
  for (const el of Object.values(elements)) {
    if (el.type !== "Map") continue;
    const p = el.props as Record<string, unknown>;

    // Normalize lat/lng → latitude/longitude
    if (p.lat != null && p.latitude == null) {
      p.latitude = p.lat;
      delete p.lat;
      changed = true;
    }
    if ((p.lng ?? p.lon) != null && p.longitude == null) {
      p.longitude = p.lng ?? p.lon;
      delete p.lng;
      delete p.lon;
      changed = true;
    }

    // Normalize "style" → "mapStyle" (avoid collision with CSS style)
    if (p.style != null && typeof p.style === "string" && p.mapStyle == null) {
      p.mapStyle = p.style;
      delete p.style;
      changed = true;
    }

    // Normalize markers: ensure each marker uses latitude/longitude and label
    if (Array.isArray(p.markers)) {
      const markers = p.markers as Array<Record<string, unknown>>;
      for (const m of markers) {
        if (m.lat != null && m.latitude == null) {
          m.latitude = m.lat;
          delete m.lat;
        }
        if ((m.lng ?? m.lon) != null && m.longitude == null) {
          m.longitude = m.lng ?? m.lon;
          delete m.lng;
          delete m.lon;
        }
        if (m.name != null && m.label == null) {
          m.label = m.name;
          delete m.name;
        }
        if (m.title != null && m.label == null) {
          m.label = m.title;
          delete m.title;
        }
        // Normalize description aliases
        if (m.desc != null && m.description == null) {
          m.description = m.desc;
          delete m.desc;
        }
        if (m.detail != null && m.description == null) {
          m.description = m.detail;
          delete m.detail;
        }
        // Normalize address aliases
        if (m.location != null && m.address == null) {
          m.address = m.location;
          delete m.location;
        }
        // Normalize category aliases
        if (m.type != null && m.category == null) {
          m.category = m.type;
          delete m.type;
        }
      }
      changed = true;
    }

    el.props = p;
  }

  // ----- LineChart: normalize yKeys to { key, label?, color? } -----
  for (const el of Object.values(elements)) {
    if (el.type !== "LineChart" || !Array.isArray(el.props?.yKeys)) continue;
    const yKeys = el.props.yKeys as Array<Record<string, unknown>>;
    const normalized = yKeys.map((lk, i) => ({
      key:
        (lk.key as string) ??
        (lk.dataKey as string) ??
        (lk.id as string) ??
        `line-${i}`,
      label:
        (lk.label as string) ??
        (lk.name as string) ??
        (lk.key as string) ??
        (lk.dataKey as string) ??
        "",
      color: (lk.color as string) ?? null,
    }));
    el.props = { ...el.props, yKeys: normalized };
    changed = true;
  }

  // Collect all child references and build parent→child map
  const allChildRefs = new Set<string>();
  for (const el of Object.values(elements)) {
    for (const c of el.children ?? []) allChildRefs.add(c);
  }

  // Find missing refs (referenced as child but not in elements)
  const missingRefs = [...allChildRefs].filter((ref) => !elements[ref]);
  if (missingRefs.length === 0) return spec;

  // Sort so more specific patterns (-tabs suffix) are processed first,
  // claiming their matching orphans before generic container strategies run.
  missingRefs.sort((a, b) => {
    const aScore = a.endsWith("-tabs") ? 0 : 1;
    const bScore = b.endsWith("-tabs") ? 0 : 1;
    return aScore - bScore;
  });

  // Find orphaned elements (defined but not referenced and not root)
  const referencedKeys = new Set<string>([spec.root, ...allChildRefs]);
  const orphanedKeys = new Set(
    Object.keys(elements).filter((k) => !referencedKeys.has(k)),
  );

  for (const missing of missingRefs) {
    // ----- Strategy 1: Naming mismatch -----
    // Look for an orphaned element whose key starts with the missing key
    // e.g. "forecast-tabs" → "forecast-tabs-container"
    const SUFFIXES = ["-container", "-inner", "-wrapper", "-content", "-section"];
    let matched = false;

    for (const suffix of SUFFIXES) {
      const candidate = missing + suffix;
      if (orphanedKeys.has(candidate) && elements[candidate]) {
        // Swap the reference in all parents
        for (const [key, el] of Object.entries(elements)) {
          if (el.children?.includes(missing)) {
            elements[key] = {
              ...el,
              children: el.children.map((c) => (c === missing ? candidate : c)),
            };
          }
        }
        orphanedKeys.delete(candidate);
        changed = true;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // ----- Strategy 3: Auto-create missing Tabs wrapper (prefix match) -----
    // Common LLM pattern: references "foo-tabs" but doesn't define it, while
    // orphaned "foo-tab-*" TabContent elements exist. Auto-create a Tabs
    // element that wraps those TabContents.
    if (missing.endsWith("-tabs")) {
      const tabPrefix = missing.slice(0, -5); // strip "-tabs"
      const tabContentOrphans = [...orphanedKeys]
        .filter(
          (k) =>
            k.startsWith(tabPrefix + "-tab-") &&
            elements[k]?.type === "TabContent",
        )
        .sort();

      if (tabContentOrphans.length > 0) {
        const tabs = tabContentOrphans.map((k) => {
          const value = (elements[k]?.props?.value as string) ?? k;
          return { value, label: value.toUpperCase() };
        });

        elements[missing] = {
          type: "Tabs",
          props: {
            defaultValue: tabs[0]?.value ?? null,
            value: null,
            tabs,
          },
          children: tabContentOrphans,
        };

        for (const k of tabContentOrphans) orphanedKeys.delete(k);
        changed = true;
        continue;
      }
    }

    // ----- Strategy 4: Generic tab container with orphaned TabContent -----
    // Missing key contains "tabs" (e.g. "tabs-container") or starts with
    // "tab-", and orphaned TabContent elements exist → create a Tabs wrapper.
    if (missing.includes("tabs") || missing.startsWith("tab-")) {
      const tabContentOrphans = [...orphanedKeys]
        .filter((k) => elements[k]?.type === "TabContent")
        .sort();

      if (tabContentOrphans.length > 0) {
        const tabs = tabContentOrphans.map((k) => {
          const value = (elements[k]?.props?.value as string) ?? k;
          return { value, label: value.toUpperCase() };
        });

        elements[missing] = {
          type: "Tabs",
          props: {
            defaultValue: tabs[0]?.value ?? null,
            value: null,
            tabs,
          },
          children: tabContentOrphans,
        };

        for (const k of tabContentOrphans) orphanedKeys.delete(k);
        changed = true;
        continue;
      }
    }

    // ----- Strategy 2: Auto-create missing Card wrapper -----
    // "ny-card" → prefix "ny-" → find orphaned ny-* elements → wrap in Card
    const prefixMatch = missing.match(/^(.+)-card$/);
    if (!prefixMatch) continue;

    const prefix = prefixMatch[1] + "-";

    // Find orphaned elements that share this prefix
    const prefixedOrphans = [...orphanedKeys].filter(
      (k) => k.startsWith(prefix) && elements[k],
    );
    if (prefixedOrphans.length === 0) continue;

    // Among those, find the "top-level" ones — NOT a child of another prefixed orphan
    const childrenOfPrefixed = new Set<string>();
    for (const k of prefixedOrphans) {
      for (const c of elements[k]?.children ?? []) {
        childrenOfPrefixed.add(c);
      }
    }
    const topLevelOrphans = prefixedOrphans.filter(
      (k) => !childrenOfPrefixed.has(k),
    );

    if (topLevelOrphans.length > 0) {
      // Try to extract a meaningful title from a Heading child element
      let title: string | null = null;
      for (const orphanKey of prefixedOrphans) {
        const el = elements[orphanKey];
        if (el?.type === "Heading" && typeof el.props?.text === "string") {
          title = el.props.text as string;
          break;
        }
      }

      elements[missing] = {
        type: "Card",
        props: title ? { title } : {},
        children: topLevelOrphans,
      };

      // Remove these from orphans set
      for (const k of prefixedOrphans) orphanedKeys.delete(k);
      changed = true;
    }
  }

  if (!changed) return spec;
  return { ...spec, elements } as Spec;
}

// =============================================================================
// ExplorerRenderer
// =============================================================================

interface ExplorerRendererProps {
  spec: Spec | null;
  loading?: boolean;
}

const fallback: ComponentRenderer = ({ element }) => (
  <Fallback type={element.type} />
);

export function ExplorerRenderer({
  spec,
  loading,
}: ExplorerRendererProps): ReactNode {
  // Repair then deduplicate spec (memoized by spec reference)
  const safeSpec = useMemo(
    () => (spec ? deduplicateSpec(repairSpec(spec)) : null),
    [spec],
  );

  if (!safeSpec) return null;

  return (
    <StateProvider initialState={safeSpec.state ?? {}}>
      <VisibilityProvider>
        <ActionProvider>
          <Renderer
            spec={safeSpec}
            registry={registry}
            fallback={fallback}
            loading={loading}
          />
        </ActionProvider>
      </VisibilityProvider>
    </StateProvider>
  );
}
