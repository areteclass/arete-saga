/* ═══════════════════════════════════════════════════════════════
   아레테 사가 v14 영웅 쇼케이스 + 외형 꾸미기 (hero.js)
   - 필드: 귀여운 2등신 도트(art.js) 그대로
   - 캐릭터 상세 · 캐릭터 선택 · 랭킹 구경: 멋진 5등신 영웅 일러스트
     (장착한 무기·갑옷·망토·날개·모자·장신구·오라가 전부 반영, 숨쉬기·망토 흔들림·무기 광채)
   - 외형 꾸미기: 헤어스타일 · 머리색 · 눈동자 · 피부톤 (이 기기에 저장)
   설치: world.js 다음 줄에 <script src="hero.js?v=14"></script>
   ※ art.js도 v14로 함께 교체해야 필드 캐릭터에 꾸미기가 반영됩니다.
   ═══════════════════════════════════════════════════════════════ */
(function(){
if(typeof drawHero!=='function'||typeof renderCharDetail!=='function'){ console.warn('hero.js: 원본 엔진을 찾지 못함'); return; }

function mk(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function sh(hex,f){ return (typeof shade==='function')?shade(hex,f):hex; }
function now(){ return performance.now(); }
var CW=56, CH=112, OX=4, OY=26;             // 쇼케이스 도트 캔버스
var FEET=76+OY;
var tmp=mk(CW,CH), tg=tmp.getContext('2d');
var cache={};

/* ── 색 정규화 (hex 로) ── */
var normC=mk(1,1).getContext('2d');
function hexOf(col){
  if(/^#[0-9a-f]{6}$/i.test(col)) return col;
  try{ normC.fillStyle='#000000'; normC.fillStyle=col; var v=normC.fillStyle; if(/^#[0-9a-f]{6}$/i.test(v)) return v; }catch(e){}
  return '#888888';
}
function rgb(hex){ var n=parseInt(hexOf(hex).slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; }

/* ── 도형 한 덩어리를 픽셀화 + 자동 음영(좌상단 빛) 후 합성 ── */
var RIM='#ffe9a8';
function shape(main,col,fn,mode){
  tg.setTransform(1,0,0,1,0,0); tg.globalCompositeOperation='source-over';
  tg.clearRect(0,0,CW,CH); tg.translate(OX,OY); tg.fillStyle=col; tg.strokeStyle=col;
  fn(tg);
  tg.setTransform(1,0,0,1,0,0); tg.globalCompositeOperation='source-over';
  var id=tg.getImageData(0,0,CW,CH), d=id.data, a=new Uint8Array(CW*CH), minx=CW, maxx=0, i, x, y;
  for(i=0;i<CW*CH;i++){ if(d[i*4+3]>=110){ a[i]=1; x=i%CW; if(x<minx) minx=x; if(x>maxx) maxx=x; } }
  var c=rgb(col), rc=rgb(RIM);
  for(y=0;y<CH;y++) for(x=0;x<CW;x++){
    i=y*CW+x;
    if(!a[i]){ d[i*4+3]=0; continue; }
    var f=1, rim=0;
    if(mode!==true){
      var L=x>0?a[i-1]:0, U=y>0?a[i-CW]:0, R=x<CW-1?a[i+1]:0, D=y<CH-1?a[i+CW]:0, R2=x<CW-2?a[i+2]:0;
      if(!L||!U) f=1.28;
      else if(!R) rim=1;
      else if(!D) f=0.76;
      else if(mode!=='soft'){ if(!R2) f=0.88; else if(x>minx+(maxx-minx)*0.64) f=0.94; }
    }
    var r0=Math.min(255,c[0]*f), g0=Math.min(255,c[1]*f), b0=Math.min(255,c[2]*f);
    if(rim){ r0=r0*0.45+rc[0]*0.55; g0=g0*0.45+rc[1]*0.55; b0=b0*0.45+rc[2]*0.55; }
    d[i*4]=r0; d[i*4+1]=g0; d[i*4+2]=b0; d[i*4+3]=255;
  }
  tg.putImageData(id,0,0);
  main.drawImage(tmp,0,0);
}
function poly(p){ return function(t){ t.beginPath(); t.moveTo(p[0],p[1]); for(var i=2;i<p.length;i+=2) t.lineTo(p[i],p[i+1]); t.closePath(); t.fill(); }; }
function ell(x,y,rx,ry){ return function(t){ t.beginPath(); t.ellipse(x,y,rx,ry,0,0,6.2832); t.fill(); }; }
function multi(){ var f=arguments; return function(t){ for(var i=0;i<f.length;i++) f[i](t); }; }
function up(p,u){ var o=p.slice(); for(var i=1;i<o.length;i+=2) o[i]+=u; return o; }
function mir(p){ var o=p.slice(); for(var i=0;i<o.length;i+=2) o[i]=48-o[i]; return o; }
function px(g,x,y,col,w,h){ g.fillStyle=col; g.fillRect(Math.round(x+OX),Math.round(y+OY),w||1,h||1); }
function outline(c,col){
  var g=c.getContext('2d'), w=c.width, h=c.height, id=g.getImageData(0,0,w,h), d=id.data, o=new Uint8Array(w*h), i;
  for(i=0;i<w*h;i++) o[i]=d[i*4+3]>0?1:0;
  var cc=rgb(col);
  for(var y=0;y<h;y++) for(var x=0;x<w;x++){ i=y*w+x; if(o[i]) continue;
    if((x>0&&o[i-1])||(x<w-1&&o[i+1])||(y>0&&o[i-w])||(y<h-1&&o[i+w])){ d[i*4]=cc[0]; d[i*4+1]=cc[1]; d[i*4+2]=cc[2]; d[i*4+3]=255; } }
  g.putImageData(id,0,0);
}

/* ── 데이터 ── */
var DEF_EYE={taro:'#8a5a2a',mir:'#4a7ad0',hana:'#2a9a6a',yuri:'#e05aa0',leon:'#8a5ad0'};
var STYLE_NAME={taro:'스파이크',mir:'올백',hana:'포니테일',yuri:'긴 생머리',leon:'샤기 앞머리'};
var HAIR_COLS=['#6a4420','#2a2030','#aab6d6','#1f7a64','#e06aa0','#8a64c0','#e0b040','#c03a2a','#f4f0e0','#3a6ad0','#ff8a3a','#5ad0a0'];
var EYE_COLS=['#4a7ad0','#2a9a6a','#c03a4a','#8a5ad0','#d0902a','#3a3a4a','#20b0c0','#e05aa0'];
var SKIN_COLS=['#f8dcc0','#f4c896','#e0a878','#c08058','#8a5a3a'];
var WINGS={cos_cape6:['#f4f8ff','#b8c8e8'],cos_cape7:['#ff9a2e','#d8421e'],cos_cape9:['#fff0a8','#d8b048']};
var CAPES={cos_cape1:'#c03a3a',cos_cape2:'#9b7be0',cos_cape3:'#e0b040',cos_cape4:'#2a2036',cos_cape5:'#ff6ad0',cos_cape8:'#5ad8c0'};
var AURAS={cos_aura1:'#ff7a2e',cos_aura2:'#8fd0ff',cos_aura3:'#c05aff',cos_aura4:'#7fe8ff',cos_aura5:'#ff8ae0',cos_aura6:'#ffe14d',cos_aura7:'#ff9ac4',cos_aura8:'#ff6a2e'};

/* ── 외형 꾸미기 저장 (이 기기) ── */
function custKey(){ return 'cs_cust_'+((G&&G.hakbun)||'guest'); }
function getCust(){ try{ return JSON.parse(localStorage.getItem(custKey())||'{}')||{}; }catch(e){ return {}; } }
function setCust(k,v){
  var c=getCust(); if(v) c[k]=v; else delete c[k];
  try{ localStorage.setItem(custKey(),JSON.stringify(c)); }catch(e){}
  if(typeof sfx==='function') sfx('buy');
  renderCustomUI();
}
window.setHeroCust=setCust;
var _heroEq=heroEq;
heroEq=function(){ var e=_heroEq(); var c=getCust(); if(Object.keys(c).length) e.custom=c; return e; };

/* ═══════════════ 영웅 일러스트 조립 ═══════════════ */
function rot(hx,hy,ang,pts){
  var o=[], ca=Math.cos(ang), sa=Math.sin(ang);
  for(var i=0;i<pts.length;i+=2){ var x=pts[i], y=pts[i+1]; o.push(hx+x*ca-y*sa, hy+x*sa+y*ca); }
  return o;
}
function buildShow(id,eq,f){
  var cu=eq.custom||{};
  var key=[id,f,eq.w&&eq.w.id,eq.a&&eq.a.id,eq.acc&&eq.acc.id,eq.hat&&eq.hat.id,eq.cape&&eq.cape.id,eq.dye,JSON.stringify(cu)].join('|');
  if(cache[key]) return cache[key];
  var base=(typeof HERO!=='undefined'&&HERO[id])||HERO.taro;
  var hair=cu.hair||base.hair, skin=cu.skin||base.skin, eye=cu.eye||DEF_EYE[id]||'#4a7ad0', style=cu.style||id;
  var suit=base.suit, trim=base.trim, accent=base.accent, robe=0, heavy=0;
  if(eq.dye){ suit=eq.dye; trim=sh(eq.dye,0.6); }
  else if(eq.a&&typeof AART!=='undefined'&&AART[eq.a.id]){ suit=AART[eq.a.id][0]; trim=AART[eq.a.id][1]; robe=AART[eq.a.id][2]; heavy=robe?0:1; }
  suit=hexOf(suit); trim=hexOf(trim); hair=hexOf(hair); skin=hexOf(skin); eye=hexOf(eye); accent=hexOf(accent);
  RIM=hexOf((STORY.charColor&&STORY.charColor[id])||'#ffe9a8'); RIM=sh(RIM,1.25);
  var U=(f>=2)?1:0, sw=[0,1,2,1][f];
  var c=mk(CW,CH), g=c.getContext('2d');
  function S(col,fn,mode){ shape(g,hexOf(col),fn,mode); }
  var pants='#3a3458', boot=heavy?sh(trim,0.8):'#6a4428';
  var HX=38, HY=22+U;                              // 무기 든 손 (머리 옆으로 치켜든 자세)

  /* 1) 날개 / 망토 — 바람에 휘날림 */
  if(eq.cape&&WINGS[eq.cape.id]){
    var wc=WINGS[eq.cape.id];
    var wl=up([17,28, 3,2-sw, -3,14-sw, -2,30, 2,44, 10,40, 16,36],U), wi=up([17,30, 6,10-sw, 2,26, 6,40, 15,37],U);
    S(wc[1],multi(poly(wl),poly(mir(wl)))); S(wc[0],multi(poly(wi),poly(mir(wi))));
  } else if(eq.cape){
    var cc=CAPES[eq.cape.id]||'#c03a3a';
    S(cc,poly(up([16,26,32,26,33,48,28,78,18,84,5+sw,80,-2+sw,64,5,44],U)));
  }
  /* 2) 뒷머리 */
  if(style==='yuri') S(hair,poly(up([15,10,33,10,36,42,32,50,20,50,9+sw*0.5,46,11,30],U)));
  if(style==='hana') S(hair,poly(up([29,5,35,5,43,14+sw*0.3,47,28+sw,44,40+sw,39,28,33,14],U)));
  /* 3) 다리 — 앞다리 굽히고 뒷다리 뻗은 전투 자세 */
  S(pants,multi(poly([18,49,24,50,19,61,16,71,10,71,13,60]),poly([24,50,30,49,33,60,37,71,31,71,27,61])));
  if(heavy) S(trim,multi(poly([12,59,19,60,16,70,10,70]),poly([28,60,33,59,36,70,31,70])));
  if(robe) S(suit,poly(up([17,43,31,43,38,74,31,76,24,73,17,76,9,74],U)));
  S(boot,multi(poly([9,68,17,68,17,76,6,76,6,73]),poly([30,68,38,68,40,73,40,76,30,76])));
  /* 4) 몸통 */
  S(suit,poly(up([14.5,26,33.5,26,31,36,29,45,30,51,18,51,19,45,17,36],U)));
  if(heavy) S(sh(suit,1.15),poly(up([18,28,30,28,29,40,24,43,19,40],U)));
  else if(!robe){ S(sh(suit,0.82),poly(up([20,33,28,33,27,50,21,50],U))); S(accent,poly(up([20,26,28,26,24,33],U))); S(trim,poly(up([17,27,19,26,31,43,29,44],U))); }
  S(trim,poly(up([18,44,30,44,30,47,18,47],U))); px(g,23,44+U,'#ffe070',2,3);
  /* 5) 왼팔 — 앞으로 불끈 쥔 주먹 */
  S(suit,poly(up([12,27,17,26,16,36,11,37],U)));
  S(robe?suit:(heavy?trim:suit),poly(up([11,35,16,36,12,45,7,43],U)));
  S(skin,ell(9,45.5+U,2.7,2.7),'soft');
  /* 6) 무기 */
  c._blade=null;
  var ang=0.34, wa=null;
  if(eq.w&&typeof WART!=='undefined'){
    wa=WART[eq.w.id]||['#6a4a26','#c9ccd8',1,'s'];
    var bl=hexOf(wa[1]==='RAINBOW'?'#ff8ae0':wa[1]), hd=hexOf(wa[0]), gd='#e8c860', ty=wa[3];
    var maxL=(HY+OY-3)/Math.cos(ang);
    if(ty==='p'){
      var Lp=Math.min(maxL-6,34*wa[2]);
      S(hd,poly(rot(HX,HY,ang,[-0.8,26,0.8,26,0.8,-Lp,-0.8,-Lp])));
      S(bl,poly(rot(HX,HY,ang,[0,-Lp-7,3,-Lp,0,-Lp+4,-3,-Lp])));
      S('#ffe070',poly(rot(HX,HY,ang,[-1.6,-Lp+1,1.6,-Lp+1,1.6,-Lp+3,-1.6,-Lp+3])));
      var tp=rot(HX,HY,ang,[0,-Lp-6]); c._blade=[HX,HY-4,tp[0],tp[1],bl];
    } else if(ty==='o'){
      var Lo=Math.min(maxL-6,26*wa[2]);
      S(hd,poly(rot(HX,HY,ang,[-0.8,22,0.8,22,0.8,-Lo,-0.8,-Lo])));
      S(gd,poly(rot(HX,HY,ang,[-3.5,-Lo+1,3.5,-Lo+1,2,-Lo-2,-2,-Lo-2])));
      var oc=rot(HX,HY,ang,[0,-Lo-4]); S(bl,ell(oc[0],oc[1],4.3,4.3),'soft'); px(g,oc[0]-2,oc[1]-2,'#ffffff',2,2);
      c._blade=[oc[0],oc[1],oc[0],oc[1],bl];
    } else {
      var L=Math.min(maxL-5,(ty==='d'?15:(ty==='g'?32:27))*wa[2]), hw=(ty==='g'?3.2:1.7), gw=(ty==='g'?7:5.5);
      S(hd,poly(rot(HX,HY,ang,[-1,1,1,1,1,9,-1,9]))); S(gd,ell.apply(null,rot(HX,HY,ang,[0,10]).concat([1.6,1.6])));
      S(gd,poly(rot(HX,HY,ang,[-gw,-1,gw,-1,gw,-3,-gw,-3])));
      S(bl,poly(rot(HX,HY,ang,[-hw,-3,hw,-3,hw,-L,0,-L-5,-hw,-L])));
      var a0=rot(HX,HY,ang,[0,-4]), a1=rot(HX,HY,ang,[0,-L-3]);
      for(var q=0;q<=1;q+=0.04){ px(g,a0[0]+(a1[0]-a0[0])*q-0.3,a0[1]+(a1[1]-a0[1])*q,sh(bl,1.4)); }
      c._blade=[a0[0],a0[1],a1[0],a1[1],bl];
    }
  }
  /* 7) 오른팔 — 무기를 하늘로 */
  S(suit,poly(up([31,26,36,27,41,33,37,36],U)));
  S(robe?suit:(heavy?trim:suit),poly(up([37,35,41,33,41,23,36,23],U)));
  S(skin,ell(HX,HY+0.5,2.8,2.7),'soft');
  if(heavy) S(trim,multi(ell(14.5,27.5+U,4.8,3.4),ell(33.5,27.5+U,4.8,3.4)));
  /* 8) 목 · 얼굴 */
  S(skin,poly(up([21,19,27,19,27,27,21,27],U)),'soft');
  S(skin,multi(ell(24,13+U,7.4,8.4),ell(16.6,14+U,1.3,2),ell(31.4,14+U,1.3,2),poly(up([19,18,29,18,24,22.5],U))),'soft');
  /* 9) 머리카락 (바람에 뒤로 휘날림) */
  var cap=function(t){ t.save(); t.beginPath(); t.rect(-10,-40,70,49+U); t.clip(); ell(24,10+U,8.8,7.4)(t); t.restore(); ell(16.6,12+U,2,4.4)(t); ell(31.4,12+U,2,4.4)(t); };
  if(style==='taro'){
    S(hair,multi(cap,poly(up([15,9,13,0,19,4,20,-4,24,2,27,-5,29,2,34,-1,33,6,38,5,33,10],U)),poly(up([16,9,32,9,31,13,28,10,26,12.5,23,9.5,21,12,18,10,16.5,13.5],U))));
    S(accent,multi(poly(up([15.5,8.2,32.5,8.2,32.5,10.3,15.5,10.3],U)),poly(up([16,8.5,8,10+sw*0.6,4,13+sw,15,11],U))));
  } else if(style==='mir'){
    S(hair,multi(cap,poly(up([30,3,41,-1,35,6,42,8,34,11],U)),poly(up([16,5,21,-5,23,1,28,-6,29,2,34,-2,31,6],U)),poly(up([17,9,31,6.5,30,10,24,8,18,11],U))));
  } else if(style==='hana'){
    S(hair,multi(cap,poly(up([15,10,26,1,33,4,33.5,11,28,8.5,24,12,21,9.5,17,14],U))));
    S(accent,ell(32,6+U,1.7,1.7));
  } else if(style==='yuri'){
    S(hair,multi(cap,poly(up([16,8,32,8,33,15,30,10.5,26,9.5,24,12,22,9.5,18,10.5,15,15],U)),poly(up([14.5,12,18,12,17.5,30,13,33],U)),poly(up([30,12,33.5,12,35,33,30.5,30],U))));
    S('#ff9ac4',ell(31,5.5+U,2.1,2.1)); px(g,30.5,4.5+U,'#ffe070',1,1);
  } else {
    S(hair,multi(cap,poly(up([16,9,31,5,35,11,32,17,28.5,14,26,9.5,20,10.5,17,14],U)),poly(up([14,7,10,3,15,4],U))));
    S(trim,poly(up([16,7.4,32,7.4,32,8.8,16,8.8],U))); px(g,23,7+U,accent,2,2);
  }
  /* 10) 얼굴 표정: 큰 눈 · 올라간 눈썹 · 자신감 있는 미소 */
  var dark='#1e1024', irL=sh(eye,1.35), irD=sh(eye,0.7), bw=sh(hair,0.55);
  [[19,1],[26,-1]].forEach(function(e){
    var ex=e[0], s=e[1], inner=s>0?ex+2:ex, outer=s>0?ex-1:ex+3;
    px(g,ex,11+U,dark,3,1); px(g,outer,11+U,dark); px(g,outer+(s>0?0:0),10+U,dark);   // 윗 속눈썹 + 치켜올린 눈꼬리
    px(g,ex,12+U,irD,3,1); px(g,inner,12+U,dark);                                    // 안쪽 눈머리를 눌러 결의 있는 눈매
    px(g,ex,13+U,irD,3,1); px(g,ex+1,13+U,dark);
    px(g,ex,14+U,eye,3,1); px(g,ex+1,14+U,dark);
    px(g,ex,15+U,irL,3,1);
    px(g,s>0?ex:ex+2,12+U,'#ffffff'); px(g,s>0?ex+2:ex,14+U,'#dff4ff');              // 큰 하이라이트 + 작은 반사광
  });
  px(g,24,17+U,sh(skin,0.85));
  px(g,22,18.6+U,'#7a2a30'); px(g,23,19+U,'#ffffff',3,1); px(g,26,18.6+U,'#7a2a30'); px(g,23,20+U,'#c85a5a',3,1);
  px(g,18,16+U,'#f4a090',2,1); px(g,28,16+U,'#f4a090',2,1);
  /* 11) 모자 */
  var HO=(ART&&ART.lib&&ART.lib.HAT_OF)||{};
  var ht=eq.hat&&(HO[eq.hat.id]||['brim',{X:'#d0a850',x:'#8a6a30',Y:'#a5763f'}]);
  function drawHat(kind,p){
    var X=p.X||'#888888', xd=p.x||sh(X,0.7), Y=p.Y||'#ffe070';
    if(kind==='wizard'){ S(X,multi(ell(24,6+U,13,2.6),poly(up([16,6,32,6,28,-6,34,-13,24,-8,20,-2],U)))); S(Y,poly(up([16.5,3.5,31.5,3.5,31,5.8,17,5.8],U))); px(g,25,-4+U,Y,2,2); }
    else if(kind==='crown'){ S(X,multi(poly(up([17,3,31,3,31,7,17,7],U)),poly(up([17,3.5,18.5,-2,20,3.5],U)),poly(up([21.5,3.5,24,-4,26.5,3.5],U)),poly(up([28,3.5,29.5,-2,31,3.5],U)))); px(g,23.5,4.5+U,Y,2,2); px(g,19,4.5+U,Y); px(g,29,4.5+U,Y); }
    else if(kind==='horns'){ var W=p.W||'#e8e2d4'; S(W,multi(poly(up([17,6,10,2,6,-8,10,-4,13,0,18,3],U)),poly(mir(up([17,6,10,2,6,-8,10,-4,13,0,18,3],U))))); S(X,multi(ell(24,8+U,9,6.5),poly(up([15,9,33,9,33,11.5,15,11.5],U)))); px(g,23,5+U,Y,2,3); }
    else if(kind==='flower'){ var G2=p.G||'#3a7a3a', R=p.R||'#ff9ac4'; S(G2,poly(up([16,5,32,5,32,7,16,7],U))); for(var i=0;i<7;i++) S(i%2?Y:R,ell(17+i*2.35,5+U-Math.sin(i/6*3.14)*1.5,1.4,1.4)); }
    else if(kind==='phones'){ S(xd,poly(up([16,12,17,3,24,0,31,3,32,12,30.5,12,29.5,4.5,24,2,18.5,4.5,17.5,12],U))); S(X,multi(ell(16,14+U,2.5,3.3),ell(32,14+U,2.5,3.3))); px(g,15.5,13+U,Y); px(g,32,13+U,Y); }
    else if(kind==='halo'){ S(Y,function(t){ ell(24,-3,8,2.3)(t); t.globalCompositeOperation='destination-out'; ell(24,-3,5.8,1.1)(t); t.globalCompositeOperation='source-over'; },true); }
    else if(kind==='fox'){ var Wf=p.W||'#f4f0ea', Rf=p.R||'#c03a3a'; S(Wf,multi(ell(30,5+U,4.2,3.6),poly(up([26.5,3,27.5,-2,29.5,2],U)),poly(up([30.5,2,32.5,-2,33.5,3],U)))); px(g,28,4.5+U,Rf,2,1); px(g,31,4.5+U,Rf,2,1); px(g,29.5,6.5+U,'#2a2030'); }
    else if(kind==='owl'){ S(X,multi(ell(24,7+U,9.5,6.5),poly(up([15,6,15.5,-3,19.5,2],U)),poly(up([33,6,32.5,-3,28.5,2],U)))); px(g,23.5,6+U,Y,2,1); }
    else { S(X,multi(ell(24,6+U,12.5,2.5),poly(up([17.5,6,30.5,6,29.5,-1,18.5,-1],U)))); S(Y,poly(up([17.6,3.5,30.4,3.5,30.3,5.5,17.7,5.5],U))); }
  }
  if(ht) drawHat(ht[0],ht[1]);
  /* 12) 장신구 */
  if(eq.acc){
    var ai=eq.acc.id, it=G.itemById&&G.itemById[ai], tc=hexOf((it&&typeof tierColor==='function')?tierColor(it):'#ffe070');
    if(ai==='ac_crown'&&!eq.hat) drawHat('crown',{X:'#ffd040',Y:'#ff5a8a'});
    else if(ai==='ac_halo'&&!eq.hat) drawHat('halo',{Y:'#e8d0ff'});
    else if(ai==='ac_glass'){ [17,25].forEach(function(gx){ px(g,gx,11+U,'#cfe8ff',6,1); px(g,gx,16+U,'#cfe8ff',6,1); px(g,gx,11+U,'#cfe8ff',1,6); px(g,gx+5,11+U,'#cfe8ff',1,6); }); }
    else { for(var k2=0;k2<4;k2++){ px(g,20+k2,27+k2+U,'#e0c060'); px(g,28-k2,27+k2+U,'#e0c060'); } S(tc,ell(24,31.5+U,1.8,2)); px(g,23.5,30.8+U,'#ffffff'); }
  }
  outline(c,'#120a1a');
  return (cache[key]=c);
}

/* ── 쇼케이스 그리기 (광채·오라 효과는 실시간) ── */
function drawShowcase(g,id,eq,cx,groundY,k){
  var t=now(), f=Math.floor(t/260)%4;
  var spr=buildShow(id,eq,f);
  var x0=Math.round(cx-(OX+24)*k), y0=Math.round(groundY-FEET*k);
  if(eq.aura){
    var ac=AURAS[eq.aura.id]||'#ffca4b';
    g.save(); g.globalCompositeOperation='lighter';
    var col=g.createLinearGradient(0,y0,0,groundY);
    col.addColorStop(0,'rgba(0,0,0,0)'); col.addColorStop(1,ac);
    g.globalAlpha=0.2+0.08*Math.sin(t/300); g.fillStyle=col; g.fillRect(cx-22*k,y0+20*k,44*k,groundY-y0-20*k);
    for(var i=0;i<16;i++){ var ph=(t/1300+i/16)%1; g.globalAlpha=(1-ph)*0.9; g.fillStyle=ac;
      g.fillRect(Math.round(cx+Math.sin(i*2.3+t/600)*18*k),Math.round(groundY-ph*80*k),k,k); }
    g.restore();
  }
  var sm=g.imageSmoothingEnabled; g.imageSmoothingEnabled=false;
  g.drawImage(spr,x0,y0,CW*k,CH*k); g.imageSmoothingEnabled=sm;
  var w=eq.w&&G.itemById?G.itemById[eq.w.id]:null, lv=(eq.w&&eq.w.lvl)||0;
  if(spr._blade){
    var b=spr._blade, bc=hexOf(b[4]), strong=(lv>=3||(w&&(Number(w.tier)>=3||Number(w.price)<=0)));
    g.save(); g.globalCompositeOperation='lighter';
    for(var q=0;q<=1;q+=0.1){
      var gx=x0+(OX+b[0]+(b[2]-b[0])*q)*k, gy=y0+(OY+b[1]+(b[3]-b[1])*q)*k, r=(strong?5+(lv>=5?3:0):3)*k;
      var gr=g.createRadialGradient(gx,gy,0,gx,gy,r); gr.addColorStop(0,bc); gr.addColorStop(1,'rgba(0,0,0,0)');
      g.globalAlpha=(strong?0.2:0.08)+0.08*Math.sin(t/200+q*9); g.fillStyle=gr; g.fillRect(gx-r,gy-r,r*2,r*2);
    }
    var sp=(t/700)%1; g.globalAlpha=1; g.fillStyle='#ffffff';
    g.fillRect(Math.round(x0+(OX+b[0]+(b[2]-b[0])*sp)*k-k/2),Math.round(y0+(OY+b[1]+(b[3]-b[1])*sp)*k-k/2),k,k);
    g.restore();
  }
}
window.drawShowcase=drawShowcase;

/* ── 무대 배경: 에너지 폭발 + 스포트라이트 + 마법진 ── */
function drawStage(g,W,H,col,t){
  col=hexOf(col);
  var bg=g.createRadialGradient(W/2,H*0.45,10,W/2,H*0.45,H*0.8);
  bg.addColorStop(0,sh(col,0.45)); bg.addColorStop(0.45,'#1c1438'); bg.addColorStop(1,'#08050f');
  g.fillStyle=bg; g.fillRect(0,0,W,H);
  g.save(); g.translate(W/2,H*0.42); g.rotate(t/9000);
  g.globalCompositeOperation='lighter';
  for(var i=0;i<16;i++){ g.rotate(Math.PI*2/16);
    g.globalAlpha=0.07+0.04*Math.sin(t/400+i); g.fillStyle=col;
    g.beginPath(); g.moveTo(0,0); g.lineTo(-10,-H); g.lineTo(10,-H); g.closePath(); g.fill(); }
  g.restore();
  g.save(); g.globalCompositeOperation='lighter';
  var sp=g.createLinearGradient(0,0,0,H); sp.addColorStop(0,'#ffffff'); sp.addColorStop(1,'rgba(0,0,0,0)');
  g.globalAlpha=0.1; g.fillStyle=sp;
  g.beginPath(); g.moveTo(W/2-26,0); g.lineTo(W/2+26,0); g.lineTo(W/2+100,H); g.lineTo(W/2-100,H); g.closePath(); g.fill();
  for(var j=0;j<22;j++){ var py=(H-((t/18+j*53)%(H+20))), pxx=W/2+Math.sin(t/900+j*1.7)*(W*0.42);
    g.globalAlpha=0.55; g.fillStyle=j%3?col:'#ffffff'; g.fillRect(Math.round(pxx),Math.round(py),2,2); }
  g.restore();
  var fy=H-30;
  g.save(); g.globalCompositeOperation='lighter';
  var fl=g.createRadialGradient(W/2,fy,4,W/2,fy,100); fl.addColorStop(0,col); fl.addColorStop(1,'rgba(0,0,0,0)');
  g.globalAlpha=0.35; g.fillStyle=fl; g.beginPath(); g.ellipse(W/2,fy,100,22,0,0,6.29); g.fill(); g.restore();
  g.save(); g.strokeStyle=col; g.globalAlpha=0.8; g.lineWidth=2; g.setLineDash([6,5]); g.lineDashOffset=-t/50;
  g.beginPath(); g.ellipse(W/2,fy,84,15,0,0,6.29); g.stroke();
  g.setLineDash([2,6]); g.lineDashOffset=t/40; g.globalAlpha=0.5; g.beginPath(); g.ellipse(W/2,fy,64,11,0,0,6.29); g.stroke(); g.restore();
  return fy;
}

/* ═══════════════ 캐릭터 상세 화면 교체 ═══════════════ */
var _rcd=renderCharDetail;
renderCharDetail=function(p){
  _rcd(p);
  if(_cdTimer){ cancelAnimationFrame(_cdTimer); _cdTimer=null; }
  var mine=!p, charId=mine?G.save['캐릭터']:p.charId;
  var cv2=document.getElementById('cd-canvas'); if(!cv2) return;
  cv2.width=300; cv2.height=360;
  var g=cv2.getContext('2d'), col=hexOf((STORY.charColor&&STORY.charColor[charId])||'#9b7be0');
  (function anim(){
    if(!document.getElementById('chardetail').classList.contains('open')){ _cdTimer=null; return; }
    var t=now(), eq=mine?heroEq():(lookToEq(p.look)||{});
    var fy=drawStage(g,cv2.width,cv2.height,col,t);
    drawShowcase(g,charId,eq,cv2.width/2,fy+4,3);
    _cdTimer=requestAnimationFrame(anim);
  })();
  var box=document.getElementById('cd-custom');
  if(!box){ box=document.createElement('div'); box.id='cd-custom';
    var dye=document.getElementById('cd-dye'); dye.parentNode.insertBefore(box,dye.nextSibling); }
  box.style.display=mine?'block':'none';
  if(mine) renderCustomUI();
};

/* ── 외형 꾸미기 UI ── */
var _cuTab='style';
window.heroCustTab=function(t){ _cuTab=t; renderCustomUI(); };
function sw(val,cur,bg,onclick,label){
  var on=(val||'')===(cur||'');
  return '<button onclick="'+onclick+'" style="min-width:32px;height:32px;padding:0 8px;border-radius:6px;border:3px solid var(--line);'+
    (on?'outline:3px solid var(--gold);':'')+'background:'+bg+';color:#fff;font-size:11px;font-family:var(--font-body)">'+(label||'')+'</button>';
}
function renderCustomUI(){
  var box=document.getElementById('cd-custom'); if(!box||!G.save) return;
  var cu=getCust(), id=G.save['캐릭터'];
  var tabs=[['style','헤어'],['hair','머리색'],['eye','눈동자'],['skin','피부']];
  var h='<div style="margin-top:12px;font-size:12px;color:var(--gold)">✂ 외형 꾸미기 <span style="color:var(--muted);font-size:10px">(이 기기에 저장)</span></div>'+
    '<div class="seg" style="margin:6px 0">'+tabs.map(function(tb){ return '<button class="'+(_cuTab===tb[0]?'on':'')+'" onclick="heroCustTab(\''+tb[0]+'\')">'+tb[1]+'</button>'; }).join('')+'</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap">';
  if(_cuTab==='style'){
    h+=sw('',cu.style,'var(--panel2)',"setHeroCust('style','')",'기본');
    Object.keys(STYLE_NAME).forEach(function(s){ if(s===id) return; h+=sw(s,cu.style,'var(--panel2)',"setHeroCust('style','"+s+"')",STYLE_NAME[s]); });
  } else {
    var list=_cuTab==='hair'?HAIR_COLS:(_cuTab==='eye'?EYE_COLS:SKIN_COLS);
    h+=sw('',cu[_cuTab],'linear-gradient(135deg,#888 45%,#fff 50%,#888 55%)',"setHeroCust('"+_cuTab+"','')",'');
    list.forEach(function(cl){ h+=sw(cl,cu[_cuTab],cl,"setHeroCust('"+_cuTab+"','"+cl+"')",''); });
  }
  box.innerHTML=h+'</div>';
}

/* ═══════════════ 캐릭터 선택 화면: 멋진 영웅으로 ═══════════════ */
drawSelBig=function(id){
  var c=document.getElementById('sel-big'); if(!c) return;
  c.width=180; c.height=230;
  var ch=(G.characters||[]).filter(function(x){ return x.id===id; })[0];
  var nm=document.getElementById('sel-name');
  if(nm) nm.innerHTML=ch?('<b>'+ch.name+'</b> · <span style="color:var(--energy)">'+(ch.job||ch.type||'')+'</span><br><span style="font-size:10px;color:var(--muted)">'+((STORY.charLine||{})[id]||'')+'</span>'):'';
  if(_selT) cancelAnimationFrame(_selT);
  var g=c.getContext('2d'), col=hexOf((STORY.charColor&&STORY.charColor[id])||'#9b7be0');
  (function anim(){
    if(!document.getElementById('sel-big')){ _selT=null; return; }
    var fy=drawStage(g,c.width,c.height,col,now());
    drawShowcase(g,id,{},c.width/2,fy+3,2);
    _selT=requestAnimationFrame(anim);
  })();
};

try{ var ver=document.getElementById('ver'); if(ver) ver.textContent='빌드 v15 용사 리메이크'; }catch(e){}
})();
