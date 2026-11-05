// Everything the app remembers on this device.
const KEY = 'quizzy.v2';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = data => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* private mode: keep going */ } };
const update = fn => { const d = read(); fn(d); write(d); };

export const store = {
  get name() { return read().name || ''; },
  set name(v) { update(d => { d.name = v; }); },

  get session() { return read().session || null; },
  set session(v) { update(d => { d.session = v; }); },

  best(board) { return (read().bests || {})[board] || null; },
  history() { return read().history || []; },

  // Saves a finished round; returns true if it beat this device's best for that board.
  record(run) {
    let improved = false;
    update(d => {
      d.history = [run, ...(d.history || [])].slice(0, 60);
      d.bests = d.bests || {};
      const prev = d.bests[run.board];
      if (!prev || run.score > prev.score) { d.bests[run.board] = { score: run.score, correct: run.correct, total: run.total }; improved = true; }
    });
    return improved;
  },

  markSaved(runId, entryId) { update(d => { d.saved = { ...(d.saved || {}), [runId]: entryId }; }); },
  savedEntry(runId) { return (read().saved || {})[runId] || null; },
  myEntryIds() { return new Set(Object.values(read().saved || {})); },

  clearHistory() { update(d => { d.history = []; d.bests = {}; }); },
};

// The round that just finished, kept for the results screen (survives a refresh).
export const lastRun = {
  get() { try { return JSON.parse(sessionStorage.getItem('quizzy.last')); } catch { return null; } },
  set(v) { try { sessionStorage.setItem('quizzy.last', JSON.stringify(v)); } catch { /* ignore */ } },
};
