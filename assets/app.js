/* THE WORLD IS YOURS — index + watch engine (page sets window.LANG) */
(function(){
const L = window.LANG === 'zh' ? 'zh' : 'en';
const T = {
 en:{
  films:[
   ["The Crane and the Moon","Someone described the moon as something near — near enough to install. So we hung it.","1'09"],
   ["The Threshold","Half of it is not yet said; half already understood. The border keeps moving, and dust crosses through the light.","1'00"],
   ["Brightness That Refuses","That brightness is not for seeing — it forces the eyes shut. Only when he said “bright” did we learn that brightness can refuse.","1'00"],
   ["A Cathedral Overheard","A building never visited, built from adjectives overheard. The grain of the stone is the residue of other people's voices.","1'00"],
   ["Steles in Fog","Grass to the knee, steles in fog. A shape without a name can still be remembered — remembering how it feels is enough.","0'47"],
   ["Assemblage at Dusk","A column, pipes, a cracked tub: sentences from different people piled into one dusk. None of them is whole; together they resemble a home.","0'41"],
   ["The Wire Sphere","The thing inside can't be explained — only that it burns, and that wire wraps around it. The plain is vast, the antenna thin, the fire small; it stays lit.","0'46"],
   ["A Planet on No Map","The world he spoke of is on no map. Fine — give it a glowing horizon and a few yellow moons. It is wherever you say it is.","0'54"],
   ["The Doorway","She stands in the doorway; beyond it, a sky described to her a thousand times. Her back is to us — seeing was never something we could finish on her behalf.","1'31"],
   ["Two Cats","Two cats on a white city, watching the sun go down. Neither explains orange to the other. Some company precedes understanding, and asks for none.","0'50"],
   ["Daytime Through Paper","The whole world gauzed in yellow, like light seen through paper. He said: this is my daytime. So we placed the camera inside the paper, too.","1'00"]],
  hint:"SCROLL / ← → TO CHANGE FILM"
 },
 zh:{
  films:[
   ["塔吊与月亮","有人把月亮说得很近，近到像一件可以安装的东西。我们就把它挂上去了。","1'09"],
   ["边界","一半是还没说出的，一半是已经听懂的。中间那条边界一直在移动，尘埃在光里过境。","1'00"],
   ["睁不开眼的亮","那种亮不是用来看见的亮，是睁不开眼的亮。他说“亮”的时候，我们才知道亮也可以是一种拒绝。","1'00"],
   ["听来的教堂","一座从来没有去过的建筑，用听来的形容词砌成。石头的纹理，是别人的声音留下的。","1'00"],
   ["雾中石碑","草长到膝盖，碑站在雾里。没有名字的形状也可以被记住——记住它的手感就够了。","0'47"],
   ["黄昏里的拼装","柱子、水管、一只裂了的浴缸：不同人的句子堆在同一个黄昏里。没有一件是完整的，合起来却像一个家。","0'41"],
   ["原野上的线团","心里的那团东西说不清楚，只能说它在烧，外面缠着线。原野很大，天线很细，火很小，但一直亮着。","0'46"],
   ["不在地图上的行星","他说的世界不在地图上。好——那就给它一条发光的地平线，几颗黄色的月亮。你说它在哪里，它就在哪里。","0'54"],
   ["门框里的背影","她站在门里，门外是别人替她描述过一千次的天空。她背对我们——因为看见，从来不是我们能替她完成的事。","1'31"],
   ["两只猫","两只猫坐在白色的城市上看落日。它们不需要向对方解释橙色。有些陪伴先于理解，也不索取理解。","0'50"],
   ["隔着纸的白天","整个世界蒙上一层黄，像隔着一张纸看光。他说：这就是我的白天。我们把摄影机也放进了那张纸里。","1'00"]],
  hint:"滚 动 / ← → 切 换"
 }
}[L];
const NN = i => String(i+1).padStart(2,'0');

/* ---------- splash ---------- */
setTimeout(()=>document.body.classList.add('ready'), 2100);

/* ---------- index ---------- */
const idx = document.getElementById('index');
const prev = document.getElementById('prev');
const pv = prev ? prev.querySelector('video') : null;
const seen = new Set();
const rows = T.films.map((f,i)=>{
  const r = document.createElement('div');
  r.className='row';
  r.style.transitionDelay = (0.06*i)+'s';
  r.innerHTML = `<span class="n">${NN(i)}</span><span class="ti">${f[0]}</span><span class="dur">${f[2]}"</span>`;
  if(matchMedia('(hover:hover)').matches && pv){
    r.addEventListener('mouseenter',()=>{
      pv.src = `assets/video/film${NN(i)}.mp4`;
      pv.play().catch(()=>{});
      prev.classList.add('on');
    });
    r.addEventListener('mouseleave',()=>{ prev.classList.remove('on'); pv.pause(); });
  }
  r.addEventListener('click',()=>enterWatch(i));
  idx.appendChild(r);
  return r;
});
/* preview follows cursor */
if(pv){
  let px=0,py=0,tx=0,ty=0;
  addEventListener('mousemove',e=>{tx=e.clientX+34;ty=e.clientY-104;});
  (function anim(){
    px+=(tx-px)*.12; py+=(ty-py)*.12;
    prev.style.left=Math.min(px,innerWidth-390)+'px';
    prev.style.top=Math.max(16,Math.min(py,innerHeight-240))+'px';
    requestAnimationFrame(anim);
  })();
}

/* ---------- watch mode ---------- */
const watch = document.getElementById('watch');
const stage = document.getElementById('wstage');
const curtain = document.getElementById('curtain');
const slides = T.films.map((f,i)=>{
  const d=document.createElement('div'); d.className='slide';
  d.innerHTML=`<video muted loop playsinline preload="none" poster="assets/poster/${'film'+NN(i)}.jpg" data-src="assets/video/film${NN(i)}.mp4"></video>`;
  stage.appendChild(d); return d;
});
let cur=-1, busy=false, watching=false;
function vidOf(i){ const v=slides[i].querySelector('video'); if(!v.src) v.src=v.dataset.src; return v; }
function show(i, first){
  i=(i+11)%11;
  if(busy || i===cur) return;
  busy=true; watch.classList.remove('settled');
  const prevIdx = cur; cur=i;
  const v=vidOf(i); v.currentTime=0;
  slides[i].classList.add('on'); v.play().catch(()=>{});
  vidOf((i+1)%11);
  if(prevIdx>=0){ const o=slides[prevIdx]; o.classList.remove('on');
    setTimeout(()=>o.querySelector('video').pause(), 1200); }
  document.getElementById('wnum').textContent=NN(i);
  document.querySelector('#wmeta .t').textContent=NN(i)+' · '+T.films[i][0];
  document.querySelector('#wmeta .r').textContent=T.films[i][1];
  document.getElementById('wbar').style.width=((i+1)/11*100)+'%';
  seen.add(i); rows[i].classList.add('seen');
  setTimeout(()=>{watch.classList.add('settled'); busy=false;}, first?300:700);
}
function enterWatch(i){
  if(watching) return;
  curtain.classList.add('on');
  setTimeout(()=>{
    watching=true; document.body.classList.add('watching');
    show(i,true);
    curtain.classList.remove('on');
  }, 480);
}
function exitWatch(){
  if(!watching) return;
  curtain.classList.add('on');
  setTimeout(()=>{
    watching=false; document.body.classList.remove('watching');
    if(cur>=0){ slides[cur].classList.remove('on'); slides[cur].querySelector('video').pause(); cur=-1; }
    curtain.classList.remove('on');
  }, 480);
}
document.getElementById('backidx').addEventListener('click',exitWatch);
document.getElementById('wprev').addEventListener('click',()=>show(cur-1));
document.getElementById('wnext').addEventListener('click',()=>show(cur+1));

let acc=0,lastW=0;
addEventListener('wheel',e=>{
  if(!watching) return;
  const now=performance.now(); if(now-lastW<900) return;
  acc+=e.deltaY;
  if(Math.abs(acc)>40){ show(cur+(acc>0?1:-1)); acc=0; lastW=now; }
},{passive:true});
addEventListener('keydown',e=>{
  if(e.key==='Escape'){ closeVeils(); exitWatch(); }
  if(!watching) return;
  if(e.key==='ArrowRight'||e.key==='ArrowDown') show(cur+1);
  if(e.key==='ArrowLeft'||e.key==='ArrowUp') show(cur-1);
});

/* ---------- veils ---------- */
function closeVeils(){ document.querySelectorAll('.veil.open').forEach(v=>{
  v.classList.remove('open');
  v.querySelectorAll('audio').forEach(a=>a.pause());
});}
document.querySelectorAll('[data-open]').forEach(b=>{
  b.addEventListener('click',()=>{ closeVeils(); document.getElementById(b.dataset.open).classList.add('open'); });
});
document.querySelectorAll('.veil .x').forEach(x=>x.addEventListener('click',closeVeils));
})();
