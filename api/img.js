// GET /api/img?id=… — serves a generated picture stored in Redis.
const { cmd } = require('./_store');
module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || new URL(req.url, 'http://x').searchParams.get('id') || '');
  if (!/^s_[a-z0-9]+$/.test(id)) { res.statusCode = 400; return res.end('bad id'); }
  const b64 = await cmd('GET', `img:${id}`).catch(() => null);
  if (!b64) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.end(Buffer.from(b64, 'base64'));
};
