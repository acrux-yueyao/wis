/* THE WORLD IS YOURS — dark-field engine (shared EN/ZH; page sets window.LANG) */
(function(){
const L = window.LANG === 'zh' ? 'zh' : 'en';

const T = {
 en:{
  films:[
   ["The Crane and the Moon","Someone described the moon as something near — near enough to install. So we hung it."],
   ["The Threshold","Half of it is not yet said; half already understood. The border keeps moving, and dust crosses through the light."],
   ["Brightness That Refuses","That brightness is not for seeing — it forces the eyes shut. Only when he said “bright” did we learn that brightness can refuse."],
   ["A Cathedral Overheard","A building never visited, built from adjectives overheard. The grain of the stone is the residue of other people's voices."],
   ["Steles in Fog","Grass to the knee, steles in fog. A shape without a name can still be remembered — remembering how it feels is enough."],
   ["Assemblage at Dusk","A column, pipes, a cracked tub: sentences from different people piled into one dusk. None of them is whole; together they resemble a home."],
   ["The Wire Sphere","The thing inside can't be explained — only that it burns, and that wire wraps around it. The plain is vast, the antenna thin, the fire small; it stays lit."],
   ["A Planet on No Map","The world he spoke of is on no map. Fine — give it a glowing horizon and a few yellow moons. It is wherever you say it is."],
   ["The Doorway","She stands in the doorway; beyond it, a sky described to her a thousand times. Her back is to us — seeing was never something we could finish on her behalf."],
   ["Two Cats","Two cats on a white city, watching the sun go down. Neither explains orange to the other. Some company precedes understanding, and asks for none."],
   ["Daytime Through Paper","The whole world gauzed in yellow, like light seen through paper. He said: this is my daytime. So we placed the camera inside the paper, too."]],
  listenIdle:"STAND STILL TO LISTEN", listenUp:"EIGHT VOICES — KEEP STILL",
  sentenceBtn:"THE SENTENCE →"
 },
 zh:{
  films:[
   ["塔吊与月亮","有人把月亮说得很近，近到像一件可以安装的东西。我们就把它挂上去了。"],
   ["边界","一半是还没说出的，一半是已经听懂的。中间那条边界一直在移动，尘埃在光里过境。"],
   ["睁不开眼的亮","那种亮不是用来看见的亮，是睁不开眼的亮。他说“亮”的时候，我们才知道亮也可以是一种拒绝。"],
   ["听来的教堂","一座从来没有去过的建筑，用听来的形容词砌成。石头的纹理，是别人的声音留下的。"],
   ["雾中石碑","草长到膝盖，碑站在雾里。没有名字的形状也可以被记住——记住它的手感就够了。"],
   ["黄昏里的拼装","柱子、水管、一只裂了的浴缸：不同人的句子堆在同一个黄昏里。没有一件是完整的，合起来却像一个家。"],
   ["原野上的线团","心里的那团东西说不清楚，只能说它在烧，外面缠着线。原野很大，天线很细，火很小，但一直亮着。"],
   ["不在地图上的行星","他说的世界不在地图上。好——那就给它一条发光的地平线，几颗黄色的月亮。你说它在哪里，它就在哪里。"],
   ["门框里的背影","她站在门里，门外是别人替她描述过一千次的天空。她背对我们——因为看见，从来不是我们能替她完成的事。"],
   ["两只猫","两只猫坐在白色的城市上看落日。它们不需要向对方解释橙色。有些陪伴先于理解，也不索取理解。"],
   ["隔着纸的白天","整个世界蒙上一层黄，像隔着一张纸看光。他说：这就是我的白天。我们把摄影机也放进了那张纸里。"]],
  listenIdle:"驻 足 即 听", listenUp:"八 个 声 道 —— 别 动",
  sentenceBtn:"那 句 话 →"
 }
}[L];

/* 11 屏位（来自布展平面, 米） -> 视口归一 */
const POS = [[1.8,9.2],[4.6,9.3],[7.3,9.6],[3.2,12.55],[6.3,12.65],[1.6,13.9],
             [4.6,14.2],[7.5,14.0],[3.0,16.6],[6.4,16.9],[4.8,19.4]];
const xs = POS.map(p=>p[0]), ys = POS.map(p=>p[1]);
const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);

/* ---------- cursor light ---------- */
const cur = document.getElementById('cursor');
let mx=innerWidth/2, my=innerHeight/2;
addEventListener('mousemove',e=>{
  mx=e.clientX; my=e.clientY;
  document.documentElement.style.setProperty('--mx',mx+'px');
  document.documentElement.style.setProperty('--my',my+'px');
  if(cur){cur.style.left=mx+'px';cur.style.top=my+'px';}
  stirred();
});
document.addEventListener('mouseover',e=>{
  document.body.classList.toggle('hovering', !!e.target.closest('button,a,.star'));
});

/* ---------- field ---------- */
const field = document.getElementById('field');
const seen = new Set();
const stars = T.films.map((f,i)=>{
  const n = String(i+1).padStart(2,'0');
  const s = document.createElement('button');
  s.className='star'; s.setAttribute('aria-label', n+' '+f[0]);
  const px = 14 + ( (POS[i][0]-x0)/(x1-x0) )*72;      /* vw % */
  const py = 16 + ( 1-(POS[i][1]-y0)/(y1-y0) )*64;    /* vh %, 北在上 */
  s.style.left=px+'vw'; s.style.top=py+'vh';
  s.innerHTML = `<span class="pt"></span>
    <span class="peek"><img src="assets/poster/film${n}.jpg" alt=""><em>${n} · ${f[0]}</em></span>
    <span class="num">${n}</span>`;
  s.addEventListener('click',()=>openViewer(i));
  field.appendChild(s);
  return s;
});

/* ---------- viewer ---------- */
const viewer = document.getElementById('viewer');
const vv = viewer.querySelector('video');
let cursorIdx = 0;
function openViewer(i){
  cursorIdx = i;
  const n = String(i+1).padStart(2,'0');
  vv.src = `assets/video/film${n}.mp4`;
  vv.poster = `assets/poster/film${n}.jpg`;
  viewer.querySelector('.n').textContent = n;
  viewer.querySelector('.t').textContent = T.films[i][0];
  viewer.querySelector('.r').textContent = T.films[i][1];
  viewer.classList.add('open');
  duckAudio(true);
  vv.play().catch(()=>{});
  seen.add(i); stars[i].classList.add('seen'); updateCount();
}
function closeViewer(){
  viewer.classList.remove('open'); vv.pause(); vv.removeAttribute('src'); vv.load();
  duckAudio(false);
}
viewer.querySelector('.x').addEventListener('click',closeViewer);
viewer.querySelector('.prev').addEventListener('click',()=>openViewer((cursorIdx+10)%11));
viewer.querySelector('.next').addEventListener('click',()=>openViewer((cursorIdx+1)%11));
viewer.addEventListener('click',e=>{ if(e.target===viewer) closeViewer(); });
addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeViewer();closeVeils();}
  if(viewer.classList.contains('open')){
    if(e.key==='ArrowRight')openViewer((cursorIdx+1)%11);
    if(e.key==='ArrowLeft')openViewer((cursorIdx+10)%11);
  }
});

