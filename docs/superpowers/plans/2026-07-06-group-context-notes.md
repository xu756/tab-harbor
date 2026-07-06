# Group Context Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local, quiet status and short note context to open tab groups and saved sessions.

**Architecture:** Add a focused `extension/group-context.js` storage module exposed as `globalThis.TabHarborGroupContext`. Wire open-group rendering in `dashboard-runtime.js` and saved-session rendering in `session-manager.js`, with `i18n.js` labels and `style.css` treatment. Keep `extension/app.js` unchanged as a thin orchestrator.

**Tech Stack:** Plain HTML, CSS, ordered script tags, vanilla JavaScript, Chrome `storage.local`, Node `node:test`

---

### Task 1: Add Group Context Data Module

**Files:**
- Create: `extension/group-context.js`
- Create: `extension/group-context.test.js`

- [ ] **Step 1: Write failing tests for normalization and storage behavior**

Add tests covering `normalizeGroupContextState`, `setOpenGroupContext`, `setSavedSessionContext`, `transferOpenGroupContextToSavedSession`, and `pruneOpenGroupContext`.

Run: `node --test extension/group-context.test.js`
Expected: FAIL because `extension/group-context.js` does not exist.

- [ ] **Step 2: Implement the module**

Implement:

```js
const GROUP_CONTEXT_KEY = 'groupContextNotes';
const GROUP_CONTEXT_NOTE_LIMIT = 280;
const GROUP_CONTEXT_STATUSES = ['working', 'reading', 'later', 'done'];
```

Expose `TabHarborGroupContext` with pure helpers and async helpers. Empty status plus empty note removes the entry. Unknown statuses normalize to empty. Notes trim and truncate to 280 characters.

- [ ] **Step 3: Verify module tests**

Run: `node --test extension/group-context.test.js`
Expected: PASS.

- [ ] **Step 4: Commit data module**

Commit message: `feat: add group context storage`

### Task 2: Load Script And Add Regression Hooks

**Files:**
- Modify: `extension/index.html`
- Modify: `extension/ui-regression.test.js`

- [ ] **Step 1: Add failing regression assertions**

Assert `group-context.js` loads after `tab-sessions.js` and before `session-manager.js`, and that `app.js` remains an orchestrator.

Run: `node --test extension/ui-regression.test.js`
Expected: FAIL until script tag is added.

- [ ] **Step 2: Add script tag**

Add:

```html
<script src="group-context.js"></script>
```

between `tab-sessions.js` and `session-manager.js`.

- [ ] **Step 3: Verify regression**

Run: `node --test extension/ui-regression.test.js`
Expected: PASS.

- [ ] **Step 4: Commit script wiring**

Commit message: `chore: load group context module`

### Task 3: Render And Edit Open Group Context

**Files:**
- Modify: `extension/dashboard-runtime.js`
- Modify: `extension/i18n.js`
- Modify: `extension/style.css`
- Modify: `extension/ui-regression.test.js`

- [ ] **Step 1: Add failing UI regression assertions**

Assert open group cards render `group-context-row`, use `data-action="open-group-context-editor"`, and handle `data-action="save-group-context"`.

Run: `node --test extension/ui-regression.test.js`
Expected: FAIL until rendering is added.

- [ ] **Step 2: Import group context helpers with prefixed aliases**

Destructure from `globalThis.TabHarborGroupContext || {}` using names such as `runtimeGetOpenGroupContext`, `runtimeSetOpenGroupContext`, `runtimeClearOpenGroupContext`, and `runtimePruneOpenGroupContext`.

- [ ] **Step 3: Add open group context state and renderer helpers**

Add a local `groupContextEditorState` and helpers that render one quiet row and an anchored editor dialog with status buttons, textarea, Save, Cancel, and Clear.

- [ ] **Step 4: Wire open group actions**

Handle `open-group-context-editor`, `change-group-context-status`, `change-group-context-note`, `save-group-context`, `clear-group-context`, and `close-group-context-editor` through existing delegated events.

- [ ] **Step 5: Load and prune context during dashboard render**

Load context before open groups render. After `buildDomainGroups`, prune open group context to current group keys.

- [ ] **Step 6: Add labels**

Add English and Simplified Chinese strings for `Add note`, `Edit note`, `Working`, `Reading`, `Later`, `Done`, `No status`, `Group note`, `Could not save note`, and `Note saved`.

- [ ] **Step 7: Add quiet CSS**

Style context rows and editor using theme variables, visible focus states, and reduced-motion-safe behavior. Do not create nested cards.

- [ ] **Step 8: Verify**

Run: `node --test extension/ui-regression.test.js extension/group-context.test.js`
Expected: PASS.

- [ ] **Step 9: Commit open group UI**

Commit message: `feat: add open group context notes`

### Task 4: Render And Edit Saved Session Context

**Files:**
- Modify: `extension/session-manager.js`
- Modify: `extension/style.css`
- Modify: `extension/ui-regression.test.js`

- [ ] **Step 1: Add failing saved-session assertions**

Assert saved session cards render `saved-session-context-row`, use `data-action="open-saved-session-context-editor"`, and handle `data-action="save-saved-session-context"`.

Run: `node --test extension/ui-regression.test.js`
Expected: FAIL until saved session rendering is added.

- [ ] **Step 2: Import group context helpers with manager-prefixed aliases**

Use aliases such as `managerGetSavedSessionContext`, `managerSetSavedSessionContext`, and `managerClearSavedSessionContext`.

- [ ] **Step 3: Add saved session editor state and renderer**

Render status and note in the session header area. Reuse the same CSS classes where possible, with saved-session-specific hooks only where tests or layout need them.

- [ ] **Step 4: Wire saved session actions**

Handle `open-saved-session-context-editor`, `change-saved-session-context-status`, `change-saved-session-context-note`, `save-saved-session-context`, `clear-saved-session-context`, and `close-saved-session-context-editor`.

- [ ] **Step 5: Verify**

Run: `node --test extension/ui-regression.test.js extension/group-context.test.js`
Expected: PASS.

- [ ] **Step 6: Commit saved session UI**

Commit message: `feat: add saved session context notes`

### Task 5: Transfer Context When Saving Groups

**Files:**
- Modify: `extension/dashboard-runtime.js`
- Modify: `extension/group-context.test.js`

- [ ] **Step 1: Add failing transfer coverage**

Extend tests so a single open group context can transfer to a saved session while current-window saves do not merge multiple group notes.

Run: `node --test extension/group-context.test.js`
Expected: PASS for pure helper coverage before runtime wiring begins.

- [ ] **Step 2: Track clear source group in save flow**

When `save-domain-session` calls `openTabSessionPicker`, pass a source group key. Preserve it in `tabSessionPickerState`.

- [ ] **Step 3: Transfer after new saved session creation**

After `saveSelectedTabSession` returns, if `tabSessionPickerState.sourceGroupKey` is set and the save mode is new, transfer open-group context to the created saved session ID.

- [ ] **Step 4: Verify**

Run: `node --test extension/*.test.js`
Expected: PASS.

- [ ] **Step 5: Commit transfer behavior**

Commit message: `feat: carry group context into saved sessions`

### Task 6: Final Verification

**Files:**
- Test: `extension/*.test.js`

- [ ] **Step 1: Run full Node test suite**

Run: `node --test extension/*.test.js`
Expected: PASS.

- [ ] **Step 2: Browser startup verification**

Load `extension/index.html` in a browser-capable session or extension context where available. Check for startup errors such as `Identifier has already been declared`.

- [ ] **Step 3: Final status**

Summarize user-facing behavior, commits, tests, and any browser verification limitation.
