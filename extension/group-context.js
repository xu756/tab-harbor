'use strict';

(function attachTabHarborGroupContext(globalScope) {
  const GROUP_CONTEXT_KEY = 'groupContextNotes';
  const GROUP_CONTEXT_NOTE_LIMIT = 280;
  const GROUP_CONTEXT_STATUSES = ['working', 'reading', 'later', 'done'];
  const VALID_GROUP_CONTEXT_STATUSES = new Set(GROUP_CONTEXT_STATUSES);

  function normalizeString(value = '') {
    return String(value == null ? '' : value).trim();
  }

  function normalizeStatus(value = '') {
    const cleanValue = normalizeString(value).toLowerCase();
    return VALID_GROUP_CONTEXT_STATUSES.has(cleanValue) ? cleanValue : '';
  }

  function normalizeNote(value = '') {
    return normalizeString(value).slice(0, GROUP_CONTEXT_NOTE_LIMIT);
  }

  function normalizeUpdatedAt(value = '') {
    const cleanValue = normalizeString(value);
    if (!cleanValue) return '';
    const timestamp = Date.parse(cleanValue);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '';
  }

  function normalizeContextEntry(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const status = normalizeStatus(input.status);
    const note = normalizeNote(input.note);
    if (!status && !note) return null;

    const updatedAt = normalizeUpdatedAt(input.updatedAt);
    return {
      status,
      note,
      updatedAt: updatedAt || new Date().toISOString(),
    };
  }

  function normalizeContextBucket(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

    return Object.fromEntries(
      Object.entries(input)
        .map(([key, value]) => {
          const cleanKey = normalizeString(key);
          const entry = normalizeContextEntry(value);
          return cleanKey && entry ? [cleanKey, entry] : null;
        })
        .filter(Boolean)
    );
  }

  function normalizeGroupContextState(input = {}) {
    return {
      openGroups: normalizeContextBucket(input?.openGroups),
      savedSessions: normalizeContextBucket(input?.savedSessions),
    };
  }

  function createEntry(context = {}, now = new Date().toISOString()) {
    return normalizeContextEntry({
      status: context?.status,
      note: context?.note,
      updatedAt: now,
    });
  }

  function getOpenGroupContext(state = {}, groupKey = '') {
    const normalized = normalizeGroupContextState(state);
    return normalized.openGroups[normalizeString(groupKey)] || null;
  }

  function getSavedSessionContext(state = {}, sessionId = '') {
    const normalized = normalizeGroupContextState(state);
    return normalized.savedSessions[normalizeString(sessionId)] || null;
  }

  function setOpenGroupContext(state = {}, groupKey = '', context = {}, { now = new Date().toISOString() } = {}) {
    const cleanKey = normalizeString(groupKey);
    const normalized = normalizeGroupContextState(state);
    if (!cleanKey) return normalized;

    const entry = createEntry(context, now);
    const openGroups = { ...normalized.openGroups };
    if (entry) openGroups[cleanKey] = entry;
    else delete openGroups[cleanKey];

    return {
      ...normalized,
      openGroups,
    };
  }

  function setSavedSessionContext(state = {}, sessionId = '', context = {}, { now = new Date().toISOString() } = {}) {
    const cleanSessionId = normalizeString(sessionId);
    const normalized = normalizeGroupContextState(state);
    if (!cleanSessionId) return normalized;

    const entry = createEntry(context, now);
    const savedSessions = { ...normalized.savedSessions };
    if (entry) savedSessions[cleanSessionId] = entry;
    else delete savedSessions[cleanSessionId];

    return {
      ...normalized,
      savedSessions,
    };
  }

  function clearOpenGroupContext(state = {}, groupKey = '') {
    return setOpenGroupContext(state, groupKey, { status: '', note: '' });
  }

  function clearSavedSessionContext(state = {}, sessionId = '') {
    return setSavedSessionContext(state, sessionId, { status: '', note: '' });
  }

  function transferOpenGroupContextToSavedSession(
    state = {},
    groupKey = '',
    sessionId = '',
    { now = new Date().toISOString() } = {}
  ) {
    const cleanGroupKey = normalizeString(groupKey);
    const cleanSessionId = normalizeString(sessionId);
    const normalized = normalizeGroupContextState(state);
    if (!cleanGroupKey || !cleanSessionId) return normalized;

    const entry = normalized.openGroups[cleanGroupKey] || null;
    if (!entry) return normalized;

    return setSavedSessionContext(normalized, cleanSessionId, {
      status: entry.status,
      note: entry.note,
    }, { now });
  }

  function pruneOpenGroupContext(state = {}, activeGroupKeys = []) {
    const normalized = normalizeGroupContextState(state);
    const activeKeys = new Set((Array.isArray(activeGroupKeys) ? activeGroupKeys : [])
      .map(normalizeString)
      .filter(Boolean));
    if (!activeKeys.size) {
      return {
        ...normalized,
        openGroups: {},
      };
    }

    return {
      ...normalized,
      openGroups: Object.fromEntries(
        Object.entries(normalized.openGroups)
          .filter(([key]) => activeKeys.has(key))
      ),
    };
  }

  function getStorageArea(storageArea) {
    return storageArea || globalScope?.chrome?.storage?.local || null;
  }

  async function loadGroupContextState(storageArea) {
    const storage = getStorageArea(storageArea);
    if (!storage?.get) return normalizeGroupContextState();
    const stored = await storage.get(GROUP_CONTEXT_KEY);
    return normalizeGroupContextState(stored?.[GROUP_CONTEXT_KEY]);
  }

  async function saveGroupContextState(nextState = {}, storageArea) {
    const storage = getStorageArea(storageArea);
    const normalized = normalizeGroupContextState(nextState);
    if (storage?.set) {
      await storage.set({ [GROUP_CONTEXT_KEY]: normalized });
    }
    return normalized;
  }

  async function updateGroupContextState(updater, storageArea) {
    const current = await loadGroupContextState(storageArea);
    const nextState = typeof updater === 'function' ? updater(current) : current;
    return saveGroupContextState(nextState, storageArea);
  }

  async function saveOpenGroupContext(groupKey = '', context = {}, options = {}) {
    return updateGroupContextState(
      state => setOpenGroupContext(state, groupKey, context, options),
      options.storageArea
    );
  }

  async function saveSavedSessionContext(sessionId = '', context = {}, options = {}) {
    return updateGroupContextState(
      state => setSavedSessionContext(state, sessionId, context, options),
      options.storageArea
    );
  }

  async function removeOpenGroupContext(groupKey = '', options = {}) {
    return updateGroupContextState(
      state => clearOpenGroupContext(state, groupKey),
      options.storageArea
    );
  }

  async function removeSavedSessionContext(sessionId = '', options = {}) {
    return updateGroupContextState(
      state => clearSavedSessionContext(state, sessionId),
      options.storageArea
    );
  }

  async function copyOpenGroupContextToSavedSession(groupKey = '', sessionId = '', options = {}) {
    return updateGroupContextState(
      state => transferOpenGroupContextToSavedSession(state, groupKey, sessionId, options),
      options.storageArea
    );
  }

  async function pruneStoredOpenGroupContext(activeGroupKeys = [], options = {}) {
    return updateGroupContextState(
      state => pruneOpenGroupContext(state, activeGroupKeys),
      options.storageArea
    );
  }

  const exportsApi = {
    GROUP_CONTEXT_KEY,
    GROUP_CONTEXT_NOTE_LIMIT,
    GROUP_CONTEXT_STATUSES,
    clearOpenGroupContext,
    clearSavedSessionContext,
    copyOpenGroupContextToSavedSession,
    getOpenGroupContext,
    getSavedSessionContext,
    loadGroupContextState,
    normalizeGroupContextState,
    pruneOpenGroupContext,
    pruneStoredOpenGroupContext,
    removeOpenGroupContext,
    removeSavedSessionContext,
    saveGroupContextState,
    saveOpenGroupContext,
    saveSavedSessionContext,
    setOpenGroupContext,
    setSavedSessionContext,
    transferOpenGroupContextToSavedSession,
  };

  globalScope.TabHarborGroupContext = exportsApi;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsApi;
  }
})(typeof globalThis !== 'undefined' ? globalThis : global);
