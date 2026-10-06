/* ═══════════════════════════════════════════════════════════════
   아레테 사가 v35 접속 준비 + 속도 진단 (perf.js)
   ① 접속 준비: 첫 화면이 뜨면 서버(Apps Script)에 아주 가벼운 요청(ping)을 한 번 보내 둡니다.
      Apps Script는 한동안 안 쓰면 '잠들어' 있다가 첫 요청이 느린데, 학생이 아이디·비밀번호를
      입력하는 몇 초 동안 미리 깨워 두면 [접속하기]를 눌렀을 때 훨씬 빨리 들어갑니다.
   ② 속도 진단: 주소 끝에 ?perf=1 을 붙여 열면 왼쪽 위에 "어디가 느린지" 숫자로 보여 줍니다.
      (페이지 로딩·글꼴·큰 파일·서버 호출별 총 시간과 서버 처리 시간) — 평소에는 아무것도 보이지 않습니다.
   로드 순서: 가장 먼저(remaster.js보다 앞). 서버(Addon.gs v35)가 없어도 오류 없이 넘어갑니다.
   ═══════════════════════════════════════════════════════════════ */
(function(){
var T0=(window.performance&&performance.now)?performance.now():0;
var diag=/[?&]perf=1/.test(location.search); try{ if(diag) localStorage.setItem('cs_perf','1'); else if(/[?&]perf=0/.test(location.search)) localStorage.removeItem('cs_perf'); else diag=localStorage.getItem('cs_perf')==='1'; }catch(e){}
var LOG=[], marks=[], serverState=null;
function now(){ return performance.now(); }
function mark(name){ marks.push([name,Math.round(now())]); }

/* ① 서버 깨우기 — 첫 화면이 그려진 직후 한 번 */
function warm(){
  try{
    if(typeof API_URL==='undefined'||!API_URL) return;                 // 주소가 없으면 할 일 없음
    if(window.google&&google.script&&google.script.run) return;          // Apps Script 안에서 열었을 때는 불필요
    var t=now();
    fetch(API_URL,{method:'POST',body:JSON.stringify({fn:'ping',token:'',args:[]})})
      .then(function(r){ return r.json(); })
      .then(function(j){ serverState=!!(j&&j.ok&&typeof j._ms==='number'); LOG.push({fn:'ping(서버 깨우기)',total:Math.round(now()-t),server:j&&j._ms,ok:!!(j&&j.ok)}); render(); stamp(); })
      .catch(function(){ LOG.push({fn:'ping(서버 깨우기)',total:Math.round(now()-t),err:1}); render(); });
  }catch(e){}
}
setTimeout(warm,80);

/* ③ 설치 점검 + 버전 표시
   다른 파일들도 각자 '빌드 vNN'을 적어 두고, 페이지가 다 열릴 때 등록 순서대로 덮어쓰기 때문에
   마지막에 실행되는 옛 파일의 번호가 남아 있었습니다. 그래서 모든 파일이 끝난 뒤 한 번 더 확정해서 적습니다.
   각 파일이 '이번 버전에 맞는 기능'을 갖고 있는지 확인해서, 빠졌거나 옛 파일이면 알려 줍니다. */
var RELEASE='36';
var PROBES=[
  ['remaster.js',function(){ return !!window.RM; },'몬스터 움직임·조명'],
  ['art.js',function(){ return !!(window.ART&&ART.v>=29); },'도트 그래픽'],
  ['world.js',function(){ return typeof showPwModal==='function'; },'비밀번호 변경·월드'],
  ['hero.js',function(){ return !!window.HeroArt; },'캐릭터 일러스트(v34 이상)'],
  ['fx.js',function(){ return !!(window.FX&&FX.v>=32); },'전투 연출·몬스터 난이도(v32 이상)'],
  ['skills.js',function(){ return !!(window.SKILLS&&SKILLS.statLine); },'스킬트리'],
  ['audio.js',function(){ return !!window.AU; },'배경음·효과음'],
  ['battle.js',function(){ return !!window.BATTLE; },'퀴즈 전투 화면'],
  ['codex.js',function(){ return !!window.CODEX; },'도감·업적']
];
var CHECK=[];
function runCheck(){
  CHECK=PROBES.map(function(p){ var ok=false; try{ ok=!!p[1](); }catch(e){} return {name:p[0],ok:ok,hint:p[2]}; });
  CHECK.push({name:'서버(Addon.gs)',ok:serverState===true,hint:'새 버전으로 배포 필요',unknown:serverState===null});
  return CHECK;
}
function badList(){ return runCheck().filter(function(c){ return !c.ok&&!c.unknown; }); }
function stamp(){
  try{
    var v=document.getElementById('ver'); if(!v) return;
    var bad=badList();
    v.textContent='빌드 v'+RELEASE+(bad.length?' ⚠ 점검':'');
    v.style.pointerEvents='auto';
    v.onclick=function(){
      var b=badList();
      var msg=b.length?('⚠ 최신이 아닌 파일: <b>'+b.map(function(x){ return x.name; }).join(', ')+'</b><br><small>파일을 다시 올리고 index.html 번호를 올렸는지 확인해 주세요</small>'):'✔ 모든 파일이 최신이에요 (v'+RELEASE+')';
      if(typeof toast==='function') toast(msg);
    };
  }catch(e){}
}
window.addEventListener('load',function(){ setTimeout(stamp,700); setTimeout(stamp,2600); setTimeout(guard,900); });   // 다른 파일의 표시가 끝난 뒤에 확정
/** 다른 코드가 나중에 다시 덮어써도(로그인 후 등) 바로 원래대로 되돌린다 */
var guarding=false;
function guard(){
  try{
    var v=document.getElementById('ver'); if(!v||guarding||!window.MutationObserver) return; guarding=true;
    new MutationObserver(function(){ var want='빌드 v'+RELEASE+(badList().length?' ⚠ 점검':''); if(v.textContent!==want) v.textContent=want; })
      .observe(v,{childList:true,characterData:true,subtree:true});
  }catch(e){}
}

/* ② 진단 (?perf=1 일 때만) */
if(!diag) return;
mark('perf.js 시작');
function wrapSrv(){
  if(typeof srv!=='function'||srv.__perf) return;
  var _s=srv;
  srv=function(fn){
    var t=now(), name=fn;
    var p=_s.apply(this,arguments);
    if(!p||!p.then) return p;
    return p.then(function(r){ LOG.push({fn:name,total:Math.round(now()-t),server:r&&r._ms,ok:!r||r.ok!==false}); render(); return r; },
                  function(e){ LOG.push({fn:name,total:Math.round(now()-t),err:1}); render(); throw e; });
  };
  srv.__perf=1;
}
wrapSrv();
document.addEventListener('DOMContentLoaded',function(){ mark('화면 구성 완료(DOMContentLoaded)'); wrapSrv(); build(); });
window.addEventListener('load',function(){ mark('모든 파일 로드 완료(load)'); wrapSrv(); render(); });
try{ if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ mark('글꼴 준비 완료'); render(); }); }catch(e){}

