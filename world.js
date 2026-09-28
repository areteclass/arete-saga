/* ═══════════════════════════════════════════════════════════════
   아레테 사가 v13 월드 확장 (world.js)
   - 섬 크기 38×17 → 56×25 타일 (약 2.2배)
   - 퀴즈 수호병: 한 줄로 늘어서던 배치 → 섬 전체에 흩어 배치, 동시 출현 수 제한
   - 사냥 몹·보물상자: 섬 곳곳(상자는 막다른 구석)에 배치, 모두 길로 연결된 칸에만
   - NPC: 넓어진 섬에 맞춰 위치 재배치
   - 문제 순환: 안 푼 문제 → 틀린 문제 우선, 필드에 같은 문제가 겹치지 않게
   설치: art.js 다음 줄에 <script src="world.js?v=13"></script>
   서버 변경 없음 (사냥 키 r1_h0~h9, 상자 키 c1~c3 그대로 사용)
   ═══════════════════════════════════════════════════════════════ */
(function(){
if(typeof initEntities!=='function'||typeof blockedLocal!=='function'){ console.warn('world.js: 원본 엔진을 찾지 못함'); return; }

/* ── 조정 가능한 값 ── */
var NEW_ZC=56, NEW_ZR=25;      // 섬 가로·세로 타일 수
var QUIZ_PER_REGION=10;        // 한 섬에 동시에 서 있는 퀴즈 수호병 수
var QUIZ_GAP=5;                // 수호병끼리 최소 간격(타일)
var HUNT_GAP=4.5;              // 사냥 몹끼리 최소 간격

var OLD_ZC=ZC, OLD_ZR=ZR, OLD_ROAD=ROAD;
ZC=NEW_ZC; ZR=NEW_ZR; ROAD=Math.floor(NEW_ZR/2); WW=ZC*5; WH=ZR;

/* 미니맵(remaster.js) 크기 갱신 */
try{
  var mm=document.getElementById('minimap');
  if(mm){ mm.width=ZC*3; mm.height=ZR*3; mm.style.width=(ZC*2)+'px'; mm.style.height=(ZR*2)+'px'; }
  if(window.RM) RM.mmCache={};
}catch(e){}

/* ── 강제로 비워 둘 칸(보스 앞마당·모닥불·상점) ── */
var CLEAR={};
function clearArea(z,cx,cy,rx,ry){
  for(var x=cx-rx;x<=cx+rx;x++) for(var y=cy-ry;y<=cy+ry;y++){
    if(y<1||y>ZR-2||x<2||x>ZC-3) continue;
    CLEAR[z+','+x+','+y]=1;
  }
}
var _blocked=blockedLocal;
blockedLocal=function(z,tx,ty){
  if(CLEAR[z+','+tx+','+ty]) return false;
  return _blocked(z,tx,ty);
};

/* ── 입구에서 걸어서 갈 수 있는 칸 (BFS) ── */
function walkable(z){
  var seen={}, q=[[3,ROAD]], out=[], head=0;
  seen['3,'+ROAD]=1;
  while(head<q.length){
    var p=q[head++]; out.push(p);
    var nb=[[1,0],[-1,0],[0,1],[0,-1]];
    for(var i=0;i<4;i++){
      var x=p[0]+nb[i][0], y=p[1]+nb[i][1], k=x+','+y;
      if(x<2||x>ZC-3||y<1||y>ZR-2||seen[k]) continue;
      if(blockedLocal(z,x,y)) continue;
      seen[k]=1; q.push([x,y]);
    }
  }
  return {list:out,set:seen};
}
function openNeighbors(z,x,y){
  var n=0; [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){ if(!blockedLocal(z,x+d[0],y+d[1])) n++; });
  return n;
}
/* 결정론적 흩뿌리기: 해시 순으로 훑으며 간격 조건을 만족하는 칸만 채택 */
function scatter(z,cands,count,gap,avoid,avoidGap,salt){
  var sorted=cands.slice().sort(function(a,b){ return hash(z*977+a[0]*3+salt,a[1]*7)-hash(z*977+b[0]*3+salt,b[1]*7); });
  var picked=[];
  for(var i=0;i<sorted.length&&picked.length<count;i++){
    var c=sorted[i], ok=true, j;
    for(j=0;j<picked.length;j++){ if(Math.hypot(picked[j][0]-c[0],picked[j][1]-c[1])<gap){ ok=false; break; } }
    if(ok) for(j=0;j<avoid.length;j++){ if(Math.hypot(avoid[j][0]-c[0],avoid[j][1]-c[1])<avoidGap){ ok=false; break; } }
    if(ok) picked.push(c);
  }
  if(picked.length<count&&gap>2) return scatter(z,cands,count,gap-1,avoid,Math.max(1.5,avoidGap-0.5),salt);
  return picked;
}
function nearest(list,x,y){
  var best=list[0], bd=1e9;
  list.forEach(function(p){ var d=Math.hypot(p[0]-x,p[1]-y); if(d<bd){ bd=d; best=p; } });
  return best;
}
function qState(id){ return ((G.save&&G.save['문제상태'])||{})[id]; }

/* ── 엔티티 배치 (원본 initEntities 대체) ── */
initEntities=function(){
  entities=[];
  G.regions.forEach(function(reg,z){
    var base=z*ZC, th=THEME[reg.id]||THEME.r1;
    var bp=bossPos(z);
    clearArea(z,bp.c,bp.r,2,1);
    clearArea(z,3,ROAD+2,1,1);
    clearArea(z,5,ROAD-2,1,1);
    var W_=walkable(z), all=W_.list;
    var fixed=[[3,ROAD+2],[5,ROAD-2],[bp.c,bp.r]];

    // 모닥불 · 상점
    entities.push({type:'fire',z:z,tx:base+3,ty:ROAD+2,emoji:'🔥'});
    entities.push({type:'shop',z:z,tx:base+5,ty:ROAD-2,emoji:'🛒'});

    // NPC: 넓어진 섬 비율로 옮기고, 길에서 너무 멀지 않게
    var npcSpots=[];
    G.npcs.filter(function(n){ return n.region===reg.id; }).forEach(function(n){
      var nx=Math.round(Number(n.tx)*(ZC/OLD_ZC));
      var ny=ROAD+Math.round((Number(n.ty)-OLD_ROAD)*1.3);
      ny=Math.max(ROAD-5,Math.min(ROAD+4,ny));
      var near=all.filter(function(p){ return Math.abs(p[1]-ROAD)>=1&&Math.abs(p[1]-ROAD+0.5)>0.6; });
      var s=nearest(near.length?near:all,nx,ny);
      npcSpots.push(s);
      entities.push({type:'npc',z:z,tx:base+s[0],ty:s[1],emoji:n.emoji,npc:n});
    });

    // 길(가운데 2줄)과 입구·보스 주변은 몹 배치 금지
    var field=all.filter(function(p){
      return p[0]>=8 && p[0]<=ZC-7 && (p[1]<ROAD-2||p[1]>ROAD+1);
    });
    var avoidBase=fixed.concat(npcSpots);

    // 사냥 몹 10마리 (서버 키 h0~h9 유지). 안쪽일수록 강한 등급
    var hs=scatter(z,field,10,HUNT_GAP,avoidBase,3,11).sort(function(a,b){ return a[0]-b[0]; });
    hs.forEach(function(sp,i){
      var tier=(i>=9?2:(i>=6?1:0));
      entities.push({type:'hunt',z:z,tx:base+sp[0],ty:sp[1],emoji:th.hunt,key:reg.id+'_h'+i,tier:tier,sp:i%3});
    });

    // 퀴즈 수호병: 안 푼 문제 → 틀린 문제 → 이미 푼 문제 순으로 골라 흩어 세움
    var normals=G.questions.filter(function(q){ return q.region===reg.id&&q.type==='normal'; });
    var order=normals.slice().sort(function(a,b){
      function rank(q){ var s=qState(q.id); if(!s) return 1; if(s.solved) return 2; return 0; }
      return rank(a)-rank(b);
    });
    var qn=Math.min(QUIZ_PER_REGION,order.length);
    var qs=scatter(z,field,qn,QUIZ_GAP,avoidBase.concat(hs),2.5,29);
    qs.forEach(function(sp,i){
      entities.push({type:'quiz',z:z,tx:base+sp[0],ty:sp[1],emoji:th.mob,qid:order[i].id,dead:false});
    });

    // 보물상자 3개: 길에서 먼 막다른 구석 우선
    var nooks=field.filter(function(p){ return Math.abs(p[1]-ROAD)>=5 && openNeighbors(z,p[0],p[1])<=2; });
    var cs=scatter(z,nooks.length>=3?nooks:field,3,12,avoidBase.concat(hs,qs),2,47);
    ['c1','c2','c3'].forEach(function(key,i){
      var sp=cs[i]||field[(i*37)%Math.max(1,field.length)]||[10+i*10,ROAD+4];
      entities.push({type:'chest',z:z,tx:base+sp[0],ty:sp[1],emoji:'📦',key:reg.id+'_'+key});
    });

    // 보스 봉인석 · 관문
    entities.push({type:'boss',z:z,tx:base+bp.c,ty:bp.r,emoji:th.boss,region:reg.id});
    if(z<G.regions.length-1) entities.push({type:'gate',z:z,tx:base+ZC-1,ty:ROAD,emoji:'🌀',nextZ:z+1});
  });
  if(window.RM) RM.mmCache={};
};

/* ── 문제 순환: 필드에 없는 문제 중에서, 틀린 문제·안 푼 문제 우선 ── */
nextRegionQuestion=function(regionId,cur){
  var pool=G.questions.filter(function(q){ return q.region===regionId&&q.type==='normal'; });
  if(!pool.length) return cur;
  var onField={};
  entities.forEach(function(e){ if(e.type==='quiz'&&!e.dead&&e.qid) onField[e.qid]=1; });
  function pick(a){ return a[Math.floor(Math.random()*a.length)].id; }
  var free=pool.filter(function(q){ return !onField[q.id]&&q.id!==cur; });
  if(!free.length) free=pool;
  var weak=free.filter(function(q){ var s=qState(q.id); return s&&s.attempts>0&&!s.solved; });
  if(weak.length&&Math.random()<0.6) return pick(weak);
  var fresh=free.filter(function(q){ var s=qState(q.id); return !(s&&s.solved); });
  if(fresh.length) return pick(fresh);
  return pick(free);
};

try{ var ver=document.getElementById('ver'); if(ver) ver.textContent='빌드 v13 넓은 섬'; }catch(e){}
})();
