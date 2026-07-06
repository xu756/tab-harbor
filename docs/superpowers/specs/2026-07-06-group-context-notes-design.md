# Group Context Notes Design

> Date: 2026-07-06
> Product area: `extension/` new tab workspace
> Status: design selected by product owner direction

## Summary

Tab Harbor should add a lightweight context layer to open tab groups and saved sessions: each group can carry a quiet status and one short desk note. The feature helps users remember why a cluster of tabs exists, what state it is in, and what to do when they return.

This is not a standalone notes app, project planner, or sync system. It is a small memory surface attached to the browser workspace.

## Product Decision

Recommended first version: **bound group context**.

Other approaches considered:

1. **Global desk notes only**
   - Easier to build, but too detached from the tab groups that create the user problem.
   - Risks becoming a generic sticky-note widget.

2. **Fully custom status and note system**
   - Powerful, but too much setup for a calm new tab page.
   - Risks visual clutter, inconsistent labels, and product-management bloat.

3. **Bound group context with fixed states**
   - Best fit for Tab Harbor.
   - Keeps the page scannable while making each group more understandable.
   - Works for both open tabs and saved sessions without requiring accounts or sync.

## Goals

1. Help users understand the purpose of a tab group at a glance.
2. Let users capture the next thought or reason for a group without leaving the new tab page.
3. Preserve context when an open group becomes a saved session.
4. Keep the main tab content visually dominant.
5. Stay fully local using `chrome.storage.local`.

## Non-Goals

1. No user login, cloud sync, collaboration, or cross-device behavior.
2. No markdown editor, long-form notes, rich text, tags, reminders, due dates, or notification system.
3. No AI summarization in this version.
4. No large dashboard metrics or productivity scoring.
5. No custom status creation in the first version.

## User Experience

### Statuses

Use four fixed statuses:

- `Working`: active work or reference material currently in use.
- `Reading`: articles, docs, papers, or content being read through.
- `Later`: useful context that should be kept but does not need attention now.
- `Done`: context that can probably be closed, archived, or left quiet.

There is also an implicit empty state: no status selected.

The labels should be localized through `i18n.js`. Visual treatment must be restrained: small text or a subtle pill, not bright badges.

### Open Tab Groups

Each open tab group card gets a small context row near the group title area:

- If no status or note exists, show a quiet `Add note` affordance.
- If a status exists, show the status near the title.
- If a note exists, show one short line below the title or summary.
- Editing opens a small anchored popover near the triggering control.

The popover contains:

- Status segmented control: None, Working, Reading, Later, Done.
- Short note textarea.
- Save and Cancel actions.
- Clear note/status action when context exists.

The note should be optimized for 1-2 sentences. The first version should cap stored note text to a reasonable length, such as 280 characters, to protect layout and intent.

### Saved Sessions

Saved session cards use the same context model:

- Status appears in the session header.
- Note appears as a single quiet line when present.
- The same edit popover pattern applies.

When saving an open tab group or selected tabs as a saved session, context should transfer when there is a clear source group:

- Saving one group carries that group's status and note to the saved session.
- Saving the whole current window does not merge multiple group notes into one note.
- Adding tabs to an existing saved session keeps the existing saved session context unchanged.

### Top Navigation

Top navigation should remain focused on movement, not content editing.

- Open group nav buttons may show a very subtle status dot or underline only when a status exists.
- Saved session nav buttons should not become visually heavier than current group icons or names.
- Notes do not appear in top nav.

### Empty And Error States

If storage read/write fails, the interface should keep the current group usable and show a short toast such as `Could not save note`.

If a group disappears because all tabs close, its open-group context can remain stored briefly but should be pruned when it no longer maps to any active group and has not been transferred to a saved session.

## Data Model

Use a new local storage key:

```text
groupContextNotes
```

Shape:

