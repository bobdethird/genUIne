# Plan: Interactive Follow-Up Choices Flow (e.g. Valentine’s Dinner)

## Goal

When the user asks for suggestions (e.g. “I’m planning to go somewhere with my partner for Valentine’s day dinner, can you help suggest?”):

1. **AI** determines relevant **categories** of follow-up (e.g. Dinner, Activity, Drinks).
2. **UI** shows these as **multi-select buttons** the user can tap.
3. The user’s **selections become the next prompt** (shortcut): e.g. “I’d like: dinner and drinks” is sent automatically as the next user message so the chatbot continues with that context.

---

## Current Behavior (for context)

- **Chat**: `app/page.tsx` uses `useChat`; `handleSubmit(text?)` sends a message (optionally with a string, e.g. from suggestion pills).
- **Rendering**: Assistant content is rendered via `ExplorerRenderer` (spec-driven UI from `lib/render/`). The renderer has no callback to the page today.
- **Suggestions**: Empty state has `SUGGESTIONS` pills that call `handleSubmit(s.prompt)` on click.

---

## Proposed Flow (end-to-end)

1. User sends: *“I’m planning to go somewhere with my partner for Valentine’s day dinner, can you help suggest?”*
2. **Backend (agent)** responds with a **spec** that includes:
   - A short intro (e.g. Card + Text).
   - A **FollowUpChoices** component with categories like: `Dinner`, `Activity`, `Drinks`, and optionally `Other`.
3. **Frontend** renders the spec; **FollowUpChoices** shows:
   - One button per category (multi-select toggles).
   - A **“Continue”** (or “Send”) button.
4. User selects e.g. **Dinner** and **Drinks**, then clicks **Continue**.
5. Frontend **builds a shortcut message** from the selected labels (e.g. “I’m interested in: dinner and drinks”) and calls the same **send** path as the normal input (e.g. `handleSubmit(shortcut)`).
6. That message is appended as the **next user message** and the AI continues with that context (no extra click or typing).

---

## Implementation Outline

### 1. New component: `FollowUpChoices`

- **Catalog** (`lib/render/catalog.ts`): Define a component with props, e.g.:
  - `categories`: array of `{ id: string, label: string }` (e.g. `[{ id: "dinner", label: "Dinner" }, ...]`).
  - `multiSelect`: boolean (default true).
  - `confirmLabel`: string (e.g. `"Continue"`).
  - Optional: `intro` or `title` for a short line above the buttons.
- **Registry** (`lib/render/registry.tsx`): Implement the component:
  - Render a row of toggle buttons (or pill-style toggles) per category.
  - “Continue” button that:
    - Builds a single string from the selected labels (e.g. “I’m interested in: dinner and drinks”).
    - Calls an **app-level callback** to send that string as the next user message (see below).
- **Callback from renderer to page**: The component must be able to call something like `sendFollowUp(text)`. Options:
  - **Recommended**: Pass an optional callback from the page into the renderer (e.g. `onSendFollowUp`) and provide it to the component via **React context** inside the render tree. The registry component then uses `useContext(FollowUpContext)` and calls `sendFollowUp(composedText)` when Continue is clicked.
  - Alternatively, a custom event or a ref-based imperative handle (more brittle).

### 2. Wiring the callback from page to renderer

- **Isolated context** (`lib/follow-up-choices/context.tsx`): `FollowUpProvider` and `useSendFollowUp()` so the FollowUpChoices component can call the send function without the renderer knowing about it.
- **Page** (`app/page.tsx`): Wrap the chat area (e.g. the main content inside `SidebarInset`) in `<FollowUpProvider sendFollowUp={handleSubmit}>`. Every `ExplorerRenderer` rendered inside (in message bubbles) then has access to the context, and FollowUpChoices will send the composed text as the next user message via `handleSubmit(text)`.

### 3. Agent instructions

