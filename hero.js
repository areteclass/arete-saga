/* ═══════════════════════════════════════════════════════════════
   아레테 사가 v21 영웅 쇼케이스 HD + 꾸미기 확장 (hero.js)
   - 필드 캐릭터는 그대로. 캐릭터 상세 · 캐릭터 선택 · 랭킹 구경 화면만 고해상도 전신 일러스트
   - 해상도 2배: 눈매·표정·머리결 광택·옷 주름·갑옷 광택까지 표현
   - 꾸미기: 헤어 11종 · 눈매 4종 · 표정 3종 · 포즈 3종 · 머리/눈/피부/상의/하의/망토 색 · 코디 3칸
   - 섬 클리어로 한정 외형 해금 (트윈테일·여유 포즈·와일드·전투 표정·웨이브)
   - 서버 저장(Addon.gs v21의 setLook) → 다른 기기·랭킹에서도 보임. 체험판은 기기 저장
   ═══════════════════════════════════════════════════════════════ */
(function(){
if(typeof drawHero!=='function'||typeof renderCharDetail!=='function'){ console.warn('hero.js: 원본 엔진을 찾지 못함'); return; }

/* ───────────── 기본 도구 ───────────── */
function mk(w,h){ var c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function sh(hex,f){ return (typeof shade==='function')?shade(hexOf(hex),f):hex; }
function now(){ return performance.now(); }
var SC=2, CW=64, CH=112, OX=4, OY=26, RW=CW*SC, RH=CH*SC, FEET=76+OY;
var tmp=mk(RW,RH), tg=tmp.getContext('2d');
var cache={}, cacheN=0;
var normC=mk(1,1).getContext('2d');
function hexOf(col){
  if(/^#[0-9a-f]{6}$/i.test(col)) return col;
  try{ normC.fillStyle='#000000'; normC.fillStyle=col; var v=normC.fillStyle; if(/^#[0-9a-f]{6}$/i.test(v)) return v; }catch(e){}
  return '#888888';
}
function rgb(hex){ var n=parseInt(hexOf(hex).slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function poly(p){ return function(t){ t.beginPath(); t.moveTo(p[0],p[1]); for(var i=2;i<p.length;i+=2) t.lineTo(p[i],p[i+1]); t.closePath(); t.fill(); }; }
function ell(x,y,rx,ry){ return function(t){ t.beginPath(); t.ellipse(x,y,rx,ry,0,0,6.2832); t.fill(); }; }
function multi(){ var f=arguments; return function(t){ for(var i=0;i<f.length;i++) f[i](t); }; }
function up(p,u){ var o=p.slice(); for(var i=1;i<o.length;i+=2) o[i]+=u; return o; }
function mir(p){ var o=p.slice(); for(var i=0;i<o.length;i+=2) o[i]=48-o[i]; return o; }
function rot(hx,hy,ang,pts){ var o=[], ca=Math.cos(ang), sa=Math.sin(ang);
  for(var i=0;i<pts.length;i+=2){ var x=pts[i], y=pts[i+1]; o.push(hx+x*ca-y*sa, hy+x*sa+y*ca); } return o; }
/* 단위 좌표 픽셀(2×2) / 실제 픽셀(1×1) */
function px(g,x,y,col,w,h){ g.fillStyle=col; g.fillRect(Math.round((x+OX)*SC),Math.round((y+OY)*SC),Math.round((w||1)*SC),Math.round((h||1)*SC)); }
function hp(g,rx,ry,col,w,h){ g.fillStyle=col; g.fillRect(Math.round(rx),Math.round(ry),w||1,h||1); }
function RX(u){ return (u+OX)*SC; } function RY(v){ return (v+OY)*SC; }
function drawMap(g,rows,rx,ry,pal,flip){
  var w=0; rows.forEach(function(r){ w=Math.max(w,r.length); });
  for(var y=0;y<rows.length;y++) for(var x=0;x<rows[y].length;x++){
    var ch=rows[y].charAt(x); if(ch==='.') continue; var c=pal[ch]; if(!c) continue;
    hp(g,Math.round(rx)+(flip?(w-1-x):x),Math.round(ry)+y,c);
  }
}

/* ── 도형 한 덩어리 → 픽셀화 + 자동 음영(좌상단 빛 · 우측 림라이트) ── */
var RIM='#ffe9a8', HAIRU=0;
function shape(main,col,fn,mode){
  tg.setTransform(1,0,0,1,0,0); tg.globalCompositeOperation='source-over';
  tg.clearRect(0,0,RW,RH); tg.setTransform(SC,0,0,SC,OX*SC,OY*SC); tg.fillStyle=col; tg.strokeStyle=col;
  fn(tg);
  tg.setTransform(1,0,0,1,0,0); tg.globalCompositeOperation='source-over';
  var id=tg.getImageData(0,0,RW,RH), d=id.data, a=new Uint8Array(RW*RH), minx=RW, maxx=0, i, x, y;
  for(i=0;i<RW*RH;i++){ if(d[i*4+3]>=110){ a[i]=1; x=i%RW; if(x<minx) minx=x; if(x>maxx) maxx=x; } }
  var c=rgb(col), rc=rgb(RIM);
  for(y=0;y<RH;y++) for(x=0;x<RW;x++){
    i=y*RW+x;
    if(!a[i]){ d[i*4+3]=0; continue; }
    var f=1, rim=0;
    if(mode!==true){
      var L=x>0?a[i-1]:0, U=y>0?a[i-RW]:0, R=x<RW-1?a[i+1]:0, D=y<RH-1?a[i+RW]:0, R2=x<RW-2?a[i+2]:0, D2=y<RH-2?a[i+RW*2]:0;
      if(!L||!U) f=1.26;
      else if(!R) rim=1;
      else if(!D) f=0.74;
      else if(mode!=='soft'){ if(!R2) f=0.86; else if(!D2) f=0.86; else if(x>minx+(maxx-minx)*0.64) f=0.93; }
      if(mode==='hair'&&!rim){
        var u=x/SC-OX, v=y/SC-OY-HAIRU, dd=((u-24)/8.6)*((u-24)/8.6)+((v-8.5)/7.2)*((v-8.5)/7.2);
        if(dd>0.46&&dd<0.62&&v<10) f=Math.max(f,1.38);
      }
    }
    var r0=Math.min(255,c[0]*f), g0=Math.min(255,c[1]*f), b0=Math.min(255,c[2]*f);
    if(rim){ r0=r0*0.45+rc[0]*0.55; g0=g0*0.45+rc[1]*0.55; b0=b0*0.45+rc[2]*0.55; }
    d[i*4]=r0; d[i*4+1]=g0; d[i*4+2]=b0; d[i*4+3]=255;
  }
  tg.putImageData(id,0,0);
  main.drawImage(tmp,0,0);
}
function outline(c,col){
  var g=c.getContext('2d'), w=c.width, h=c.height, id=g.getImageData(0,0,w,h), d=id.data, o=new Uint8Array(w*h), i;
  for(i=0;i<w*h;i++) o[i]=d[i*4+3]>0?1:0;
  var cc=rgb(col);
  for(var y=0;y<h;y++) for(var x=0;x<w;x++){ i=y*w+x; if(o[i]) continue;
    if((x>0&&o[i-1])||(x<w-1&&o[i+1])||(y>0&&o[i-w])||(y<h-1&&o[i+w])){ d[i*4]=cc[0]; d[i*4+1]=cc[1]; d[i*4+2]=cc[2]; d[i*4+3]=255; } }
  g.putImageData(id,0,0);
}

/* ═══════════════ 꾸미기 데이터 ═══════════════ */
var DEF_EYE={taro:'#4a3228',mir:'#3a8a4a',hana:'#c83030',yuri:'#9a4ad0',leon:'#3a8ad8'};
/* 직업별 기본 디자인 (그림 시안 기준) */
var CLASS_LOOK={
  taro:{outfit:'coat',   style:'hero',  pants:'#2a2a3a'},   // 아레테: 털 칼라 파란 코트
  mir: {outfit:'knight', style:'messy', pants:'#3a3a48'},   // 포르사: 은빛 판금 + 초록 휘장 기사
  hana:{outfit:'rogue',  style:'hana',  pants:'#2a1e24'},   // 아길레: 붉은 스카프 무투가
  yuri:{outfit:'witch',  style:'yuri',  pants:'#2a2050'},   // 리커버: 마녀 모자 · 보라 로브
  leon:{outfit:'mystic', style:'messy', pants:'#2a2030'}    // 멘타: 흑백 로브 술사
};
if(typeof HERO!=='undefined'){
  HERO.taro={skin:'#f4c896',hair:'#3a2a22',suit:'#2e5aa8',accent:'#f4f0ea',trim:'#6a4428'};
  HERO.mir ={skin:'#f0c090',hair:'#6a4420',suit:'#c8ccd6',accent:'#4a7a3a',trim:'#8a92a4'};
  HERO.hana={skin:'#f4c896',hair:'#d0302a',suit:'#2a2030',accent:'#d0302a',trim:'#6a4428'};
  HERO.yuri={skin:'#f8d8c0',hair:'#d8d4e8',suit:'#4a3a9a',accent:'#f4f0ea',trim:'#e0b040'};
  HERO.leon={skin:'#f0c8a0',hair:'#b8b0b0',suit:'#f0ece4',accent:'#2a2030',trim:'#e0b040'};
}
var STYLES=[ ['hero','용사'],['messy','부스스'],['taro','스파이크'],['mir','올백'],['hana','포니테일'],['yuri','긴 생머리'],['leon','샤기'],
  ['bob','단발'],['short','스포츠'],['bun','올림머리'],['twin','트윈테일','r1'],['wild','와일드','r3'],['wavy','웨이브','r5'] ];
var EYES=[ ['bright','또렷한'],['sharp','날카로운'],['soft','순한'],['sleepy','나른한'] ];
var EXPRS=[ ['confident','자신만만'],['smile','미소'],['battle','전투','r4'] ];
var POSES=[ ['raise','검을 치켜듦'],['guard','전투 자세'],['relax','여유','r2'] ];
var HAIR_COLS=['#6a4420','#2a2030','#aab6d6','#1f7a64','#e06aa0','#8a64c0','#e0b040','#c03a2a','#f4f0e0','#3a6ad0','#ff8a3a','#5ad0a0'];
var EYE_COLS=['#8a5a2a','#4a7ad0','#2a9a6a','#c03a4a','#8a5ad0','#d0902a','#3a3a4a','#20b0c0','#e05aa0','#e8c040'];
var SKIN_COLS=['#f8dcc0','#f4c896','#e0a878','#c08058','#8a5a3a'];
var CLOTH_COLS=['#e0a83c','#c03a3a','#3a6ad0','#37e0cf','#5aa05a','#8a64c0','#ff9ac4','#f0f0f0','#3a3a48','#1e2a4a','#8a5a2a','#e8c040'];
var WINGS={cos_cape6:['#f4f8ff','#b8c8e8'],cos_cape7:['#ff9a2e','#d8421e'],cos_cape9:['#fff0a8','#d8b048']};
var CAPES={cos_cape1:'#c03a3a',cos_cape2:'#9b7be0',cos_cape3:'#e0b040',cos_cape4:'#2a2036',cos_cape5:'#ff6ad0',cos_cape8:'#5ad8c0'};
var AURAS={cos_aura1:'#ff7a2e',cos_aura2:'#8fd0ff',cos_aura3:'#c05aff',cos_aura4:'#7fe8ff',cos_aura5:'#ff8ae0',cos_aura6:'#ffe14d',cos_aura7:'#ff9ac4',cos_aura8:'#ff6a2e'};
var REG_NAME={r1:'1번 섬',r2:'2번 섬',r3:'3번 섬',r4:'4번 섬',r5:'5번 섬'};

/* ═══════════════ 외형 저장 (서버 우선, 체험판은 기기) ═══════════════ */
function localKey(){ return 'cs_cust_'+((G&&G.hakbun)||'guest'); }
function localGet(){ try{ return JSON.parse(localStorage.getItem(localKey())||'{}')||{}; }catch(e){ return {}; } }
function localSet(c){ try{ localStorage.setItem(localKey(),JSON.stringify(c)); }catch(e){} }
function serverLook(){ var st=(G.save&&G.save['문제상태'])||{}; return st.__look||null; }
function stripSets(o){ var c=JSON.parse(JSON.stringify(o||{})); delete c.__sets; return c; }
function getCust(){ var s=serverLook(); return (s&&Object.keys(s).length)?s:stripSets(localGet()); }
function lookSets(){ var st=(G.save&&G.save['문제상태'])||{}; return st.__lookSets||{}; }
function cleared(){ return (G.save&&G.save['클리어지역'])||[]; }
function unlocked(lock){ return !lock||cleared().indexOf(lock)>=0; }
var _pushT=null;
function pushLook(c,slot){
  var l=localGet(), keep=l.__sets; var nc=stripSets(c); if(keep) nc.__sets=keep; localSet(nc);
  if(G.save&&G.save['문제상태']) G.save['문제상태'].__look=stripSets(c);
  if(G.guest) return;
  clearTimeout(_pushT);
  _pushT=setTimeout(function(){
    try{ srv('setLook',G.hakbun,stripSets(c),slot||0).then(function(r){
      if(r&&r.ok&&r.save){ G.save=r.save; if(slot) toast('👗 코디 '+slot+' 저장 완료!');
        if(document.getElementById('chardetail').classList.contains('open')) renderCustomUI(); }
      else if(r&&r.msg) toast(r.msg);
    }).catch(function(){}); }catch(e){}
  },slot?0:700);
}
function setCust(k,v){
  var c=stripSets(getCust());
  if(v) c[k]=v; else delete c[k];
  pushLook(c); if(typeof sfx==='function') sfx('buy');
  if(CD_MODE!=='pixel') heroCdMode('pixel');
  renderCustomUI();
}
window.setHeroCust=setCust;
var _heroEq=heroEq;
heroEq=function(){ var e=_heroEq(); var c=getCust(); if(Object.keys(c).length) e.custom=c; return e; };
var _l2e=lookToEq;
lookToEq=function(lk){ var e=_l2e(lk); if(e&&lk&&lk.cu) e.custom=lk.cu; return e; };

/* ═══════════════ 얼굴 부품 (실제 픽셀 맵, 왼쪽 눈 기준 · 오른쪽은 좌우반전) ═══════════════ */
var EYE_MAP={
  bright:[".LLLLLL.","LLDDDDLL","SDWWPPDS","SDWPPPDS","SIIPPlIS",".SIllIS.","..bbbb.."],
  sharp: ["LL......",".LLLLLLL",".LDDDDDL",".SDWPPDS","..SIPlIS","...bbbb.","........"],
  soft:  ["..LLLL..",".LLDDLL.","LDWWPPDL","SDWPPPDS","SIIPPlIS","SIlllIIS",".bbbbbb."],
  sleepy:["........","........","LLLLLLLL","LDDDDDDL","SIWPPlIS",".SIllIS.","..bbbb.."]
};
var BROW_MAP={ confident:["BBB.....","..BBBBB."], smile:[".BBBBB..","B.....B."], battle:["BB......","..BBB...",".....BBB"] };
var MOUTH_MAP={ confident:["M......M",".MWWWWM.","..MMMM.."], smile:["M.....M",".MMMMM."], battle:[".MMMMM.","MRRRRRM","MRTTTRM",".MMMMM."] };

/* ═══════════════ 머리 모양 ═══════════════ */
function hairBack(S,style,hair,U,sw){
  if(style==='yuri') S(hair,poly(up([15,10,33,10,36,42,32,50,20,50,9+sw*0.5,46,11,30],U)));
  else if(style==='hana') S(hair,poly(up([29,5,35,5,43,14+sw*0.3,47,28+sw,44,40+sw,39,28,33,14],U)));
  else if(style==='twin'){ var t=up([15,7,11,8,6,20+sw*0.5,7,36+sw,12,31,14,15],U); S(hair,multi(poly(t),poly(mir(t)))); }
  else if(style==='wavy') S(hair,poly(up([15,10,33,10,36,20,34,26,37,32,34,40,30,46,18,46,14,40,11,32,14,26,12,20],U)));
  else if(style==='bun') S(hair,ell(24,1.5+U,4.2,3.6));
}
function hairFront(S,g,style,hair,accent,trim,U,sw){
  var cap=function(t){ t.save(); t.beginPath(); t.rect(-10,-40,70,49+U); t.clip(); ell(24,10+U,8.8,7.4)(t); t.restore(); ell(16.6,12+U,2,4.4)(t); ell(31.4,12+U,2,4.4)(t); };
  var H=function(f){ S(hair,f,'hair'); };
  if(style==='taro'){
    H(multi(cap,poly(up([15,9,13,0,19,4,20,-4,24,2,27,-5,29,2,34,-1,33,6,38,5,33,10],U)),poly(up([16,9,32,9,31,13,28,10,26,12.5,23,9.5,21,12,18,10,16.5,13.5],U))));
    S(accent,multi(poly(up([15.5,8.2,32.5,8.2,32.5,10.3,15.5,10.3],U)),poly(up([16,8.5,8,10+sw*0.6,4,13+sw,15,11],U))));
  } else if(style==='hero'){
    H(multi(cap,poly(up([15,9,13.5,1,18,4,19.5,-3,23,2,26,-4,28.5,2,33,0,33,6,36,6,33,10],U)),poly(up([16,9,32,9,31.5,13,28.5,10,26.5,12.5,24,9.5,21.5,12,19,10,16.5,13],U))));
  } else if(style==='messy'){
    H(multi(cap,poly(up([15,8,14,1,18,3,20,-3,24,1,27,-3,30,1,34,1,33,7],U)),poly(up([16,9,32,8,33,14,30,11.5,27.5,13,25,10,22,12.5,19.5,10,16.5,14],U))));
  } else if(style==='mir'){
    H(multi(cap,poly(up([30,3,41,-1,35,6,42,8,34,11],U)),poly(up([16,5,21,-5,23,1,28,-6,29,2,34,-2,31,6],U)),poly(up([17,9,31,6.5,30,10,24,8,18,11],U))));
  } else if(style==='hana'){
    H(multi(cap,poly(up([15,10,26,1,33,4,33.5,11,28,8.5,24,12,21,9.5,17,14],U))));
    S(accent,ell(32,6+U,1.7,1.7));
  } else if(style==='yuri'){
    H(multi(cap,poly(up([16,8,32,8,33,15,30,10.5,26,9.5,24,12,22,9.5,18,10.5,15,15],U)),poly(up([14.5,12,18,12,17.5,30,13,33],U)),poly(up([30,12,33.5,12,35,33,30.5,30],U))));
    S('#ff9ac4',ell(31,5.5+U,2.1,2.1));
  } else if(style==='leon'){
    H(multi(cap,poly(up([16,9,31,5,35,11,32,17,28.5,14,26,9.5,20,10.5,17,14],U)),poly(up([14,7,10,3,15,4],U))));
    S(trim,poly(up([16,7.4,32,7.4,32,8.8,16,8.8],U))); px(g,23,7+U,accent,1.5,1.5);
  } else if(style==='bob'){
    H(multi(cap,poly(up([15,9,19.5,9,19,21,14.5,20],U)),poly(up([33,9,28.5,9,29,21,33.5,20],U)),poly(up([16,7.5,32,7.5,32,12,29,11,26,12,23,11,20,12,16,11.5],U))));
  } else if(style==='short'){
    H(function(t){ t.save(); t.beginPath(); t.rect(-10,-40,70,47.5+U); t.clip(); ell(24,10+U,8.3,6.8)(t); t.restore(); poly(up([17,8,31,8,30,9.8,18,9.8],U))(t); ell(16.8,11+U,1.4,2.5)(t); ell(31.2,11+U,1.4,2.5)(t); });
  } else if(style==='bun'){
    H(multi(cap,poly(up([15,10,27,2,33,5,33.5,11,29,8.5,25,11,21,9,17,13],U))));
    px(g,26.5,0.5+U,accent,2.5,1);
  } else if(style==='twin'){
    H(multi(cap,poly(up([16,9,23.5,4.5,24,10,24.5,4.5,32,9,31,13,27.5,10,24,12,20.5,10,17,13],U))));
    S(accent,multi(ell(14.2,7+U,1.8,1.8),ell(33.8,7+U,1.8,1.8)));
  } else if(style==='wild'){
    H(multi(cap,poly(up([30,2,45,-1,37,5,47,8,36,11,45,16,34,14],U)),poly(up([15,7,16,-7,21,0,24,-9,27,-1,33,-6,32,5],U)),poly(up([16,9,32,8,31,14,28,10,25,14,22,10,19,13,16.5,15],U))));
  } else if(style==='wavy'){
    H(multi(cap,poly(up([16,8,32,8,33,15,30,11,26,9.5,24,12.5,22,9.5,18,11,15,15],U)),poly(up([14.5,12,18,12,17,20,18.5,26,15,32,13,26,14.5,20],U)),poly(up([30,12,33.5,12,34.5,20,33,26,34.5,32,31,27,31,20],U))));
    S('#ffe070',ell(31,6+U,1.4,1.4));
  }
}

/* ═══════════════ 포즈 ═══════════════ */
var POSE={
  raise:{ legs:'wide', hand:[38,22], ang:0.34,
    ru:[31,26,36,27,41,33,37,36], rf:[37,35,41,33,41,23,36,23],
    lu:[12,27,17,26,16,36,11,37], lf:[11,35,16,36,12,45,7,43], lh:[9,45.5] },
  guard:{ legs:'wide', hand:[39,37], ang:0.62,
    ru:[31,26,36,27,39,33,35,36], rf:[35,34,39,32,41,37,38,39],
    lu:[12,27,17,26,17,35,12,36], lf:[12,34,17,35,21,39,18,42], lh:[20.5,40] },
  relax:{ legs:'stand', hand:[35,46], ang:Math.PI,
    ru:[31,26,36,27,37,37,32,38], rf:[32,37,37,37,37,45,33,45],
    lu:[12,27,17,26,16,36,12,37], lf:[12,35,16,36,20,42,17,45], lh:[18.5,43.5] }
};

/* ═══════════════ 영웅 조립 ═══════════════ */
function buildShow(id,eq,f){
  var cu=eq.custom||{};
  var key=[id,f,eq.w&&eq.w.id,eq.a&&eq.a.id,eq.acc&&eq.acc.id,eq.hat&&eq.hat.id,eq.cape&&eq.cape.id,eq.dye,JSON.stringify(cu)].join('|');
  if(cache[key]) return cache[key];
  if(++cacheN>160){ cache={}; cacheN=0; }
  var base=(typeof HERO!=='undefined'&&HERO[id])||HERO.taro;
  var hair=hexOf(cu.hair||base.hair), skin=hexOf(cu.skin||base.skin), eye=hexOf(cu.eye||DEF_EYE[id]||'#4a7ad0');
  var CL=CLASS_LOOK[id]||CLASS_LOOK.taro;
  var style=cu.style||CL.style, eyeT=EYE_MAP[cu.eyeType]?cu.eyeType:'bright', expr=MOUTH_MAP[cu.expr]?cu.expr:'confident';
  var P=POSE[cu.pose]||POSE.raise;
  var outfit=CL.outfit, suit=base.suit, trim=base.trim, accent=hexOf(base.accent), robe=0, heavy=0;
  if(eq.a&&typeof AART!=='undefined'&&AART[eq.a.id]){ suit=AART[eq.a.id][0]; trim=AART[eq.a.id][1]; robe=AART[eq.a.id][2]; heavy=robe?0:1; outfit='armor'; }
  else { if(outfit==='knight') heavy=1; if(outfit==='witch'||outfit==='mystic') robe=1; }
  if(eq.dye) suit=eq.dye;
  if(cu.top) suit=cu.top;
  suit=hexOf(suit); trim=hexOf(trim);
  var pants=hexOf(cu.bottom||CL.pants||'#3a3458'), boot=heavy?sh(trim,0.8):(outfit==='witch'?'#2a2050':'#4a3024');
  var armU=(outfit==='rogue')?skin:suit;
  RIM=sh(hexOf((STORY.charColor&&STORY.charColor[id])||'#ffe9a8'),1.25);
  var U=(f>=2)?1:0, sw=[0,1,2,1][f]; HAIRU=U;
  var c=mk(RW,RH), g=c.getContext('2d');
  function S(col,fn,mode){ shape(g,hexOf(col),fn,mode); }
  var HX=P.hand[0], HY=P.hand[1]+U, ang=P.ang;

  /* 1) 날개 · 망토 */
  if(eq.cape&&WINGS[eq.cape.id]){
    var wc=WINGS[eq.cape.id];
    var wl=up([17,28,3,2-sw,-3,14-sw,-2,30,2,44,10,40,16,36],U), wi=up([17,30,6,10-sw,2,26,6,40,15,37],U);
    S(wc[1],multi(poly(wl),poly(mir(wl)))); S(wc[0],multi(poly(wi),poly(mir(wi))));
    for(var fq=0;fq<4;fq++){ var fy=12+fq*7+U; hp(g,RX(4+fq),RY(fy),sh(wc[1],0.8),4,1); hp(g,RX(44-fq)-4,RY(fy),sh(wc[1],0.8),4,1); }
  } else if(eq.cape){
    var cc=cu.cape||CAPES[eq.cape.id]||'#c03a3a';
    S(cc,poly(up([16,26,32,26,33,48,28,78,18,84,5+sw,80,-2+sw,64,5,44],U)));
  } else if(CL.outfit==='knight'&&!(eq.a&&AART[eq.a.id])){
    S(cu.cape||base.accent,poly(up([16,26,32,26,33,48,28,76,18,80,6+sw,76,0+sw,62,6,44],U)));
  }
  /* 2) 뒷머리 */
  hairBack(S,style,hair,U,sw);
  /* 3) 다리 · 로브 · 부츠 */
  if(P.legs==='wide'){
    S(pants,multi(poly([18,49,24,50,19,61,16,71,10,71,13,60]),poly([24,50,30,49,33,60,37,71,31,71,27,61])));
    hp(g,RX(14.5),RY(60),sh(pants,0.7),6,1); hp(g,RX(28),RY(60),sh(pants,0.7),6,1);
    if(heavy) S(trim,multi(poly([12,59,19,60,16,70,10,70]),poly([28,60,33,59,36,70,31,70])));
    S(boot,multi(poly([9,68,17,68,17,76,6,76,6,73]),poly([30,68,38,68,40,73,40,76,30,76])));
  } else {
    S(pants,multi(poly([18,49,24,50,22,71,16.5,71]),poly([24,50,30,49,31.5,71,26,71])));
    hp(g,RX(17.5),RY(60),sh(pants,0.7),6,1); hp(g,RX(26.5),RY(60),sh(pants,0.7),6,1);
    if(heavy) S(trim,multi(poly([16,59,22,59,21.5,70,16,70]),poly([26,59,32,59,32,70,26.5,70])));
    S(boot,multi(poly([14,68,22.5,68,22.5,76,12,76,12,73]),poly([25.5,68,34,68,36,73,36,76,25.5,76])));
  }
  if(robe) S(suit,poly(up([17,43,31,43,38,74,31,76,24,73,17,76,9,74],U)));
  if(outfit==='coat') S(suit,multi(poly(up([16.5,43,23,45,20.5,63,12.5,61],U)),poly(up([25,45,31.5,43,35.5,61,27.5,63],U))));
  if(outfit==='mystic') S('#7ab8e8',multi(poly(up([10,58,14,58,13,74,9,74],U)),poly(up([34,58,38,58,39,74,35,74],U))));
  /* 4) 몸통 + 옷 주름 */
  S(suit,poly(up([14.5,26,33.5,26,31,36,29,45,30,51,18,51,19,45,17,36],U)));
  if(heavy){
    S(sh(suit,1.15),poly(up([18,28,30,28,29,40,24,43,19,40],U)));
    hp(g,RX(20),RY(29.5+U),'#ffffff',3,1); hp(g,RX(19.5),RY(30.5+U),'#ffffff',1,3);
  } else if(!robe&&outfit==='coat'){
    S('#20263a',poly(up([21,27,27,27,26.5,50,21.5,50],U)));
    S(trim,multi(poly(up([16,28,18,27,30,42,28,43],U)),poly(mir(up([16,28,18,27,30,42,28,43],U)))));
    S('#d8dce8',ell(24,33.5+U,2,2.2)); hp(g,RX(23.3),RY(32.6+U),'#ffffff',2,2);
  } else if(!robe&&outfit==='rogue'){
    S(skin,poly(up([17.5,34,30.5,34,29.5,44,18.5,44],U)),'soft');
    hp(g,RX(23.5),RY(39+U),sh(skin,0.8),2,1);
  } else if(!robe){
    S(sh(suit,0.82),poly(up([20,33,28,33,27,50,21,50],U)));
    S(accent,poly(up([20,26,28,26,24,33],U)));
    S(trim,poly(up([17,27,19,26,31,43,29,44],U)));
    hp(g,RX(18),RY(38+U),sh(suit,0.72),1,5); hp(g,RX(29.5),RY(37+U),sh(suit,0.72),1,4);
  } else if(outfit==='witch'){
    S(accent,poly(up([21,30,27,30,30,72,18,72],U)));
    S(trim,multi(poly(up([9,72,39,72,38.5,74.5,9.5,74.5],U)),poly(up([22.5,54,25.5,54,24,57],U))));
  } else if(outfit==='mystic'){
    S(accent,poly(up([21,27,27,27,28.5,74,19.5,74],U)));
    S(trim,multi(poly(up([20.5,28,21.5,28,20.5,74,19.5,74],U)),poly(up([26.5,28,27.5,28,28.5,74,27.5,74],U)),poly(up([9,72.5,39,72.5,38.5,74.5,9.5,74.5],U))));
    S('#7ad0f0',poly(up([24,30,26,32.5,24,35,22,32.5],U)));
  }
  S(trim,poly(up([18,44,30,44,30,47,18,47],U)));
  if(heavy&&outfit==='knight') S(accent,poly(up([20.5,47,27.5,47,27,58,24,60,21,58],U)));
  if(outfit==='rogue') S(accent,poly(up([18,46,30,46,33.5,58,28,56,24,59,20,56,14.5,58],U)));
  hp(g,RX(23),RY(44+U),'#ffe070',4,6); hp(g,RX(23.5),RY(44.5+U),'#fff6c0',1,2);
  /* 5) 왼팔 */
  S(armU,poly(up(P.lu,U)),outfit==='rogue'?'soft':undefined);
  S(robe?suit:(heavy?trim:suit),poly(up(P.lf,U)));
  S(skin,ell(P.lh[0],P.lh[1]+U,2.6,2.6),'soft');
  /* 6) 무기 */
  c._blade=null;
  if(eq.w&&typeof WART!=='undefined'){
    var wa=WART[eq.w.id]||['#6a4a26','#c9ccd8',1,'s'];
    var bl=hexOf(wa[1]==='RAINBOW'?'#ff8ae0':wa[1]), hd=hexOf(wa[0]), gd='#e8c860', ty=wa[3];
    var ca=Math.cos(ang), sa=Math.sin(ang), maxL=ca>0?(HY+OY-4)/ca:(76-HY-1)/(-ca);
    if(sa>0.05) maxL=Math.min(maxL,(CW-OX-4-HX)/sa); else if(sa<-0.05) maxL=Math.min(maxL,(HX+OX-4)/(-sa));
    if(ty==='p'){
      var Lp=Math.min(maxL-6,34*wa[2]);
      S(hd,poly(rot(HX,HY,ang,[-0.8,20,0.8,20,0.8,-Lp,-0.8,-Lp])));
      S(bl,poly(rot(HX,HY,ang,[0,-Lp-7,3,-Lp,0,-Lp+4,-3,-Lp])));
      S('#ffe070',poly(rot(HX,HY,ang,[-1.6,-Lp+1,1.6,-Lp+1,1.6,-Lp+3,-1.6,-Lp+3])));
      var tp=rot(HX,HY,ang,[0,-Lp-6]), bp=rot(HX,HY,ang,[0,-4]); c._blade=[bp[0],bp[1],tp[0],tp[1],bl];
    } else if(ty==='o'){
      var Lo=Math.min(maxL-6,26*wa[2]);
      S(hd,poly(rot(HX,HY,ang,[-0.8,16,0.8,16,0.8,-Lo,-0.8,-Lo])));
      S(gd,poly(rot(HX,HY,ang,[-3.5,-Lo+1,3.5,-Lo+1,2,-Lo-2,-2,-Lo-2])));
      var oc=rot(HX,HY,ang,[0,-Lo-4]); S(bl,ell(oc[0],oc[1],4.3,4.3),'soft'); px(g,oc[0]-2,oc[1]-2,'#ffffff',1.5,1.5);
      c._blade=[oc[0],oc[1],oc[0],oc[1],bl];
    } else {
      var L=Math.min(maxL-5,(ty==='d'?15:(ty==='g'?32:27))*wa[2]), hw=(ty==='g'?3.2:1.7), gw=(ty==='g'?7:5.5);
      S(hd,poly(rot(HX,HY,ang,[-1,1,1,1,1,9,-1,9]))); S(gd,ell.apply(null,rot(HX,HY,ang,[0,10]).concat([1.6,1.6])));
      S(gd,poly(rot(HX,HY,ang,[-gw,-1,gw,-1,gw,-3,-gw,-3])));
      S(bl,poly(rot(HX,HY,ang,[-hw,-3,hw,-3,hw,-L,0,-L-5,-hw,-L])));
      var a0=rot(HX,HY,ang,[0,-4]), a1=rot(HX,HY,ang,[0,-L-3]);
      for(var q=0;q<=1;q+=0.02) hp(g,RX(a0[0]+(a1[0]-a0[0])*q),RY(a0[1]+(a1[1]-a0[1])*q),sh(bl,1.45));
      c._blade=[a0[0],a0[1],a1[0],a1[1],bl];
    }
  }
  /* 7) 오른팔 */
  S(armU,poly(up(P.ru,U)),outfit==='rogue'?'soft':undefined);
  S(robe?suit:(heavy?trim:suit),poly(up(P.rf,U)));
  S(skin,ell(HX,HY+0.5,2.8,2.7),'soft');
  if(heavy){ S(trim,multi(ell(14.5,27.5+U,4.8,3.4),ell(33.5,27.5+U,4.8,3.4))); hp(g,RX(12.5),RY(25.5+U),'#ffffff',3,1); hp(g,RX(31.5),RY(25.5+U),'#ffffff',3,1); }
  /* 8) 목 · 얼굴 */
  S(skin,poly(up([21,19,27,19,27,27,21,27],U)),'soft');
  hp(g,RX(21),RY(20.5+U),sh(skin,0.82),12,2);
  if(outfit==='coat') S('#f4f0ea',multi(ell(18,26.5+U,4.2,2.6),ell(30,26.5+U,4.2,2.6),ell(24,25.8+U,3.6,1.8)));
  if(outfit==='rogue') S(accent,multi(ell(24,25.8+U,5.4,2.4),poly(up([19,26,11,29+sw,6,33+sw,9,34+sw,18,28.5],U))));
  if(outfit==='mystic') S(accent,poly(up([15,24.5,33,24.5,31,29.5,24,27.5,17,29.5],U)));
  S(skin,multi(ell(24,13+U,7.4,8.4),ell(16.6,14+U,1.3,2),ell(31.4,14+U,1.3,2),poly(up([19,18,29,18,24,22.5],U))),'soft');
  /* 9) 앞머리 */
  hairFront(S,g,style,hair,accent,trim,U,sw);
  /* 10) 얼굴: 눈 · 눈썹 · 입 */
  var epal={L:'#1e1024',D:sh(eye,0.62),I:eye,l:sh(eye,1.45),P:'#140a18',W:'#ffffff',S:'#f8f2f6',b:sh(skin,0.7)};
  var ey=RY(11+U)-1;
  drawMap(g,EYE_MAP[eyeT],RX(18.5),ey,epal,false);
  drawMap(g,EYE_MAP[eyeT],RX(25.5),ey,epal,true);
  var bm=BROW_MAP[expr], by=ey-bm.length-1, bpal={B:sh(hair,0.55)};
  drawMap(g,bm,RX(18.5),by,bpal,false); drawMap(g,bm,RX(25.5),by,bpal,true);
  hp(g,RX(24),RY(16.5+U),sh(skin,0.8),1,2);
  var mm=MOUTH_MAP[expr], mw=mm[0].length;
  drawMap(g,mm,Math.round(RX(24)-mw/2),RY(18.3+U),{M:'#6a2a30',W:'#ffffff',R:'#8a2a3a',T:'#e07080'},false);
  hp(g,RX(18),RY(16+U),'#f4a090',4,1); hp(g,RX(28),RY(16+U),'#f4a090',4,1);
  /* 11) 모자 */
  var HO=(window.ART&&ART.lib&&ART.lib.HAT_OF)||{};
  var ht=eq.hat&&(HO[eq.hat.id]||['brim',{X:'#d0a850',x:'#8a6a30',Y:'#a5763f'}]);
  function drawHat(kind,p){ hatDraw(S,g,U,kind,p); }
  if(ht) drawHat(ht[0],ht[1]);
  else if(outfit==='witch'&&!cu.nohat){ drawHat('wizard',{X:suit,Y:trim}); px(g,33.5,-8+U,trim,1,2); px(g,33,-6+U,trim,2,1); }
  c._orb=null;
  if(outfit==='mystic'&&!eq.w){
    var ox0=P.lh[0]-4, oy0=P.lh[1]-7+U;
    S('#3a8ae8',ell(ox0,oy0,3.2,3.2),'soft'); hp(g,RX(ox0-1.5),RY(oy0-1.5),'#ffffff',2,2);
    c._orb=[ox0,oy0];
  }
  /* 12) 장신구 */
  accDraw(S,g,U,eq);
  outline(c,'#120a1a');
  return (cache[key]=c);
}

function hatDraw(S,g,U,kind,p){
    var X=p.X||'#888888', xd=p.x||sh(X,0.7), Y=p.Y||'#ffe070';
    if(kind==='wizard'){ S(X,multi(ell(24,6+U,13,2.6),poly(up([16,6,32,6,28,-6,34,-13,24,-8,20,-2],U)))); S(Y,poly(up([16.5,3.5,31.5,3.5,31,5.8,17,5.8],U))); px(g,25,-4+U,Y,1.5,1.5); }
    else if(kind==='crown'){ S(X,multi(poly(up([17,3,31,3,31,7,17,7],U)),poly(up([17,3.5,18.5,-2,20,3.5],U)),poly(up([21.5,3.5,24,-4,26.5,3.5],U)),poly(up([28,3.5,29.5,-2,31,3.5],U)))); px(g,23.5,4.5+U,Y,1.5,1.5); px(g,19,4.5+U,Y); px(g,29,4.5+U,Y); }
    else if(kind==='horns'){ var W=p.W||'#e8e2d4'; S(W,multi(poly(up([17,6,10,2,6,-8,10,-4,13,0,18,3],U)),poly(mir(up([17,6,10,2,6,-8,10,-4,13,0,18,3],U))))); S(X,multi(ell(24,8+U,9,6.5),poly(up([15,9,33,9,33,11.5,15,11.5],U)))); px(g,23,5+U,Y,1.5,2.5); }
    else if(kind==='flower'){ var G2=p.G||'#3a7a3a', R=p.R||'#ff9ac4'; S(G2,poly(up([16,5,32,5,32,7,16,7],U))); for(var i=0;i<7;i++) S(i%2?Y:R,ell(17+i*2.35,5+U-Math.sin(i/6*3.14)*1.5,1.4,1.4)); }
    else if(kind==='phones'){ S(xd,poly(up([16,12,17,3,24,0,31,3,32,12,30.5,12,29.5,4.5,24,2,18.5,4.5,17.5,12],U))); S(X,multi(ell(16,14+U,2.5,3.3),ell(32,14+U,2.5,3.3))); }
    else if(kind==='halo'){ S(Y,function(t){ ell(24,-3,8,2.3)(t); t.globalCompositeOperation='destination-out'; ell(24,-3,5.8,1.1)(t); t.globalCompositeOperation='source-over'; },true); }
    else if(kind==='fox'){ var Wf=p.W||'#f4f0ea', Rf=p.R||'#c03a3a'; S(Wf,multi(ell(30,5+U,4.2,3.6),poly(up([26.5,3,27.5,-2,29.5,2],U)),poly(up([30.5,2,32.5,-2,33.5,3],U)))); px(g,28,4.5+U,Rf,1.5,1); px(g,31,4.5+U,Rf,1.5,1); }
    else if(kind==='owl'){ S(X,multi(ell(24,7+U,9.5,6.5),poly(up([15,6,15.5,-3,19.5,2],U)),poly(up([33,6,32.5,-3,28.5,2],U)))); px(g,23.5,6+U,Y,1.5,1); }
    else { S(X,multi(ell(24,6+U,12.5,2.5),poly(up([17.5,6,30.5,6,29.5,-1,18.5,-1],U)))); S(Y,poly(up([17.6,3.5,30.4,3.5,30.3,5.5,17.7,5.5],U))); }
  }
function accDraw(S,g,U,eq){
  function drawHat(kind,p){ hatDraw(S,g,U,kind,p); }
  if(eq.acc){
    var ai=eq.acc.id, it=G.itemById&&G.itemById[ai], tc=hexOf((it&&typeof tierColor==='function')?tierColor(it):'#ffe070');
    if(ai==='ac_crown'&&!eq.hat) drawHat('crown',{X:'#ffd040',Y:'#ff5a8a'});
    else if(ai==='ac_halo'&&!eq.hat) drawHat('halo',{Y:'#e8d0ff'});
    else if(ai==='ac_glass'){ [18,25].forEach(function(gx){ hp(g,RX(gx),RY(10.5+U),'#cfe8ff',10,1); hp(g,RX(gx),RY(14.8+U),'#cfe8ff',10,1); hp(g,RX(gx),RY(10.5+U),'#cfe8ff',1,9); hp(g,RX(gx+5)-1,RY(10.5+U),'#cfe8ff',1,9); }); }
    else { for(var k2=0;k2<8;k2++){ hp(g,RX(20)+k2,RY(27+U)+k2,'#e0c060'); hp(g,RX(28)-k2,RY(27+U)+k2,'#e0c060'); } S(tc,ell(24,31.5+U,1.8,2)); hp(g,RX(23.4),RY(30.6+U),'#ffffff',2,2); }
  }
}

/* ── 쇼케이스 그리기 (광채·오라는 실시간) ── */
function drawShowcase(g,id,eq,cx,groundY,k){
  var t=now(), f=Math.floor(t/260)%4;
  var spr=buildShow(id,eq,f);
  var u=SC*k, x0=Math.round(cx-(OX+24)*u), y0=Math.round(groundY-FEET*u);
  if(eq.aura){
    var ac=AURAS[eq.aura.id]||'#ffca4b';
    g.save(); g.globalCompositeOperation='lighter';
    var col=g.createLinearGradient(0,y0,0,groundY); col.addColorStop(0,'rgba(0,0,0,0)'); col.addColorStop(1,ac);
    g.globalAlpha=0.2+0.08*Math.sin(t/300); g.fillStyle=col; g.fillRect(cx-22*u,y0+20*u,44*u,groundY-y0-20*u);
    for(var i=0;i<16;i++){ var ph=(t/1300+i/16)%1; g.globalAlpha=(1-ph)*0.9; g.fillStyle=ac;
      g.fillRect(Math.round(cx+Math.sin(i*2.3+t/600)*18*u),Math.round(groundY-ph*80*u),u,u); }
    g.restore();
  }
  var sm=g.imageSmoothingEnabled; g.imageSmoothingEnabled=false;
  g.drawImage(spr,x0,y0,RW*k,RH*k); g.imageSmoothingEnabled=sm;
  if(spr._orb){
    var ob=spr._orb, gx0=x0+(OX+ob[0])*u, gy0=y0+(OY+ob[1])*u+Math.sin(t/400)*u, rr=9*u;
    g.save(); g.globalCompositeOperation='lighter';
    var og=g.createRadialGradient(gx0,gy0,0,gx0,gy0,rr); og.addColorStop(0,'#8fd0ff'); og.addColorStop(1,'rgba(0,0,0,0)');
    g.globalAlpha=0.45+0.15*Math.sin(t/250); g.fillStyle=og; g.fillRect(gx0-rr,gy0-rr,rr*2,rr*2); g.restore();
  }
  var w=eq.w&&G.itemById?G.itemById[eq.w.id]:null, lv=(eq.w&&eq.w.lvl)||0;
  if(spr._blade){
    var b=spr._blade, bc=hexOf(b[4]), strong=(lv>=3||(w&&(Number(w.tier)>=3||Number(w.price)<=0)));
    g.save(); g.globalCompositeOperation='lighter';
    for(var q=0;q<=1;q+=0.1){
      var gx=x0+(OX+b[0]+(b[2]-b[0])*q)*u, gy=y0+(OY+b[1]+(b[3]-b[1])*q)*u, r=(strong?5+(lv>=5?3:0):3)*u;
      var gr=g.createRadialGradient(gx,gy,0,gx,gy,r); gr.addColorStop(0,bc); gr.addColorStop(1,'rgba(0,0,0,0)');
      g.globalAlpha=(strong?0.2:0.08)+0.08*Math.sin(t/200+q*9); g.fillStyle=gr; g.fillRect(gx-r,gy-r,r*2,r*2);
    }
    var sp=(t/700)%1; g.globalAlpha=1; g.fillStyle='#ffffff';
    g.fillRect(Math.round(x0+(OX+b[0]+(b[2]-b[0])*sp)*u-k),Math.round(y0+(OY+b[1]+(b[3]-b[1])*sp)*u-k),Math.max(2,k*2),Math.max(2,k*2));
    g.restore();
  }
}
window.drawShowcase=drawShowcase;

/* ── 무대 배경 ── */
function drawStage(g,W,H,col,t){
  col=hexOf(col);
  var bg=g.createRadialGradient(W/2,H*0.45,10,W/2,H*0.45,H*0.8);
  bg.addColorStop(0,sh(col,0.45)); bg.addColorStop(0.45,'#1c1438'); bg.addColorStop(1,'#08050f');
  g.fillStyle=bg; g.fillRect(0,0,W,H);
  g.save(); g.translate(W/2,H*0.42); g.rotate(t/9000); g.globalCompositeOperation='lighter';
  for(var i=0;i<16;i++){ g.rotate(Math.PI*2/16); g.globalAlpha=0.07+0.04*Math.sin(t/400+i); g.fillStyle=col;
    g.beginPath(); g.moveTo(0,0); g.lineTo(-10,-H); g.lineTo(10,-H); g.closePath(); g.fill(); }
  g.restore();
  g.save(); g.globalCompositeOperation='lighter';
  var sp=g.createLinearGradient(0,0,0,H); sp.addColorStop(0,'#ffffff'); sp.addColorStop(1,'rgba(0,0,0,0)');
  g.globalAlpha=0.1; g.fillStyle=sp;
  g.beginPath(); g.moveTo(W/2-26,0); g.lineTo(W/2+26,0); g.lineTo(W/2+100,H); g.lineTo(W/2-100,H); g.closePath(); g.fill();
  for(var j=0;j<22;j++){ var py=(H-((t/18+j*53)%(H+20))), pxx=W/2+Math.sin(t/900+j*1.7)*(W*0.42);
    g.globalAlpha=0.55; g.fillStyle=j%3?col:'#ffffff'; g.fillRect(Math.round(pxx),Math.round(py),2,2); }
  g.restore();
  var fy=H-26;
  g.save(); g.globalCompositeOperation='lighter';
  var fl=g.createRadialGradient(W/2,fy,4,W/2,fy,100); fl.addColorStop(0,col); fl.addColorStop(1,'rgba(0,0,0,0)');
  g.globalAlpha=0.35; g.fillStyle=fl; g.beginPath(); g.ellipse(W/2,fy,100,22,0,0,6.29); g.fill(); g.restore();
  g.save(); g.strokeStyle=col; g.globalAlpha=0.8; g.lineWidth=2; g.setLineDash([6,5]); g.lineDashOffset=-t/50;
  g.beginPath(); g.ellipse(W/2,fy,84,15,0,0,6.29); g.stroke();
  g.setLineDash([2,6]); g.lineDashOffset=t/40; g.globalAlpha=0.5; g.beginPath(); g.ellipse(W/2,fy,64,11,0,0,6.29); g.stroke(); g.restore();
  return fy;
}


/* ═══════════════ 일러스트 보기 + 장비 적용 ═══════════════
   그림(한 장) 위에 장비 효과를 겹쳐 그린다.
   날개·망토는 뒤에, 모자·장신구는 머리 위에, 무기는 그림 속 무기에 색 광채로, 오라는 발밑·주변 입자로.
   좌표는 360px 높이 그림 기준 (얼굴 중심 fx,fy · 얼굴 폭 fw · 그림 속 무기 선분 wp) */
var ANCHOR={
  taro:{fx:86, fy:62, fw:58, wp:[21,205,5,350],   hatOff:-16},
  mir: {fx:134,fy:68, fw:58, wp:[3,2,115,343],    hatOff:-22},
  hana:{fx:99, fy:72, fw:52, wp:[33,205,7,271],   hatOff:-14},
  yuri:{fx:101,fy:98, fw:50, wp:[15,70,68,337],   hatOff:-22},
  leon:{fx:82, fy:66, fw:60, wp:[181,90,181,90],  hatOff:-20}
};
/* 모자 종류별 추가 높이 (그림 속 풍성한 머리 위에 얹히도록, 단위 좌표) */
var HAT_LIFT={horns:-5,owl:-4,wizard:-2,brim:-2,flower:-1,crown:0,halo:0,phones:0,fox:0};
function headKind(eq){
  var HO=(window.ART&&ART.lib&&ART.lib.HAT_OF)||{};
  if(eq.hat) return (HO[eq.hat.id]||['brim'])[0];
  if(eq.acc&&(eq.acc.id==='ac_crown'||eq.acc.id==='ac_halo')) return eq.acc.id==='ac_crown'?'crown':'halo';
  return '';
}
var ovCache={};
function buildOverlay(id,eq,layer,f){
  var cu=eq.custom||{};
  var key=[layer,f,eq.cape&&eq.cape.id,eq.hat&&eq.hat.id,eq.acc&&eq.acc.id,cu.cape].join('|');
  if(ovCache[key]) return ovCache[key];
  var c=mk(RW,RH), g=c.getContext('2d'), U=0, sw=[0,1,2,1][f], any=false;
  function S(col,fn,mode){ shape(g,hexOf(col),fn,mode); any=true; }
  RIM='#fff4c8';
  if(layer==='back'){
    if(eq.cape&&WINGS[eq.cape.id]){
      var wc=WINGS[eq.cape.id];
      var wl=up([17,28,1,0-sw,-6,12-sw,-5,30,0,46,10,40,16,36],U), wi=up([17,30,5,8-sw,0,26,4,40,15,37],U);
      S(wc[1],multi(poly(wl),poly(mir(wl)))); S(wc[0],multi(poly(wi),poly(mir(wi))));
    } else if(eq.cape){
      S(cu.cape||CAPES[eq.cape.id]||'#c03a3a',poly([15,26,33,26,40,50,44+sw,84,24,88,4+sw,84,8,50]));
    }
  } else if(layer==='head'){
    var HO=(window.ART&&ART.lib&&ART.lib.HAT_OF)||{};
    if(eq.hat){ var ht=HO[eq.hat.id]||['brim',{X:'#d0a850',x:'#8a6a30',Y:'#a5763f'}]; hatDraw(S,g,U,ht[0],ht[1]); }
    else if(eq.acc&&eq.acc.id==='ac_crown') hatDraw(S,g,U,'crown',{X:'#ffd040',Y:'#ff5a8a'});
    else if(eq.acc&&eq.acc.id==='ac_halo') hatDraw(S,g,U,'halo',{Y:'#e8d0ff'});
  } else {
    if(eq.acc&&eq.acc.id!=='ac_crown'&&eq.acc.id!=='ac_halo') accDraw(S,g,U,{acc:eq.acc,hat:true});
  }
  if(any) outline(c,'#120a1a');
  return (ovCache[key]=any?c:null);
}
function drawArtView(g,id,eq,cx,groundY,H){
  var A=ARTS[id]; if(!A||!A.ok) return false;
  var an=ANCHOR[id]||ANCHOR.taro, t=now(), f=Math.floor(t/260)%4;
  var s=H/360, iw=A.img.width*s, bob=Math.sin(t/600)*2;
  var ix=cx-iw/2, iy=groundY+6-H+bob;
  var k=an.fw*s/(14.8*SC), ox=ix+an.fx*s-RX(24)*k, oy=iy+an.fy*s-RY(13)*k;
  var hk=headKind(eq), hy=oy+(an.hatOff||0)*s+(HAT_LIFT[hk]||0)*SC*k;
  // 오라 (뒤)
  if(eq.aura){
    var ac=AURAS[eq.aura.id]||'#ffca4b';
    g.save(); g.globalCompositeOperation='lighter';
    var cg=g.createLinearGradient(0,iy,0,groundY); cg.addColorStop(0,'rgba(0,0,0,0)'); cg.addColorStop(1,ac);
    g.globalAlpha=0.28+0.1*Math.sin(t/300); g.fillStyle=cg; g.fillRect(cx-iw*0.55,iy+H*0.25,iw*1.1,groundY-iy-H*0.25);
    var rg=g.createRadialGradient(cx,groundY,4,cx,groundY,iw*0.8); rg.addColorStop(0,ac); rg.addColorStop(1,'rgba(0,0,0,0)');
    g.globalAlpha=0.5; g.fillStyle=rg; g.beginPath(); g.ellipse(cx,groundY,iw*0.8,18,0,0,6.29); g.fill();
    g.restore();
  }
  var sm=g.imageSmoothingEnabled;
  var back=buildOverlay(id,eq,'back',f);
  if(back){ g.imageSmoothingEnabled=false; g.drawImage(back,ox,oy,RW*k,RH*k); }
  g.imageSmoothingEnabled=true; g.drawImage(A.img,ix,iy,iw,H);
  var body=buildOverlay(id,eq,'body',f);
  if(body){ g.imageSmoothingEnabled=false; g.drawImage(body,ox,oy,RW*k,RH*k); }
  var head=buildOverlay(id,eq,'head',f);
  if(head){ g.imageSmoothingEnabled=false; g.drawImage(head,ox,hy,RW*k,RH*k); }
  g.imageSmoothingEnabled=sm;
  // 무기: 그림 속 무기에 장착 무기 색 광채 + 강화 반짝임
  if(eq.w&&typeof WART!=='undefined'){
    var wa=WART[eq.w.id]||['#6a4a26','#c9ccd8',1,'s'], bc=hexOf(wa[1]==='RAINBOW'?'hsl('+((t/8)%360)+',90%,65%)':wa[1]);
    var lv=eq.w.lvl||0, wp=an.wp, it=G.itemById&&G.itemById[eq.w.id];
    var strong=lv>=3||(it&&(Number(it.tier)>=3||Number(it.price)<=0));
    g.save(); g.globalCompositeOperation='lighter';
    for(var q=0;q<=1;q+=0.08){
      var gx=ix+(wp[0]+(wp[2]-wp[0])*q)*s, gy=iy+(wp[1]+(wp[3]-wp[1])*q)*s, r=(strong?16:10)+lv*2;
      var gr=g.createRadialGradient(gx,gy,0,gx,gy,r); gr.addColorStop(0,bc); gr.addColorStop(1,'rgba(0,0,0,0)');
      g.globalAlpha=(strong?0.3:0.18)+0.1*Math.sin(t/200+q*9); g.fillStyle=gr; g.fillRect(gx-r,gy-r,r*2,r*2);
    }
    for(var sp=0;sp<Math.min(8,2+lv*2);sp++){
      var ph=((t/900)+sp/8)%1, qq=(sp*0.37)%1;
      var sx=ix+(wp[0]+(wp[2]-wp[0])*qq)*s+Math.sin(t/300+sp)*6, sy=iy+(wp[1]+(wp[3]-wp[1])*qq)*s-ph*30;
      g.globalAlpha=1-ph; g.fillStyle=sp%2?'#ffffff':bc; g.fillRect(Math.round(sx),Math.round(sy),2,2);
    }
    g.restore();
  }
  // 오라 입자 (앞)
  if(eq.aura){
    var ac2=AURAS[eq.aura.id]||'#ffca4b';
    g.save(); g.globalCompositeOperation='lighter';
    for(var i=0;i<22;i++){ var p2=(t/1500+i/22)%1; g.globalAlpha=(1-p2)*0.9; g.fillStyle=i%3?ac2:'#ffffff';
      g.fillRect(Math.round(cx+Math.sin(i*2.1+t/700)*iw*0.55),Math.round(groundY-p2*H*0.9),2,2); }
    g.restore();
  }
  return true;
}
/* 장비 슬롯 (그림 양옆) */
function renderSlotsOverlay(eq,show){
  var st=document.getElementById('cd-stage'); if(!st) return;
  var box=document.getElementById('cd-eqslots');
  if(!box){ box=document.createElement('div'); box.id='cd-eqslots'; box.style.cssText='position:absolute;inset:0;pointer-events:none'; st.appendChild(box); }
  if(!show){ box.innerHTML=''; return; }
  var L=[['weapon','w','⚔️'],['armor','a','🛡️'],['acc','acc','💍']], R=[['hat','hat','🎩'],['cape','cape','🧣'],['aura','aura','✨']];
  function cell(sl,y,side){
    var info=eq[sl[1]], it=info&&G.itemById?G.itemById[info.id]:null;
    var ra=(it&&typeof rarityOf==='function')?rarityOf(it):{c:'#3a3050',n:''};
    var ic=it?((typeof iconImg==='function')?iconImg(it,34):sl[2]):'<span style="opacity:.35;font-size:16px">'+sl[2]+'</span>';
    var lv=info&&info.lvl?'<b style="position:absolute;right:-4px;bottom:-6px;font-size:10px;color:#ffca4b;text-shadow:1px 1px 0 #000">+'+info.lvl+'</b>':'';
    return '<div style="position:absolute;'+side+':6px;top:'+y+'px;width:40px;height:40px;border-radius:7px;border:2px solid '+(it?ra.c:'#3a3050')+
      ';background:rgba(16,11,26,.78);display:flex;align-items:center;justify-content:center;'+(it?'box-shadow:0 0 8px '+ra.c+'66':'')+'">'+ic+lv+'</div>';
  }
  var h=''; L.forEach(function(sl,i){ h+=cell(sl,70+i*50,'left'); }); R.forEach(function(sl,i){ h+=cell(sl,70+i*50,'right'); });
  box.innerHTML=h;
}
var CD_MODE=(function(){ try{ return localStorage.getItem('cs_cd_mode')||'art'; }catch(e){ return 'art'; } })();
window.heroCdMode=function(m){ CD_MODE=m; try{ localStorage.setItem('cs_cd_mode',m); }catch(e){} renderModeBar(); };
function renderModeBar(){
  var cv=document.getElementById('cd-stage'); if(!cv) return;
  var bar=document.getElementById('cd-modebar');
  if(!bar){ bar=document.createElement('div'); bar.id='cd-modebar'; bar.style.cssText='display:flex;gap:6px;margin-top:8px'; cv.parentNode.insertBefore(bar,cv.nextSibling); }
  function b(m,label){ var on=CD_MODE===m; return '<button onclick="heroCdMode(\''+m+'\')" style="flex:1;padding:9px 6px;border-radius:7px;border:3px solid '+(on?'var(--gold)':'var(--line)')+';background:'+(on?'var(--panel2)':'var(--bg2)')+';color:'+(on?'var(--gold)':'var(--muted)')+';font-size:12px;font-family:var(--font-body)">'+label+'</button>'; }
  bar.innerHTML=b('art','🖼 일러스트')+b('pixel','✂ 내 모습 (꾸미기)');
}

/* ═══════════════ 캐릭터 상세 화면 ═══════════════ */
var _rcd=renderCharDetail;
renderCharDetail=function(p){
  _rcd(p);
  if(_cdTimer){ cancelAnimationFrame(_cdTimer); _cdTimer=null; }
  var mine=!p, charId=mine?G.save['캐릭터']:p.charId;
  var cv2=document.getElementById('cd-canvas'); if(!cv2) return;
  cv2.width=300; cv2.height=360;
  var g=cv2.getContext('2d'), col=hexOf((STORY.charColor&&STORY.charColor[charId])||'#9b7be0');
  renderModeBar();
  var lastMode='';
  (function anim(){
    if(!document.getElementById('chardetail').classList.contains('open')){ _cdTimer=null; renderSlotsOverlay({},false); return; }
    var t=now(), eq=mine?heroEq():(lookToEq(p.look)||{});
    var fy=drawStage(g,cv2.width,cv2.height,col,t);
    var useArt=(CD_MODE==='art')&&ARTS[charId]&&ARTS[charId].ok;
    if(useArt) drawArtView(g,charId,eq,cv2.width/2,fy+4,cv2.height-40);
    else drawShowcase(g,charId,eq,cv2.width/2,fy+4,2);
    var mk2=(useArt?'a':'p')+JSON.stringify([eq.w,eq.a,eq.acc,eq.hat,eq.cape,eq.aura]);
    if(mk2!==lastMode){ lastMode=mk2; renderSlotsOverlay(eq,useArt); }
    _cdTimer=requestAnimationFrame(anim);
  })();
  var box=document.getElementById('cd-custom');
  if(!box){ box=document.createElement('div'); box.id='cd-custom';
    var dye=document.getElementById('cd-dye'); dye.parentNode.insertBefore(box,dye.nextSibling); }
  box.style.display=mine?'block':'none';
  if(mine) renderCustomUI();
};

/* ── 꾸미기 UI ── */
var _cuTab='style';
window.heroCustTab=function(t){ _cuTab=t; renderCustomUI(); };
function btn(on,locked,bg,onclick,label,title){
  return '<button '+(locked?'disabled ':'')+'title="'+(title||'')+'" onclick="'+(locked?'':onclick)+'" style="min-width:34px;height:34px;padding:0 9px;border-radius:6px;border:3px solid var(--line);'+
    (on?'outline:3px solid var(--gold);':'')+'background:'+bg+';color:#fff;font-size:11px;font-family:var(--font-body);'+(locked?'opacity:.45;':'')+'">'+(label||'')+'</button>';
}
var COLOR_TABS={hair:HAIR_COLS,eye:EYE_COLS,skin:SKIN_COLS,top:CLOTH_COLS,bottom:CLOTH_COLS,cape:CLOTH_COLS};
function renderCustomUI(){
  var box=document.getElementById('cd-custom'); if(!box||!G.save) return;
  var cu=getCust(), id=G.save['캐릭터'];
  var tabs=[['style','헤어'],['eyeType','눈매'],['expr','표정'],['pose','포즈'],['hair','머리색'],['eye','눈동자'],['skin','피부'],['top','상의'],['bottom','하의'],['cape','망토'],['sets','코디']];
  var h=(CD_MODE==='art'?'<div style="margin-top:10px;font-size:10.5px;color:var(--muted)">💡 머리·눈·색·포즈 꾸미기는 <b style="color:var(--gold)">✂ 내 모습</b>에서 보여요. 장비는 두 화면 모두에 적용돼요.</div>':'')+'<div style="margin-top:12px;font-size:12px;color:var(--gold)">✂ 외형 꾸미기 <span style="color:var(--muted);font-size:10px">'+(G.guest?'(체험판: 이 기기에만 저장)':'(서버 저장 · 친구에게도 보여요)')+'</span></div>'+
    '<div style="display:flex;gap:5px;overflow-x:auto;margin:6px 0;padding-bottom:4px">'+
    tabs.map(function(tb){ return '<button onclick="heroCustTab(\''+tb[0]+'\')" style="flex-shrink:0;padding:8px 10px;border-radius:6px;border:3px solid '+(_cuTab===tb[0]?'var(--gold)':'var(--line)')+';background:var(--bg2);color:'+(_cuTab===tb[0]?'var(--gold)':'var(--muted)')+';font-size:11px;font-family:var(--font-body)">'+tb[1]+'</button>'; }).join('')+
    '</div><div style="display:flex;gap:6px;flex-wrap:wrap">';
  function listOpts(key,list,defVal){
    var cur=cu[key]||defVal;
    list.forEach(function(o){
      var lock=o[2], ok=unlocked(lock);
      h+=btn(cur===o[0],!ok,'var(--panel2)',"setHeroCust('"+key+"','"+o[0]+"')",(ok?'':'🔒 ')+o[1],ok?'':(REG_NAME[lock]+' 클리어 시 해금'));
    });
    var lockedOnes=list.filter(function(o){ return o[2]&&!unlocked(o[2]); });
    if(lockedOnes.length) h+='<div style="width:100%;font-size:10px;color:var(--muted)">🔒 '+lockedOnes.map(function(o){ return o[1]+'('+REG_NAME[o[2]]+' 보스 처치)'; }).join(' · ')+'</div>';
  }
  if(_cuTab==='style'){
    listOpts('style',STYLES,(CLASS_LOOK[id]||{}).style||id);
    if((CLASS_LOOK[id]||{}).outfit==='witch') h+='<div style="width:100%"></div>'+btn(!!cu.nohat,false,'var(--panel2)',"setHeroCust('nohat',"+(cu.nohat?"''":"'yes'")+")",cu.nohat?'🎩 마녀 모자 쓰기':'🎩 마녀 모자 벗기');
  }
  else if(_cuTab==='eyeType') listOpts('eyeType',EYES,'bright');
  else if(_cuTab==='expr') listOpts('expr',EXPRS,'confident');
  else if(_cuTab==='pose') listOpts('pose',POSES,'raise');
  else if(COLOR_TABS[_cuTab]){
    h+=btn(!cu[_cuTab],false,'linear-gradient(135deg,#888 45%,#fff 50%,#888 55%)',"setHeroCust('"+_cuTab+"','')",'기본');
    COLOR_TABS[_cuTab].forEach(function(cl){ h+=btn(cu[_cuTab]===cl,false,cl,"setHeroCust('"+_cuTab+"','"+cl+"')",''); });
    if(_cuTab==='cape') h+='<div style="width:100%;font-size:10px;color:var(--muted)">망토 코스튬을 장착했을 때만 보여요. 날개는 색이 바뀌지 않아요.</div>';
    if(_cuTab==='top') h+='<div style="width:100%;font-size:10px;color:var(--muted)">상의 색은 위쪽 "옷 염색"보다 우선 적용돼요.</div>';
  } else if(_cuTab==='sets'){
    var sets=G.guest?(localGet().__sets||{}):lookSets();
    [1,2,3].forEach(function(n){
      var has=!!sets[n];
      h+='<div style="display:flex;align-items:center;gap:6px;width:100%;background:var(--panel2);border:2px solid var(--line);border-radius:6px;padding:6px 8px">'+
        '<span style="flex:1;font-size:12px">👗 코디 '+n+(has?' <small style="color:var(--good)">저장됨</small>':' <small style="color:var(--muted)">비어 있음</small>')+'</span>'+
        '<button class="btn ghost" style="padding:6px 10px;font-size:11px" onclick="heroSaveSet('+n+')">지금 모습 저장</button>'+
        (has?'<button class="btn gold" style="padding:6px 10px;font-size:11px" onclick="heroLoadSet('+n+')">입기</button>':'')+'</div>';
    });
  }
  box.innerHTML=h+'</div>';
}
window.heroSaveSet=function(n){
  var c=stripSets(getCust());
  if(G.guest){ var l=localGet(); l.__sets=l.__sets||{}; l.__sets[n]=c; localSet(l); toast('👗 코디 '+n+' 저장!'); renderCustomUI(); return; }
  pushLook(c,n); toast('👗 코디 '+n+' 저장 중…');
};
window.heroLoadSet=function(n){
  var sets=G.guest?(localGet().__sets||{}):lookSets(); var c=sets[n]; if(!c) return;
  pushLook(JSON.parse(JSON.stringify(c)));
  if(typeof sfx==='function') sfx('relic'); toast('👗 코디 '+n+'(으)로 갈아입었어요!'); renderCustomUI();
};

/* 기기에만 있던 옛 꾸미기(v14~v20)를 서버로 한 번 옮기기 */
var _sync=syncFromSave, migrated=false;
syncFromSave=function(){
  _sync.apply(this,arguments);
  if(migrated||!G.save||G.guest||!G.hakbun) return;
  migrated=true;
  var s=serverLook(), l=stripSets(localGet());
  if((!s||!Object.keys(s).length)&&Object.keys(l).length) pushLook(l);
};

/* ═══════════════ 캐릭터 선택 화면 ═══════════════ */
/* chars/<id>.png 가 있으면 선택 화면에 일러스트를, 없으면 도트 쇼케이스를 보여준다 */
var ARTS={};
['taro','mir','hana','yuri','leon'].forEach(function(id){
  var im=new Image(), rec={img:im,ok:false}; ARTS[id]=rec;
  im.onload=function(){ rec.ok=true; };
  var tries=['chars/'+id+'.png?v=24', id+'.png?v=24'], ti=0;     // chars 폴더 → 없으면 저장소 첫 화면(루트)
  im.onerror=function(){ ti++; if(ti<tries.length) im.src=tries[ti]; else rec.ok=false; };
  im.src=tries[0];
});
drawSelBig=function(id){
  var c=document.getElementById('sel-big'); if(!c) return;
  c.width=190; c.height=250;
  var ch=(G.characters||[]).filter(function(x){ return x.id===id; })[0];
  var nm=document.getElementById('sel-name');
  if(nm) nm.innerHTML=ch?('<b>'+ch.name+'</b> · <span style="color:var(--energy)">'+(ch.job||ch.type||'')+'</span><br><span style="font-size:10px;color:var(--muted)">'+((STORY.charLine||{})[id]||'')+'</span>'):'';
  if(_selT) cancelAnimationFrame(_selT);
  var g=c.getContext('2d'), col=hexOf((STORY.charColor&&STORY.charColor[id])||'#9b7be0');
  (function anim(){
    if(!document.getElementById('sel-big')){ _selT=null; return; }
    var t=now(), fy=drawStage(g,c.width,c.height,col,t), art=ARTS[id];
    if(art&&art.ok){
      var hh=c.height-34, ww=art.img.width*hh/art.img.height, bob=Math.sin(t/600)*2;
      g.save(); g.imageSmoothingEnabled=true; g.drawImage(art.img,c.width/2-ww/2,fy+6-hh+bob,ww,hh); g.restore();
    } else drawShowcase(g,id,{},c.width/2,fy+3,1);
    _selT=requestAnimationFrame(anim);
  })();
};

function setVer(){ try{ var v=document.getElementById('ver'); if(v) v.textContent='빌드 v25 일러스트+장비'; }catch(e){} }
window.addEventListener('DOMContentLoaded',setVer); window.addEventListener('load',setVer);
})();
