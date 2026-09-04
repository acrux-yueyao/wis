// Upstash Redis REST helper (zero dependencies). Works with either the Vercel KV
// integration (KV_REST_API_*) or an Upstash marketplace database (UPSTASH_REDIS_REST_*).
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function cmd(...args) {
  if (!URL_ || !TOKEN) throw new Error('store not configured');
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
async function pipeline(cmds) {
  if (!URL_ || !TOKEN) throw new Error('store not configured');
  const r = await fetch(`${URL_}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
  const j = await r.json();
  return j.map(x => x.result);
}
function flat(h) { // Upstash returns HGETALL as [k,v,k,v,...]
  if (!Array.isArray(h)) return h || null;
  const o = {}; for (let i = 0; i < h.length; i += 2) o[h[i]] = h[i + 1]; return o;
}
async function allStories() {
  const ids = await cmd('LRANGE', 'stories:all', 0, -1);
  if (!ids.length) return [];
  const rows = await pipeline(ids.map(id => ['HGETALL', `story:${id}`]));
  return rows.map(flat).filter(Boolean).map(s => ({ ...s, createdAt: Number(s.createdAt) }));
}
function publicView(s) {
  return { id: s.id, text: s.text, initials: s.initials || '', lang: s.lang || 'zh', image: s.image || '', alt: s.alt || '', createdAt: s.createdAt };
}
function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise(resolve => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let d = ''; req.on('data', c => d += c); req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
  });
}
module.exports = { cmd, pipeline, allStories, publicView, json, readBody };
