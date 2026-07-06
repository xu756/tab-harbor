# Focus Shelf Design

> Date: 2026-07-06
> Product area: `extension/` new tab workspace
> Status: design selected by product owner direction

## Summary

Tab Harbor should add a small **Focus Shelf** to the home page: a restrained strip for 1-3 pinned pieces of context that the user wants to return to today.

The shelf answers two moments:

1. "What was I working on?"
2. "What should I start with today?"

This is not a calendar, project board, habit tracker, daily planner, or productivity scoring system. It is a quiet local-first memory surface for the most important current browser context.

## Product Decision

Recommended first version: **manual focus with gentle suggestions**.

Other approaches considered:

1. **Manual pinning only**
   - Gives users full control and avoids wrong guesses.
   - Empty state can feel inert until the user discovers pinning.

2. **Automatic recommendations**
   - Reduces setup and could surface useful work.
   - Easy to feel presumptuous, noisy, or wrong. Risks turning Tab Harbor into a manager instead of a desk.

3. **Manual focus with gentle suggestions**
   - Best fit for Tab Harbor.
   - The user decides what stays on the desk.
   - The system only offers quiet "Add to focus" suggestions when the shelf is empty or near relevant content.

## Goals

1. Let users pin the few contexts they want to resume today.
2. Support both immediate work recovery and beginning-of-day orientation.
3. Keep focus items local and predictable.
4. Make the feature discoverable without adding a large onboarding surface.
5. Preserve Tab Harbor's calm visual hierarchy.

## Non-Goals

1. No login, cloud sync, collaboration, reminders, due dates, notifications, or recurring focus schedules.
2. No calendar integration or time blocking.
3. No AI-generated prioritization.
4. No productivity scores, streaks, urgency labels, or gamification.
5. No replacement for the existing todo drawer, saved sessions page, or group context notes.
6. No automatic pinning in the first version.

## User Experience

### Focus Shelf Placement

Place the shelf on the home page below the top workspace navigation and above the main open-tab content.

The shelf should be visually quiet:

- One compact horizontal band.
- No hero treatment.
- No nested cards.
- No large empty marketing copy.
- It should not visually outrank open tab groups.

If there are no pinned items and no useful suggestions, the shelf can be a single quiet sentence plus a subtle empty affordance.

### Pinned Item Types

First version supports:

1. **Open group**
   - Identified by stable group key.
   - Click jumps to the group card on the home page.
   - Label uses the same group display label used by the group card.
   - If the group has a context status or note, show the status and a short note snippet.

2. **Saved session**
   - Identified by saved session ID.
   - Click switches to the saved tabs page and highlights or scrolls to the session card.
   - Label uses saved session name.
   - If the session has context status or note, show the status and a short note snippet.

3. **Todo**
   - Identified by todo ID.
   - Click opens the todo drawer and todo detail.
   - Label uses todo title.
   - If the todo has a description, show a short snippet.

Quick links are intentionally excluded from the first version. They already have their own surface and would make Focus Shelf feel like another speed dial.

### Limit

Limit the shelf to **3 pinned focus items**.

Rationale:

- A focus shelf should force a small "today's desk" choice.
- It prevents another unbounded list.
- It preserves page calm and scanability.

When the shelf is full, pin actions should be disabled or show a short toast such as `Focus shelf is full`.

### Pin And Unpin

Add quiet pin/unpin actions near the existing controls for each supported item:

- Open group card header actions.
- Saved session card header actions.
- Todo list row and todo detail actions.

Controls must be visible and keyboard reachable. They cannot rely on hover alone.

Suggested affordance:

- Icon-only pin button with tooltip and `aria-label`.
- Pinned state uses a filled or active pin mark.
- Unpinned state uses an outline pin mark.

Suggested labels:

- `Add to focus`
- `Remove from focus`
- `Focus shelf is full`
- `Pinned to focus`
- `Removed from focus`

### Gentle Suggestions

Suggestions should help discovery without taking control.

When the shelf is empty, show up to 2 suggestions drawn from:

1. Open groups with `Working` status.
2. Open groups with recently updated context notes.
3. Active todos, preserving current todo order.
4. Saved sessions with `Working` or `Reading` status.

Suggestions are not focus items until the user clicks `Add to focus`.

Suggestion copy should be small and direct:

```text
Keep one thing on today's desk.
```

Each suggestion has a quiet `Add` action. Do not automatically pin anything.

### Missing Items

Pinned references can become stale:

- An open group may disappear when its tabs close.
- A saved session may be deleted.
- A todo may be completed, archived, or deleted.

Behavior:

- Stale focus entries are pruned during shelf render/load.
- Completed or archived todos should leave the focus shelf.
- If an open group disappears because it was saved as a session, the first version does not automatically retarget the focus item unless a clear saved session ID is available from the save operation.

### Ordering

Focus items appear in the order the user pinned them.

Future drag reorder is allowed but not part of the first version. First version can support:

- Add at end.
- Remove any item.
- Keep persisted order stable.

