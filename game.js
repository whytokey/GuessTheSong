(() => {
  'use strict';
  // Release 3.2.0 / room protocol 5. All participants must update together.
  const PROTOCOL = 5;
  const CONFIG = Object.freeze({ rounds: 10, clip: 5, lives: 3, roundMs: 45000,
    revealMs: 1600, loadMs: 8000, stallMs: 8000, networkMs: 10000,
    prepareMs: 50000, reconnectMs: 60000, maxReplacements: 2,
    heartbeatMs: 5000, staleMs: 65000, maxPlayers: 8, lookAhead: 2, musicRetryMs: 10000 });
  const $ = id => document.getElementById(id);
  const text = (id, value) => { if ($(id)) $(id).textContent = value; };
  const html = (id, value) => { if ($(id)) $(id).innerHTML = value; };
  const esc = value => String(value ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) { /* Private browsing is supported. */ } }
  };
  const number = value => Math.max(0, Math.floor(Number(value) || 0));
  const shuffle = list => {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const uid = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  };
  const trackKey = track => `${track?.trackName || ''}::${track?.artistName || ''}`.normalize('NFKC').toLowerCase();
  const multiplier = streak => streak >= 5 ? 3 : streak >= 3 ? 2 : 1;
  function bounded(promise, ms = CONFIG.networkMs) {
    let timer;
    return Promise.race([Promise.resolve(promise), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    })]).finally(() => clearTimeout(timer));
  }
  // Keep an active listener until the server acknowledges the transaction.
  // once('value') alone can release the cache before transaction's first callback.
  // applyLocally=false prevents UI from starting a match on a speculative write.
  async function roomTransaction(ref, update) {
    let listener;
    try {
      await bounded(new Promise((resolve, reject) => {
        listener = snap => resolve(snap);
        ref.on('value', listener, reject);
      }));
      return await ref.transaction(update, undefined, false);
    } finally {
      if (listener) ref.off('value', listener);
    }
  }
  async function transactWithRollback(ref, update, rollback, label) {
    // Firebase writes cannot be aborted by Promise.race. If the local timeout wins,
    // observe the original transaction and compensate if it commits later.
    const request = roomTransaction(ref, update);
    try {
      return await bounded(request);
    } catch (error) {
      if (error?.message === 'TIMEOUT') {
        Promise.resolve(request).then(result => {
          if (result?.committed) return rollback();
        }).catch(lateError => report(`${label} late-commit cleanup`, lateError));
      }
      throw error;
    }
  }
  function removeCancelledParticipant(ref) {
    return roomTransaction(ref, data => {
      const players = data?.players;
      if (!players?.[clientId]) return;
      delete players[clientId];
      const remaining = Object.keys(players).sort();
      if (!remaining.length) return null;
      if (data.host === clientId || !players[data.host]) data.host = remaining[0];
      return data;
    });
  }
  function report(where, error) { console.warn(`[GuessTheSong] ${where}`, error); }
  function toast(message) {
    text('toast', message); $('toast').classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => $('toast').classList.remove('show'), 3500);
  }
  function screen(name) {
    document.querySelectorAll('.screen').forEach(el => el.classList.toggle('active', el.id === `${name}Screen`));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  let stats = { bestScore: 0, bestStreak: 0, roundsPlayed: 0 };
  try {
    const saved = JSON.parse(storage.get('gs5_stats') || '{}');
    Object.keys(stats).forEach(key => { stats[key] = number(saved?.[key]); });
  } catch (error) { report('Invalid saved stats; using defaults', error); }
  function homeStats() {
    text('bestScore', stats.bestScore.toLocaleString());
    html('bestStreak', `${stats.bestStreak} <small>подряд</small>`);
    text('roundsPlayed', stats.roundsPlayed);
  }
  // The leaderboard ID persists. A room participant ID never shares localStorage:
  // two browser tabs must not overwrite each other's answers/presence.
  const persistentId = storage.get('gs5_uid') || uid();
  storage.set('gs5_uid', persistentId);
  const clientId = uid();
  const state = {
    session: 0, token: 0, active: false, mode: 'solo', queue: [], catalog: [],
    round: 0, current: null, options: [], answered: false, heard: false,
    score: 0, streak: 0, bestStreak: 0, correct: 0, lives: CONFIG.lives,
    hintUsed: false, reviveUsed: false, phase: 'idle', attempts: 0,
    audioTick: null, nextTimer: null, cancelPlay: null, heardUntil: 0,
    adPending: false, modalKind: '', replacements: 0, badUrls: new Set()
  };
  let audio = $('audio');
  let lastVolume = 1;
  let sdk = null;
  let platformPlayer = null;
  let adShowing = false;
  const pauseReasons = new Set();
  let db = null;
  let connected = false;
  let serverOffset = 0;
  let room = null;
  let roomEpoch = 0;
  let lobbyBusy = false;
  let lobbyTask = 0;
  const now = () => Date.now() + serverOffset;
  const activePlayers = data => Object.entries(data.players || {}).filter(([, p]) =>
    !p.left && p.online !== false && now() - Number(p.lastSeen || 0) < CONFIG.staleMs);
  // Short disconnects must not remove participants from allAnswered.
  const roundPlayers = data => Object.entries(data.players || {}).filter(([, p]) =>
    !p.left && now() - Number(p.lastSeen || 0) < CONFIG.staleMs);
  const mediaMatches = (data, p, status) => p.media?.round === data.round &&
    p.media?.revision === data.roundRevision && (!status || p.media.status === status);
  async function roomOp(r, key, update) {
    if (!r.requests) r.requests = new Map();
    let request = r.requests.get(key);
    if (!request) {
      request = roomTransaction(r.ref, update); r.requests.set(key, request);
      // A timeout cannot abort Firebase. Do not enqueue the same operation again
      // until the original request has actually settled.
      request.then(() => r.requests.delete(key), () => r.requests.delete(key));
    }
    return bounded(request);
  }
  async function publishMediaStatus(r, status, permanent = false) {
    if (!r || room !== r || !connected || r.mediaBusy || r.data?.state !== 'playing') return;
    const data = r.data, round = data.round, revision = data.roundRevision, match = data.matchId;
    if (state.round !== round || state.roundRevision !== revision) return;
    const me = data.players?.[clientId] || {};
    if (mediaMatches(data, me, status) || (status === 'ready' && mediaMatches(data, me, 'failed'))) return;
    r.mediaBusy = true;
    try {
      await roomOp(r, `media:${match}:${round}:${revision}:${status}`, current => {
        const p = current?.players?.[clientId];
        if (room !== r || !connected || !p || p.left || current.state !== 'playing' ||
            current.matchId !== match || current.round !== round || current.roundRevision !== revision || current.revealAt) return;
        if (mediaMatches(current, p, status) || (status === 'ready' && mediaMatches(current, p, 'failed'))) return;
        p.media = { round, revision, status, permanent: !!permanent };
        // A media fault is a ROOM event, never a player's answer or a lost round.
        if (status === 'failed') replaceRoomTrack(current, round - 1, !!permanent);
        return current;
      });
    } catch (error) { roomError(r, error); }
    finally { r.mediaBusy = false; }
  }
  const currentName = () => String(platformPlayer?.name || `Игрок ${clientId.slice(-4)}`).slice(0, 60);

  // One additional control is inserted by JS; the original HTML remains usable.
  const skipBtn = document.createElement('button');
  skipBtn.id = 'skipTrackBtn'; skipBtn.type = 'button'; skipBtn.className = 'sound-btn';
  skipBtn.textContent = 'Пропустить трек'; skipBtn.hidden = true;
  $('playClipBtn').parentNode.appendChild(skipBtn);
  text('questionSub', 'Нажми «Слушать», чтобы включить фрагмент.');
  document.querySelectorAll('[data-i18n="topTitle"]').forEach(el => { el.textContent = 'Таблица рекордов'; });
  // document.querySelectorAll('[data-i18n="miniNote"]').forEach(el => { el.textContent = 'Песни загружаются из папки music на сервере игры.'; });
  $('mpRoomInput').inputMode = 'numeric';

  const sfx = {
    ctx: null,
    play(good) {
      try {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context || !audio.volume) return;
        if (!this.ctx) this.ctx = new Context();
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(error => report('SFX resume', error));
        const osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.frequency.value = good ? 660 : 150;
        gain.gain.setValueAtTime(0.08 * audio.volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
        osc.connect(gain); gain.connect(this.ctx.destination); osc.start();
        osc.stop(this.ctx.currentTime + 0.2); osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      } catch (error) { report('Optional sound effect', error); }
    }
  };
  // Load complete files before playback, not all 1200 tracks. External URLs
  // require CORS; same-origin music/ is recommended. No automatic autoplay.
  class MediaCache {
    constructor() {
      this.entries = new Map(); this.jobs = new Map(); this.queue = [];
      this.running = 0; this.bytes = 0; this.failures = new Map();
      this.maxFile = 20 * 1024 * 1024; this.maxBytes = 48 * 1024 * 1024;
    }
    key(url) { return new URL(url, document.baseURI).href; }
    get(url, foreground = false) {
      let key;
      try { key = this.key(url); } catch (_) { return Promise.reject(new Error('EMPTY_AUDIO_URL')); }
      const cached = this.entries.get(key);
      if (cached) { cached.used = Date.now(); return Promise.resolve(cached); }
      const failure = this.failures.get(key);
      if (failure && failure.until > Date.now()) return Promise.reject(failure.error);
      const existing = this.jobs.get(key);
      if (existing) { if (foreground) existing.priority = 1; return existing.promise; }
      const job = { key, priority: foreground ? 1 : 0 };
      job.promise = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
      this.jobs.set(key, job); this.queue.push(job); this.pump(); return job.promise;
    }
    pump() {
      while (this.running < 2 && this.queue.length) {
        this.queue.sort((a, b) => b.priority - a.priority);
        const job = this.queue.shift(); this.running++;
        this.fetchTrack(job.key).then(entry => {
          this.entries.set(job.key, entry); this.bytes += entry.size;
          this.trim(job.key); this.failures.delete(job.key); job.resolve(entry);
        }, error => {
          this.failures.set(job.key, { error, until: Date.now() + (error.permanent ? 300000 : 8000) });
          job.reject(error);
        }).finally(() => { this.jobs.delete(job.key); this.running--; this.pump(); });
      }
    }
    async fetchTrack(key) {
      let error;
      for (let attempt = 0; attempt < 3; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), CONFIG.loadMs);
        try {
          if (navigator.onLine === false) throw new Error('OFFLINE');
          const response = await fetch(key, { signal: controller.signal,
            cache: attempt ? 'reload' : 'default', credentials: 'same-origin' });
          if (!response.ok) {
            const e = new Error(`AUDIO_HTTP_${response.status}`);
            e.permanent = [400, 401, 403, 404, 410].includes(response.status); throw e;
          }
          const type = (response.headers.get('content-type') || '').toLowerCase();
          if (/text\/html|application\/json/.test(type)) {
            const e = new Error('AUDIO_IS_NOT_MEDIA'); e.permanent = true; throw e;
          }
          const tooLarge = () => { const e = new Error('AUDIO_FILE_TOO_LARGE'); e.permanent = true; return e; };
          if (Number(response.headers.get('content-length')) > this.maxFile) throw tooLarge();
          let blob;
          if (response.body?.getReader) {
            const reader = response.body.getReader(), chunks = []; let size = 0;
            try {
              for (;;) {
                const { done, value } = await reader.read(); if (done) break;
                size += value.byteLength;
                if (size > this.maxFile) { controller.abort(); throw tooLarge(); }
                chunks.push(value);
              }
              blob = new Blob(chunks, { type: type || 'audio/mpeg' });
            } finally { reader.releaseLock(); }
          } else blob = await response.blob();
          clearTimeout(timer);
          if (!blob.size) { const e = new Error('EMPTY_AUDIO_FILE'); e.permanent = true; throw e; }
          if (blob.size > this.maxFile) throw tooLarge();
          const src = URL.createObjectURL(blob);
          try { await this.validate(src); }
          catch (e) { URL.revokeObjectURL(src); throw e; }
          return { src, size: blob.size, used: Date.now() };
        } catch (e) {
          error = e; report(`Audio preload attempt ${attempt + 1}: ${key}`, e);
          if (e.permanent || navigator.onLine === false) break;
          if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 350 * (attempt + 1)));
        } finally { clearTimeout(timer); }
      }
      throw error;
    }
    validate(src) {
      return new Promise((resolve, reject) => {
        const probe = document.createElement('audio'); probe.preload = 'auto'; let done = false;
        const finish = error => {
          if (done) return; done = true; clearTimeout(timer);
          probe.onloadedmetadata = probe.oncanplay = probe.onerror = null;
          probe.removeAttribute('src'); probe.load(); error ? reject(error) : resolve();
        };
        const check = () => {
          if (Number.isFinite(probe.duration) && probe.duration < CONFIG.clip - 0.1) {
            const e = new Error('AUDIO_SHORTER_THAN_CLIP'); e.permanent = true; finish(e);
          } else if (Number.isFinite(probe.duration) && probe.readyState >= 3) finish();
        };
        const timer = setTimeout(() => finish(new Error('MEDIA_PREPARE_TIMEOUT')), 6000);
        probe.onloadedmetadata = probe.oncanplay = check;
        probe.onerror = () => { const e = new Error(`MEDIA_DECODE_${probe.error?.code || 0}`); e.permanent = true; finish(e); };
        probe.src = src; probe.load();
      });
    }
    trim(keep) {
      const pinned = new Set();
      if (state.current?.previewUrl) pinned.add(this.key(state.current.previewUrl));
      if (state.active && state.mode === 'mp') {
        state.queue.slice(Math.max(0, state.round - 1), state.round + CONFIG.lookAhead)
          .forEach(entry => { if (entry?.answer?.previewUrl) pinned.add(this.key(entry.answer.previewUrl)); });
      }
      // At most current + two upcoming files are pinned (each <= maxFile).
      for (const [key] of [...this.entries].sort((a, b) => a[1].used - b[1].used)) {
        if (this.entries.size <= 4 && this.bytes <= this.maxBytes) break;
        if (key !== keep && !pinned.has(key)) this.drop(key);
      }
    }
    drop(key) {
      const entry = this.entries.get(key); if (!entry) return;
      URL.revokeObjectURL(entry.src); this.bytes -= entry.size; this.entries.delete(key);
    }
    invalidate(url) { try { this.drop(this.key(url)); } catch (_) { /* Invalid URL has no entry. */ } }
    warm(tracks) { tracks.filter(Boolean).forEach(t => this.get(t.previewUrl).catch(e => report('Background audio warmup', e))); }
  }
  const media = new MediaCache();
  function warmUpcoming() {
    if (state.mode === 'mp') return warmRoomTracks(room);
    media.warm(state.queue.slice(state.round, state.round + 2).map(entry => entry.answer || entry));
  }
  // Prepare upcoming tracks on EVERY client while the current song is played.
  // Statuses identify the exact queue entry, not merely its round number.
  function warmRoomTracks(r) {
    if (!r || room !== r || !connected || r.data?.state !== 'playing') return;
    if (!r.preloads) r.preloads = new Map();
    const data = r.data, match = data.matchId;
    const upcoming = data.sharedQueue.slice(data.round, data.round + CONFIG.lookAhead);
    const ids = new Set(upcoming.map(entry => entry.id));
    for (const id of r.preloads.keys()) if (!ids.has(id)) r.preloads.delete(id);
    upcoming.forEach(entry => {
      let job = r.preloads.get(entry.id);
      if (!job) {
        job = { status: 'loading' }; r.preloads.set(entry.id, job);
        media.get(entry.answer.previewUrl).then(() => {
          if (room !== r || r.preloads.get(entry.id) !== job) return;
          job.status = 'ready'; publishPreparedTrack(r, match, entry, job);
        }, error => {
          if (room !== r || r.preloads.get(entry.id) !== job) return;
          job.status = 'failed'; job.permanent = !!error.permanent;
          publishPreparedTrack(r, match, entry, job);
        });
      } else if (job.status !== 'loading') publishPreparedTrack(r, match, entry, job);
    });
    media.trim();
  }
  async function publishPreparedTrack(r, match, entry, job) {
    if (room !== r || !connected || job.busy || job.status === 'loading') return;
    if (r.data?.players?.[clientId]?.prepared?.[entry.id]?.status === job.status) return;
    job.busy = true;
    try {
      await roomOp(r, `preload:${match}:${entry.id}:${job.status}`, data => {
        const p = data?.players?.[clientId];
        const index = data?.sharedQueue?.findIndex(item => item.id === entry.id);
        if (room !== r || !connected || !p || p.left || data.state !== 'playing' ||
            data.matchId !== match || index < data.round - 1 || index > data.round + CONFIG.lookAhead - 1 ||
            (index === data.round - 1 && data.revealAt)) return;
        if (!p.prepared) p.prepared = {};
        if (p.prepared[entry.id]?.status === job.status || p.prepared[entry.id]?.status === 'failed') return;
        p.prepared[entry.id] = { status: job.status, permanent: !!job.permanent };
        if (job.status === 'failed') replaceRoomTrack(data, index, !!job.permanent);
        return data;
      });
    } catch (error) { roomError(r, error); }
    finally { job.busy = false; }
  }
  function mpRoundOpen() {
    return connected && room?.data?.phase === 'answering' && !room.data.revealAt && now() < room.data.deadline;
  }
  function animate(playing) {
    $('soundWave').classList.toggle('playing', playing);
    const vinyl = $('vinylSvg');
    if (vinyl) vinyl.style.animation = playing ? 'spin 2s linear infinite' : 'none';
  }
  function stopAudio() {
    if (state.cancelPlay) state.cancelPlay();
    state.cancelPlay = null;
    clearInterval(state.audioTick); state.audioTick = null;
    audio.pause(); animate(false);
  }
  function cancelRound() {
    state.token++;
    clearTimeout(state.nextTimer); state.nextTimer = null;
    stopAudio();
    // Detach media handlers before resetting: aborted loads must not affect a new round.
    audio.onerror = null; audio.onended = null;
    if (state.cancelBind) state.cancelBind(); state.cancelBind = null;
    audio.removeAttribute('src'); audio.load();
    skipBtn.hidden = true;
  }
  function endSession() {
    state.active = false; state.session++;
    cancelRound(); state.phase = 'idle'; state.adPending = false;
    $('modal').classList.remove('open'); state.modalKind = '';
  }
  function hearts() {
    html('hearts', state.mode === 'mp' ? '<span>Без ограничения жизней</span>' :
      Array.from({ length: CONFIG.lives }, (_, i) => `<span class="heart ${i < state.lives ? 'live' : ''}">♥</span>`).join(''));
  }
  function hud() {
    text('scoreLabel', state.score.toLocaleString()); text('streakLabel', `Стрик ${state.streak}`); hearts();
  }
  function cover() {
    // No initials of the secret title: the cover must not disclose the answer.
    $('cover').style.cssText = 'background:transparent;border:none;box-shadow:none;border-radius:50%';
    html('cover', '<svg id="vinylSvg" viewBox="0 0 100 100" style="width:100%;height:100%;border-radius:50%"><circle cx="50" cy="50" r="49" fill="#111" stroke="#29243a"/><circle cx="50" cy="50" r="42" fill="none" stroke="#28242e" stroke-width="2"/><circle cx="50" cy="50" r="34" fill="none" stroke="#28242e"/><circle cx="50" cy="50" r="24" fill="none" stroke="#28242e"/><circle cx="50" cy="50" r="14" fill="#a987ff"/><text x="50" y="55" text-anchor="middle" fill="#1a102b" font-size="14">♫</text><circle cx="50" cy="50" r="3" fill="#111"/></svg>');
  }
  function answerButtons() {
    return [...$('answerGrid').querySelectorAll('.answer-btn')];
  }
  function enableAnswers() {
    answerButtons().forEach((button, i) => {
      button.disabled = !state.heard || state.answered ||
        (state.mode === 'mp' && (!state.localReady || !mpRoundOpen())) ||
        (state.hintUsed && state.options[i].artistName !== state.current.artistName);
    });
  }
  function optionsFor(answer) {
    return shuffle([answer, ...shuffle(state.catalog.filter(track => trackKey(track) !== trackKey(answer))).slice(0, 3)]);
  }
  function prepareRound(answer, options) {
    cancelRound();
    state.current = answer; state.options = options;
    state.answered = false; state.heard = false; state.hintUsed = false;
    state.attempts = 0; state.heardUntil = 0; state.localReady = false; state.phase = 'preparing';
    text('roundKicker', `РАУНД ${state.round} / ${state.queue.length}`);
    text('roundStatus', 'Ждём твоего ответа');
    text('questionSub', 'Нажми «Слушать», чтобы включить фрагмент.');
    text('playClipBtn', 'Подготавливаем звук…'); $('playClipBtn').disabled = true;
    text('questionSub', state.mode === 'mp' ? 'Скоро следующий фрагмент…' : 'Подготавливаем фрагмент. Жизни и очки сохраняются.');
    $('answerGrid').style.visibility = state.mode === 'mp' ? 'hidden' : 'visible';
    $('hintBtn').disabled = true; $('timeProgress').style.width = '0%';
    cover(); hud();
    html('answerGrid', options.map((track, index) => `<button class="answer-btn" data-index="${index}" type="button" disabled><span class="answer-letter">${String.fromCharCode(65 + index)}</span><span class="answer-text"><b>${esc(track.trackName)}</b><span>${esc(track.artistName)}</span></span></button>`).join(''));
    // Fresh media node isolates late events and old play() promises on WebKit/Chromium.
    const fresh = document.createElement('audio');
    fresh.id = 'audio'; fresh.preload = 'auto'; fresh.volume = audio.volume;
    fresh.setAttribute('playsinline', '');
    audio.replaceWith(fresh); audio = fresh;
    const token = state.token;
    audio.onerror = () => {
      if (state.active && token === state.token && !state.answered)
        audioFailure(new Error(`MEDIA_${audio.error?.code || 'UNKNOWN'}`), token);
    };
    audio.onended = () => {
      if (state.active && token === state.token && state.heard && !state.answered) clipEnded();
    };
    screen('game');
    if (answer?.previewUrl) bindPreparedAudio(answer, token, fresh);
    else audioFailure(new Error('EMPTY_AUDIO_URL'), token);
  }
  async function bindPreparedAudio(answer, token, node) {
    const current = () => state.active && token === state.token && node === audio && !state.answered;
    try {
      const entry = await media.get(answer.previewUrl, true);
      if (!current()) return;
      // A probe's readyState does not belong to the actual playback node.
      await new Promise((resolve, reject) => {
        let done = false;
        const finish = error => {
          if (done) return; done = true; clearTimeout(timer);
          node.removeEventListener('canplay', ready); node.removeEventListener('error', failed);
          state.cancelBind = null; error ? reject(error) : resolve();
        };
        const ready = () => finish();
        const failed = () => finish(new Error(`MEDIA_BIND_${node.error?.code || 0}`));
        const timer = setTimeout(() => finish(new Error('MEDIA_BIND_TIMEOUT')), 6000);
        state.cancelBind = () => finish(new Error('CANCELLED'));
        node.addEventListener('canplay', ready); node.addEventListener('error', failed);
        node.src = entry.src; node.load(); if (node.readyState >= 3) ready();
      });
      if (!current()) return;
      state.phase = 'ready'; state.localReady = true;
      text('questionSub', state.mode === 'mp' && !mpRoundOpen() ? 'Скоро следующий фрагмент…' : 'Фрагмент загружен. Нажми «Слушать».');
      text('playClipBtn', '▶ Слушать 5 сек');
      $('playClipBtn').disabled = state.mode === 'mp' && !mpRoundOpen();
      $('hintBtn').disabled = state.mode === 'mp';
      if (state.mode === 'mp') publishMediaStatus(room, 'ready');
      warmUpcoming();
    } catch (error) { if (current() && error.message !== 'CANCELLED') audioFailure(error, token); }
  }
  function clipEnded() {
    stopAudio(); state.phase = 'ended';
    $('timeProgress').style.width = '100%';
    text('questionSub', 'Фрагмент закончился — выбирай ответ.');
    text('playClipBtn', '↻ Послушать ещё');
    $('playClipBtn').disabled = state.answered || state.adPending || (state.mode === 'mp' && !mpRoundOpen());
    enableAnswers();
  }
  function audioFailure(error, token) {
    if (!state.active || token !== state.token || state.answered || ['error', 'offline'].includes(state.phase)) return;
    report(`Audio round ${state.round}, ${state.current?.previewUrl}`, error);
    stopAudio(); state.phase = 'error'; state.localReady = false;
    media.invalidate(state.current?.previewUrl);
    $('playClipBtn').disabled = true; $('hintBtn').disabled = true;
    text('playClipBtn', 'Восстанавливаем звук…');
    if (state.mode === 'mp') {
      state.heard = false; state.mediaPermanent = !!error.permanent;
      answerButtons().forEach(button => { button.disabled = true; });
      $('answerGrid').style.visibility = 'hidden';
      text('playClipBtn', 'Подготавливаем звук…');
      text('questionSub', 'Скоро следующий фрагмент…');
      publishMediaStatus(room, 'failed', state.mediaPermanent);
      return;
    }
    if (navigator.onLine === false) {
      state.phase = 'offline';
      text('questionSub', 'Ожидаем интернет. Игра сохранена — продолжим после восстановления связи.');
      text('roundStatus', 'Пауза без штрафа'); return;
    }
    state.badUrls.add(state.current?.previewUrl);
    text('questionSub', 'Автоматически подбираем доступный трек. Без потери жизни и серии.');
    const session = state.session; clearTimeout(state.nextTimer);
    state.nextTimer = setTimeout(() => {
      if (state.active && session === state.session && token === state.token) skipTrack();
    }, 450);
  }
  async function playClip() {
    if (!state.active || state.answered || state.adPending || adShowing ||
        ['preparing', 'loading', 'playing', 'error', 'offline'].includes(state.phase)) return;
    if (pauseReasons.size || document.hidden) { toast('Вернись в игру, чтобы включить звук.'); return; }
    if (state.mode === 'mp' && !mpRoundOpen()) return;
    const token = state.token, node = audio;
    const resume = state.phase === 'paused';
    if (!resume) state.attempts++;
    state.phase = 'loading'; text('playClipBtn', 'Загрузка звука…'); $('playClipBtn').disabled = true;
    text('questionSub', 'Загружаем фрагмент…');
    let settled = false;
    const stale = () => !state.active || token !== state.token || node !== audio || state.answered;
    const startedAt = performance.now();
    let lastPosition = Number(node.currentTime) || 0, lastMovement = startedAt;
    const onPlaying = () => {
      if (settled || stale()) return;
      settled = true; state.phase = 'playing'; state.heard = true;
      lastMovement = performance.now();
      text('playClipBtn', '♪ Играет…'); text('questionSub', 'Слушай и выбирай ответ.');
      animate(true); enableAnswers();
    };
    node.addEventListener('playing', onPlaying);
    state.cancelPlay = () => { settled = true; node.removeEventListener('playing', onPlaying); };
    clearInterval(state.audioTick);
    state.audioTick = setInterval(() => {
      if (stale()) return;
      const time = performance.now(), position = Number(node.currentTime) || 0;
      if (position > lastPosition + 0.015) { lastPosition = position; lastMovement = time; }
      if (state.phase === 'loading' && time - startedAt > CONFIG.loadMs)
        return audioFailure(new Error('PLAY_TIMEOUT'), token);
      if (state.phase === 'playing') {
        state.heardUntil = Math.max(state.heardUntil, position);
        $('timeProgress').style.width = `${Math.min(100, position / CONFIG.clip * 100)}%`;
        if (position >= CONFIG.clip) return clipEnded();
        if (time - lastMovement > CONFIG.stallMs) audioFailure(new Error('PLAYBACK_STALLED'), token);
      }
    }, 80);
    try {
      // Keep play() in the actual click call stack (required by mobile autoplay policies).
      if (!node.getAttribute('src')) throw new Error('EMPTY_AUDIO_URL');
      if (!resume) {
        node.currentTime = 0; // Replay the buffered Blob without another network load.
      }
      const promise = node.play();
      if (promise && typeof promise.then === 'function') await promise;
      if (!stale() && state.phase === 'loading') onPlaying();
    } catch (error) {
      if (stale() || state.phase === 'paused' || state.phase === 'error') return;
      if (error?.name === 'NotAllowedError') {
        stopAudio(); state.phase = 'ready'; state.attempts = Math.max(0, state.attempts - 1);
        text('questionSub', 'Браузер заблокировал звук. Нажми «Слушать» ещё раз.');
        text('playClipBtn', '▶ Разрешить звук'); $('playClipBtn').disabled = false;
      } else audioFailure(error, token);
    }
  }
  function pauseAudio(reason) {
    pauseReasons.add(reason);
    if (!state.active || !['playing', 'loading'].includes(state.phase)) return;
    stopAudio(); state.phase = 'paused';
    text('questionSub', state.mode === 'mp' ? 'Звук на паузе. Общее время раунда продолжается.' : 'Звук на паузе.');
    text('playClipBtn', '▶ Продолжить фрагмент'); $('playClipBtn').disabled = false;
  }
  function resumeAudio(reason) {
    pauseReasons.delete(reason);
    // Never silently restart an old track after an ad or a change of screen.
    if (state.active && state.phase === 'paused' && !state.answered && !pauseReasons.size)
      text('questionSub', 'Нажми «Продолжить фрагмент», чтобы вернуть звук.');
  }
  document.addEventListener('visibilitychange', () => document.hidden ? pauseAudio('hidden') : resumeAudio('hidden'));
  window.addEventListener('online', () => {
    if (state.active && state.mode === 'solo' && state.phase === 'offline') {
      media.failures.clear(); prepareRound(state.current, state.options);
    }
  });

  async function loadCatalog() {
    text('catalogStatus', 'Загрузка каталога…'); $('startBtn').disabled = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.loadMs);
    try {
      const response = await fetch('catalog.json', { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('CATALOG_NOT_ARRAY');
      const seen = new Set();
      state.catalog = data.filter(track => {
        if (!track || typeof track.trackName !== 'string' || typeof track.artistName !== 'string' ||
            typeof track.previewUrl !== 'string' || !track.previewUrl.trim()) return false;
        let url;
        try { url = new URL(track.previewUrl, document.baseURI); } catch (_) { return false; }
        if (!['https:', 'http:'].includes(url.protocol)) return false;
        const key = trackKey(track); if (seen.has(key)) return false;
        seen.add(key); return true;
      }).map(track => ({ trackName: track.trackName, artistName: track.artistName, previewUrl: track.previewUrl }));
      if (state.catalog.length < 4) throw new Error('LESS_THAN_FOUR_UNIQUE_TRACKS');
      text('catalogCount', state.catalog.length);
      text('catalogStatus', `${state.catalog.length} песен в каталоге`);
      $('catalogStatus').className = 'status-chip online';
      $('startBtn').disabled = false;
    } catch (error) {
      state.catalog = []; report('Catalog', error);
      text('catalogStatus', 'Каталог недоступен. Проверь catalog.json и обнови страницу.');
      $('catalogStatus').className = 'status-chip warn'; text('catalogCount', 'Ошибка');
    } finally { clearTimeout(timer); networkButtons(); }
  }
  function resetGame(mode, queue) {
    endSession();
    Object.assign(state, { active: true, mode, queue, round: 0, score: 0, streak: 0,
      bestStreak: 0, correct: 0, lives: CONFIG.lives, answered: false, heard: false,
      reviveUsed: false, hintUsed: false, replacements: 0, badUrls: new Set() });
    $('mpScoreBoard').style.display = mode === 'mp' ? 'block' : 'none';
    $('formulaCard').style.display = mode === 'mp' ? 'none' : 'block';
    $('catalogCard').style.display = mode === 'mp' ? 'none' : 'block';
  }
  function startSolo() {
    if (state.catalog.length < 4) return toast('Каталог ещё не готов.');
    if (room || lobbyBusy) return toast('Сначала выйди из сетевой комнаты.');
    resetGame('solo', shuffle(state.catalog).slice(0, CONFIG.rounds)); nextSoloRound();
  }
  function nextSoloRound() {
    if (!state.active || state.mode !== 'solo') return;
    if (state.round >= state.queue.length) return finishSolo();
    if (state.lives <= 0) {
      if (!state.reviveUsed) return askRevive();
      return finishSolo();
    }
    state.round++; state.replacements = 0;
    const answer = state.queue[state.round - 1]; prepareRound(answer, optionsFor(answer));
  }
  function markAnswer(index, correct) {
    answerButtons().forEach((button, i) => {
      button.disabled = true;
      if (trackKey(state.options[i]) === trackKey(state.current)) button.classList.add('correct');
      if (i === index && !correct) button.classList.add('wrong');
    });
  }
  function answerRound(index) {
    if (!state.active || state.answered || state.adPending || !state.options[index]) return;
    if (!state.heard) return toast('Сначала включи фрагмент.');
    if (state.mode === 'mp') return submitMp(index, 'answer');
    state.answered = true; stopAudio(); state.phase = 'answered';
    const correct = trackKey(state.options[index]) === trackKey(state.current);
    markAnswer(index, correct); sfx.play(correct);
    if (correct) {
      state.correct++; state.streak++; state.bestStreak = Math.max(state.bestStreak, state.streak);
      const points = 100 * multiplier(state.streak); state.score += points;
      text('roundStatus', `Верно! +${points} очков`);
    } else {
      state.streak = 0; state.lives--;
      text('roundStatus', `Не угадал. Это «${state.current.trackName}»`);
    }
    $('playClipBtn').disabled = true; $('hintBtn').disabled = true; skipBtn.hidden = true; hud();
    const session = state.session, token = state.token;
    state.nextTimer = setTimeout(() => {
      if (state.active && session === state.session && token === state.token) nextSoloRound();
    }, correct ? 1000 : 1500);
  }
  function skipTrack() {
    if (!state.active || state.answered || state.adPending) return;
    if (state.mode === 'mp') return audioFailure(new Error('MEDIA_UNAVAILABLE'), state.token);
    const used = new Set(state.queue.map(trackKey));
    const replacement = shuffle(state.catalog).find(track => !used.has(trackKey(track)) && !state.badUrls.has(track.previewUrl));
    if (replacement && state.replacements < CONFIG.maxReplacements) {
      state.replacements++; state.queue[state.round - 1] = replacement;
      prepareRound(replacement, optionsFor(replacement));
    } else {
      // An unavailable origin cannot be fixed by burning through silent rounds.
      state.phase = 'offline';
      text('questionSub', 'Сервер музыки недоступен. Прогресс сохранён. Повтори после восстановления связи.');
      text('roundStatus', 'Пауза без штрафа'); text('playClipBtn', '↻ Проверить связь');
      $('playClipBtn').disabled = false;
    }
  }
  function saveStats() {
    storage.set('gs5_stats', JSON.stringify(stats)); homeStats();
    if (platformPlayer?.setData) bounded(platformPlayer.setData(stats)).catch(error => report('Cloud save', error));
    submitLeaderboard();
  }
  function resultFacts() {
    text('finalScore', state.score.toLocaleString()); text('finalCorrect', `${state.correct}/${state.queue.length}`);
    text('finalStreak', state.bestStreak); text('finalMultiplier', `×${multiplier(state.bestStreak)}`);
  }
  function finishSolo() {
    if (!state.active) return;
    const newRecord = state.score > stats.bestScore;
    endSession(); stats.bestScore = Math.max(stats.bestScore, state.score);
    stats.bestStreak = Math.max(stats.bestStreak, state.bestStreak); stats.roundsPlayed++; saveStats();
    resultFacts(); text('resultTitle', state.lives <= 0 ? 'Жизни закончились' : 'Раунд окончен');
    text('resultCopy', newRecord ? 'Новый личный рекорд!' : 'Следующий стрик может быть ещё длиннее.'); screen('result');
    if (stats.roundsPlayed % 3 === 0) fullscreenAd();
  }

  // Pikabu APIs are optional. Their failure must not block the catalog/game.
  let sdkStarting = false;
  async function initSdk() {
    if (sdk || sdkStarting) return;
    const instance = window.PkbSDK || window.PikabuSDK || window.PikabuGames;
    if (!instance?.init) return;
    sdkStarting = true;
    try {
      sdk = await bounded(instance.init(), 8000); platformPlayer = sdk?.player || null;
      if (typeof sdk?.on === 'function') {
        sdk.on('pause', () => pauseAudio('platform'));
        sdk.on('resume', () => resumeAudio('platform'));
      }
      if (platformPlayer?.getData) {
        bounded(platformPlayer.getData(Object.keys(stats))).then(data => {
          Object.keys(stats).forEach(key => { stats[key] = Math.max(stats[key], number(data?.[key])); });
          homeStats();
        }).catch(error => report('Cloud load', error));
      }
      if (typeof sdk?.gameStarted === 'function') sdk.gameStarted();
    } catch (error) { report('Pikabu SDK initialization', error); }
    finally { sdkStarting = false; }
  }
  async function fullscreenAd() {
    const ad = sdk?.ads?.fullscreen;
    if (state.mode === 'mp' || room || adShowing || !ad?.isSupported) return;
    try {
      if (!await bounded(ad.canShow(), 5000) || state.active || room) return;
      adShowing = true; pauseAudio('ad'); await bounded(ad.show(), 60000);
    } catch (error) { report('Fullscreen ad', error); }
    finally { adShowing = false; resumeAudio('ad'); }
  }
  async function rewardedAd() {
    if (!sdk) { toast('Тестовый режим без SDK: бонус выдан без рекламы.'); return true; }
    const ad = sdk.ads?.rewarded;
    if (adShowing || !ad?.isSupported) return false;
    try {
      if (!await bounded(ad.canShow(), 5000)) return false;
      adShowing = true; pauseAudio('ad');
      const result = await bounded(ad.show(), 60000);
      return !!(result?.rendered && result?.reward);
    } catch (error) { report('Rewarded ad', error); return false; }
    finally { adShowing = false; resumeAudio('ad'); }
  }
  function openModal(kind, title, message, actions) {
    state.modalKind = kind; text('modalTitle', title); text('modalText', message);
    $('modalActions').replaceChildren();
    actions.forEach(([label, callback]) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary-btn';
      button.textContent = label; button.onclick = callback; $('modalActions').appendChild(button);
    });
    $('modal').classList.add('open');
  }
  function closeModal() { $('modal').classList.remove('open'); state.modalKind = ''; }
  function askRevive() {
    stopAudio(); const session = state.session;
    openModal('revive', 'Вторая попытка', 'Реклама даёт одну дополнительную жизнь.', [
      ['🎥 Продолжить', async () => {
        if (state.adPending) return;
        state.adPending = true; closeModal(); const rewarded = await rewardedAd();
        if (!state.active || state.session !== session) return;
        state.adPending = false;
        if (rewarded) { state.reviveUsed = true; state.lives = 1; nextSoloRound(); }
        else { toast('Реклама недоступна.'); finishSolo(); }
      }], ['Завершить', () => { closeModal(); finishSolo(); }]
    ]);
  }
  async function useHint() {
    if (!state.active || state.mode !== 'solo' || state.answered || state.hintUsed || state.adPending) return;
    const token = state.token; state.adPending = true; $('hintBtn').disabled = true;
    pauseAudio('hint'); const rewarded = await rewardedAd(); resumeAudio('hint');
    if (!state.active || token !== state.token) return;
    state.adPending = false;
    if (rewarded) {
      state.hintUsed = true;
      answerButtons().forEach((button, i) => {
        if (state.options[i].artistName !== state.current.artistName) button.style.opacity = '.35';
      });
      toast(`Исполнитель — ${state.current.artistName}`);
    } else { $('hintBtn').disabled = false; toast('Реклама недоступна.'); }
    enableAnswers();
  }

  // Firebase protocol 5. Every normal room write is one root transaction.
  // Never use set/update/child transactions inside this subtree: they can cancel
  // pending ancestor transactions in the Firebase client.
  // This is reliability logic, NOT anti-cheat; production authorization belongs in RTDB rules/backend.
  function networkButtons() {
    text('networkStatus', connected && db ? 'Мультиплеер подключён · версия 3.2.0' :
      db ? 'Мультиплеер: подключаемся к серверу…' : 'Мультиплеер недоступен: сервер не подключён. Одиночная игра работает.');
    if ($('networkStatus')) $('networkStatus').className = `status-chip ${connected && db ? 'online' : 'warn'}`;
    ['btn1v1', 'btnCustom'].forEach(id => {
      $(id).disabled = !db || !connected || state.catalog.length < 4 || lobbyBusy || adShowing;
      $(id).title = !connected ? 'Нет соединения с сервером' : '';
    });
  }
  function initFirebase() {
    try {
      if (db || typeof firebase === 'undefined' || typeof firebase.database !== 'function') return;
      if (!firebase.apps.length) firebase.initializeApp({
        apiKey: 'AIzaSyAF_F3-LODFm7ZDCS5D0x-xq8XJ2e8Atl8',
        authDomain: 'guessthesong-97155.firebaseapp.com',
        databaseURL: 'https://guessthesong-97155-default-rtdb.firebaseio.com',
        projectId: 'guessthesong-97155', storageBucket: 'guessthesong-97155.firebasestorage.app',
        messagingSenderId: '163574999757', appId: '1:163574999757:web:c7d939c4d7a030dde25784',
        measurementId: 'G-9YVHHLLX22'
      });
      db = firebase.database();
      db.ref('.info/serverTimeOffset').on('value', snap => { serverOffset = Number(snap.val()) || 0; });
      db.ref('.info/connected').on('value', snap => {
        connected = snap.val() === true; networkButtons();
        if (!room) { if (connected) leaderboard(); return; }
        const r = room;
        if (!connected) {
          pauseAudio('network'); toast('Соединение потеряно. Пытаемся восстановить…');
          clearTimeout(r.offlineTimer);
          r.offlineTimer = setTimeout(() => {
            if (room === r && !connected) toast('Связь пока не восстановлена. Ожидаем сервер; можно выйти самостоятельно.');
          }, CONFIG.reconnectMs);
        } else {
          clearTimeout(r.offlineTimer); resumeAudio('network');
          // Re-arm onDisconnect after every reconnection; do not resurrect deleted rooms.
          armPresence(r).then(() => heartbeat(r)).catch(error => roomError(r, error));
        }
      });
    } catch (error) { db = null; report('Firebase init', error); networkButtons(); }
  }
  function roomError(r, error) {
    report('Firebase room operation', error);
    if (room !== r) return;
    const code = String(error?.code || error?.message || '');
    if (/permission|denied|ROOM_VERSION_MISMATCH|INVALID_/i.test(code)) {
      toast(/permission|denied/i.test(code) ? 'Firebase запретил доступ. Владельцу игры нужно проверить правила базы.' :
        code === 'ROOM_VERSION_MISMATCH' ? 'Версии игры различаются. Всем нужно обновить страницу.' : 'Некорректные данные комнаты. Создай новую комнату.');
      leaveRoom(); return;
    }
    r.retryAt = now() + 3000;
    if (!r.lastError || now() - r.lastError > 5000) {
      r.lastError = now(); toast('Сервер задерживает ответ. Восстанавливаем связь без выхода из комнаты.');
    }
  }
  function lobbyControls(busy) {
    lobbyBusy = busy; networkButtons(); $('btnCreateRoom').disabled = busy; $('btnJoinRoom').disabled = busy;
  }
  function showLobby() {
    if (!connected || !db) return toast('Сетевые функции недоступны.');
    if (state.catalog.length < 4 || adShowing) return toast('Дождись загрузки каталога.');
    text('mpTitle', 'Своя игра'); $('mpSelection').style.display = 'block'; $('mpLobby').style.display = 'none';
    $('mpModal').classList.add('open');
  }
  function displayLobby(r) {
    $('mpSelection').style.display = 'none'; $('mpLobby').style.display = 'block';
    $('mpCodeBlock').style.display = r.type === 'custom' ? 'block' : 'none'; text('mpRoomCodeDisplay', r.id);
    text('mpTitle', r.type === '1v1' ? 'Поиск 1 на 1…' : 'Своя игра');
    $('mpModal').classList.add('open');
  }
  const playerRecord = () => ({ name: currentName(), online: true, lastSeen: now(),
    score: 0, streak: 0, bestStreak: 0, correct: 0 });
  async function createRoom(type, task) {
    for (let attempt = 0; attempt < 6; attempt++) {
      if (task !== lobbyTask || !connected) throw new Error('CANCELLED');
      const id = String(Math.floor(100000 + Math.random() * 900000));
      const ref = db.ref(`rooms/${id}`);
      const result = await transactWithRollback(ref, data => {
        if (task !== lobbyTask || !connected || data !== null) return;
        return { protocol: PROTOCOL, type, state: 'waiting', host: clientId, createdAt: now(),
          players: { [clientId]: playerRecord() } };
      }, () => removeCancelledParticipant(ref), 'Room creation');
      if (result.committed) {
        if (task !== lobbyTask) {
          removeCancelledParticipant(ref).catch(error => report('Cancelled room creation cleanup', error));
          return;
        }
        return attachRoom(id, type, task);
      }
    }
    throw new Error('ROOM_CODE_COLLISION');
  }
  async function joinRoom(id, type, task) {
    const ref = db.ref(`rooms/${id}`);
    if (task !== lobbyTask || !connected) throw new Error('CANCELLED');
    let reason = 'Комната недоступна.';
    const result = await transactWithRollback(ref, data => {
      if (task !== lobbyTask || !connected) return;
      if (!data) { reason = 'Комната не найдена. Проверь код и одинаковую версию игры.'; return; }
      if (data.protocol !== PROTOCOL) { reason = 'Разные версии игры. Всем нужно обновить страницу и создать новую комнату.'; return; }
      if (data.state !== 'waiting') { reason = 'Игра уже началась.'; return; }
      if (data.type !== type) { reason = 'Неверный тип комнаты.'; return; }
      const players = data.players || {};
      // `onDisconnect` marks a brief network interruption offline immediately.
      // Keep that participant for the stale interval so reconnect can restore it.
      Object.entries(players).forEach(([key, p]) => {
        if (now() - Number(p.lastSeen || 0) >= CONFIG.staleMs) delete players[key];
      });
      const limit = type === '1v1' ? 2 : CONFIG.maxPlayers;
      if (Object.keys(players).length >= limit) { reason = 'Комната заполнена.'; return; }
      players[clientId] = playerRecord(); data.players = players;
      if (!players[data.host]) data.host = Object.keys(players).sort()[0];
      return data;
    }, () => removeCancelledParticipant(ref), 'Room join');
    if (!result.committed) throw new Error(reason);
    if (task !== lobbyTask) {
      removeCancelledParticipant(ref).catch(error => report('Cancelled room join cleanup', error));
      return;
    }
    return attachRoom(id, type, task);
  }
  async function lobbyAction(action) {
    if (lobbyBusy || room || !connected || adShowing) return;
    const task = ++lobbyTask; lobbyControls(true);
    try { await action(task); }
    catch (error) {
      report('Create/join room', error);
      if (task === lobbyTask) toast(/permission|denied/i.test(String(error.code || error.message)) ?
        'Firebase запретил доступ к комнатам. Нужна проверка правил базы владельцем игры.' :
        error.message === 'TIMEOUT' ? 'Сервер не ответил вовремя. Проверь подключение.' :
        error.message === 'CANCELLED' ? 'Подключение отменено.' : error.message);
    } finally { if (task === lobbyTask) lobbyControls(false); }
  }
  async function matchmaking(task) {
    const snap = await bounded(db.ref('rooms').orderByChild('type').equalTo('1v1').once('value'));
    const candidates = [];
    snap.forEach(child => {
      const data = child.val();
      if (data?.protocol === PROTOCOL && data.state === 'waiting' && activePlayers(data).length === 1) candidates.push(child.key);
    });
    for (const id of shuffle(candidates)) {
      if (task !== lobbyTask) return;
      try { await joinRoom(id, '1v1', task); return; }
      catch (error) { if (error.message === 'TIMEOUT' || error.code === 'PERMISSION_DENIED') throw error; }
    }
    return createRoom('1v1', task);
  }
  async function armPresence(r) {
    if (room !== r || !connected) return;
    const hook = r.ref.child(`players/${clientId}`).onDisconnect();
    const request = hook.update({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP });
    // A registration may complete after leaving the lobby. Do not leave a stale hook.
    Promise.resolve(request).then(() => {
      if (room !== r) return hook.cancel();
    }).catch(error => report('Presence registration', error));
    await bounded(request);
  }
  async function heartbeat(r) {
    if (room !== r || !connected || r.heartbeatBusy || r.data?.state === 'finished') return;
    r.heartbeatBusy = true;
    try {
      // A transaction cannot recreate a player after the room has been deleted.
      await roomOp(r, 'heartbeat', data => {
        if (room !== r || !connected || !data?.players?.[clientId] || data.players[clientId].left || data.state === 'finished') return;
        data.players[clientId].online = true;
        data.players[clientId].lastSeen = now(); return data;
      });
    } catch (error) { roomError(r, error); }
    finally { r.heartbeatBusy = false; }
  }
  async function attachRoom(id, type, task) {
    if (task !== lobbyTask) return;
    endSession();
    // A new room must not inherit an outstanding answer or platform pause.
    resumeAudio('network');
    const r = { id, type, ref: db.ref(`rooms/${id}`), epoch: ++roomEpoch, data: null,
      pending: false, starting: false, submitting: null, heartbeatBusy: false, matchId: null, finished: false };
    room = r; displayLobby(r);
    r.listener = snap => {
      if (room !== r) return;
      const data = snap.val();
      if (!data || !data.players?.[clientId]) { toast('Комната закрыта или участие завершено.'); return leaveRoom(); }
      r.data = data;
      try { renderRoom(r); } catch (error) { roomError(r, error); }
    };
    r.ref.on('value', r.listener, error => roomError(r, error));
    await armPresence(r);
    if (room !== r) return;
    r.heartbeat = setInterval(() => heartbeat(r), CONFIG.heartbeatMs);
    r.tick = setInterval(() => roomTick(r), 400);
  }
  function renderRoom(r) {
    const data = r.data, players = data.players || {};
    if (data.protocol !== PROTOCOL) throw new Error('ROOM_VERSION_MISMATCH');
    if (data.state === 'waiting') {
      const live = activePlayers(data), liveIds = new Set(live.map(([id]) => id));
      html('mpPlayersList', Object.entries(players).map(([id, p]) =>
        `<div class="mp-player ${liveIds.has(id) ? 'ready' : ''}"><span>${esc(p.name)}${id === clientId ? ' (ты)' : ''}${id === data.host ? ' 👑' : ''}</span><span>${liveIds.has(id) ? 'В комнате' : 'Не в сети'}</span></div>`).join(''));
      $('btnStartMp').style.display = data.type === 'custom' && data.host === clientId ? 'block' : 'none';
      $('btnStartMp').disabled = live.length < 2 || r.starting;
      text('btnStartMp', r.starting ? 'Готовим треки…' : 'Начать игру');
      if (data.type === '1v1' && data.host === clientId && live.length === 2) startMp();
      return;
    }
    if (!['playing', 'finished'].includes(data.state) || !Array.isArray(data.sharedQueue) || !data.matchId)
      throw new Error('INVALID_ROOM_PROTOCOL');
    if (r.matchId !== data.matchId) {
      r.matchId = data.matchId; resetGame('mp', data.sharedQueue); $('mpModal').classList.remove('open');
    }
    html('mpOpponentScores', Object.entries(players).filter(([id]) => id !== clientId).map(([, p]) =>
      `<div class="mp-score-item"><span>${esc(p.name)}${p.online === false ? ' (не в сети)' : ''}</span><b>${number(p.score)}</b></div>`).join('') || 'Соперники вышли');
    const me = players[clientId];
    state.score = number(me.score); state.streak = number(me.streak);
    state.bestStreak = number(me.bestStreak); state.correct = number(me.correct);
    if (data.state === 'finished') return finishMp(r);
    if (!Number.isInteger(data.round) || data.round < 1 || data.round > data.sharedQueue.length || !Number.isFinite(data.deadline))
      throw new Error('INVALID_ROUND');
    state.queue = data.sharedQueue;
    if (!['buffering', 'answering'].includes(data.phase) || !Number.isInteger(data.roundRevision)) throw new Error('INVALID_PHASE');
    if (state.round !== data.round || state.roundRevision !== data.roundRevision) {
      state.round = data.round; state.roundRevision = data.roundRevision;
      r.answerIntent = null; r.submitting = null;
      const entry = data.sharedQueue[data.round - 1];
      if (!entry?.answer || !Array.isArray(entry.options) || entry.options.length !== 4) throw new Error('INVALID_TRACK');
      prepareRound(entry.answer, entry.options);
    }
    hud();
    const answer = me.answers?.[String(data.round)];
    warmRoomTracks(r);
    if (data.phase === 'buffering' && !data.revealAt) {
      $('playClipBtn').disabled = true;
      $('answerGrid').style.visibility = 'hidden';
      text('roundStatus', 'Готовим следующий раунд…');
      text('questionSub', data.musicRetryAt ? 'Ожидаем доступную музыку. Очки и серия сохранены.' : 'Скоро следующий фрагмент…');
      if (state.localReady) publishMediaStatus(r, 'ready');
      else if (state.phase === 'error') publishMediaStatus(r, 'failed', state.mediaPermanent);
      roomTick(r); return;
    }
    if (state.localReady) $('answerGrid').style.visibility = 'visible';
    if (!answer && !data.revealAt && state.phase === 'ready' && state.localReady) {
      text('questionSub', 'Фрагмент загружен. Нажми «Слушать».');
      $('playClipBtn').disabled = !mpRoundOpen();
    }
    if (answer) {
      state.answered = true; stopAudio(); state.phase = 'answered'; enableAnswers();
      $('playClipBtn').disabled = true; $('hintBtn').disabled = true; skipBtn.hidden = true;
      r.answerIntent = null;
      if (answer.reason !== 'audio_error') markAnswer(Number.isInteger(answer.index) ? answer.index : -1, !!answer.correct);
      text('questionSub', answer.reason === 'audio_error' ? 'Звук недоступен: трек пропущен без потери очков.' :
        answer.reason === 'network_error' ? 'Связь прервалась: трек пропущен без штрафа.' :
        answer.reason === 'timeout' ? 'Время ответа вышло.' : answer.correct ? `Верно! +${answer.points} очков` : `Это «${state.current.trackName}».`);
      text('roundStatus', data.revealAt ? 'Следующий раунд…' : 'Ответ принят. Ждём остальных…');
    } else if (data.revealAt) {
      state.answered = true; stopAudio(); enableAnswers(); $('playClipBtn').disabled = true; skipBtn.hidden = true;
      text('roundStatus', 'Время раунда завершено. Следующий трек…');
    } else if (r.submitting !== data.round && !r.answerIntent) {
      // A non-committed answer must not leave the controls permanently locked.
      state.answered = false;
      if (state.phase === 'submitting') {
        state.phase = state.heard ? 'ended' : 'ready';
        text('questionSub', state.heard ? 'Ответ не сохранён. Выбери вариант ещё раз.' : 'Нажми «Слушать», чтобы включить фрагмент.');
        text('playClipBtn', state.heard ? '↻ Послушать ещё' : '▶ Слушать 5 сек');
        $('playClipBtn').disabled = false;
      }
      enableAnswers();
    }
    roomTick(r);
  }
  async function startMp() {
    const r = room;
    if (!r || r.starting || !connected || r.data?.state !== 'waiting' || r.data.host !== clientId) return;
    if (activePlayers(r.data).length < 2) return toast('Нужно хотя бы два игрока.');
    if (state.catalog.length < 4) return toast('Каталог ещё не готов.');
    r.starting = true; $('btnStartMp').disabled = true; text('btnStartMp', 'Запускаем матч…');
    // Store the complete candidate pool once. No limit of two replacements and
    // no short reserve list that can turn ten rounds into ten silent skips.
    const urls = new Set();
    const candidates = shuffle(state.catalog).filter(track => {
      const key = media.key(track.previewUrl);
      if (urls.has(key)) return false;
      urls.add(key); return true;
    });
    const queue = candidates.slice(0, CONFIG.rounds).map((answer, asset) =>
      ({ id: `slot${asset}v0`, asset, answer, options: optionsFor(answer) }));
    const matchId = uid();
    try {
      const result = await bounded(roomTransaction(r.ref, data => {
        if (room !== r || !connected || !data || data.protocol !== PROTOCOL || data.state !== 'waiting' || data.host !== clientId || activePlayers(data).length < 2) return;
        data.state = 'playing'; data.matchId = matchId; data.sharedQueue = queue;
        data.trackPool = candidates; data.poolCursor = queue.length;
        data.disabledTracks = {}; data.trackCooldowns = {}; data.goodTracks = {};
        data.entrySerial = 0; data.round = 1; data.roundRevision = 1; beginBuffering(data);
        Object.values(data.players || {}).forEach(p => {
          p.score = 0; p.streak = 0; p.bestStreak = 0; p.correct = 0;
          delete p.answers; delete p.media; delete p.prepared;
        }); return data;
      }));
      if (room === r && !result.committed) {
        const latest = result.snapshot.val();
        if (latest?.players?.[clientId]) { r.data = latest; renderRoom(r); }
        else { toast('Комната закрыта. Создай новую.'); leaveRoom(); return; }
        if (latest.state === 'waiting') toast('Матч не запущен: проверь, что в комнате хотя бы два игрока в сети.');
      }
    } catch (error) { roomError(r, error); }
    finally { r.starting = false; if (room === r && r.data?.state === 'waiting') renderRoom(r); }
  }
  function recordAnswer(p, round, entry, index, reason) {
    if (!p.answers) p.answers = {};
    if (p.answers[String(round)]) return;
    if (reason === 'audio_error' || reason === 'network_error') {
      p.answers[String(round)] = { index: -1, correct: false, points: 0, reason }; return;
    }
    const correct = reason === 'answer' && Number.isInteger(index) &&
      trackKey(entry.options[index]) === trackKey(entry.answer);
    p.streak = correct ? number(p.streak) + 1 : 0;
    const points = correct ? 100 * multiplier(p.streak) : 0;
    p.score = number(p.score) + points; p.correct = number(p.correct) + (correct ? 1 : 0);
    p.bestStreak = Math.max(number(p.bestStreak), p.streak);
    p.answers[String(round)] = { index: Number.isInteger(index) ? index : -1, correct, points, reason };
  }
  async function submitMp(index, reason, retry = false) {
    const r = room;
    if (!r || r.submitting !== null || !state.active || (state.answered && !retry) || !connected || r.data?.state !== 'playing') return;
    const round = state.round, revision = state.roundRevision, matchId = r.matchId, token = state.token;
    if (r.data.phase !== 'answering' || r.data.revealAt) return;
    if (reason === 'answer' && (!mpRoundOpen() || !state.heard)) return;
    const intent = r.answerIntent || { round, revision, index, reason };
    r.answerIntent = intent; r.submitting = round;
    state.answered = true; stopAudio(); state.phase = 'submitting';
    enableAnswers(); $('playClipBtn').disabled = true; skipBtn.hidden = true;
    text('roundStatus', 'Сохраняем ответ…');
    try {
      const result = await roomOp(r, `answer:${matchId}:${round}:${revision}`, data => {
        if (room !== r || !connected || !data || data.state !== 'playing' || data.matchId !== matchId ||
            data.round !== round || data.roundRevision !== revision || data.phase !== 'answering' ||
            data.revealAt || !data.players?.[clientId] || data.players[clientId].left) return;
        const entry = data.sharedQueue[round - 1];
        if (reason === 'answer' && (now() >= data.deadline || !Number.isInteger(index) || !entry.options[index])) return;
        if (data.players[clientId].answers?.[String(round)]) return;
        recordAnswer(data.players[clientId], round, entry, index, reason); return data;
      });
      if (room !== r || token !== state.token) return;
      r.submitting = null;
      // The room value listener is authoritative; a transaction snapshot can be older.
      if (!result.committed && now() < Number(r.data?.deadline || 0) && !r.data?.players?.[clientId]?.answers?.[String(round)]) {
        r.answerIntent = null; state.answered = false; state.phase = state.heard ? 'ended' : 'ready';
        text('questionSub', 'Ответ не сохранён. Попробуй ещё раз.');
        $('playClipBtn').disabled = !state.localReady || !mpRoundOpen(); enableAnswers();
      }
    } catch (error) { roomError(r, error); }
    finally { if (room === r && token === state.token) r.submitting = null; }
  }
  function beginBuffering(data, advanceRevision = false) {
    if (advanceRevision) data.roundRevision = Number(data.roundRevision || 0) + 1;
    data.phase = 'buffering'; data.bufferUntil = now() + CONFIG.prepareMs;
    data.deadline = 0; data.revealAt = 0;
    delete data.musicRetryAt; delete data.roundBaseline;
  }
  const scoreFields = ['score', 'streak', 'bestStreak', 'correct'];
  function rememberRoundScores(data) {
    const players = {};
    Object.entries(data.players || {}).forEach(([id, p]) => {
      players[id] = {};
      scoreFields.forEach(key => { players[id][key] = number(p[key]); });
    });
    data.roundBaseline = { round: data.round, players };
  }
  function rollbackMediaRound(data) {
    Object.entries(data.players || {}).forEach(([id, p]) => {
      const baseline = data.roundBaseline?.round === data.round ? data.roundBaseline.players?.[id] : null;
      if (baseline) scoreFields.forEach(key => { p[key] = number(baseline[key]); });
      if (p.answers) delete p.answers[String(data.round)];
    });
  }
  function roomTrackOptions(data, asset) {
    // Deterministic inside a retryable Firebase transaction: answer and options
    // are committed atomically, and never selected independently by clients.
    const pool = data.trackPool, answer = pool[asset], options = [answer];
    const seen = new Set([trackKey(answer)]);
    for (let step = 1; step < pool.length && options.length < 4; step++) {
      const track = pool[(asset + step) % pool.length], key = trackKey(track);
      if (!seen.has(key)) { seen.add(key); options.push(track); }
    }
    const offset = number(data.entrySerial) % options.length;
    return options.slice(offset).concat(options.slice(0, offset));
  }
  function nextRoomAsset(data, index) {
    const pool = data.trackPool || [];
    const used = new Set(data.sharedQueue.slice(data.round - 1)
      .filter((_, offset) => offset + data.round - 1 !== index).map(entry => entry.asset));
    const available = asset => pool[asset] && !data.disabledTracks?.[asset] &&
      Number(data.trackCooldowns?.[asset] || 0) <= now();
    const allowed = asset => available(asset) && !used.has(asset);
    let cursor = number(data.poolCursor);
    while (cursor < pool.length) {
      const asset = cursor++; data.poolCursor = cursor;
      if (allowed(asset)) return asset;
    }
    // A small real catalog may have fewer working songs than rounds. Reuse a
    // verified song instead of consuming a silent round or ending the match.
    const verified = Object.keys(data.goodTracks || {}).map(Number);
    const known = verified.find(allowed) ?? verified.find(available);
    if (known !== undefined) return known;
    // Transient failures are retried after cooldown, permanent 404/decode errors
    // remain excluded for the whole room session. With a tiny catalog a future
    // slot may hold the only viable track: sharing it is better than deadlock.
    const retry = Object.keys(data.trackCooldowns || {}).map(Number).find(allowed);
    if (retry !== undefined) return retry;
    return pool.findIndex((_, asset) => available(asset));
  }
  function replaceRoomTrack(data, index, permanent = false, markFailure = true) {
    const old = data.sharedQueue?.[index];
    if (!old || index < data.round - 1) return false;
    if (markFailure) {
      if (permanent) {
        if (!data.disabledTracks) data.disabledTracks = {};
        data.disabledTracks[old.asset] = true;
      } else {
        if (!data.trackCooldowns) data.trackCooldowns = {};
        data.trackCooldowns[old.asset] = now() + CONFIG.reconnectMs;
      }
      if (data.goodTracks) delete data.goodTracks[old.asset];
    }
    const isCurrent = index === data.round - 1;
    let restarted = false;
    if (isCurrent && data.phase === 'answering') {
      rollbackMediaRound(data); beginBuffering(data, true); restarted = true;
    }
    const asset = nextRoomAsset(data, index);
    if (asset < 0) {
      if (isCurrent) data.musicRetryAt = now() + CONFIG.musicRetryMs;
      return restarted;
    }
    data.entrySerial = number(data.entrySerial) + 1;
    data.sharedQueue[index] = { id: `slot${index}v${data.entrySerial}`, asset,
      answer: data.trackPool[asset], options: roomTrackOptions(data, asset) };
    Object.values(data.players || {}).forEach(p => {
      if (p.prepared) delete p.prepared[old.id];
    });
    if (isCurrent) {
      if (!restarted) beginBuffering(data, true);
      else delete data.musicRetryAt;
    }
    return true;
  }
  // Run transitions only inside a root RTDB transaction.
  function progressRoom(current) {
    const live = activePlayers(current), participants = roundPlayers(current);
    const liveIds = live.map(([id]) => id).sort();
    let changed = false;
    if (liveIds.length && !liveIds.includes(current.host)) { current.host = liveIds[0]; changed = true; }
    if (current.state !== 'playing') return changed;
    if (current.revealAt) {
      if (now() < current.revealAt) return changed;
      if (current.round >= current.sharedQueue.length) {
        current.state = 'finished'; current.finishedAt = now();
      } else {
        current.round++; beginBuffering(current, true);
        const keep = new Set(current.sharedQueue.slice(current.round - 1,
          current.round + CONFIG.lookAhead).map(entry => entry.id));
        Object.values(current.players || {}).forEach(p => {
          Object.keys(p.prepared || {}).forEach(id => { if (!keep.has(id)) delete p.prepared[id]; });
        });
      }
      return true;
    }
    const entry = current.sharedQueue?.[current.round - 1];
    if (!entry || !participants.length) return changed;
    // Failure has priority over allReady, allAnswered and the answer deadline.
    const failed = participants.map(([, p]) => mediaMatches(current, p, 'failed') ? p.media :
      p.prepared?.[entry.id]?.status === 'failed' ? p.prepared[entry.id] : null).filter(Boolean);
    if (current.musicRetryAt && now() < current.musicRetryAt) return changed;
    if (failed.length || current.disabledTracks?.[entry.asset]) {
      replaceRoomTrack(current, current.round - 1,
        !!current.disabledTracks?.[entry.asset] || failed.some(item => item.permanent), !current.musicRetryAt);
      return true;
    }
    if (current.phase === 'buffering') {
      // A short disconnect does not allow the room to start without that player.
      // After staleMs an absent participant no longer holds up the room.
      const allReady = participants.every(([, p]) => p.online !== false && mediaMatches(current, p, 'ready'));
      if (allReady) {
        current.phase = 'answering'; current.deadline = now() + CONFIG.roundMs;
        if (!current.goodTracks) current.goodTracks = {};
        current.goodTracks[entry.asset] = true;
        rememberRoundScores(current); delete current.musicRetryAt; return true;
      }
      if (now() < Number(current.bufferUntil || 0)) return changed;
      if (participants.some(([, p]) => p.online === false)) {
        current.bufferUntil = now() + CONFIG.musicRetryMs; return true;
      }
      replaceRoomTrack(current, current.round - 1, false, true); return true;
    }
    if (current.phase !== 'answering') return changed;
    const allAnswered = participants.every(([, p]) => !!p.answers?.[String(current.round)]);
    if (allAnswered || now() >= Number(current.deadline || 0)) {
      Object.values(current.players || {}).forEach(p => {
        if (p.left || p.answers?.[String(current.round)]) return;
        const reason = p.online === false || now() - Number(p.lastSeen || 0) >= CONFIG.staleMs ? 'network_error' :
          !mediaMatches(current, p, 'ready') ? 'audio_error' : 'timeout';
        recordAnswer(p, current.round, entry, null, reason);
      });
      current.revealAt = now() + CONFIG.revealMs; return true;
    }
    return changed;
  }
  async function roomTick(r) {
    if (room !== r || !connected || !r.data || r.pending || r.finished || now() < (r.retryAt || 0)) return;
    const data = r.data;
    if (data.state === 'playing' && state.active && !data.revealAt) {
      if (data.phase === 'answering') {
        if (!state.answered) text('roundStatus', `На ответ: ${Math.max(0, Math.ceil((data.deadline - now()) / 1000))} сек`);
        if (state.phase === 'error') publishMediaStatus(r, 'failed', state.mediaPermanent);
        const intent = r.answerIntent;
        if (intent && r.submitting === null && intent.round === data.round && intent.revision === data.roundRevision &&
            (intent.reason !== 'answer' || now() < data.deadline)) submitMp(intent.index, intent.reason, true);
      } else if (data.phase === 'buffering') {
        text('roundStatus', 'Готовим следующий раунд…');
        if (state.localReady) publishMediaStatus(r, 'ready');
        else if (state.phase === 'error') publishMediaStatus(r, 'failed', state.mediaPermanent);
      }
    }
    if (data.state === 'playing') warmRoomTracks(r);
    if (!['waiting', 'playing'].includes(data.state)) return;
    // Avoid RTDB writes on each 400ms tick when no transition is due.
    const preview = JSON.parse(JSON.stringify(data));
    if (!progressRoom(preview)) return;
    r.pending = true;
    const expectedRound = data.round || 0, revision = data.roundRevision || 0, matchId = data.matchId || null;
    try {
      await roomOp(r, 'step', current => {
        if (room !== r || !connected || !current || !current.players?.[clientId] || current.players[clientId].left ||
            current.state !== data.state || (current.matchId || null) !== matchId ||
            (current.round || 0) !== expectedRound || (current.roundRevision || 0) !== revision) return;
        return progressRoom(current) ? current : undefined;
      });
      r.retryAt = 0;
    } catch (error) { roomError(r, error); }
    finally { r.pending = false; }
  }
  function finishMp(r) {
    if (r.finished) return;
    r.finished = true; endSession(); clearInterval(r.tick); clearInterval(r.heartbeat);
    resultFacts(); text('resultTitle', 'Матч завершён');
    const players = Object.entries(r.data.players || {}).sort((a, b) => number(b[1].score) - number(a[1].score));
    html('resultCopy', players.map(([id, p], i) => `<span style="display:block;margin:10px 0">#${i + 1} <b>${esc(p.name)}${id === clientId ? ' (ты)' : ''}</b>: ${number(p.score)} очков</span>`).join(''));
    // The result stays visible until the player chooses to leave.
    screen('result');
  }
  function leaveRoom(goHome = true) {
    ++lobbyTask; lobbyControls(false);
    const r = room; room = null; ++roomEpoch; endSession();
    $('mpModal').classList.remove('open');
    if (r) {
      clearInterval(r.tick); clearInterval(r.heartbeat); clearTimeout(r.offlineTimer);
      r.ref.off('value', r.listener);
      // Never remove the whole room when the host leaves. Preserve scores and elect a new host.
      // Same root as start/join/submit; do not cancel those with a child update.
      roomTransaction(r.ref, data => {
        if (!data?.players?.[clientId]) return;
        data.players[clientId].online = false; data.players[clientId].left = true;
        data.players[clientId].lastSeen = now();
        const live = activePlayers(data).map(([id]) => id).sort();
        if (!live.includes(data.host) && live.length) data.host = live[0];
        return data;
      }).then(() => r.ref.child(`players/${clientId}`).onDisconnect().cancel())
        .catch(error => report('Leave room presence (onDisconnect remains armed)', error));
    }
    resumeAudio('network');
    if (goHome) screen('home');
  }

  function leaderboard() {
    if (!db || !connected) { text('leaderboardContainer', 'Таблица рекордов недоступна без сети.'); return; }
    bounded(db.ref('leaderboard').orderByChild('score').limitToLast(10).once('value')).then(snap => {
      const entries = []; snap.forEach(child => entries.push(child.val()));
      entries.sort((a, b) => number(b?.score) - number(a?.score));
      html('leaderboardContainer', entries.length ? entries.slice(0, 3).map((p, i) =>
        `<div class="mini-leader"><span class="rank">#0${i + 1}</span><span class="player">${esc(p?.name || 'Игрок')}</span><span class="score">${number(p?.score).toLocaleString()}</span></div>`).join('') : 'Стань первым!');
    }).catch(error => { report('Leaderboard read', error); text('leaderboardContainer', 'Таблица рекордов временно недоступна.'); });
  }
  async function submitLeaderboard() {
    if (!db || !connected || stats.bestScore <= 0 || stats.bestScore > 2400) return;
    // Hash/encode path keys: SDK identifiers can contain characters forbidden in RTDB paths.
    const id = encodeURIComponent(String(platformPlayer?.id || persistentId)).replace(/\./g, '%2E');
    try {
      await bounded(db.ref(`leaderboard/${id}`).transaction(data => {
        if (number(data?.score) > stats.bestScore) return;
        return { name: String(platformPlayer?.name || 'Пикабушник').slice(0, 60), score: stats.bestScore, updatedAt: now() };
      })); leaderboard();
    } catch (error) { report('Leaderboard write', error); }
  }

  $('answerGrid').addEventListener('click', event => {
    const button = event.target.closest('.answer-btn');
    if (button && !button.disabled) answerRound(Number(button.dataset.index));
  });
  $('playClipBtn').addEventListener('click', () => {
    if (state.active && state.mode === 'solo' && state.phase === 'offline') {
      media.failures.clear(); state.badUrls.clear(); state.replacements = 0;
      prepareRound(state.current, state.options);
    } else playClip();
  });
  skipBtn.addEventListener('click', skipTrack);
  $('hintBtn').addEventListener('click', useHint);
  $('startBtn').addEventListener('click', startSolo);
  $('btnCustom').addEventListener('click', showLobby);
  $('btnCreateRoom').addEventListener('click', () => lobbyAction(task => createRoom('custom', task)));
  $('btnJoinRoom').addEventListener('click', () => {
    const code = $('mpRoomInput').value.trim();
    if (!/^\d{6}$/.test(code)) return toast('Введи шесть цифр кода комнаты.');
    lobbyAction(task => joinRoom(code, 'custom', task));
  });
  $('btn1v1').addEventListener('click', () => {
    if (!connected || state.catalog.length < 4) return toast('Дождись соединения и загрузки каталога.');
    $('mpModal').classList.add('open'); $('mpSelection').style.display = 'none';
    $('mpLobby').style.display = 'block'; $('mpCodeBlock').style.display = 'none';
    $('btnStartMp').style.display = 'none'; text('mpTitle', 'Поиск 1 на 1…'); text('mpPlayersList', 'Ищем соперника…');
    lobbyAction(matchmaking);
  });
  $('btnStartMp').addEventListener('click', startMp);
  $('mpModalClose').addEventListener('click', () => leaveRoom());
  $('quitGameBtn').addEventListener('click', () => {
    openModal('quit', 'Выход', 'Завершить участие и выйти на главную?', [
      ['Выйти', () => { closeModal(); if (room) leaveRoom(); else { endSession(); screen('home'); } }],
      ['Продолжить', closeModal]
    ]);
  });
  $('modalClose').addEventListener('click', () => { if (state.modalKind === 'revive') finishSolo(); else closeModal(); });
  $('helpBtn').addEventListener('click', () => {
    if (state.modalKind === 'revive' || state.adPending) return;
    openModal('help', 'Как играть', 'Угадай до 10 песен. Фрагмент длится 5 секунд. В одиночной игре ошибка отнимает жизнь. В сетевой игре на включение звука и ответ даётся 45 секунд; затем раунд завершается автоматически.', [['Понятно', closeModal]]);
  });
  $('againBtn').addEventListener('click', () => {
    if (room || state.mode === 'mp') { leaveRoom(); showLobby(); } else startSolo();
  });
  $('homeBtn').addEventListener('click', () => { if (room) leaveRoom(); else { endSession(); screen('home'); } });
  function setVolume(value) {
    const volume = Math.min(1, Math.max(0, Number(value) || 0)); audio.volume = volume;
    if (volume > 0) lastVolume = volume;
    $('volumeSlider').value = String(volume); text('soundToggle', volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊');
  }
  $('volumeSlider').addEventListener('input', event => setVolume(event.target.value));
  $('soundToggle').addEventListener('click', () => setVolume(audio.volume > 0 ? 0 : lastVolume));
  // Leaving the page is also covered by onDisconnect; no unreliable async unload writes.
  window.addEventListener('firebase-ready', initFirebase);
  window.addEventListener('pikabu-sdk-ready', initSdk);
  setVolume($('volumeSlider').value); homeStats(); networkButtons();
  initFirebase(); loadCatalog(); initSdk();
})();
