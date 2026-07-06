# Focus Shelf Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local Focus Shelf that lets users pin up to three open groups, saved sessions, or todos to the home page for quick context recovery.

**Architecture:** Add a focused `extension/focus-shelf.js` storage module exposed as `globalThis.TabHarborFocusShelf`. Wire home-page shelf rendering and open-group actions in `dashboard-runtime.js`, saved-session pinning in `session-manager.js`, and todo pinning/detail opening in `drawer-manager.js`, with labels in `i18n.js` and quiet styling in `style.css`. Keep `extension/app.js` unchanged as the orchestrator.

**Tech Stack:** Plain HTML, CSS, ordered script tags, vanilla JavaScript, Chrome `storage.local`, Node `node:test`

---

### Task 1: Add Focus Shelf Data Module

**Files:**
- Create: `extension/focus-shelf.js`
- Create: `extension/focus-shelf.test.js`

- [ ] **Step 1: Write failing tests for normalization and state changes**

Create `extension/focus-shelf.test.js` with tests for max item limit, duplicate removal, invalid item pruning, add/remove/toggle, and stale item pruning:

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const {
  FOCUS_SHELF_KEY,
  FOCUS_SHELF_MAX_ITEMS,
  addFocusItem,
  isFocusItemPinned,
  normalizeFocusShelfState,
  pruneFocusShelfItems,
  removeFocusItem,
  toggleFocusItem,
} = require('./focus-shelf.js');

test('normalizeFocusShelfState keeps valid unique items up to max', () => {
  const state = normalizeFocusShelfState({
    items: [
      { type: 'open-group', id: 'github.com', createdAt: '2026-07-06T00:00:00.000Z' },
      { type: 'open-group', id: 'github.com', createdAt: 'later duplicate' },
      { type: 'saved-session', id: 'tab-session-1', createdAt: '2026-07-06T00:01:00.000Z' },
      { type: 'todo', id: 'todo-1', createdAt: '2026-07-06T00:02:00.000Z' },
      { type: 'quick-link', id: 'shortcut-1', createdAt: '2026-07-06T00:03:00.000Z' },
      { type: 'todo', id: '', createdAt: '2026-07-06T00:04:00.000Z' },
    ],
  });

  assert.equal(FOCUS_SHELF_KEY, 'focusShelf');
  assert.equal(FOCUS_SHELF_MAX_ITEMS, 3);
  assert.deepEqual(state.items, [
    { type: 'open-group', id: 'github.com', createdAt: '2026-07-06T00:00:00.000Z' },
    { type: 'saved-session', id: 'tab-session-1', createdAt: '2026-07-06T00:01:00.000Z' },
    { type: 'todo', id: 'todo-1', createdAt: '2026-07-06T00:02:00.000Z' },
  ]);
});

test('addFocusItem appends valid items and refuses a fourth item', () => {
  const full = normalizeFocusShelfState({
    items: [
      { type: 'open-group', id: 'a.com' },
      { type: 'saved-session', id: 'saved-1' },
      { type: 'todo', id: 'todo-1' },
    ],
  });

  const unchanged = addFocusItem(full, { type: 'todo', id: 'todo-2' }, { now: '2026-07-06T00:10:00.000Z' });
  assert.deepEqual(unchanged, full);

  const added = addFocusItem({}, { type: 'open-group', id: 'github.com' }, { now: '2026-07-06T00:10:00.000Z' });
  assert.deepEqual(added.items, [
    { type: 'open-group', id: 'github.com', createdAt: '2026-07-06T00:10:00.000Z' },
  ]);
});

test('removeFocusItem and toggleFocusItem update one item reference', () => {
  const state = normalizeFocusShelfState({
    items: [
      { type: 'open-group', id: 'github.com' },
      { type: 'todo', id: 'todo-1' },
    ],
  });

  assert.equal(isFocusItemPinned(state, { type: 'todo', id: 'todo-1' }), true);
  assert.equal(isFocusItemPinned(state, { type: 'saved-session', id: 'missing' }), false);

  assert.deepEqual(removeFocusItem(state, { type: 'todo', id: 'todo-1' }).items, [
    { type: 'open-group', id: 'github.com', createdAt: '' },
  ]);

  assert.deepEqual(toggleFocusItem(state, { type: 'todo', id: 'todo-1' }).items, [
    { type: 'open-group', id: 'github.com', createdAt: '' },
  ]);

  assert.deepEqual(toggleFocusItem(state, { type: 'saved-session', id: 'saved-1' }, { now: '2026-07-06T00:11:00.000Z' }).items, [
    { type: 'open-group', id: 'github.com', createdAt: '' },
    { type: 'todo', id: 'todo-1', createdAt: '' },
    { type: 'saved-session', id: 'saved-1', createdAt: '2026-07-06T00:11:00.000Z' },
  ]);
});

