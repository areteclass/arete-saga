/* ═══════════════════════════════════════════════════════════════
   아레테 사가 v34 도감 · 업적 (codex.js)
   · 📚 지식(기존) · 👾 몬스터 15종 · 🎒 장비·꾸미기 · ✦ 스킬 · 🏆 업적 — 한 화면에서 "수집률 N%"
   · 몬스터는 처음 쓰러뜨리면 실루엣 → 그림·성격·처치 수·드랍이 열림
   · 업적 40개(전투·도감·학습·탐험·성장·수집·꾸준함)와 수집률 25/50/75/100% 보상 — 받기는 서버가 확인
   · 새 업적 달성·새 몬스터 발견 시 알림음과 알림, 메뉴·도감 버튼에 빨간 점
   서버: Addon.gs v34 필요(getAchievements · claimAchievement · claimCollection). 로드 순서: ... battle.js → codex.js
   ═══════════════════════════════════════════════════════════════ */
(function(){
var ov=document.getElementById('codex'); var panel=ov&&ov.querySelector('.panel');
if(!panel||typeof openCodex!=='function'||typeof renderCodex!=='function'){ console.warn('codex.js: 원본 도감을 찾지 못함'); return; }
var origRender=renderCodex;

var GEAR={'무기':1,'방어구':1,'장신구':1,'코스튬':1};
var KIND_ICON={'무기':'⚔️','방어구':'🛡️','장신구':'💍','코스튬':'🎩'};
var TRAIT={
  '입문':'입문용 몬스터예요. 약하고 느려서 첫 사냥에 좋아요.',
  '보통':'기본적인 몬스터예요. 균형이 잡혀 있어요.',
  '날렵':'빠르게 달라붙지만 체력이 낮아요. 빨리 잡는 게 상책!',
  '단단':'느리지만 아주 단단해요. 오래 걸리니 스킬을 아끼지 마세요.',
  '강타':'한 방이 아파요. 붉은 원이 차오르면 꼭 피하세요!',
  '거인':'체력도 공격도 최고지만 느리고 둔해요. 거리를 두고 싸우세요.',
  '최강':'이 섬 최강의 몬스터예요. 체력·공격이 모두 높아요.'
};
var MILE=[{pct:25,tp:100,sp:0},{pct:50,tp:200,sp:2},{pct:75,tp:400,sp:3},{pct:100,tp:1000,sp:5}];
var tab='m', ACH=null, lastBadge=0;
function el(id){ return document.getElementById(id); }
function sfxp(n){ try{ if(typeof sfx==='function') sfx(n); }catch(e){} }
function tierCol(it){ return (typeof tierColor==='function')?tierColor(it):'var(--line)'; }

/* ───────────── 기록 읽기 (서버 기준과 같은 식) ───────────── */
function st(){ return (G.save&&G.save['문제상태'])||{}; }
function killMap(){ return st().__kills||{}; }
function foundSet(){
  var f={}, k=killMap(); Object.keys(k).forEach(function(x){ f[x]=1; });
  Object.keys((G.save&&G.save['사냥기록'])||{}).forEach(function(key){ var m=/^(r[1-5])_h(\d)$/.exec(key); if(m) f[m[1]+'_'+(Number(m[2])%3)]=1; });
  return f;
}
function gearList(){ return (G.items||[]).filter(function(i){ return GEAR[i.kind]; }); }
function mySkills(){ var c=G.save&&G.save['캐릭터']; return (G.fskills||[]).filter(function(d){ return d.c===c; }); }
function skillLv(d){ var v=Number(((G.save&&G.save['스킬'])||{})[d.id])||0; if(d.free&&v<1) v=1; return v; }
function coll(){
  var inv=(G.save&&G.save['보유아이템'])||{}, gl=gearList(), sk=mySkills();
  var found=Object.keys(foundSet()).length, gOwn=gl.filter(function(i){ return inv[i.id]; }).length, sOwn=sk.filter(function(d){ return skillLv(d)>=1; }).length;
  var total=15+gl.length+sk.length, own=found+gOwn+sOwn;
  return {found:found,gOwn:gOwn,gTotal:gl.length,sOwn:sOwn,sTotal:sk.length,own:own,total:total,pct:total?Math.floor(own/total*100):0};
}
function claimedColl(pct){ var a=st().__ach; return !!(a&&a.coll&&a.coll[pct]); }

/* ───────────── 화면 구조 ───────────── */
var css=document.createElement('style');
css.textContent=
 '#codex .panel{width:420px;max-width:100%;max-height:92vh;display:flex;flex-direction:column}'+
 '#cx-coll{margin:8px 0 6px}.cx-cbar{height:12px;background:#241c3c;border:2px solid var(--line);border-radius:6px;overflow:hidden;position:relative}'+
 '.cx-cbar>i{display:block;height:100%;background:linear-gradient(90deg,#ffca4b,#ff9a3a);transition:width .5s}'+
 '.cx-ml{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:6px}'+
 '.cx-m{border:3px solid var(--line);border-radius:8px;background:var(--bg2);padding:4px 2px;text-align:center;font-size:10px;line-height:1.4;color:var(--muted);font-family:var(--font-body)}'+
 '.cx-m b{display:block;font-size:12px;color:#fff}.cx-m.ok{border-color:var(--gold);color:var(--gold);animation:cxp 1.1s infinite}.cx-m.done{border-color:#3a6a4a;color:#7fe0a0;background:#16281e}'+
 '@keyframes cxp{50%{box-shadow:0 0 0 3px rgba(255,202,75,.6)}}'+
 '#cx-tabs{display:flex;gap:4px;margin:6px 0 4px}#cx-tabs button{flex:1;position:relative;padding:8px 2px;font-size:10.5px;border-radius:7px;border:3px solid var(--line);background:var(--bg2);color:var(--muted);font-family:var(--font-body)}'+
 '#cx-tabs button.on{background:var(--panel);color:var(--gold);border-color:var(--gold)}'+
 '.cx-dot{position:absolute;right:2px;top:-4px;width:11px;height:11px;border-radius:50%;background:#ff4d4d;border:2px solid #120a1e}'+
 '#cx-body{overflow-y:auto;flex:1;min-height:200px;padding-right:2px}'+
 '.cx-h{font-size:12px;color:var(--gold);margin:12px 0 6px;display:flex;justify-content:space-between}'+
 '.cx-g3{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.cx-g4{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}'+
 '.cx-card{background:var(--panel2);border:3px solid var(--line);border-radius:9px;padding:6px 4px 7px;text-align:center;box-shadow:0 3px 0 var(--line);font-size:10.5px;line-height:1.4;font-family:var(--font-body);color:#fff;cursor:pointer}'+
 '.cx-card canvas,.cx-card img{display:block;margin:0 auto 3px;image-rendering:auto}.cx-card.lock{opacity:.55}.cx-card .nm{font-size:11px}.cx-card .sub{color:var(--muted);font-size:9.5px}'+
 '.cx-card.sel{border-color:var(--gold)}'+
 '.cx-det{margin-top:8px;background:#1b1432;border:3px solid #4a3a78;border-radius:10px;padding:10px;font-size:11px;line-height:1.6}'+
 '.cx-det .row{display:flex;align-items:center;gap:6px;margin-top:4px}.cx-det .lb{width:34px;color:var(--muted);font-size:10px}'+
 '.cx-bar{flex:1;height:8px;background:#241c3c;border-radius:4px;overflow:hidden}.cx-bar>i{display:block;height:100%}'+
 '.cx-ach{display:flex;gap:8px;align-items:center;background:var(--panel2);border:3px solid var(--line);border-radius:9px;padding:8px 9px;margin-top:6px}'+
 '.cx-ach.ok{border-color:var(--gold)}.cx-ach.done{opacity:.6}.cx-ach .in{flex:1;min-width:0}.cx-ach .t{font-size:12px}.cx-ach .d{font-size:10px;color:var(--muted);margin-top:1px}'+
 '.cx-ach .pb{height:6px;background:#241c3c;border-radius:3px;margin-top:5px;overflow:hidden}.cx-ach .pb>i{display:block;height:100%;background:var(--energy)}'+
 '.cx-ach .rw{font-size:10px;color:var(--gold);margin-top:3px}.cx-ach .btn{padding:8px 11px;font-size:11px;white-space:nowrap}'+
 '.cx-note{font-size:10.5px;color:var(--muted);line-height:1.6;margin:8px 2px}';
document.head.appendChild(css);
panel.innerHTML=
 '<div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">📖 도감</h3><div id="cx-pct" style="color:var(--gold);font-size:12px"></div></div>'+
 '<div id="cx-coll"></div><div id="cx-tabs"></div><div id="cx-body"></div>'+
 '<div style="text-align:right;margin-top:10px"><button class="btn ghost" onclick="closeOvl(\'codex\')">닫기</button></div>';

/* ───────────── 상단: 수집률 · 마일스톤 ───────────── */
function renderCollBar(){
  var c=coll(), box=el('cx-coll');
  el('cx-pct').textContent='수집률 '+c.pct+'%  ('+c.own+'/'+c.total+')';
  var h='<div class="cx-cbar"><i style="width:'+c.pct+'%"></i></div><div class="cx-ml">';
  MILE.forEach(function(m){
    var cls=claimedColl(m.pct)?'done':(c.pct>=m.pct?'ok':'');
    h+='<button class="cx-m '+cls+'" '+(cls==='ok'?'onclick="CODEX.claimColl('+m.pct+')"':'')+'><b>'+m.pct+'%</b>'+(cls==='done'?'✔ 받음':('🪙'+m.tp+(m.sp?' ✦'+m.sp:'')))+'</button>';
  });
  box.innerHTML=h+'</div>';
}
function badgeCount(){
  var n=0; if(ACH){ ACH.list.forEach(function(a){ if(a.cur>=a.goal&&!a.claimed) n++; }); (ACH.coll.mile||[]).forEach(function(m){ if(m.ok&&!m.claimed) n++; }); }
  else { n=Number(G.achClaimable)||0; var c=coll(); MILE.forEach(function(m){ if(c.pct>=m.pct&&!claimedColl(m.pct)) n++; }); }
  return n;
}
function renderTabs(){
  var defs=[['k','📚 지식'],['m','👾 몬스터'],['c','🎒 장비'],['s','✦ 스킬'],['a','🏆 업적']], b=badgeCount();
  el('cx-tabs').innerHTML=defs.map(function(d){ return '<button class="'+(tab===d[0]?'on':'')+'" onclick="codexTab(\''+d[0]+'\')">'+d[1]+(d[0]==='a'&&b>0?'<span class="cx-dot"></span>':'')+'</button>'; }).join('');
  setBadge(b);
}
function setBadge(n){
  lastBadge=n;
  document.querySelectorAll('[onclick*="openCodex"]').forEach(function(b){ var d=b.querySelector('.cx-dot'); if(n>0&&!d){ d=document.createElement('span'); d.className='cx-dot'; b.style.position='relative'; b.appendChild(d); } else if(n<=0&&d) d.remove(); });
  var mb=document.querySelector('[onclick*="toggleMenu"]')||el('btn-menu'); if(mb){ var d2=mb.querySelector('.cx-dot'); if(n>0&&!d2){ d2=document.createElement('span'); d2.className='cx-dot'; mb.style.position='relative'; mb.appendChild(d2); } else if(n<=0&&d2) d2.remove(); }
}

/* ───────────── 👾 몬스터 ───────────── */
var selMon=null;
function monThumb(rid,sp,known){
  var c=document.createElement('canvas'); c.width=76; c.height=76; var g=c.getContext('2d'); g.imageSmoothingEnabled=false;
  g.save(); g.scale(1.7,1.7); try{ drawBeast(g,22,22,rid,0,sp); }catch(e){} g.restore();
  if(!known){ g.globalCompositeOperation='source-in'; g.fillStyle='#0b0714'; g.fillRect(0,0,76,76); }
  return c;
}
function barRow(label,v,col){ return '<div class="row"><span class="lb">'+label+'</span><div class="cx-bar"><i style="width:'+Math.min(100,Math.round(v/1.8*100))+'%;background:'+col+'"></i></div><span style="width:34px;text-align:right">×'+v.toFixed(2).replace(/\.?0+$/,'')+'</span></div>'; }
function monDetail(z,sp){
  var rid=G.regions[z].id, key=rid+'_'+sp, k=killMap()[key]||[0,0,0], f=foundSet(), known=!!f[key];
  var nm=(BEAST_NAME[rid]||[])[sp]||'몬스터';
  if(!known) return '<div class="cx-det"><b>???</b><div class="cx-note" style="margin:4px 0 0">'+G.regions[z].name+'에서 만날 수 있어요. 한 번 쓰러뜨리면 도감에 등록돼요.</div></div>';
  var spec=(window.BAL&&BAL.spec)?BAL.spec({z:z,sp:sp}):{hp:1,dmg:1,spd:1,aggro:1,label:'보통'};
  var drops=((G.mobDrops||{})[rid]||[]).map(function(id){ var it=(G.items||[]).filter(function(x){ return x.id===id; })[0]; var own=((G.save['보유아이템'])||{})[id]; return it?('<span style="color:'+(own?'#7fe0a0':'var(--muted)')+'">'+(own?'✔ ':'')+it.name+'</span>'):''; }).filter(Boolean).join(' · ');
  return '<div class="cx-det"><div style="display:flex;justify-content:space-between"><b style="font-size:13px">'+nm+'</b><span style="color:var(--gold)">'+spec.label+'형</span></div>'+
    '<div style="color:var(--muted);margin-top:3px">'+(TRAIT[spec.label]||'')+'</div>'+
    barRow('체력',spec.hp,'#ff9a6b')+barRow('공격',spec.dmg,'#ff5a5a')+barRow('속도',spec.spd,'#37e0cf')+
    '<div style="margin-top:7px">처치 <b>'+(k[0]||0)+'</b>마리 · 정예 <b>'+(k[1]||0)+'</b> · 희귀 <b>'+(k[2]||0)+'</b></div>'+
    (drops?'<div style="margin-top:4px;color:var(--muted)">🎁 전리품: '+drops+'</div>':'')+'</div>';
}
function renderMonsters(b){
  var f=foundSet(), total=0, h='';
  G.regions.forEach(function(r,z){ var n=0; for(var s=0;s<3;s++) if(f[r.id+'_'+s]) n++; total+=n; h+='<div class="cx-h"><span>'+(z+1)+'단계 · '+r.name+'</span><span>'+n+'/3</span></div><div class="cx-g3" data-z="'+z+'"></div><div class="cx-detslot" data-z="'+z+'"></div>'; });
  b.innerHTML='<div class="cx-note">몬스터를 한 번 쓰러뜨리면 도감에 등록돼요. 눌러서 성격과 전리품을 확인하세요. (처치 수는 업데이트 이후부터 세어요)</div>'+h;
  G.regions.forEach(function(r,z){
    var row=b.querySelector('.cx-g3[data-z="'+z+'"]');
    for(var s=0;s<3;s++) (function(s){
      var known=!!f[r.id+'_'+s], d=document.createElement('div'); d.className='cx-card'+(known?'':' lock')+(selMon===z+'_'+s?' sel':'');
      d.appendChild(monThumb(r.id,s,known));
      var nm=document.createElement('div'); nm.className='nm'; nm.textContent=known?(BEAST_NAME[r.id]||[])[s]:'???'; d.appendChild(nm);
      var sub=document.createElement('div'); sub.className='sub'; sub.textContent=known?('처치 '+(((killMap()[r.id+'_'+s])||[0])[0]||0)):'미발견'; d.appendChild(sub);
      d.onclick=function(){ selMon=(selMon===z+'_'+s)?null:(z+'_'+s); sfxp('click'); renderMonsters(b); };
      row.appendChild(d);
    })(s);
  });
  if(selMon){ var p=selMon.split('_'), slot=b.querySelector('.cx-detslot[data-z="'+p[0]+'"]'); if(slot) slot.innerHTML=monDetail(Number(p[0]),Number(p[1])); }
}

/* ───────────── 🎒 장비 · 꾸미기 ───────────── */
var iconCache={};
function gearIcon(it,known){
  var k=it.id+(known?'1':'0'); if(iconCache[k]) return iconCache[k];
  var c=document.createElement('canvas'); c.width=c.height=48; var g=c.getContext('2d'); g.imageSmoothingEnabled=true;
  var p=(window.HeroArt&&HeroArt.part)?HeroArt.part(it.id):null;
  if(p){ var s=Math.min(44/p.width,44/p.height); g.drawImage(p,24-p.width*s/2,24-p.height*s/2,p.width*s,p.height*s); }
  else { g.font='28px serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(KIND_ICON[it.kind]||'❔',24,26); }
  if(!known){ g.globalCompositeOperation='source-in'; g.fillStyle='#0b0714'; g.fillRect(0,0,48,48); }
  return (iconCache[k]=c.toDataURL());
}
function renderGear(b){
  var inv=G.save['보유아이템']||{}, h='<div class="cx-note">모은 장비와 꾸미기예요. 아직 없는 것은 실루엣으로 보여요.</div>';
  ['무기','방어구','장신구','코스튬'].forEach(function(kind){
    var list=(G.items||[]).filter(function(i){ return i.kind===kind; }).sort(function(a,b2){ return (Number(a.tier)||1)-(Number(b2.tier)||1); });
    if(!list.length) return;
    var own=list.filter(function(i){ return inv[i.id]; }).length;
    h+='<div class="cx-h"><span>'+KIND_ICON[kind]+' '+kind+'</span><span>'+own+'/'+list.length+'</span></div><div class="cx-g4">';
    list.forEach(function(it){
      var has=!!inv[it.id], col=has?tierCol(it):'var(--line)';
      h+='<div class="cx-card'+(has?'':' lock')+'" style="border-color:'+col+'"><img src="'+gearIcon(it,has)+'" width="44" height="44" alt=""><div class="nm">'+(has?it.name:'???')+'</div><div class="sub">'+(has?'':(Number(it.price)>0?'상점':'전리품'))+'</div></div>';
    });
    h+='</div>';
  });
  b.innerHTML=h;
}

/* ───────────── ✦ 스킬 ───────────── */
function renderSkillCodex(b){
  var sk=mySkills(), h='<div class="cx-note">내 영웅의 스킬이에요. 스킬 화면(★)에서 SP로 익히고 키울 수 있어요.</div>';
  if(!sk.length){ b.innerHTML=h+'<div class="cx-note">스킬 정보를 불러오는 중이에요.</div>'; return; }
  [['a','⚔ 전투 스킬'],['p','✚ 패시브'],['u','★ 필살기']].forEach(function(g){
    var list=sk.filter(function(d){ return d.t===g[0]; }), own=list.filter(function(d){ return skillLv(d)>=1; }).length;
    h+='<div class="cx-h"><span>'+g[1]+'</span><span>'+own+'/'+list.length+'</span></div>';
    list.forEach(function(d){
      var lv=skillLv(d), has=lv>=1, pips=''; for(var i=1;i<=d.max;i++) pips+=(i<=lv?'●':'○');
      var icon=(window.SKILLS&&SKILLS.iconURL)?SKILLS.iconURL(d.id,40):'';
      h+='<div class="cx-ach'+(has?'':' done')+'" style="'+(has?'':'opacity:.5')+'"><img src="'+icon+'" width="40" height="40" alt="" style="'+(has?'':'filter:grayscale(1) brightness(.5)')+'"><div class="in"><div class="t">'+(has?d.n:'???')+' <span style="color:var(--gold);font-size:10px;letter-spacing:1px">'+pips+'</span></div>'+
        '<div class="d">'+(has?d.d:('캐릭터 Lv.'+d.lr+'부터 · '+(d.cost&&d.cost[0]!==undefined?d.cost[0]:0)+' SP'))+'</div></div></div>';
    });
  });
  b.innerHTML=h;
}

/* ───────────── 🏆 업적 ───────────── */
function renderAch(b){
  if(G.guest){ b.innerHTML='<div class="cx-note">체험판에서는 업적을 모을 수 없어요. 가입하면 업적과 보상을 받을 수 있어요!</div>'; return; }
  if(!ACH){ b.innerHTML='<div class="cx-note">업적을 불러오는 중…</div>'; loadAch(); return; }
  var att=st().__att||{}, done=ACH.list.filter(function(a){ return a.claimed; }).length;
  var h='<div class="cx-note">🔥 연속 출석 <b style="color:var(--gold)">'+(att.streak||0)+'일</b> (최고 '+(att.best||0)+'일 · 총 '+(att.days||0)+'일) · 달성한 업적 <b style="color:var(--gold)">'+done+'/'+ACH.list.length+'</b></div>';
  var cats=[]; ACH.list.forEach(function(a){ if(cats.indexOf(a.cat)<0) cats.push(a.cat); });
  cats.forEach(function(c){
    var L=ACH.list.filter(function(a){ return a.cat===c; }).sort(function(x,y){ var xr=(x.cur>=x.goal&&!x.claimed)?0:(x.claimed?2:1), yr=(y.cur>=y.goal&&!y.claimed)?0:(y.claimed?2:1); return xr-yr; });
    h+='<div class="cx-h"><span>'+c+'</span><span>'+L.filter(function(a){return a.claimed;}).length+'/'+L.length+'</span></div>';
    L.forEach(function(a){
      var ok=a.cur>=a.goal, cls=a.claimed?'done':(ok?'ok':'');
      h+='<div class="cx-ach '+cls+'"><div style="font-size:22px">'+(a.claimed?'🏅':(ok?'🏆':'🔒'))+'</div><div class="in"><div class="t">'+a.n+'</div><div class="d">'+a.d+'</div><div class="pb"><i style="width:'+Math.min(100,a.cur/a.goal*100)+'%"></i></div>'+
        '<div class="rw">'+Math.min(a.cur,a.goal)+' / '+a.goal+' · 보상 🪙'+a.tp+(a.sp?' ✦'+a.sp+' SP':'')+'</div></div>'+
        (a.claimed?'<span style="font-size:11px;color:#7fe0a0">✔</span>':(ok?'<button class="btn gold" onclick="CODEX.claim(\''+a.id+'\')">받기</button>':''))+'</div>';
    });
  });
  b.innerHTML=h;
}
function loadAch(cb){
  if(G.guest) return;
  srv('getAchievements',G.hakbun).then(function(r){ if(r&&r.ok){ ACH=r; if(cb) cb(); render(); } else if(el('cx-body')&&tab==='a') el('cx-body').innerHTML='<div class="cx-note">업적을 불러오지 못했어요. 서버(Addon.gs)를 새 버전으로 배포했는지 확인해 주세요.</div>'; }).catch(function(){});
}

/* ───────────── 전체 그리기 ───────────── */
function render(){
  if(!el('codex').classList.contains('open')) return;
  renderCollBar(); renderTabs();
  var b=el('cx-body');
  if(tab==='k'){ _cxTab='k'; origRender(); return; }
  if(tab==='m') renderMonsters(b); else if(tab==='c') renderGear(b); else if(tab==='s') renderSkillCodex(b); else renderAch(b);
}
openCodex=function(){ tab=(badgeCount()>0&&!G.guest)?'a':'m'; selMon=null; if(!ACH&&!G.guest) loadAch(); openOvl('codex'); render(); };
codexTab=function(t){ tab=t; sfxp('click'); if(t==='a'&&!ACH) loadAch(); render(); };
renderCodex=render;

/* ───────────── 받기 ───────────── */
function afterClaim(r,label){
  G.save=r.save; syncFromSave(); sfxp('achv'); if(r.sp) setTimeout(function(){ sfxp('sp'); },300);
  toast('🏆 <b>'+label+'</b> 보상 — 🪙 TP +'+r.tp+(r.sp?' · ✦ SP +'+r.sp:''));
  if(typeof banner==='function') banner('🏅 보상 획득!','TP +'+r.tp+(r.sp?' · SP +'+r.sp:''));
}
var CODEX={
  badge:function(){ return lastBadge; },
  claim:function(id){ srv('claimAchievement',G.hakbun,id).then(function(r){ if(!r||!r.ok){ toast((r&&r.msg)||'받지 못했어요'); return; } afterClaim(r,r.name);
    if(ACH){ ACH.list.forEach(function(a){ if(a.id===id) a.claimed=true; }); } render(); }).catch(function(){ toast('통신 오류예요'); }); },
  claimColl:function(pct){ srv('claimCollection',G.hakbun,pct).then(function(r){ if(!r||!r.ok){ toast((r&&r.msg)||'받지 못했어요'); return; } afterClaim(r,'수집률 '+pct+'%');
    if(ACH&&ACH.coll) ACH.coll.mile.forEach(function(m){ if(m.pct===pct) m.claimed=true; }); var a=st().__ach; render(); }).catch(function(){ toast('통신 오류예요'); }); },
  notify:function(a){
    sfxp('achv'); toast('🏆 <b>업적 달성!</b> '+a.n+' <small>(도감에서 보상 받기)</small>');
    G.achClaimable=(Number(G.achClaimable)||0)+1; ACH=null; setBadge(badgeCount()); if(el('codex').classList.contains('open')&&tab==='a') loadAch();
  },
  stats:coll
};
window.CODEX=CODEX;

/* ───────────── 서버 응답에서 알림 · 새 몬스터 발견 알림 ───────────── */
var _srv=srv;
srv=function(fn){
  var p=_srv.apply(this,arguments);
  return p.then(function(r){
    if(r&&r.ok){
      if((fn==='initGame')&&r.achClaimable!==undefined){ G.achClaimable=r.achClaimable; if(r.mobDrops) G.mobDrops=r.mobDrops; ACH=null; knownBase=null; setTimeout(function(){ setBadge(badgeCount()); },400); }
      if(fn==='guestInit'&&r.mobDrops) G.mobDrops=r.mobDrops;
      if(r.achNew&&r.achNew.length&&fn!=='submitAnswer') r.achNew.forEach(function(a,i){ setTimeout(function(){ CODEX.notify(a); },400+i*900); });
      else if(r.achNew&&r.achNew.length) r.achNew.forEach(function(a,i){ setTimeout(function(){ CODEX.notify(a); },1200+i*900); });
    }
    return r;
  });
};
var knownBase=null;
function watchDiscovery(){
  if(!G.save||!G.save['캐릭터']||G.guest) return;
  var f=foundSet(), n=Object.keys(f).length;
  if(knownBase===null){ knownBase=f; return; }
  Object.keys(f).forEach(function(k){ if(!knownBase[k]){ knownBase[k]=1; var p=k.split('_'), nm=(BEAST_NAME[p[0]]||[])[Number(p[1])]||'몬스터'; sfxp('codex'); toast('👾 <b>도감 등록!</b> '+nm); setBadge(badgeCount()); if(el('codex').classList.contains('open')) render(); } });
}
setInterval(watchDiscovery,1200);
/* 보상·구입 직후 화면 갱신 */
var _sfs=syncFromSave; syncFromSave=function(){ var r=_sfs.apply(this,arguments); if(el('codex')&&el('codex').classList.contains('open')) renderCollBar(); return r; };
window.addEventListener('load',function(){ setTimeout(function(){ setBadge(badgeCount()); },1500); });
})();
