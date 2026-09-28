// Automatic pipeline: moderation -> concept (Gemini text) -> image (fal flux-lora) -> stored in Redis.
const { cmd } = require('./_store');

const GEMINI = process.env.GEMINI_API_KEY, FAL = process.env.FAL_KEY, LORA = process.env.WIS_LORA_URL;
const TEXT_MODELS = ['gemini-3.6-flash', 'gemini-3.6-flash', 'gemini-3.6-flash-lite', 'gemini-3.1-flash'];

const STYLE = "Style: a still frame from a low-poly 3D game-engine film — simple untextured geometry, flat or softly shaded surfaces, " +
  "slight bloom, gentle fog, film grain. Wide static shot, cinematic 16:9, minimal detail, large empty space, ONE central motif. " +
  "Human figures tiny or absent; never faces. No photorealism, no text, no rainy blue city street, no walking-silhouette cliche.";
const PALETTES = {
  'moon-night': 'deep indigo and cosmic purple night sky with a faint starfield, one pale white moon as the only light, cool shadows',
  'paper-yellow': 'the whole world gauzed in warm paper-yellow haze, high-key, soft golden light seen through paper, almost no shadows',
  'white-room': 'a pale white interior, chalky walls, one bright doorway or window of daylight, bleached and quiet',
  'fog-grey': 'grey-green fog over low grass, stone shapes standing in mist, desaturated, damp, muted',
  'dusk-pink': 'warm dusk of pink, peach and orange, long soft light, objects as dark silhouettes against the glow',
  'cathedral-dim': 'dim stone interior, ochre and umber, one shaft of light from above, heavy quiet dark',
  'wire-plain': 'a vast dark plain under a deep blue-black sky, one small warm fire the only light, thin lines against the void',
};
const READINGS = "Someone described the moon as something near — near enough to install. So we hung it. | " +
  "A building never visited, built from adjectives overheard. | Steles in fog: a shape without a name can still be remembered. | " +
  "A column, pipes, a cracked tub: sentences from different people piled into one dusk. | A planet on no map, with a glowing horizon and yellow moons. | " +
  "Three cats on a white city watching the sun go down. | The whole world gauzed in yellow, like light seen through paper.";

async function gemini(prompt) {
  if (!GEMINI) throw new Error('GEMINI_API_KEY missing');
  const body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, responseMimeType: 'application/json' } };
  let last;
  for (const m of TEXT_MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI }, body: JSON.stringify(body),
        signal: AbortSignal.timeout(25000) });
      const j = await r.json();
      if (j.error) { last = new Error(j.error.message); continue; }
      const parts = j.candidates[0].content.parts.filter(p => p.text && !p.thought);
      return JSON.parse(parts[parts.length - 1].text);
    } catch (e) { last = e; }
  }
  throw last || new Error('gemini failed');
}

// Returns {ok:boolean, reason:string}. Conservative: anything uncertain is held for a person.
async function moderate(text) {
  const out = await gemini(
    "You screen visitor submissions for a public art exhibition screen. Visitors were asked to write whatever they want.\n" +
    "HOLD the text (ok=false) if it: identifies a real private person by name together with private details; contains phone numbers, addresses, " +
    "emails, IDs or other contact details; is sexual; is hateful, harassing or threatening; describes intent to harm oneself or others; " +
    "is an advertisement, a link or spam; or is gibberish/keyboard mashing.\n" +
    "Everything else is ok=true — sadness, illness, anger, love, ordinary everyday things, public figures mentioned in passing are all fine.\n" +
    `Text: """${text}"""\n` +
    'Answer as JSON only: {"ok":true|false,"reason":"<short reason in Chinese>"}');
  return { ok: out.ok === true, reason: String(out.reason || '').slice(0, 120) };
}

async function concept(text, lang, source) {
  const pal = Object.entries(PALETTES).map(([k, v]) => `${k}: ${v}`).join('; ');
  const who = source === 'expo' ? `A visitor in the exhibition wrote: "${text}" (language: ${lang}).`
    : `A visitor finished the sentence 'The thing I can never describe is…' with: "${text}" (language: ${lang}).`;
  const out = await gemini(
    `You write image concepts for a film series whose logic is shown by these readings: ${READINGS}\n` +
    `The series uses exactly these palettes — ${pal}\n${who}\n` +
    "1) Write ONE image concept in English, max 40 words: a single quiet scene with one concrete motif, built as a metaphor in the film's " +
    "language — the thing itself, not a person describing it; no faces, no text in the image.\n" +
    "2) Choose the ONE palette whose mood fits the text best.\n" +
    'Answer as JSON only: {"concept":"...","palette":"<key>"}');
  const k = PALETTES[out.palette] ? out.palette : 'white-room';
  const c = String(out.concept || text).slice(0, 400);
  return { concept: c, palette: k };
}

async function render(conceptText, palette) {
  if (!FAL || !LORA) throw new Error('FAL_KEY / WIS_LORA_URL missing');
  const r = await fetch('https://fal.run/fal-ai/flux-lora', {
    method: 'POST', headers: { Authorization: `Key ${FAL}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: `wisworld style, ${conceptText}. Palette: ${PALETTES[palette]}. ${STYLE}`, image_size: 'landscape_16_9',
      num_images: 1, guidance_scale: 3.5, num_inference_steps: 26, loras: [{ path: LORA, scale: 0.85 }], output_format: 'jpeg' }),
    signal: AbortSignal.timeout(45000) });
  const j = await r.json();
  if (!r.ok || !j.images) throw new Error('fal: ' + (j.detail || r.status));
  const img = await fetch(j.images[0].url);
  return Buffer.from(await img.arrayBuffer()).toString('base64');
}

// Process the oldest story that needs work. One at a time, guarded by a lock.
async function processNext() {
  const got = await cmd('SET', 'lock:process', '1', 'NX', 'EX', 90);
  if (!got) return { busy: true };
  try {
    const ids = (await cmd('LRANGE', 'stories:all', 0, 50)).reverse();
    for (const id of ids) {
      const k = `story:${id}`;
      const [status, checked, image, text, lang, source, tries] = await cmd('HMGET', k, 'status', 'checked', 'image', 'text', 'lang', 'source', 'tries');
      if (!text) continue;
      if (Number(tries || 0) >= 3) continue;
      if (status === 'pending' && !checked) {
        await cmd('HINCRBY', k, 'tries', 1);
        const m = await moderate(text);
        await cmd('HSET', k, 'checked', m.ok ? 'auto-ok' : 'auto-held', 'reason', m.reason, 'status', m.ok ? 'approved' : 'hidden', 'tries', 0);
        return { id, moderated: m.ok ? 'approved' : 'held', reason: m.reason };
      }
      if (status === 'approved' && !image) {
        await cmd('HINCRBY', k, 'tries', 1);
        const c = await concept(text, lang || 'zh', source || 'web');
        const b64 = await render(c.concept, c.palette);
        await cmd('SET', `img:${id}`, b64);
        await cmd('HSET', k, 'image', `/api/img?id=${id}`, 'alt', `A program's guess: ${c.concept}`, 'palette', c.palette, 'tries', 0);
        return { id, image: true, palette: c.palette };
      }
    }
    return { idle: true };
  } finally { await cmd('DEL', 'lock:process'); }
}
module.exports = { processNext, moderate };
