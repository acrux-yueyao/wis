// POST /api/admin  header x-admin-token: <ADMIN_TOKEN>
// {action:'list'} | {action:'approve'|'hide'|'delete', id} | {action:'setimage', id, image, alt}
const { cmd, allStories, json, readBody } = require('./_store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const want = process.env.ADMIN_TOKEN;
  if (!want || req.headers['x-admin-token'] !== want) return json(res, 401, { error: 'unauthorized' });
  const b = await readBody(req);
  try {
    if (b.action === 'list') {
      const all = (await allStories()).sort((a, c) => c.createdAt - a.createdAt);
      return json(res, 200, { stories: all });
    }
    const id = String(b.id || ''); if (!/^s_[a-z0-9]+$/.test(id)) return json(res, 400, { error: 'bad id' });
    if (b.action === 'approve' || b.action === 'hide') {
      await cmd('HSET', `story:${id}`, 'status', b.action === 'approve' ? 'approved' : 'hidden');
      return json(res, 200, { ok: true });
    }
    if (b.action === 'setimage') {
      await cmd('HSET', `story:${id}`, 'image', String(b.image || '').slice(0, 400), 'alt', String(b.alt || '').slice(0, 400));
      return json(res, 200, { ok: true });
    }
    if (b.action === 'delete') {
      await cmd('DEL', `story:${id}`); await cmd('LREM', 'stories:all', 0, id);
      return json(res, 200, { ok: true });
    }
    return json(res, 400, { error: 'unknown action' });
  } catch (e) { return json(res, 503, { error: e.message }); }
};
