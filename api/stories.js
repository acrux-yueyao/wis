// GET /api/stories -> approved stories, newest first (public fields only)
const { allStories, publicView, json } = require('./_store');

module.exports = async (req, res) => {
  try {
    const all = await allStories();
    const stories = all.filter(s => s.status === 'approved').sort((a, b) => b.createdAt - a.createdAt).map(publicView);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return json(res, 200, { stories });
  } catch (e) {
    return json(res, 200, { stories: [], note: 'store not configured' });
  }
};