```json
{
  "openGroups": {
    "github.com": {
      "status": "working",
      "note": "Review issue thread before closing these.",
      "updatedAt": "2026-07-06T00:00:00.000Z"
    }
  },
  "savedSessions": {
    "tab-session-123": {
      "status": "later",
      "note": "Restore for weekend reading.",
      "updatedAt": "2026-07-06T00:00:00.000Z"
    }
  }
}
```

Open group keys should use the same stable group identifiers already used by group rendering:

- Domain keys such as `github.com`.
- Manual group keys such as `__session_group__:abc`.
- Special keys such as `__landing-pages__`.

Saved session keys should use saved session IDs.

Normalization rules:

- Unknown statuses become empty.
- Notes are trimmed.
- Notes longer than the limit are truncated.
- Empty status and empty note remove that context entry.
- Missing buckets normalize to empty objects.

## Architecture

Add one focused module:

```text
extension/group-context.js
```

Responsibilities:

- Normalize context state.
- Load and save context state from `chrome.storage.local`.
- Read, update, clear, transfer, and prune group/session context.
- Expose a single namespace on `globalThis`, for example `TabHarborGroupContext`.

Keep rendering integration close to current owners:

- `dashboard-runtime.js` renders open group status/note and handles open-group edit actions.
- `session-manager.js` renders saved session status/note and handles saved-session edit actions.
- `i18n.js` owns labels and toasts.
- `style.css` owns quiet visual treatment.
- `index.html` script order loads `group-context.js` after `tab-sessions.js` and before `session-manager.js`, `theme-controls.js`, `drawer-manager.js`, and `dashboard-runtime.js`. This lets saved-session and open-group renderers consume the same context API without changing `app.js`.

Do not put this logic in `app.js`.

## Interaction Details

### Edit Trigger

Use a small icon or quiet text action near the group title. It must be keyboard focusable and visible without hover when context is absent or present.

Suggested labels:

- Empty: `Add note`
- Existing: `Edit note`

### Popover Placement

The editor should anchor near the triggering element when practical, matching the existing shortcut editor lesson. Corner placement is only a fallback.

### Keyboard

- `Escape` closes the editor without saving.
- `Tab` stays inside the editor while it is open because the editor behaves as a small dialog.
- Focus returns to the trigger after close.
- Save button is reachable and does not depend on mouse hover.

### Reduced Motion

Opening and closing may use a short fade/translate transition, but reduced-motion users must still get an immediate state change.

## Visual Design

The feature should feel like a pencil note on a reading desk.

Rules:

1. Status marks are secondary to tab titles.
2. Note text is one quiet line in the group card, not a new card inside the card.
3. Use theme variables for borders, text, hover states, and status color accents.
4. Avoid saturated badges, large colored fills, and dashboard-like labels.
5. Do not place UI cards inside other cards.

Status tone:

- `Working`: reuse active/sage family.
- `Reading`: use slate/mist family.
- `Later`: use amber/warm family.
- `Done`: use muted neutral family.

## Testing

Add focused unit tests for `group-context.js`:

- Normalizes invalid input.
- Drops empty entries.
- Truncates long notes.
- Updates open group context.
- Updates saved session context.
- Transfers context from open group to saved session.
- Prunes stale open-group context.

Update static UI regression tests:

- `index.html` includes `group-context.js` in the correct script order.
- Open group cards render context hooks.
- Saved session cards render context hooks.
- The editor uses explicit `data-action` handlers.
- `app.js` remains a thin orchestrator.

Run:

```bash
node --test extension/*.test.js
```

Because this touches script loading and runtime UI, also verify the extension in a real browser session and inspect startup console errors.

## Rollout Plan

1. Build and test the data module first.
2. Add open group rendering and editing.
3. Add saved session rendering and editing.
4. Add context transfer during group save.
5. Add pruning and final visual polish.
6. Run Node tests and browser startup verification.

## Open Decisions Resolved

The first version uses fixed statuses, one short note per group/session, local storage only, and no global notes page. These choices keep the feature useful without turning Tab Harbor into a heavy planning app.
