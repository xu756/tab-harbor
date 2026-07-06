'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  GROUP_CONTEXT_NOTE_LIMIT,
  clearOpenGroupContext,
  getOpenGroupContext,
  getSavedSessionContext,
  normalizeGroupContextState,
  pruneOpenGroupContext,
  setOpenGroupContext,
  setSavedSessionContext,
  transferOpenGroupContextToSavedSession,
} = require('./group-context.js');

test('normalizeGroupContextState keeps known statuses and trims notes', () => {
  const state = normalizeGroupContextState({
    openGroups: {
      'github.com': {
        status: 'working',
        note: '  Review issue thread.  ',
        updatedAt: '2026-07-06T00:00:00.000Z',
      },
      'bad.example': {
        status: 'urgent',
        note: '   ',
        updatedAt: 'not-a-date',
      },
    },
    savedSessions: {
      'tab-session-1': {
        status: 'later',
        note: 'Weekend reading',
        updatedAt: '2026-07-06T00:00:00.000Z',
      },
    },
  });

  assert.deepEqual(state, {
    openGroups: {
      'github.com': {
        status: 'working',
        note: 'Review issue thread.',
        updatedAt: '2026-07-06T00:00:00.000Z',
      },
    },
    savedSessions: {
      'tab-session-1': {
        status: 'later',
        note: 'Weekend reading',
        updatedAt: '2026-07-06T00:00:00.000Z',
      },
    },
  });
});

test('normalizeGroupContextState truncates long notes', () => {
  const longNote = 'a'.repeat(GROUP_CONTEXT_NOTE_LIMIT + 20);
  const state = normalizeGroupContextState({
    openGroups: {
      'docs.example': {
        status: 'reading',
        note: longNote,
      },
    },
  });

  assert.equal(state.openGroups['docs.example'].note.length, GROUP_CONTEXT_NOTE_LIMIT);
});

test('setOpenGroupContext updates and removes empty entries immutably', () => {
  const initial = normalizeGroupContextState();
  const next = setOpenGroupContext(initial, 'github.com', {
    status: 'working',
    note: 'Check PR.',
  }, { now: '2026-07-06T01:00:00.000Z' });

  assert.deepEqual(getOpenGroupContext(next, 'github.com'), {
    status: 'working',
    note: 'Check PR.',
    updatedAt: '2026-07-06T01:00:00.000Z',
  });
  assert.deepEqual(initial, { openGroups: {}, savedSessions: {} });

  const cleared = setOpenGroupContext(next, 'github.com', {
    status: '',
    note: '   ',
  }, { now: '2026-07-06T02:00:00.000Z' });

  assert.deepEqual(cleared.openGroups, {});
});

test('setSavedSessionContext updates saved session context', () => {
  const state = setSavedSessionContext(undefined, 'tab-session-1', {
    status: 'later',
    note: 'Bring this back after lunch.',
  }, { now: '2026-07-06T03:00:00.000Z' });

  assert.deepEqual(getSavedSessionContext(state, 'tab-session-1'), {
    status: 'later',
    note: 'Bring this back after lunch.',
    updatedAt: '2026-07-06T03:00:00.000Z',
  });
});

test('transferOpenGroupContextToSavedSession copies one clear group context', () => {
  const state = setOpenGroupContext(undefined, 'github.com', {
    status: 'working',
    note: 'Review release notes.',
  }, { now: '2026-07-06T04:00:00.000Z' });

  const transferred = transferOpenGroupContextToSavedSession(state, 'github.com', 'tab-session-1', {
    now: '2026-07-06T05:00:00.000Z',
  });

  assert.deepEqual(getSavedSessionContext(transferred, 'tab-session-1'), {
    status: 'working',
    note: 'Review release notes.',
    updatedAt: '2026-07-06T05:00:00.000Z',
  });
  assert.deepEqual(getOpenGroupContext(transferred, 'github.com'), {
    status: 'working',
    note: 'Review release notes.',
    updatedAt: '2026-07-06T04:00:00.000Z',
  });
});

test('transferOpenGroupContextToSavedSession does not invent context for current-window saves', () => {
  const state = setOpenGroupContext(undefined, 'github.com', {
    status: 'working',
    note: 'Review PR.',
  });

  const transferred = transferOpenGroupContextToSavedSession(state, '', 'tab-session-1');
  assert.deepEqual(transferred.savedSessions, {});
});

test('pruneOpenGroupContext removes stale open group entries', () => {
  let state = setOpenGroupContext(undefined, 'github.com', { status: 'working', note: 'A' });
  state = setOpenGroupContext(state, 'docs.example', { status: 'reading', note: 'B' });

  const pruned = pruneOpenGroupContext(state, ['docs.example']);

  assert.deepEqual(Object.keys(pruned.openGroups), ['docs.example']);
  assert.deepEqual(getOpenGroupContext(pruned, 'docs.example').status, 'reading');
});

test('clearOpenGroupContext removes one open group entry', () => {
  const state = setOpenGroupContext(undefined, 'github.com', { status: 'done', note: 'Close soon.' });
  const cleared = clearOpenGroupContext(state, 'github.com');

  assert.deepEqual(cleared, { openGroups: {}, savedSessions: {} });
});