test('pruneFocusShelfItems removes stale open groups, saved sessions, and todos', () => {
  const state = normalizeFocusShelfState({
    items: [
      { type: 'open-group', id: 'github.com' },
      { type: 'saved-session', id: 'saved-1' },
      { type: 'todo', id: 'todo-1' },
    ],
  });

  const pruned = pruneFocusShelfItems(state, {
    openGroupIds: ['github.com'],
    savedSessionIds: [],
    todoIds: ['todo-1'],
  });

  assert.deepEqual(pruned.items, [
    { type: 'open-group', id: 'github.com', createdAt: '' },
    { type: 'todo', id: 'todo-1', createdAt: '' },
  ]);
});
```

- [ ] **Step 2: Run module tests to verify failure**

Run: `node --test extension/focus-shelf.test.js`

Expected: FAIL with a module-not-found error for `extension/focus-shelf.js`.

- [ ] **Step 3: Implement `extension/focus-shelf.js`**

Create `extension/focus-shelf.js` with this public API:

```js
'use strict';

(function initFocusShelf(globalScope) {
  const FOCUS_SHELF_KEY = 'focusShelf';
  const FOCUS_SHELF_MAX_ITEMS = 3;
  const FOCUS_SHELF_ITEM_TYPES = ['open-group', 'saved-session', 'todo'];

  function normalizeString(value) {
    return String(value || '').trim();
  }

  function normalizeType(type) {
    const value = normalizeString(type);
    return FOCUS_SHELF_ITEM_TYPES.includes(value) ? value : '';
  }

  function getItemKey(item = {}) {
    const type = normalizeType(item.type);
    const id = normalizeString(item.id);
    return type && id ? `${type}:${id}` : '';
  }

  function normalizeFocusItem(item = {}) {
    const type = normalizeType(item?.type);
    const id = normalizeString(item?.id);
    if (!type || !id) return null;
    return {
      type,
      id,
      createdAt: normalizeString(item?.createdAt),
    };
  }

  function normalizeFocusShelfState(input = {}) {
    const seen = new Set();
    const items = [];
    const sourceItems = Array.isArray(input?.items) ? input.items : [];
    sourceItems.forEach(item => {
      const normalized = normalizeFocusItem(item);
      const key = getItemKey(normalized);
      if (!normalized || !key || seen.has(key) || items.length >= FOCUS_SHELF_MAX_ITEMS) return;
      seen.add(key);
      items.push(normalized);
    });
    return { items };
  }

  function isFocusItemPinned(state = {}, item = {}) {
    const key = getItemKey(item);
    if (!key) return false;
    return normalizeFocusShelfState(state).items.some(entry => getItemKey(entry) === key);
  }

  function addFocusItem(state = {}, item = {}, { now = new Date().toISOString() } = {}) {
    const normalized = normalizeFocusItem({ ...item, createdAt: item?.createdAt || now });
    if (!normalized) return normalizeFocusShelfState(state);
    const current = normalizeFocusShelfState(state);
    if (isFocusItemPinned(current, normalized)) return current;
    if (current.items.length >= FOCUS_SHELF_MAX_ITEMS) return current;
    return {
      items: [...current.items, normalized],
    };
  }

  function removeFocusItem(state = {}, item = {}) {
    const key = getItemKey(item);
    if (!key) return normalizeFocusShelfState(state);
    return {
      items: normalizeFocusShelfState(state).items.filter(entry => getItemKey(entry) !== key),
    };
  }

  function toggleFocusItem(state = {}, item = {}, options = {}) {
    return isFocusItemPinned(state, item)
      ? removeFocusItem(state, item)
      : addFocusItem(state, item, options);
  }

  function pruneFocusShelfItems(state = {}, {
    openGroupIds = [],
    savedSessionIds = [],
    todoIds = [],
  } = {}) {
    const validOpenGroups = new Set(openGroupIds.map(normalizeString).filter(Boolean));
    const validSavedSessions = new Set(savedSessionIds.map(normalizeString).filter(Boolean));
    const validTodos = new Set(todoIds.map(normalizeString).filter(Boolean));
    return {
      items: normalizeFocusShelfState(state).items.filter(item => {
        if (item.type === 'open-group') return validOpenGroups.has(item.id);
        if (item.type === 'saved-session') return validSavedSessions.has(item.id);
        if (item.type === 'todo') return validTodos.has(item.id);
        return false;
      }),
    };
  }

  async function loadFocusShelfState(storageArea = globalScope.chrome?.storage?.local) {
    if (!storageArea?.get) return normalizeFocusShelfState();
    const stored = await storageArea.get(FOCUS_SHELF_KEY);
    return normalizeFocusShelfState(stored?.[FOCUS_SHELF_KEY]);
  }

  async function saveFocusShelfState(nextState = {}, storageArea = globalScope.chrome?.storage?.local) {
    const normalized = normalizeFocusShelfState(nextState);
    if (!storageArea?.set) return normalized;
    await storageArea.set({ [FOCUS_SHELF_KEY]: normalized });
    return normalized;
  }

  async function updateFocusShelfState(updater, storageArea = globalScope.chrome?.storage?.local) {
    const current = await loadFocusShelfState(storageArea);
    const next = typeof updater === 'function' ? updater(current) : current;
    return saveFocusShelfState(next, storageArea);
  }

  async function toggleStoredFocusItem(item = {}, options = {}) {
    return updateFocusShelfState(state => toggleFocusItem(state, item, options), options.storageArea);
  }

  async function pruneStoredFocusShelfItems(validIds = {}, options = {}) {
    return updateFocusShelfState(state => pruneFocusShelfItems(state, validIds), options.storageArea);
  }

  const api = {
    FOCUS_SHELF_KEY,
    FOCUS_SHELF_MAX_ITEMS,
    FOCUS_SHELF_ITEM_TYPES,
    addFocusItem,
    getItemKey,
    isFocusItemPinned,
    loadFocusShelfState,
    normalizeFocusShelfState,
    pruneFocusShelfItems,
    pruneStoredFocusShelfItems,
    removeFocusItem,
    saveFocusShelfState,
    toggleFocusItem,
    toggleStoredFocusItem,
  };

  globalScope.TabHarborFocusShelf = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
```

- [ ] **Step 4: Run module tests to verify pass**

Run: `node --test extension/focus-shelf.test.js`

Expected: PASS.

- [ ] **Step 5: Commit data module**

```bash
git add extension/focus-shelf.js extension/focus-shelf.test.js
git commit -m "feat: add focus shelf storage"
```

### Task 2: Load Script And Add Mount Point

**Files:**
- Modify: `extension/index.html`
- Modify: `extension/ui-regression.test.js`

- [ ] **Step 1: Add failing script-order and mount assertions**

In `extension/ui-regression.test.js`, add assertions near existing script-order tests:

```js
test('focus shelf module loads before dashboard consumers and home page exposes a mount point', () => {
  assert.match(html, /<div class="focus-shelf" id="focusShelf" aria-live="polite"><\/div>/);

  const focusIndex = html.indexOf('<script src="focus-shelf.js"></script>');
  const sessionManagerIndex = html.indexOf('<script src="session-manager.js"></script>');
  const drawerManagerIndex = html.indexOf('<script src="drawer-manager.js"></script>');
  const dashboardRuntimeIndex = html.indexOf('<script src="dashboard-runtime.js"></script>');

  assert.ok(focusIndex > -1);
  assert.ok(focusIndex < sessionManagerIndex);
  assert.ok(focusIndex < drawerManagerIndex);
  assert.ok(focusIndex < dashboardRuntimeIndex);
});
```

- [ ] **Step 2: Run UI regression to verify failure**

Run: `node --test extension/ui-regression.test.js`

Expected: FAIL because `focusShelf` and `focus-shelf.js` are absent.

- [ ] **Step 3: Add the mount point**

In `extension/index.html`, add this inside `<main id="homePage">`, after the duplicate-tab banner and before `dashboardColumns`:

```html
    <div class="focus-shelf" id="focusShelf" aria-live="polite"></div>
```

- [ ] **Step 4: Add script tag**

In `extension/index.html`, add:

```html
  <script src="focus-shelf.js"></script>
```

Place it after `group-context.js` and before `session-manager.js`.

- [ ] **Step 5: Verify regression**

Run: `node --test extension/ui-regression.test.js extension/focus-shelf.test.js`

Expected: PASS.

- [ ] **Step 6: Commit mount and script wiring**

```bash
git add extension/index.html extension/ui-regression.test.js
git commit -m "chore: load focus shelf module"
```

### Task 3: Render Home Focus Shelf

**Files:**
- Modify: `extension/dashboard-runtime.js`
- Modify: `extension/i18n.js`
- Modify: `extension/style.css`
- Modify: `extension/ui-helpers.js`
- Modify: `extension/ui-regression.test.js`

- [ ] **Step 1: Add failing render assertions**

In `extension/ui-regression.test.js`, add:

```js
test('home focus shelf renders pinned items and gentle suggestions', () => {
  assert.match(runtimeJs, /TabHarborFocusShelf \|\| \{\}/);
  assert.match(runtimeJs, /let focusShelfState = runtimeNormalizeFocusShelfState/);
  assert.match(runtimeJs, /function renderFocusShelf\(/);
  assert.match(runtimeJs, /data-action="open-focus-item"/);
  assert.match(runtimeJs, /data-action="add-focus-suggestion"/);
  assert.match(runtimeJs, /document\.getElementById\('focusShelf'\)/);
  assert.match(runtimeJs, /runtimePruneStoredFocusShelfItems/);
  assert.match(css, /\.focus-shelf\s*\{/);
  assert.match(helperJs, /pin: `<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
});
```

- [ ] **Step 2: Run UI regression to verify failure**

Run: `node --test extension/ui-regression.test.js`

Expected: FAIL because shelf rendering is not wired.

- [ ] **Step 3: Import focus shelf helpers**

Near the other `globalThis` destructuring blocks in `extension/dashboard-runtime.js`, add:

```js
const {
  FOCUS_SHELF_MAX_ITEMS: runtimeFocusShelfMaxItems = 3,
  addFocusItem: runtimeAddFocusItem,
  getItemKey: runtimeGetFocusItemKey,
  isFocusItemPinned: runtimeIsFocusItemPinned,
  loadFocusShelfState: runtimeLoadFocusShelfState,
  normalizeFocusShelfState: runtimeNormalizeFocusShelfState,
  pruneStoredFocusShelfItems: runtimePruneStoredFocusShelfItems,
  toggleStoredFocusItem: runtimeToggleStoredFocusItem,
} = globalThis.TabHarborFocusShelf || {};
```

Add state near `groupContextState`:

```js
let focusShelfState = runtimeNormalizeFocusShelfState
  ? runtimeNormalizeFocusShelfState()
  : { items: [] };
```

- [ ] **Step 4: Add focus item resolution helpers**

Add these helpers in `dashboard-runtime.js` near other rendering helpers:

```js
function getFocusItemReference(type, id) {
  return { type: String(type || ''), id: String(id || '') };
}

function isFocusItemPinned(type, id) {
  return runtimeIsFocusItemPinned
    ? runtimeIsFocusItemPinned(focusShelfState, getFocusItemReference(type, id))
    : false;
}

function getFocusShelfOpenGroupIds() {
  return domainGroups.map(group => String(group.domain || '')).filter(Boolean);
}

function getFocusShelfSavedSessionIds(savedSessions = []) {
  return (Array.isArray(savedSessions) ? savedSessions : [])
    .map(session => String(session?.id || ''))
    .filter(Boolean);
}

function getFocusShelfTodoIds(todos = []) {
  return (Array.isArray(todos) ? todos : [])
    .filter(todo => todo && todo.id && !todo.completed && !todo.dismissed)
    .map(todo => String(todo.id));
}
```

- [ ] **Step 5: Add render helpers**

Add:

```js
function getFocusShelfItemLabel(item, context = {}) {
  if (item.type === 'open-group') {
    const group = context.groupsById.get(item.id);
    return group ? getGroupDisplayLabel(group) : item.id;
  }
  if (item.type === 'saved-session') {
    return context.savedSessionsById.get(item.id)?.name || 'Saved session';
  }
  if (item.type === 'todo') {
    return context.todosById.get(item.id)?.title || 'Todo';
  }
  return '';
}

function getFocusShelfItemMeta(item, context = {}) {
  if (item.type === 'open-group') {
    const entry = runtimeGetOpenGroupContext ? runtimeGetOpenGroupContext(groupContextState, item.id) : null;
    return entry?.status ? getGroupContextStatusLabel(entry.status) : '';
  }
  if (item.type === 'saved-session') {
    const entry = context.savedSessionContext?.[item.id] || null;
    return entry?.status ? getGroupContextStatusLabel(entry.status) : '';
  }
  if (item.type === 'todo') {
    const todo = context.todosById.get(item.id);
    return todo?.description ? String(todo.description).slice(0, 80) : '';
  }
  return '';
}

function renderFocusShelfItem(item, context = {}) {
  const label = getFocusShelfItemLabel(item, context);
  if (!label) return '';
  const meta = getFocusShelfItemMeta(item, context);
  const safeType = runtimeEscapeHtmlAttribute ? runtimeEscapeHtmlAttribute(item.type) : item.type;
  const safeId = runtimeEscapeHtmlAttribute ? runtimeEscapeHtmlAttribute(item.id) : item.id.replace(/"/g, '&quot;');
  const safeLabel = runtimeEscapeHtml ? runtimeEscapeHtml(label) : label;
  const safeMeta = runtimeEscapeHtml ? runtimeEscapeHtml(meta) : meta;
  return `
    <button class="focus-shelf-item" type="button" data-action="open-focus-item" data-focus-type="${safeType}" data-focus-id="${safeId}">
      <span class="focus-shelf-item-kind">${runtimeT ? runtimeT(`focusShelfKind_${item.type.replace('-', '_')}`) : item.type}</span>
      <span class="focus-shelf-item-title">${safeLabel}</span>
      ${meta ? `<span class="focus-shelf-item-meta">${safeMeta}</span>` : ''}
    </button>`;
}

function buildFocusShelfSuggestions(context = {}) {
  if (focusShelfState.items.length >= runtimeFocusShelfMaxItems) return [];
  const suggestions = [];
  domainGroups.forEach(group => {
    const groupKey = String(group.domain || '');
    const entry = runtimeGetOpenGroupContext ? runtimeGetOpenGroupContext(groupContextState, groupKey) : null;
    if (entry?.status === 'working' && !isFocusItemPinned('open-group', groupKey)) {
      suggestions.push({ type: 'open-group', id: groupKey });
    }
  });
  context.todos.forEach(todo => {
    if (suggestions.length < 2 && !isFocusItemPinned('todo', todo.id)) {
      suggestions.push({ type: 'todo', id: String(todo.id) });
    }
  });
  return suggestions.slice(0, 2);
}

function renderFocusShelf(context = {}) {
  const items = focusShelfState.items || [];
  const itemHtml = items.map(item => renderFocusShelfItem(item, context)).filter(Boolean).join('');
  const suggestions = items.length ? [] : buildFocusShelfSuggestions(context);
  const suggestionHtml = suggestions.map(item => {
    const label = getFocusShelfItemLabel(item, context);
    const safeType = runtimeEscapeHtmlAttribute ? runtimeEscapeHtmlAttribute(item.type) : item.type;
    const safeId = runtimeEscapeHtmlAttribute ? runtimeEscapeHtmlAttribute(item.id) : item.id.replace(/"/g, '&quot;');
    return `<button class="focus-shelf-suggestion" type="button" data-action="add-focus-suggestion" data-focus-type="${safeType}" data-focus-id="${safeId}">${runtimeT ? runtimeT('focusShelfAddSuggestion', { label }) : `Add ${label}`}</button>`;
  }).join('');
  return `
    <div class="focus-shelf-inner">
      <div class="focus-shelf-label">${runtimeT ? runtimeT('focusShelfTitle') : 'Focus'}</div>
      <div class="focus-shelf-items">
        ${itemHtml || `<span class="focus-shelf-empty">${runtimeT ? runtimeT('focusShelfEmpty') : "Keep one thing on today's desk."}</span>`}
        ${suggestionHtml}
      </div>
    </div>`;
}
```

- [ ] **Step 6: Load, prune, and render shelf during dashboard render**

Inside `renderDashboard()`, after `domainGroups` have been built, load saved sessions and active todos for the shelf:

```js
const focusSavedSessions = runtimeGetSavedTabSessions ? await runtimeGetSavedTabSessions() : [];
const focusTodos = typeof getTodos === 'function' ? await getTodos() : [];
const activeFocusTodos = focusTodos.filter(todo => todo && todo.id && !todo.completed && !todo.dismissed);
```

Then build:

```js
const focusContext = {
  groupsById: new Map(domainGroups.map(group => [String(group.domain || ''), group])),
  savedSessions: focusSavedSessions,
  savedSessionsById: new Map(focusSavedSessions.map(session => [String(session.id || ''), session])),
  savedSessionContext: groupContextState.savedSessions || {},
  todos: activeFocusTodos,
  todosById: new Map(activeFocusTodos.map(todo => [String(todo.id), todo])),
};
```

Then prune and render:

```js
if (runtimeLoadFocusShelfState) {
  focusShelfState = await runtimeLoadFocusShelfState();
}
if (runtimePruneStoredFocusShelfItems) {
  focusShelfState = await runtimePruneStoredFocusShelfItems({
    openGroupIds: getFocusShelfOpenGroupIds(),
    savedSessionIds: getFocusShelfSavedSessionIds(focusSavedSessions),
    todoIds: getFocusShelfTodoIds(activeFocusTodos),
  });
}
const focusShelfEl = document.getElementById('focusShelf');
if (focusShelfEl) focusShelfEl.innerHTML = renderFocusShelf(focusContext);
```

- [ ] **Step 7: Add i18n labels**

In `extension/i18n.js`, add English and Simplified Chinese labels:

```js
focusShelfTitle: 'Focus',
focusShelfEmpty: "Keep one thing on today's desk.",
focusShelfAddSuggestion: 'Add {label}',
focusShelfKind_open_group: 'Group',
focusShelfKind_saved_session: 'Session',
focusShelfKind_todo: 'Todo',
toastFocusShelfFull: 'Focus shelf is full',
toastFocusUpdated: 'Focus updated',
toastFocusUnavailable: 'That item is no longer available',
toastFocusUpdateFailed: 'Could not update focus',
```

Chinese:

```js
focusShelfTitle: '今日焦点',
focusShelfEmpty: '把一件要回到的事放在今天的桌面上。',
focusShelfAddSuggestion: '加入：{label}',
focusShelfKind_open_group: '分组',
focusShelfKind_saved_session: '会话',
focusShelfKind_todo: '待办',
toastFocusShelfFull: '今日焦点已满',
toastFocusUpdated: '已更新今日焦点',
toastFocusUnavailable: '这个项目已经不可用了',
toastFocusUpdateFailed: '无法更新今日焦点',
```

- [ ] **Step 8: Add pin icon to shared icons**

In `extension/ui-helpers.js`, add this entry to the existing `ICONS` object:

```js
  pin: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M14.5 4.5 19.5 9.5m-11 6 7-7m-8.5 1.5 7 7m-8.5-7 3-3a2 2 0 0 1 2.83 0l5.67 5.67a2 2 0 0 1 0 2.83l-3 3M9 15l-4.5 4.5" /></svg>`,
```

- [ ] **Step 9: Add quiet shelf CSS**

In `extension/style.css`, add:

```css
.focus-shelf {
  margin: 0 auto 14px;
  width: min(1120px, calc(100% - 32px));
}

.focus-shelf-inner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 9px 12px;
  border: 1px solid color-mix(in srgb, var(--warm-gray) 78%, var(--workspace-accent-border) 22%);
  border-radius: 8px;
  background: color-mix(in srgb, var(--paper) 82%, transparent);
}

.focus-shelf-label {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.focus-shelf-items {
  display: flex;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
}

.focus-shelf-item,
.focus-shelf-suggestion {
  min-height: 34px;
  border: 1px solid color-mix(in srgb, var(--warm-gray) 74%, var(--workspace-accent-border) 26%);
  border-radius: 8px;
  background: var(--paper);
  color: var(--ink);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 9px;
  font: inherit;
  white-space: nowrap;
}

.focus-shelf-item-kind,
.focus-shelf-item-meta,
.focus-shelf-empty {
  color: var(--muted);
  font-size: 0.78rem;
}

.focus-shelf-item-title {
  max-width: 24ch;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 720px) {
  .focus-shelf {
    width: min(100% - 20px, 1120px);
  }

  .focus-shelf-inner {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 10: Verify home shelf tests**

Run: `node --test extension/ui-regression.test.js extension/focus-shelf.test.js`

Expected: PASS.

- [ ] **Step 11: Commit shelf rendering**

```bash
git add extension/dashboard-runtime.js extension/i18n.js extension/style.css extension/ui-helpers.js extension/ui-regression.test.js
git commit -m "feat: render focus shelf"
```

### Task 4: Add Open Group Focus Pinning

**Files:**
- Modify: `extension/dashboard-runtime.js`
- Modify: `extension/ui-regression.test.js`

- [ ] **Step 1: Add failing open-group action assertions**

In `extension/ui-regression.test.js`, add:

```js
test('open group cards expose focus pin controls', () => {
  assert.match(runtimeJs, /data-action="toggle-open-group-focus"/);
  assert.match(runtimeJs, /isFocusItemPinned\('open-group', groupKey\)/);
  assert.match(runtimeJs, /runtimeToggleStoredFocusItem\(\{ type: 'open-group', id: groupKey \}/);
  assert.match(runtimeJs, /toastFocusShelfFull/);
});
```

- [ ] **Step 2: Run UI regression to verify failure**

Run: `node --test extension/ui-regression.test.js`

Expected: FAIL.

- [ ] **Step 3: Add pin control to open group card header**

In the group card render path in `dashboard-runtime.js`, compute:

```js
const groupKey = String(group.domain || '');
const groupFocused = isFocusItemPinned('open-group', groupKey);
const focusLabel = groupFocused
  ? (runtimeT ? runtimeT('removeFromFocus') : 'Remove from focus')
  : (runtimeT ? runtimeT('addToFocus') : 'Add to focus');
```

Add a button near existing quiet group actions:

```html
<button class="group-action-icon focus-pin-action${groupFocused ? ' is-active' : ''}" type="button" data-action="toggle-open-group-focus" data-group-key="${safeDomain}" aria-label="${focusLabel}" data-tooltip="${focusLabel}" aria-pressed="${groupFocused ? 'true' : 'false'}">
  ${ICONS.pin}
</button>
```

`ICONS.pin` is added in Task 3. Do not add a second icon definition in `dashboard-runtime.js`.

- [ ] **Step 4: Handle open-group focus toggle**

In the delegated click handler in `dashboard-runtime.js`, add:

```js
if (action === 'toggle-open-group-focus') {
  e.preventDefault();
  const groupKey = actionEl.dataset.groupKey || '';
  if (!groupKey || !runtimeToggleStoredFocusItem) return;
  if (!isFocusItemPinned('open-group', groupKey) && focusShelfState.items.length >= runtimeFocusShelfMaxItems) {
    showToast(runtimeT ? runtimeT('toastFocusShelfFull') : 'Focus shelf is full');
    return;
  }
  try {
    focusShelfState = await runtimeToggleStoredFocusItem({ type: 'open-group', id: groupKey });
    await renderDashboard();
    showToast(runtimeT ? runtimeT('toastFocusUpdated') : 'Focus updated');
  } catch (err) {
    console.error('[tab-harbor] Failed to update open group focus:', err);
    showToast(runtimeT ? runtimeT('toastFocusUpdateFailed') : 'Could not update focus');
  }
  return;
}
```

- [ ] **Step 5: Handle focus item open for open groups**

In the `open-focus-item` branch, for `open-group`:

```js
if (focusType === 'open-group') {
  const group = domainGroups.find(item => String(item.domain || '') === focusId);
  if (!group) {
    showToast(runtimeT ? runtimeT('toastFocusUnavailable') : 'That item is no longer available');
    return;
  }
  const stableId = getStableGroupId(group.domain);
  const target = document.querySelector(`.mission-card[data-domain-id="${CSS.escape(stableId)}"]`);
  if (!target) {
    showToast(runtimeT ? runtimeT('toastFocusUnavailable') : 'That item is no longer available');
    return;
  }
  target.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });
  target.classList.add('group-nav-target');
  setTimeout(() => target.classList.remove('group-nav-target'), 1200);
  return;
}
```

- [ ] **Step 6: Verify**

Run: `node --test extension/ui-regression.test.js extension/focus-shelf.test.js`

Expected: PASS.

- [ ] **Step 7: Commit open group pinning**

```bash
git add extension/dashboard-runtime.js extension/ui-regression.test.js
git commit -m "feat: pin open groups to focus shelf"
```

### Task 5: Add Saved Session Focus Pinning

**Files:**
- Modify: `extension/session-manager.js`
- Modify: `extension/dashboard-runtime.js`
- Modify: `extension/ui-regression.test.js`

- [ ] **Step 1: Add failing saved-session assertions**

In `extension/ui-regression.test.js`, add:

```js
test('saved session cards expose focus pin controls and focus navigation', () => {
  assert.match(sessionManagerJs, /TabHarborFocusShelf \|\| \{\}/);
  assert.match(sessionManagerJs, /data-action="toggle-saved-session-focus"/);
  assert.match(sessionManagerJs, /toggleStoredFocusItem/);
  assert.match(runtimeJs, /focusType === 'saved-session'/);
  assert.match(runtimeJs, /switchWorkspacePage\('saved-tabs'\)/);
});
```

- [ ] **Step 2: Run UI regression to verify failure**

Run: `node --test extension/ui-regression.test.js`

Expected: FAIL.

- [ ] **Step 3: Import focus helpers in `session-manager.js`**

Add:

```js
const {
  FOCUS_SHELF_MAX_ITEMS: managerFocusShelfMaxItems = 3,
  isFocusItemPinned: managerIsFocusItemPinned,
  loadFocusShelfState: managerLoadFocusShelfState,
  normalizeFocusShelfState: managerNormalizeFocusShelfState,
  toggleStoredFocusItem: managerToggleStoredFocusItem,
} = globalThis.TabHarborFocusShelf || {};

let savedSessionFocusShelfState = managerNormalizeFocusShelfState
  ? managerNormalizeFocusShelfState()
  : { items: [] };
```

- [ ] **Step 4: Load focus state before rendering saved sessions**

In the saved session render flow, before card markup is built:

```js
if (managerLoadFocusShelfState) {
  savedSessionFocusShelfState = await managerLoadFocusShelfState();
}
```

- [ ] **Step 5: Add saved-session pin button**

In saved session card render helper, add:

```js
const sessionFocused = managerIsFocusItemPinned
  ? managerIsFocusItemPinned(savedSessionFocusShelfState, { type: 'saved-session', id: sessionId })
  : false;
const focusLabel = sessionFocused
  ? (managerT ? managerT('removeFromFocus') : 'Remove from focus')
  : (managerT ? managerT('addToFocus') : 'Add to focus');
```

Add `data-saved-session-id` to the saved session card root if it only has `data-session-id` today:

```html
<article class="saved-session-card" data-session-id="${safeSessionId}" data-saved-session-id="${safeSessionId}">
```

Add button:

```html
<button class="group-action-icon focus-pin-action${sessionFocused ? ' is-active' : ''}" type="button" data-action="toggle-saved-session-focus" data-session-id="${safeSessionId}" aria-label="${escapeAttr(focusLabel)}" data-tooltip="${escapeAttr(focusLabel)}" aria-pressed="${sessionFocused ? 'true' : 'false'}">
  ${ICONS.pin}
</button>
```

- [ ] **Step 6: Handle saved-session focus toggle**

In `session-manager.js` delegated action handling, add:

```js
if (action === 'toggle-saved-session-focus') {
  event.preventDefault();
  const sessionId = actionEl.dataset.sessionId || '';
  if (!sessionId || !managerToggleStoredFocusItem) return;
  if (!managerIsFocusItemPinned(savedSessionFocusShelfState, { type: 'saved-session', id: sessionId })
    && savedSessionFocusShelfState.items.length >= managerFocusShelfMaxItems) {
    showManagerToast(managerT ? managerT('toastFocusShelfFull') : 'Focus shelf is full');
    return;
  }
  try {
    savedSessionFocusShelfState = await managerToggleStoredFocusItem({ type: 'saved-session', id: sessionId });
    await renderSavedSessions();
    showManagerToast(managerT ? managerT('toastFocusUpdated') : 'Focus updated');
  } catch (err) {
    console.error('[tab-harbor] Failed to update saved session focus:', err);
    showManagerToast(managerT ? managerT('toastFocusUpdateFailed') : 'Could not update focus');
  }
  return;
}
```

- [ ] **Step 7: Add saved-session focus navigation from home shelf**

In `dashboard-runtime.js`, handle `focusType === 'saved-session'`:

```js
if (focusType === 'saved-session') {
  switchWorkspacePage('saved-tabs');
  requestAnimationFrame(() => {
    const target = document.querySelector(`[data-saved-session-id="${CSS.escape(focusId)}"]`);
    if (!target) {
      showToast(runtimeT ? runtimeT('toastFocusUnavailable') : 'That item is no longer available');
      return;
    }
    target.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    target.classList.add('is-jump-highlighted');
    window.setTimeout(() => target.classList.remove('is-jump-highlighted'), 1200);
  });
  return;
}
```

- [ ] **Step 8: Verify**

Run: `node --test extension/ui-regression.test.js extension/focus-shelf.test.js`

Expected: PASS.

- [ ] **Step 9: Commit saved session pinning**

```bash
git add extension/session-manager.js extension/dashboard-runtime.js extension/ui-regression.test.js
git commit -m "feat: pin saved sessions to focus shelf"
```

### Task 6: Add Todo Focus Pinning

**Files:**
- Modify: `extension/drawer-manager.js`
- Modify: `extension/dashboard-runtime.js`
- Modify: `extension/ui-regression.test.js`

- [ ] **Step 1: Add failing todo assertions**

In `extension/ui-regression.test.js`, add:

```js
test('todos expose focus pin controls and can be opened from focus shelf', () => {
  assert.match(drawerManagerJs, /TabHarborFocusShelf \|\| \{\}/);
  assert.match(drawerManagerJs, /data-action="toggle-todo-focus"/);
  assert.match(drawerManagerJs, /openTodoDetailFromFocus/);
  assert.match(runtimeJs, /focusType === 'todo'/);
  assert.match(runtimeJs, /TabHarborDrawerManager\.openTodoDetailFromFocus/);
});
```

- [ ] **Step 2: Run UI regression to verify failure**

Run: `node --test extension/ui-regression.test.js`

Expected: FAIL.

- [ ] **Step 3: Import focus helpers in `drawer-manager.js`**

Add:

```js
const {
  FOCUS_SHELF_MAX_ITEMS: drawerFocusShelfMaxItems = 3,
  isFocusItemPinned: drawerIsFocusItemPinned,
  loadFocusShelfState: drawerLoadFocusShelfState,
  normalizeFocusShelfState: drawerNormalizeFocusShelfState,
  toggleStoredFocusItem: drawerToggleStoredFocusItem,
} = globalThis.TabHarborFocusShelf || {};

let todoFocusShelfState = drawerNormalizeFocusShelfState
  ? drawerNormalizeFocusShelfState()
  : { items: [] };
```

- [ ] **Step 4: Load focus state before rendering todos**

Inside `renderDeferredPanel()`, immediately after `const todos = await getTodos();`, add:

```js
if (drawerLoadFocusShelfState) {
  todoFocusShelfState = await drawerLoadFocusShelfState();
}
```

- [ ] **Step 5: Add todo pin button in list and detail**

In `renderTodoListItem(todo)`, compute:

```js
const todoFocused = drawerIsFocusItemPinned
  ? drawerIsFocusItemPinned(todoFocusShelfState, { type: 'todo', id: todo.id })
  : false;
const focusLabel = todoFocused
  ? drawerTodoText('removeFromFocus', 'Remove from focus')
  : drawerTodoText('addToFocus', 'Add to focus');
```

Add a quiet button inside `.todo-actions`:

```html
<button class="todo-action-btn focus-pin-action${todoFocused ? ' is-active' : ''}" type="button" data-action="toggle-todo-focus" data-todo-id="${todo.id}" aria-label="${focusLabel}" data-tooltip="${focusLabel}" aria-pressed="${todoFocused ? 'true' : 'false'}">
  ${ICONS.pin}
</button>
```

Add the same action to `renderTodoDetail(todo)`.

- [ ] **Step 6: Handle todo focus toggle**

In the drawer click handler, add:

```js
if (action === 'toggle-todo-focus') {
  event.preventDefault();
  const todoId = actionEl.dataset.todoId || '';
  if (!todoId || !drawerToggleStoredFocusItem) return;
  if (!drawerIsFocusItemPinned(todoFocusShelfState, { type: 'todo', id: todoId })
    && todoFocusShelfState.items.length >= drawerFocusShelfMaxItems) {
    showToast(drawerTodoText('toastFocusShelfFull', 'Focus shelf is full'));
    return;
  }
  try {
    todoFocusShelfState = await drawerToggleStoredFocusItem({ type: 'todo', id: todoId });
    await renderDeferredPanel();
    showToast(drawerTodoText('toastFocusUpdated', 'Focus updated'));
  } catch (err) {
    console.error('[tab-harbor] Failed to update todo focus:', err);
    showToast(drawerTodoText('toastFocusUpdateFailed', 'Could not update focus'));
  }
  return;
}
```

- [ ] **Step 7: Expose todo detail opener**

In `drawer-manager.js`, add:

```js
async function openTodoDetailFromFocus(todoId = '') {
  const cleanTodoId = String(todoId || '');
  const todos = await getTodos();
  const target = todos.find(todo => String(todo.id || '') === cleanTodoId && !todo.completed && !todo.dismissed);
  if (!target) return false;
  drawerView = 'todos';
  todoDetailId = cleanTodoId;
  deferredPanelOpen = true;
  await renderDeferredPanel();
  return true;
}
```

Add it to `globalThis.TabHarborDrawerManager`.

- [ ] **Step 8: Handle todo focus item clicks from dashboard**

In `dashboard-runtime.js`, add:

```js
if (focusType === 'todo') {
  const opened = await globalThis.TabHarborDrawerManager?.openTodoDetailFromFocus?.(focusId);
  if (!opened) {
    showToast(runtimeT ? runtimeT('toastFocusUnavailable') : 'That item is no longer available');
  }
  return;
}
```

- [ ] **Step 9: Verify**

Run: `node --test extension/ui-regression.test.js extension/focus-shelf.test.js`

Expected: PASS.

- [ ] **Step 10: Commit todo pinning**

```bash
git add extension/drawer-manager.js extension/dashboard-runtime.js extension/ui-regression.test.js
git commit -m "feat: pin todos to focus shelf"
```

### Task 7: Final Verification

**Files:**
- Test: `extension/*.test.js`
- Inspect: `extension/index.html`

- [ ] **Step 1: Run full Node test suite**

Run: `node --test extension/*.test.js`

Expected: PASS with zero failures.

- [ ] **Step 2: Verify no stale debug strings**

Run:

```bash
rg -n "console\\.log\\(|debugger;|Focus shelf is full|Could not update focus" extension docs/superpowers/plans/2026-07-06-focus-shelf.md
```

Expected: Only intentional i18n fallback strings and plan text are present.

- [ ] **Step 3: Browser startup verification**

Load the extension in a browser-capable session where available and check:

1. `focus-shelf.js` loads before `session-manager.js`, `drawer-manager.js`, and `dashboard-runtime.js`.
2. No startup errors such as `Identifier has already been declared`.
3. Home page renders with the shelf mount point.
4. Pinning an open group updates the shelf without page reload.

If browser extension loading is blocked by the environment, run the existing local HTML startup check with Chrome API stubs and state the limitation clearly.

- [ ] **Step 4: Commit any final fixes**

If verification required fixes, commit them:

```bash
git add extension docs
git commit -m "fix: polish focus shelf verification"
```

If no fixes were needed, do not create an empty commit.
