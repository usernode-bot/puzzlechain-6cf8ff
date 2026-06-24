/* ============================================================
   Platform API helpers — forward the iframe JWT
   ============================================================ */
// The shell injects ?token=… on the initial iframe load; capture it once
// and forward it on every API call via the x-usernode-token header.
const USERNODE_TOKEN = new URLSearchParams(window.location.search).get('token') || '';

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(USERNODE_TOKEN ? { 'x-usernode-token': USERNODE_TOKEN } : {}),
      ...(opts.headers || {}),
    },
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, body };
}

/* ============================================================
   DApp Mode (Phase 0) — client helpers
   canonicalize + sha256 mirror lib/dapp.js byte-for-byte so a chain
   hash the client builds equals the one the server recomputes.
   ============================================================ */
function dappCanonicalize(value) {
  if (value === null || value === undefined) return 'null';
  const t = typeof value;
  if (t === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) throw new Error('non-integer in hashed state');
    return String(value);
  }
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(dappCanonicalize).join(',') + ']';
  if (t === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + dappCanonicalize(value[k])).join(',') + '}';
  }
  throw new Error('unhashable');
}
async function dappSha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(str)));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Anchor a verified session's final chain hash on-chain via the bridge, then
// confirm with the server. Best-effort: degrades to a 'mock' anchor when the
// bridge/wallet is unavailable (staging) and never throws. Returns the updated
// session shape (with anchorStatus/anchorTxHash) or the original on failure.
async function dappAnchor(session) {
  if (!session || session.status !== 'verified' || !session.chainHash) return session;
  let txHash = null;
  let mock = true;
  try {
    const bridgeMockOff = window.usernode && window.usernode.isMockEnabled
      ? !(await window.usernode.isMockEnabled())
      : false;
    if (window.usernode && window.usernode.sendTransaction && window.usernode.getNodeAddress && bridgeMockOff) {
      const addr = await window.usernode.getNodeAddress();
      if (addr) {
        const tx = await window.usernode.sendTransaction({ to: addr, data: '0x' + session.chainHash, value: 0 });
        txHash = tx && tx.hash ? tx.hash : null;
        mock = false;
      }
    }
  } catch (e) { /* fall through to mock anchor */ }
  try {
    const { ok, body } = await api(`/api/dapp/sessions/${session.sessionId}/anchor/confirm`, {
      method: 'POST', body: JSON.stringify({ txHash, mock }),
    });
    if (ok && body && body.session) return body.session;
  } catch (e) {}
  return session;
}

// HH:MM:SS for a millisecond remainder.
function fmtCountdown(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

// "12h 45m" for a millisecond remainder — hours + minutes only.
function fmtHoursMins(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return `${h}h ${m}m`;
}
