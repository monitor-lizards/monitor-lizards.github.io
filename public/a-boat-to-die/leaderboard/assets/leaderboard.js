/* No storage, background polling or submissions. All remote text stays text. */
(function () {
  'use strict';

  const MAX_RESPONSE_BYTES = 64 * 1024;
  const MAX_CONFIG_BYTES = 2048;
  const TIMEOUT_MS = 5000;
  const MAX_DISTANCE_METERS = 1e9;
  const FORBIDDEN_NICKNAME = /[\p{Cc}\p{Cf}\p{Cs}\u2028\u2029]/u;
  const distanceFormatter = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

  function getEndpoint(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config) || typeof config.apiBaseUrl !== 'string') {
      throw new Error('Invalid leaderboard configuration');
    }
    const base = config.apiBaseUrl.trim();
    if (!base) return null;
    const url = new URL(base);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
        url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('Invalid leaderboard origin');
    }
    return new URL('/v1/leaderboard', url.origin).href;
  }

  function validateEntries(payload) {
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.entries) || payload.entries.length > 100) {
      throw new Error('Invalid leaderboard response');
    }
    return payload.entries.map(entry => {
      const nickname = entry && typeof entry.nickname === 'string' ? entry.nickname.normalize('NFC').trim() : null;
      if (!entry || typeof entry !== 'object' ||
          !Number.isInteger(entry.rank) || entry.rank < 1 || entry.rank > 100 ||
          !nickname || [...nickname].length > 24 || new TextEncoder().encode(nickname).length > 96 ||
          FORBIDDEN_NICKNAME.test(nickname) ||
          !Number.isInteger(entry.distanceMeters) || entry.distanceMeters < 0 || entry.distanceMeters > MAX_DISTANCE_METERS) {
        throw new Error('Invalid leaderboard entry');
      }
      // Names are not identities: separate voyages may have the same nickname.
      return { rank: entry.rank, nickname, distanceMeters: entry.distanceMeters };
    });
  }

  function formatDistance(meters) {
    return distanceFormatter.format(meters / 1000);
  }

  async function readBoundedJson(response, maxBytes) {
    if (!response.ok) throw new Error('Leaderboard request failed');
    const contentType = (response.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/json' && !/^application\/[a-z0-9.+-]+\+json$/.test(contentType)) {
      throw new Error('Expected a JSON response');
    }
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error('Response too large');
    if (!response.body || typeof response.body.getReader !== 'function') throw new Error('Streaming response unavailable');
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let bytes = 0;
    let source = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) throw new Error('Response too large');
        source += decoder.decode(value, { stream: true });
      }
      source += decoder.decode();
      return JSON.parse(source);
    } catch (error) {
      Promise.resolve(reader.cancel()).catch(() => {});
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  async function fetchJson(url, maxBytes, fetchFunction, timeoutMs = TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchFunction(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      return await readBoundedJson(response, maxBytes);
    } finally {
      clearTimeout(timer);
    }
  }

  function createApp(document, fetchFunction, connection) {
    const ids = ['board', 'board-label', 'refresh', 'refresh-label', 'update-status', 'state-panel',
      'state-marker', 'state-title', 'state-description', 'table-wrap', 'entries'];
    const elements = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
    let loading = false;
    let lastEntries = null;

    function state(kind, label, message) {
      elements.board.dataset.state = kind;
      elements['board-label'].textContent = label;
      elements['update-status'].textContent = message;
    }

    function panel(marker, title, description) {
      elements['state-marker'].textContent = marker;
      elements['state-title'].textContent = title;
      elements['state-description'].textContent = description;
      elements['state-panel'].hidden = false;
    }

    function drawEntries(entries) {
      const fragment = document.createDocumentFragment();
      entries.forEach(entry => {
        const row = document.createElement('tr');
        const fields = [
          ['rank-cell', String(entry.rank).padStart(2, '0')],
          ['nickname-cell', entry.nickname],
          ['distance-cell', formatDistance(entry.distanceMeters)],
        ];
        fields.forEach(([className, value]) => {
          const cell = document.createElement('td');
          cell.className = className;
          cell.textContent = value;
          row.append(cell);
        });
        fragment.append(row);
      });
      elements.entries.replaceChildren(fragment);
      elements['table-wrap'].hidden = entries.length === 0;
      elements['state-panel'].hidden = entries.length !== 0;
    }

    async function refresh() {
      if (loading) return;
      loading = true;
      elements.refresh.disabled = true;
      elements['refresh-label'].textContent = 'Checking…';
      elements.board.setAttribute('aria-busy', 'true');
      state('loading', 'CHECKING VOYAGES', lastEntries === null ? 'Loading leaderboard.' : 'Checking for new voyages.');
      if (!lastEntries || !lastEntries.length) {
        panel('PLEASE WAIT', 'Loading voyages.', 'Fetching the longest voyages.');
      }
      try {
        if (connection.onLine === false) throw new Error('Offline');
        const configUrl = new URL('./config.json', document.baseURI).href;
        const config = await fetchJson(configUrl, MAX_CONFIG_BYTES, fetchFunction);
        const endpoint = getEndpoint(config);
        if (!endpoint) {
          lastEntries = null;
          drawEntries([]);
          panel('GETTING READY', 'Leaderboard preparing.', 'Shared voyages will appear here when the leaderboard opens.');
          state('preparing', 'AWAITING VOYAGES', 'The leaderboard is being prepared.');
          elements['refresh-label'].textContent = 'Check again';
          return;
        }
        const payload = await fetchJson(endpoint, MAX_RESPONSE_BYTES, fetchFunction);
        const entries = validateEntries(payload);
        drawEntries(entries);
        lastEntries = entries;
        elements['refresh-label'].textContent = 'Refresh';
        if (entries.length) {
          const count = `${entries.length} ${entries.length === 1 ? 'voyage' : 'voyages'}`;
          state('ready', `${count.toUpperCase()} / TOP 100`, `Loaded ${count}.`);
        } else {
          panel('NO SHARED SCORES YET', 'The first voyage is yours.', 'Play, go a little further, and choose to share your voyage from the game.');
          state('empty', 'AWAITING VOYAGES', 'No shared voyages yet.');
        }
      } catch (_) {
        const offline = connection.onLine === false;
        const hasRows = lastEntries && lastEntries.length > 0;
        if (hasRows) {
          state(offline ? 'offline' : 'error', 'LAST LOADED VOYAGES', offline
            ? 'You’re offline. Showing the last loaded voyages.'
            : 'Couldn’t refresh. Showing the last loaded voyages. Try again when you’re ready.');
        } else {
          elements['table-wrap'].hidden = true;
          panel(offline ? 'NO CONNECTION' : 'TEMPORARILY UNAVAILABLE',
            offline ? 'You’re offline.' : 'Couldn’t load voyages.',
            offline ? 'Check your connection, then try again.' : 'The leaderboard could not be reached. Please try again in a moment.');
          state(offline ? 'offline' : 'error', 'WAITING TO RECONNECT', offline ? 'You’re offline.' : 'Couldn’t load the leaderboard.');
        }
        elements['refresh-label'].textContent = 'Try again';
      } finally {
        loading = false;
        elements.refresh.disabled = false;
        elements.board.setAttribute('aria-busy', 'false');
      }
    }

    function start() {
      elements.refresh.hidden = false;
      elements.refresh.addEventListener('click', refresh);
      return refresh();
    }

    return { start, refresh };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getEndpoint, validateEntries, formatDistance, readBoundedJson, fetchJson, createApp };
  } else if (typeof document !== 'undefined') {
    createApp(document, window.fetch.bind(window), window.navigator).start();
  }
})();
