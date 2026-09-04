// POST /api/submit  {text, initials?, email?, lang?, consent:true, website:''(honeypot)}
const { cmd, json, readBody } = require('./_store');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const b = await readBody(req);
  if (b.website) return json(res, 200, { ok: true }); // honeypot: pretend success
  const text = String(b.text || '').replace(/\s+/g, ' ').trim();
  if (text.length < 10 || text.length > 600) return json(res, 400, { error: 'text must be 10–600 characters' });
  if (b.consent !== true) return json(res, 400, { error: 'consent required' });
  const initials = String(b.initials || '').slice(0, 12).replace(/[<>]/g, '').trim();
  const email = String(b.email || '').slice(0, 120).trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(res, 400, { error: 'invalid email' });
  const lang = b.lang === 'en' ? 'en' : 'zh';

  // rate limit: 5 submissions per IP per hour
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const bucket = `rl:${crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)}:${Math.floor(Date.now() / 3600000)}`;
  try {
    const n = await cmd('INCR', bucket);
    if (n === 1) await cmd('EXPIRE', bucket, 3600);
    if (n > 5) return json(res, 429, { error: 'too many submissions — please try again in an hour' });

    const id = 's_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    await cmd('HSET', `story:${id}`, 'id', id, 'text', text, 'initials', initials, 'email', email, 'lang', lang,
      'status', 'pending', 'image', '', 'alt', '', 'createdAt', String(Date.now()));
    await cmd('LPUSH', 'stories:all', id);
    return json(res, 200, { ok: true, id });
  } catch (e) {
    return json(res, 503, { error: e.message === 'store not configured' ? 'the wall is not open yet' : 'storage error' });
  }
};