const countEl = document.getElementById('c-count');
const sentBtn = document.getElementById('c-sent');
function updateCount(){
  countEl.textContent = seen.size + ' / 11';
  if(seen.size===11 && sentBtn){ sentBtn.style.display='inline'; }
}

/* ---------- veils ---------- */
function closeVeils(){ document.querySelectorAll('.veil.open').forEach(v=>v.classList.remove('open')); }
document.querySelectorAll('[data-open]').forEach(b=>{
  b.addEventListener('click',()=>{ closeVeils(); document.getElementById(b.dataset.open).classList.add('open'); });
});
document.querySelectorAll('.veil .x').forEach(x=>x.addEventListener('click',closeVeils));

/* ---------- sound: stand still to listen ---------- */
const amb = document.getElementById('amb');
const listenEl = document.getElementById('c-listen');
let soundOn=false, lastMove=performance.now(), gain=0, ducked=false;
function stirred(){ lastMove = performance.now(); }
function duckAudio(v){ ducked = v; }
function loop(){
  if(soundOn && amb){
    const still = performance.now()-lastMove > 1100;
    const target = ducked ? 0 : (still ? 0.85 : 0.08);
    gain += (target-gain)*0.03;
    amb.volume = Math.max(0,Math.min(1,gain));
    if(listenEl){
      listenEl.classList.toggle('up', still && !ducked);
      listenEl.textContent = (still && !ducked) ? T.listenUp : T.listenIdle;
    }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- enter ---------- */
const enter = document.getElementById('enter');
function goInside(withSound){
  enter.classList.add('gone');
  document.body.classList.add('inside');
  if(withSound && amb){ soundOn=true; amb.volume=0; amb.play().catch(()=>{soundOn=false;}); }
  if(!withSound && listenEl){ listenEl.style.display='none'; }
}
document.getElementById('enter-sound').addEventListener('click',()=>goInside(true));
document.getElementById('enter-silent').addEventListener('click',()=>goInside(false));

if(sentBtn) sentBtn.style.display='none';
updateCount();
})();