- In **`lib/agent.ts`** (system prompt / instructions), add guidance such as:
  - When the user is asking for **suggestions, planning, or open-ended help** (e.g. date ideas, Valentine’s dinner, “where should I go?”), the response **must** include a **FollowUpChoices** component.
  - The AI should **infer categories** from the query (e.g. Dinner, Activity, Drinks, Dessert, Other).
  - Emit a spec that includes:
    - A brief intro (Card/Text) and
    - A **FollowUpChoices** with `categories` and `multiSelect: true`, and a clear `confirmLabel`.
  - Do **not** output only plain text for such queries; always include the interactive choices in the spec.

### 4. Optional: Intent shortcut in API (like solar system)

- If you want **instant** follow-up choices without waiting for the full agent (e.g. for a few fixed prompts), you can add a small **intent check** in `app/api/chat/route.ts` (similar to `SOLAR_SYSTEM_INTENT`):
  - e.g. match “valentine”, “date night”, “dinner with partner”, “suggest somewhere”, etc.
  - Return a **predefined spec** that includes FollowUpChoices with fixed categories (Dinner, Activity, Drinks) and an intro card.
- This is **optional**; the main flow can be fully AI-driven (agent always outputs the spec with FollowUpChoices for suggestion-style queries).

### 5. UX details

- **Multi-select**: Use toggle/pill styling so selected state is clear; allow zero or more selections.
- **Continue**: Disabled until at least one option is selected (or allow “Continue anyway” with empty selection and send “I’m open to any of these” — product choice).
- **Shortcut text**: Use a consistent phrase so the model gets a clear signal, e.g. “I’m interested in: &lt;label1&gt;, &lt;label2&gt;” or “Focus on: &lt;label1&gt; and &lt;label2&gt;”. Document this in the agent instructions so the next turn stays on topic.

---

## Files to touch (summary)

Follow-up choices are **isolated in `lib/follow-up-choices/`**. Main files only import and wire.

| Area | File | Changes |
|------|------|--------|
| **Isolated module** | `lib/follow-up-choices/catalog.ts` | Catalog entry for FollowUpChoices (schema, description, example). |
| **Isolated module** | `lib/follow-up-choices/context.tsx` | React context for `sendFollowUp` and `FollowUpProvider`. |
| **Isolated module** | `lib/follow-up-choices/FollowUpChoices.tsx` | UI: category toggles + Continue button; uses context to send. |
| **Isolated module** | `lib/follow-up-choices/index.ts` | Re-exports for the module. |
| Catalog | `lib/render/catalog.ts` | Import and spread `...followUpChoicesCatalogEntry` into components. |
| Registry | `lib/render/registry.tsx` | Import `FollowUpChoicesComponent` and register as `FollowUpChoices`. |
| Page | `app/page.tsx` | Wrap chat area in `FollowUpProvider sendFollowUp={handleSubmit}`. |
| Agent | `lib/agent.ts` | Add FOLLOW-UP CHOICES instructions (suggestion/planning → use FollowUpChoices). |
| API (optional) | `app/api/chat/route.ts` | Optional intent shortcut that returns a fixed FollowUpChoices spec for date-night-style prompts. |

---

## Data flow (shortcut as next prompt)

- User selects **Dinner** and **Drinks** and clicks **Continue**.
- Frontend builds: `text = "I'm interested in: Dinner and Drinks"` (or similar).
- Frontend calls `handleSubmit(text)` (or whatever is passed as `onSendFollowUp`).
- Existing logic: `sendMessage({ text })` runs; the message is appended as user and the next assistant reply is streamed. No new API contract; the “shortcut” is just the next user message.

---

## Testing / validation

1. Send: “I’m planning Valentine’s dinner with my partner, can you suggest?”
2. Confirm the reply includes clickable category buttons (Dinner, Activity, Drinks, etc.) and a Continue button.
3. Multi-select two options, click Continue; confirm one new user message appears with the composed text and the AI continues with that context (e.g. suggests dinner + drink spots).

This keeps the flow interactive, keeps the “shortcut” as a normal user message, and reuses the existing chat transport and history.