## Data Model

Use a new local storage key:

```text
focusShelf
```

Shape:

```json
{
  "items": [
    {
      "type": "open-group",
      "id": "github.com",
      "createdAt": "2026-07-06T00:00:00.000Z"
    },
    {
      "type": "saved-session",
      "id": "tab-session-123",
      "createdAt": "2026-07-06T00:00:00.000Z"
    },
    {
      "type": "todo",
      "id": "todo-123",
      "createdAt": "2026-07-06T00:00:00.000Z"
    }
  ]
}
```

Normalization rules:

- Unknown item types are removed.
- Empty IDs are removed.
- Duplicate item references are collapsed, preserving first occurrence.
- Items beyond the max of 3 are removed.
- Missing or invalid state normalizes to `{ "items": [] }`.

## Architecture

Add one focused module:

```text
extension/focus-shelf.js
```

Responsibilities:

- Normalize shelf state.
- Add/remove/toggle focus items.
- Check whether an item is focused.
- Prune stale items from known active IDs.
- Load/save state from `chrome.storage.local`.
- Expose a single namespace on `globalThis`, for example `TabHarborFocusShelf`.

Rendering integrations:

- `dashboard-runtime.js`
  - Loads and renders the home-page Focus Shelf.
  - Adds open-group pin controls.
  - Handles open-group focus item clicks.
  - Opens todo drawer/detail when a todo focus item is clicked.

- `session-manager.js`
  - Adds saved-session pin controls.
  - Handles saved-session focus item clicks or exposes a helper so dashboard runtime can switch pages and scroll to the session.

- `drawer-manager.js`
  - Adds todo pin controls.
  - Exposes a helper for opening a specific todo detail from outside the drawer, if one does not already exist.

- `i18n.js`
  - Owns all labels, tooltips, empty states, and toasts.

- `style.css`
  - Owns quiet shelf layout, icon states, focus states, and responsive behavior.

- `index.html`
  - Adds a stable mount point such as `focusShelf`.
  - Loads `focus-shelf.js` before modules that consume it.

Keep `extension/app.js` as a thin orchestrator.

## Interaction Details

### Focus Item Clicks

Open group:

1. Scroll to group card.
2. Apply the existing card highlight/jump treatment where available.
3. Keep the user on the home page.

Saved session:

1. Switch to saved tabs page.
2. Scroll to the session card.
3. Apply the existing session highlight/jump treatment where available.

Todo:

1. Open the todo drawer.
2. Open the todo detail view.
3. Move focus into the drawer in the same pattern used by existing drawer opening.

### Keyboard

- Pin buttons are real buttons.
- Focus shelf items are real buttons or links depending on existing patterns.
- Keyboard focus remains visible.
- `Enter`/`Space` activate focus items.
- Removing a focus item returns focus to the next item or shelf container.

### Reduced Motion

Scrolling and highlight treatment should respect reduced motion:

- Smooth scroll is optional.
- Reduced-motion users should get immediate positioning and a non-animated highlight state.

## Visual Design

The shelf should feel like a small row of paper slips on the desk.

Rules:

1. Keep the shelf narrow and content-led.
2. Use restrained borders and theme variables.
3. Use small status marks only when helpful.
4. Do not use bright badges, progress indicators, gradients, or celebratory states.
5. Do not make the shelf a large card containing smaller cards.

Suggested layout:

```text
Focus      [Open group: GitHub | Working] [Todo: Review launch copy] [Saved: Weekend reading]
```

Mobile behavior:

- Horizontal scroll or stacked compact rows are acceptable.
- Text must not overflow controls.
- Pin buttons remain comfortably tappable.

## Error Handling

If focus shelf storage fails:

- Keep the rest of the page usable.
- Show a short toast such as `Could not update focus`.
- Do not lose existing rendered tab/session/todo content.

If a click target cannot be found:

- Prune the stale item.
- Show no alarming error unless the action was user-triggered; then use a short toast such as `That item is no longer available`.

## Testing

Add focused tests for:

1. `focus-shelf.js` normalization, add/remove/toggle, max item limit, and pruning.
2. `index.html` script order and shelf mount point.
3. Open group pin controls and Focus Shelf rendering hooks in `dashboard-runtime.js`.
4. Saved session pin controls in `session-manager.js`.
5. Todo pin controls and external todo-detail opening hooks in `drawer-manager.js`.
6. i18n labels for English and Simplified Chinese.

Run:

```bash
node --test extension/*.test.js
```

For script-loading changes, also verify startup in a browser-capable session when available.

## Rollout

First implementation should ship behind no extra setting. The feature is small enough to appear directly if visual treatment is restrained.

If the shelf causes visual clutter in testing, fallback is:

- Hide the shelf when empty.
- Show pin controls only in item actions.
- Reveal the shelf after the first item is pinned.

## Deferred Scope

The first version should use a max of 3 items and fixed supported types. Drag reorder, quick-link support, and daily reset are intentionally deferred until there is real usage evidence.
