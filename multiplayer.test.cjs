'use strict';
// Deterministic regression suite. No network access or npm dependencies.
// Run: node multiplayer.test.cjs [path/to/game.js] [path/to/index.html]
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(process.argv[2] || 'game.js', 'utf8');
const markup = fs.readFileSync(process.argv[3] || 'index.html', 'utf8');
const clone = x => x == null ? null : JSON.parse(JSON.stringify(x));
const settle = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
class Element {
  constructor(doc, id = '', tag = 'div') {
    this.doc = doc; this.id = id; this.tagName = tag.toUpperCase();
    this.style = {}; this.dataset = {}; this.events = new Map(); this.attrs = {};
    this.children = []; this.textContent = ''; this.disabled = false; this.hidden = false;
    this.value = id === 'volumeSlider' ? '1' : ''; this.volume = 1; this.currentTime = 0;
    this.classes = new Set();
    this.classList = { add: n => this.classes.add(n), remove: n => this.classes.delete(n),
      contains: n => this.classes.has(n), toggle: (n, flag) => {
        const add = flag === undefined ? !this.classes.has(n) : flag;
        add ? this.classes.add(n) : this.classes.delete(n); return add;
      }};
    this.parentNode = { appendChild: el => this.children.push(el) };
  }
  set innerHTML(s) {
    this._html = s; this.children = [];
    for (const m of s.matchAll(/<button class="answer-btn" data-index="(\d+)"[^>]*>/g)) {
      const e = new Element(this.doc, '', 'button'); e.dataset.index = m[1];
      e.disabled = /disabled/.test(m[0]); this.children.push(e);
    }
    if (s.includes('id="vinylSvg"')) this.doc.elements.set('vinylSvg', new Element(this.doc, 'vinylSvg'));
  }
  get innerHTML() { return this._html || ''; }
  querySelectorAll(selector) { return selector === '.answer-btn' ? this.children : []; }
  addEventListener(name, fn) { if (!this.events.has(name)) this.events.set(name, new Set()); this.events.get(name).add(fn); }
  removeEventListener(name, fn) { this.events.get(name)?.delete(fn); }
  click() { if (!this.disabled) for (const fn of this.events.get('click') || []) fn({target: this}); }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k] || (k === 'src' ? this.src : null); }
  removeAttribute(k) { delete this.attrs[k]; if (k === 'src') this.src = ''; }
  replaceWith(e) { this.doc.elements.set(e.id, e); }
  replaceChildren(...items) { this.children = items; }
  appendChild(e) { this.children.push(e); }
  pause() {}
  load() {}
  play() { for (const fn of this.events.get('playing') || []) fn(); return Promise.resolve(); }
}
function documentMock() {
  const doc = {elements: new Map(), hidden: false, baseURI: 'https://test.invalid/game/',
    addEventListener() {}, createElement(tag) { return new Element(this, '', tag); },
    getElementById(id) { return this.elements.get(id) || null; },
    querySelectorAll(selector) {
      return selector === '.screen' ? ['homeScreen', 'gameScreen', 'resultScreen'].map(id => this.getElementById(id)) : [];
    }};
  for (const m of markup.matchAll(/id="([^"]+)"/g)) doc.elements.set(m[1], new Element(doc, m[1]));
  doc.elements.get('homeScreen').classList.add('active'); return doc;
}
class Snapshot {
  constructor(value, key) { this.data = clone(value); this.key = key; }
  val() { return clone(this.data); }
  forEach(fn) { for (const [k, v] of Object.entries(this.data || {})) if (fn(new Snapshot(v, k)) === true) break; }
}
class Server {
  constructor() { this.root = {}; this.clock = 1800000000000; this.clients = [];
    this.serial = Promise.resolve(); this.transactions = []; this.abort = null; this.deny = false; }
  value(path, client) {
    if (path === '.info/connected') return client.connected;
    if (path === '.info/serverTimeOffset') return 0;
    let out = this.root; for (const k of path.split('/').filter(Boolean)) out = out?.[k]; return clone(out);
  }
  write(path, value) {
    const parts = path.split('/').filter(Boolean); let cursor = this.root;
    for (const k of parts.slice(0, -1)) cursor = cursor[k] ||= {};
    if (value == null) delete cursor[parts.at(-1)]; else cursor[parts.at(-1)] = clone(value);
    this.notify();
  }
  notify() {
    for (const c of this.clients) for (const [path, handlers] of c.listeners)
      for (const handler of handlers) {
        const value = this.value(path, c), encoded = JSON.stringify(value);
        if (c.sent.get(handler) === encoded) continue;
        c.sent.set(handler, encoded);
        queueMicrotask(() => {
          if (c.listeners.get(path)?.has(handler)) handler(new Snapshot(value));
        });
      }
  }
  client() {
    const c = {listeners: new Map(), sent: new Map(), hooks: new Map(), connected: true}; this.clients.push(c);
    const server = this;
    class Ref {
      constructor(path) { this.path = path; }
      child(name) { return new Ref(`${this.path}/${name}`); }
      on(event, fn, error) {
        if (server.deny && this.path.startsWith('rooms')) { queueMicrotask(() => error?.(Object.assign(new Error('PERMISSION_DENIED'), {code:'PERMISSION_DENIED'}))); return fn; }
        if (!c.listeners.has(this.path)) c.listeners.set(this.path, new Set());
        c.listeners.get(this.path).add(fn);
        queueMicrotask(() => {
          if (c.listeners.get(this.path)?.has(fn)) {
            const value = server.value(this.path, c);
            c.sent.set(fn, JSON.stringify(value)); fn(new Snapshot(value));
          }
        });
        return fn;
      }
      off(event, fn) { if (fn) c.listeners.get(this.path)?.delete(fn); else c.listeners.delete(this.path); }
      once() { return Promise.resolve(new Snapshot(server.value(this.path, c))); }
      orderByChild() { return this; } equalTo() { return this; } limitToLast() { return this; }
      onDisconnect() { const path = this.path; return {
        update: async value => c.hooks.set(path, clone(value)), cancel: async () => c.hooks.delete(path)}; }
      transaction(fn, callback, applyLocally = true) {
        const path = this.path;
        const execute = async () => {
          const current = server.value(path, c);
          // The first transaction callback uses a cold null cache unless held by a listener.
          const cached = c.listeners.get(path)?.size ? current : null;
          let proposed = fn(clone(cached));
          if (proposed !== undefined && JSON.stringify(current) !== JSON.stringify(cached)) proposed = fn(clone(current));
          server.transactions.push({path, applyLocally});
          if (proposed === undefined || server.abort?.(path, proposed, current)) {
            return {committed: false, snapshot: new Snapshot(current)};
          }
          server.write(path, proposed);
          return {committed: true, snapshot: new Snapshot(proposed)};
        };
        const p = server.serial.then(execute); server.serial = p.catch(() => {}); return p;
      }
    }
    const database = () => ({ref: path => new Ref(path)});
    database.ServerValue = {TIMESTAMP: {'.sv': 'timestamp'}};
    return {sdk: {apps: [], initializeApp() {this.apps.push({});}, database}, client: c};
  }
  disconnect(c) {
    c.connected = false;
    for (const [path, patch] of c.hooks) {
      const p = this.value(path, c) || {};
      this.write(path, {...p, ...patch, lastSeen: this.clock});
    }
    c.hooks.clear(); this.notify();
  }
  reconnect(c) { c.connected = true; this.notify(); }
}
const catalog = Array.from({length: 16}, (_, i) => ({trackName: `Track ${i}`, artistName: `Artist ${i}`, previewUrl: `music/${i+1}.mp3`}));
function client(server, storage = new Map()) {
  const doc = documentMock(); const fb = server.client(); const logs = [];
  class Clock extends Date { static now() {return server.clock;} }
  const context = {document: doc, console: {warn: (...x) => logs.push(x)}, URL, AbortController,
    Date: Clock, performance, crypto: require('node:crypto').webcrypto,
    setTimeout: (fn, ms) => { const t = setTimeout(fn, ms); t.unref(); return t; }, clearTimeout,
    setInterval: () => ({}), clearInterval() {},
    localStorage: {getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,String(v))},
    fetch: async () => ({ok: true, json: async () => catalog}), firebase: fb.sdk,
    scrollTo() {}};
  context.window = context;
  vm.createContext(context);
  const instrumented = source.replace(/\}\)\(\);\s*$/, `globalThis.testAPI = {
    state, clientId, get room() { return room; }, get connected() {return connected;},
    lobbyAction, createRoom, joinRoom, startMp, submitMp, roomTick, heartbeat,
    leaveRoom, startSolo, answerRound, playClip, matchmaking, roomTransaction,
    get task() {return lobbyTask;}, now
  };})();`);
  assert.notEqual(instrumented, source, 'test injection point exists');
  vm.runInContext(instrumented, context, {filename: 'game.js'});
  return {api: context.testAPI, doc, net: fb.client, logs};
}
async function setup(count = 3, type = 'custom') {
  const server = new Server(), clients = Array.from({length: count}, () => client(server)); await settle();
  const host = clients[0]; await host.api.lobbyAction(t => host.api.createRoom(type, t)); await settle();
  const id = host.api.room.id;
  await Promise.all(clients.slice(1).map(c => c.api.lobbyAction(t => c.api.joinRoom(id, type, t)))); await settle();
  return {server, clients, host, id};
}
function correctIndex(c) { return c.api.state.options.findIndex(t => t.trackName === c.api.state.current.trackName); }
let total = 0;
async function test(name, fn) { await fn(); total++; console.log(`PASS ${name}`); }
(async () => {
  await test('cold-cache create + simultaneous second/third join; no false room-not-found', async () => {
    const {server, clients, id, host} = await setup();
    assert.equal(Object.keys(server.root.rooms[id].players).length, 3);
    for (const c of clients) { assert.ok(c.api.room); assert.equal(Object.keys(c.api.room.data.players).length, 3); }
    assert.equal(host.doc.getElementById('btnStartMp').disabled, false);
    assert.ok(server.transactions.filter(x => x.path.startsWith('rooms/')).every(x => !x.applyLocally));
  });
  await test('start click while three heartbeats run; same round and options everywhere', async () => {
    const {clients, host, server, id} = await setup();
    host.doc.getElementById('btnStartMp').click();
    await Promise.all(clients.map(c => c.api.heartbeat(c.api.room))); await settle();
    assert.equal(server.root.rooms[id].state, 'playing');
    const queues = clients.map(c => JSON.stringify(c.api.state.queue));
    assert.equal(new Set(queues).size, 1);
    for (const c of clients) {
      assert.equal(c.api.state.round, 1); assert.equal(c.api.state.options.length, 4);
      assert.ok(c.doc.getElementById('gameScreen').classList.contains('active'));
      assert.equal(c.doc.getElementById('mpModal').classList.contains('open'), false);
    }
  });
  await test('duplicate Start creates exactly one match', async () => {
    const {host, server} = await setup(); const before = server.transactions.length;
    await Promise.all([host.api.startMp(), host.api.startMp()]); await settle();
    assert.equal(server.transactions.length - before, 1);
  });
  await test('aborted Start is visible and retryable; no speculative game screen', async () => {
    const {host, server} = await setup();
    server.abort = (path, next, old) => old?.state === 'waiting' && next?.state === 'playing';
    await host.api.startMp(); await settle();
    assert.equal(host.api.state.active, false);
    assert.equal(host.api.room.data.state, 'waiting');
    assert.equal(host.doc.getElementById('btnStartMp').disabled, false);
    assert.match(host.doc.getElementById('toast').textContent, /не запущен/);
    server.abort = null; await host.api.startMp(); await settle(); assert.equal(host.api.state.round, 1);
  });
  await test('all 10 rounds synchronize, duplicate answers score once, final results agree', async () => {
    const {host, clients, server, id} = await setup(); await host.api.startMp(); await settle();
    for (let round = 1; round <= 10; round++) {
      await Promise.all(clients.map(async c => {
        c.api.state.heard = true;
        await Promise.all([c.api.submitMp(correctIndex(c), 'answer'), c.api.submitMp(correctIndex(c), 'answer')]);
      })); await settle();
      await Promise.all(clients.map(c => c.api.roomTick(c.api.room))); await settle();
      assert.ok(server.root.rooms[id].revealAt > 0);
      server.clock = server.root.rooms[id].revealAt + 1;
      await Promise.all(clients.map(c => c.api.roomTick(c.api.room))); await settle();
      if (round < 10) for (const c of clients) assert.equal(c.api.state.round, round + 1);
    }
    for (const c of clients) {
      assert.equal(c.api.state.score, 2400); assert.equal(c.api.state.correct, 10);
      assert.ok(c.doc.getElementById('resultScreen').classList.contains('active'));
    }
    assert.equal(server.root.rooms[id].state, 'finished');
  });
  await test('aborted answer unlocks controls and permits a retry', async () => {
    const {host, server} = await setup(); await host.api.startMp(); await settle();
    host.api.state.heard = true;
    server.abort = (path, next) => !!next?.players?.[host.api.clientId]?.answers?.['1'];
    await host.api.submitMp(correctIndex(host), 'answer'); await settle();
    assert.equal(host.api.state.answered, false); assert.equal(host.api.room.submitting, null);
    assert.ok(host.doc.getElementById('answerGrid').children.every(b => !b.disabled));
    server.abort = null; await host.api.submitMp(correctIndex(host), 'answer'); await settle();
    assert.equal(host.api.state.score, 100);
  });
  await test('timeout records missing and disconnected answers without freezing', async () => {
    const {host, server, clients, id} = await setup(); await host.api.startMp(); await settle();
    server.disconnect(clients[2].net); await settle();
    server.clock = server.root.rooms[id].deadline + 1;
    await host.api.roomTick(host.api.room); await settle();
    for (const p of Object.values(server.root.rooms[id].players)) assert.equal(p.answers['1'].reason, 'timeout');
    assert.ok(server.root.rooms[id].revealAt > 0);
  });
  await test('host leaves lobby: room survives, a new host can admit a third player and start', async () => {
    const {server, clients, host, id} = await setup(2); host.api.leaveRoom(); await settle();
    const second = clients[1]; assert.equal(second.api.room.data.host, second.api.clientId);
    const third = client(server); await settle();
    await third.api.lobbyAction(t => third.api.joinRoom(id, 'custom', t)); await settle();
    await second.api.startMp(); await settle(); assert.equal(third.api.state.round, 1);
  });
  await test('host disconnects mid-match: another player advances; reconnect restores participation', async () => {
    const {server, clients, host, id} = await setup(); await host.api.startMp(); await settle();
    server.disconnect(host.net); await settle(); await clients[1].api.roomTick(clients[1].api.room); await settle();
    assert.notEqual(server.root.rooms[id].host, host.api.clientId);
    server.reconnect(host.net); await settle(); await host.api.heartbeat(host.api.room); await settle();
    assert.equal(server.root.rooms[id].players[host.api.clientId].online, true);
    assert.ok(host.net.hooks.size > 0);
  });
  await test('briefly offline host survives a third-player join and reconnects inside the grace period', async () => {
    const {server, clients, host, id} = await setup(2);
    const hostId = host.api.clientId;
    server.disconnect(host.net); await settle();
    assert.equal(server.root.rooms[id].players[hostId].online, false);
    const third = client(server); await settle();
    await third.api.lobbyAction(t => third.api.joinRoom(id, 'custom', t)); await settle();
    assert.ok(server.root.rooms[id].players[hostId], 'brief disconnect must not delete the player record');
    assert.equal(Object.keys(server.root.rooms[id].players).length, 3);
    server.reconnect(host.net); await settle(); await host.api.heartbeat(host.api.room); await settle();
    assert.equal(server.root.rooms[id].players[hostId].online, true);
    assert.ok(host.api.room);
  });
  await test('capacity 8: ninth rejected; existing eight stay in lobby', async () => {
    const {server, clients, id} = await setup(9);
    assert.equal(Object.keys(server.root.rooms[id].players).length, 8);
    assert.equal(clients.filter(c => c.api.room).length, 8);
    assert.ok(clients.some(c => /заполнена/.test(c.doc.getElementById('toast').textContent)));
  });
  await test('late join after start is rejected with started message, not not-found', async () => {
    const {server, host, id} = await setup(2); await host.api.startMp(); await settle();
    const third = client(server); await settle();
    await third.api.lobbyAction(t => third.api.joinRoom(id, 'custom', t)); await settle();
    assert.equal(third.api.room, null); assert.match(third.doc.getElementById('toast').textContent, /уже началась/);
  });
  await test('room not found and incompatible protocol have distinct messages', async () => {
    const server = new Server(), c = client(server); await settle();
    await c.api.lobbyAction(t => c.api.joinRoom('111111', 'custom', t)); await settle();
    assert.match(c.doc.getElementById('toast').textContent, /не найдена/);
    server.write('rooms/222222', {protocol: 2, type: 'custom', state: 'waiting', players: {}});
    await c.api.lobbyAction(t => c.api.joinRoom('222222', 'custom', t)); await settle();
    assert.match(c.doc.getElementById('toast').textContent, /версии/);
  });
  await test('cancel while joining does not leave a ghost participant', async () => {
    const {server, host, id} = await setup(1); const c = client(server); await settle();
    const task = c.api.lobbyAction(t => c.api.joinRoom(id, 'custom', t)); c.api.leaveRoom();
    await task; await settle();
    assert.equal(c.api.room, null); assert.equal(server.root.rooms[id].players[c.api.clientId], undefined);
    assert.ok(host.api.room);
  });
  await test('same localStorage in two tabs yields independent room participant IDs', async () => {
    const server = new Server(), storage = new Map(); const a = client(server, storage), b = client(server, storage); await settle();
    assert.notEqual(a.api.clientId, b.api.clientId);
  });
  await test('audio failure skips only that player without awarding points', async () => {
    const {host} = await setup(2); await host.api.startMp(); await settle();
    await host.api.submitMp(null, 'audio_error'); await settle();
    assert.equal(host.api.state.score, 0);
    assert.equal(host.api.room.data.players[host.api.clientId].answers['1'].reason, 'audio_error');
  });
  await test('quick 1v1 automatically starts for both participants', async () => {
    const {clients, server, id} = await setup(2, '1v1'); await settle();
    assert.equal(server.root.rooms[id].state, 'playing');
    for (const c of clients) assert.equal(c.api.state.round, 1);
  });
  await test('denied Firebase access shows actionable error and leaves no room', async () => {
    const server = new Server(), c = client(server); await settle(); server.deny = true;
    await c.api.lobbyAction(t => c.api.createRoom('custom', t)); await settle();
    assert.equal(c.api.room, null); assert.match(c.doc.getElementById('toast').textContent, /запретил доступ/);
  });
  await test('solo mode still starts, plays a clip and scores correct answer', async () => {
    const server = new Server(), c = client(server); await settle(); c.api.startSolo();
    assert.equal(c.api.state.mode, 'solo'); assert.equal(c.api.state.round, 1);
    await c.api.playClip(); assert.equal(c.api.state.heard, true);
    c.api.answerRound(correctIndex(c)); assert.equal(c.api.state.score, 100);
  });
  console.log(`\n${total} regression tests passed. Backend is a deterministic test double, not production Firebase.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