var box=null, body=null;
function build(){
  if(box) return;
  box=document.createElement('div');
  box.style.cssText='position:fixed;left:4px;top:4px;z-index:99999;width:min(330px,94vw);max-height:80vh;overflow:auto;background:rgba(10,6,20,.92);color:#e8e8ff;border:2px solid #ffca4b;border-radius:8px;padding:8px 9px;font:11px/1.55 monospace;white-space:pre-wrap;word-break:break-all';
  var bar=document.createElement('div'); bar.style.cssText='display:flex;gap:6px;margin-bottom:5px;font:bold 11px sans-serif';
  bar.innerHTML='<span style="flex:1;color:#ffca4b">⏱ 속도 진단</span>';
  [['복사',function(){ var t=text(); try{ navigator.clipboard.writeText(t); }catch(e){ var ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e2){} ta.remove(); } this.textContent='복사됨 ✔'; }],
   ['접기',function(){ body.style.display=body.style.display==='none'?'block':'none'; }],
   ['끄기',function(){ try{ localStorage.removeItem('cs_perf'); }catch(e){} box.remove(); box=null; }]].forEach(function(b){
    var el=document.createElement('button'); el.textContent=b[0]; el.style.cssText='background:#271e3d;color:#fff;border:1px solid #4a3a6e;border-radius:5px;padding:2px 8px;font:11px sans-serif'; el.onclick=b[1]; bar.appendChild(el); });
  body=document.createElement('div'); box.appendChild(bar); box.appendChild(body); document.body.appendChild(box);
  render();
}
function kb(n){ return n?Math.round(n/1024)+'KB':'?'; }
function text(){
  var out=['perf.js v'+RELEASE+'  (이 줄과 아래 [설치 점검]이 보이면 최신 perf.js입니다)'], nav=(performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||null;
  out.push('[페이지] '+(navigator.connection&&navigator.connection.effectiveType?('네트워크 '+navigator.connection.effectiveType+' · '):'')+(window.innerWidth+'×'+window.innerHeight));
  marks.forEach(function(m){ out.push('  '+String(m[1]).padStart(6)+'ms  '+m[0]); });
  if(nav) out.push('  HTML 받기 끝 '+Math.round(nav.responseEnd)+'ms · 문서 해석 끝 '+Math.round(nav.domContentLoadedEventEnd)+'ms');
  var res=(performance.getEntriesByType?performance.getEntriesByType('resource'):[]).filter(function(r){ return !/script\.google|googleusercontent/.test(r.name); });
  res.sort(function(a,b){ return b.duration-a.duration; });
  out.push('[오래 걸린 파일 상위 6개]');
  res.slice(0,6).forEach(function(r){ var n=r.name.replace(/^https?:\/\//,'').split('?')[0]; if(n.length>44) n='…'+n.slice(-43); out.push('  '+String(Math.round(r.duration)).padStart(5)+'ms  '+kb(r.transferSize||r.encodedBodySize)+'  '+n); });
  var tot=0; res.forEach(function(r){ tot+=(r.transferSize||r.encodedBodySize||0); }); out.push('  받은 파일 합계 약 '+kb(tot)+' ('+res.length+'개)');
  out.push('[설치 점검] 빌드 v'+RELEASE);
  runCheck().forEach(function(c){ out.push('  '+(c.ok?'✔':(c.unknown?'…':'✘'))+' '+c.name+(c.ok?'':'  ← '+(c.unknown?'확인 중':'없거나 예전 파일: '+c.hint))); });
  out.push('[서버 호출]  총 = 서버 처리 + 네트워크·대기');
  if(!LOG.length) out.push('  (아직 없음 — 로그인 등을 해 보세요)');
  LOG.slice(-14).forEach(function(l){
    if(l.err){ out.push('  '+l.fn+'  실패 '+l.total+'ms'); return; }
    var s=(typeof l.server==='number')?l.server:null;
    out.push('  '+l.fn.padEnd(16).slice(0,16)+' 총 '+String(l.total).padStart(5)+'ms'+(s===null?'  (서버 시간 없음: 서버를 새 버전으로 배포했는지 확인)':' = 서버 '+s+'ms + 네트워크·대기 '+Math.max(0,l.total-s)+'ms'));
  });
  return out.join('\n');
}
function render(){ if(body) body.textContent=text(); }
window.PERF={text:text,log:LOG,marks:marks,check:function(){ return runCheck(); }};
})();
