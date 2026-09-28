// GET /api/process — advance the automatic pipeline (moderate, then draw). Safe to call repeatedly: locked and idempotent.
const { json } = require('./_store');
const { processNext } = require('./_auto');
module.exports = async (req, res) => {
  const t0 = Date.now(), steps = [];
  try {
    while (Date.now() - t0 < 30000) {
      const r = await processNext(); steps.push(r);
      if (r.idle || r.busy) break;
    }
    json(res, 200, { steps });
  } catch (e) { json(res, 200, { steps, error: String(e.message || e).slice(0, 200) }); }
};
