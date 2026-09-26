// Thin WebSocket client for the room relay (see server/rooms.js for the protocol).

export function wsUrl() {
  const override = new URLSearchParams(location.search).get('server');
  if (override && /^wss?:\/\//.test(override)) return override;
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}

export class Net {
  constructor(url = wsUrl()) {
    this.url = url;
    this.ws = null;
    this.handlers = {};
    this.pending = null;
    this.open = false;
  }

  /** Resolves once connected. `onSlow` fires if it takes >4s (free hosts sleep when idle). */
  connect({ timeoutMs = 60000, onSlow } = {}) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let ws;
      try { ws = new WebSocket(this.url); } catch (e) { reject(new Error('connect-failed')); return; }
      this.ws = ws;
      const slow = setTimeout(() => onSlow && onSlow(), 4000);
      const give = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { ws.close(); } catch { /* ignore */ }
        reject(new Error('timeout'));
      }, timeoutMs);
      const finish = (fn) => { clearTimeout(slow); clearTimeout(give); settled = true; fn(); };

      ws.onopen = () => finish(() => {
        this.open = true;
        this.keepAlive = setInterval(() => this.send({ t: 'ping' }), 20000);
        resolve();
      });
      ws.onerror = () => { if (!settled) finish(() => reject(new Error('connect-failed'))); };
      ws.onmessage = (e) => this.onMessage(e);
      ws.onclose = () => {
        clearInterval(this.keepAlive);
        const wasOpen = this.open;
        this.open = false;
        if (!settled) finish(() => reject(new Error('connect-failed')));
        else if (wasOpen) this.emit('close');
      };
    });
  }

  on(event, fn) { this.handlers[event] = fn; return this; }
  emit(event, data) { if (this.handlers[event]) this.handlers[event](data); }

  onMessage(e) {
    let m;
    try { m = JSON.parse(e.data); } catch { return; }
    if (this.pending) {
      if (m.t === this.pending.okType) { const p = this.pending; this.pending = null; p.resolve(m); return; }
      if (m.t === 'error') { const p = this.pending; this.pending = null; p.reject(new Error(m.reason)); return; }
    }
    this.emit(m.t, m);
  }

  send(msg) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  request(msg, okType) {
    return new Promise((resolve, reject) => {
      this.pending = { okType, resolve, reject };
      this.send(msg);
    });
  }

  create(character) { return this.request({ t: 'create', character }, 'created'); }
  join(code, character) { return this.request({ t: 'join', code, character }, 'joined'); }
  sendState(s) { this.send({ t: 'state', ...s }); }

  close() {
    clearInterval(this.keepAlive);
    this.handlers = {};
    if (this.ws) { try { this.ws.close(); } catch { /* ignore */ } }
  }
}
