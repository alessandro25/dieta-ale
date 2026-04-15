/* =============================================
   DIETA ALE v4.4 — APP LOGIC
   Safari iOS compatible: NO ?. ?? ||= ??=
   Depends on: database.js (FOOD_DB, DEF_S, DEF_GYM, DEF_REST)
   v4.2: editable nutrients, agenda planning, corr alert,
         add food post-complete, enhanced bolo2 alert
   v4.3: portions, delete meal+insulin confirm, UX
   v4.4: recent/frequent foods, view bolo post-confirm,
         split % editable in bolo modal, B2 FPU confirm to IOB
   ============================================= */

/* ---------- HELPERS ---------- */
function $(id){return document.getElementById(id)}
function qsa(s){return document.querySelectorAll(s)}
function pad(n){return n<10?'0'+n:''+n}
function r1(n){return Math.round(n*10)/10}
function r2(n){return Math.round(n*100)/100}
function todayStr(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function dateLbl(ds){
  if(!ds)return'';
  var p=ds.split('-');
  var mo=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return parseInt(p[2])+' '+mo[parseInt(p[1])-1]+' '+p[0];
}
function lsG(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
function lsS(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function deepCopy(o){return JSON.parse(JSON.stringify(o))}

/* ---------- STATE ---------- */
var S={};      // settings
var D={};      // diary data per date key
var diets={};  // named diets
var actDiet='Cut';
var cFoods=[]; // custom foods
var curPg='home';
var calY,calM; // calendar state
var editIdx=-1;
var editCtx=''; // 'oggi' or 'piano'
var tmpFoods=[];
var selFood=null;
var pianoDT='gym';
var reList=[];
var reCtx='';
var selCat='';
var glyChart=null;
var bcStream=null;
var ringCharts=[];
var agendaEditDay='';

/* ---------- APP NAMESPACE ---------- */
var A={};

/* ---------- NOTIFY ---------- */
A.notify=function(msg){
  var b=$('nbar');
  b.textContent=msg;
  b.classList.add('show');
  setTimeout(function(){b.classList.remove('show')},2500);
};

/* ---------- NAVIGATION ---------- */
A.go=function(id){
  var pages=qsa('.page');
  for(var i=0;i<pages.length;i++) pages[i].classList.remove('on');
  $('pg-'+id).classList.add('on');

  var tabs=qsa('.tabbar .tab');
  var ids=['home','oggi','agenda','piano','diario','set'];
  for(var j=0;j<tabs.length;j++) tabs[j].classList.remove('on');
  var idx=ids.indexOf(id);
  if(idx>=0) tabs[idx].classList.add('on');

  curPg=id;
  if(id==='home') A.rHome();
  if(id==='oggi') A.rOggi();
  if(id==='agenda') A.rAgenda();
  if(id==='piano') A.rPiano();
  if(id==='diario') A.rDiario();
};

/* ---------- FOOD UTILS ---------- */
function allFoods(){return FOOD_DB.concat(cFoods)}
function findF(name){
  var a=allFoods();
  for(var i=0;i<a.length;i++){if(a[i].n===name)return a[i]}
  return null;
}
function fuzzy(q,t){
  q=q.toLowerCase();t=t.toLowerCase();
  if(t.indexOf(q)>=0)return true;
  var qi=0;
  for(var ti=0;ti<t.length&&qi<q.length;ti++){if(t[ti]===q[qi])qi++}
  return qi===q.length;
}
function safeNum(v){var n=parseFloat(v);return isNaN(n)?0:n}
function dbCA(o){return o.ca!==undefined?safeNum(o.ca):(typeof o.c==='number'?safeNum(o.c):0)}
function dbK(o){return o.k!==undefined?safeNum(o.k):0}
function dbF(o){return o.f!==undefined?safeNum(o.f):(o.fat!==undefined?safeNum(o.fat):0)}
function dbP(o){return o.p!==undefined?safeNum(o.p):(o.prot!==undefined?safeNum(o.prot):0)}
function dbFi(o){return o.fi!==undefined?safeNum(o.fi):0}
function calcM(foods){
  var m={kcal:0,carb:0,prot:0,fat:0,fiber:0};
  for(var i=0;i<foods.length;i++){
    var fd=findF(foods[i].n);
    if(!fd)continue;
    var r=safeNum(foods[i].g)/100;
    var ov=foods[i].ov;
    var k=ov&&ov.k!==undefined?safeNum(ov.k):dbK(fd);
    var ca=ov&&ov.ca!==undefined?safeNum(ov.ca):dbCA(fd);
    var p=ov&&ov.p!==undefined?safeNum(ov.p):dbP(fd);
    var f=ov&&ov.f!==undefined?safeNum(ov.f):dbF(fd);
    var fi=ov&&ov.fi!==undefined?safeNum(ov.fi):dbFi(fd);
    m.kcal+=k*r;m.carb+=ca*r;m.prot+=p*r;m.fat+=f*r;m.fiber+=fi*r;
  }
  return{kcal:r1(m.kcal),carb:r1(m.carb),prot:r1(m.prot),fat:r1(m.fat),fiber:r1(m.fiber)};
}

/* ---------- DAY TYPE ---------- */
function getDT(ds){var dd=D[ds];if(dd&&dd.dayType)return dd.dayType;return'gym'}
function setDT(ds,t){if(!D[ds])D[ds]={};D[ds].dayType=t;save()}
function todayDT(){return getDT(todayStr())}

/* ---------- DIET / PLAN ---------- */
function actD(){return diets[actDiet]||{gym:deepCopy(DEF_GYM),rest:deepCopy(DEF_REST)}}
function planM(dt){var d=actD();return dt==='gym'?(d.gym||[]):(d.rest||[])}
function todayMeals(){
  var ds=todayStr();var dd=D[ds];
  if(dd&&dd.meals)return dd.meals;
  return deepCopy(planM(todayDT()));
}

/* ---------- BOLUS CALC ---------- */
function calcBolus(foods,gly){
  var m=calcM(foods);
  var cb=m.carb/S.icr;
  var corr=0;
  if(gly&&gly>S.target) corr=(gly-S.target)/S.isf;
  var b1=r2(cb+corr);
  if(b1<0)b1=0;
  var b1a=b1,b1b=0;
  if(S.splitBolus){
    var pa=(S.splitStart||60)/100;
    var pb=(S.splitEnd||40)/100;
    b1a=r2(b1*pa);b1b=r2(b1*pb);
  }
  var fpu=m.fat+m.prot;
  var b2=r2(fpu/S.gpr);
  return{cb:r2(cb),corr:r2(corr),b1:b1,b1a:b1a,b1b:b1b,b2:b2,m:m,split:S.splitBolus};
}

/* ---------- IOB (linear decay) ---------- */
function calcIOB(){
  var dd=D[todayStr()];
  if(!dd||!dd.boluses)return 0;
  var now=Date.now();
  var diaMs=(S.dia||135)*60000;
  var tot=0;
  for(var i=0;i<dd.boluses.length;i++){
    var b=dd.boluses[i];
    var el=now-b.time;
    if(el>=0&&el<diaMs) tot+=b.units*(1-el/diaMs);
  }
  return r2(tot);
}

function lastGly(){
  var dd=D[todayStr()];
  if(dd&&dd.glycemia&&dd.glycemia.length>0) return dd.glycemia[dd.glycemia.length-1].value;
  return null;
}

/* ---------- SAVE SYSTEM ---------- */
function save(){
  lsS('dp_s',S);lsS('dp_d',D);
  lsS('dp_diets',diets);lsS('dp_active',actDiet);
  lsS('dp_cfood',cFoods);
}

function loadSettings(){
  $('s-isf').value=S.isf;$('s-icr').value=S.icr;
  $('s-tgt').value=S.target;$('s-dia').value=S.dia;
  $('s-gpr').value=S.gpr;
  $('s-sp1').value=S.splitStart||60;
  $('s-sp2').value=S.splitEnd||40;
  $('s-rdel').value=S.reminderDelay||150;
  var st=$('s-spl');
  if(S.splitBolus){st.classList.add('on')}else{st.classList.remove('on')}
  $('spl-set').style.display=S.splitBolus?'block':'none';
  var rt=$('s-rem');
  if(S.reminder){rt.classList.add('on')}else{rt.classList.remove('on')}
  var ct=$('s-corr');
  if(ct){if(S.corrNotify){ct.classList.add('on')}else{ct.classList.remove('on')}}
  var b2t=$('s-b2a');
  if(b2t){if(S.b2alert!==false){b2t.classList.add('on')}else{b2t.classList.remove('on')}}
}

function readSettings(){
  var v;
  v=parseFloat($('s-isf').value);if(!isNaN(v))S.isf=v;
  v=parseFloat($('s-icr').value);if(!isNaN(v))S.icr=v;
  v=parseFloat($('s-tgt').value);if(!isNaN(v))S.target=v;
  v=parseFloat($('s-dia').value);if(!isNaN(v))S.dia=v;
  v=parseFloat($('s-gpr').value);if(!isNaN(v))S.gpr=v;
  v=parseFloat($('s-sp1').value);if(!isNaN(v))S.splitStart=v;
  v=parseFloat($('s-sp2').value);if(!isNaN(v))S.splitEnd=v;
  v=parseFloat($('s-rdel').value);if(!isNaN(v))S.reminderDelay=v;
}

A.tglSplit=function(){
  S.splitBolus=!S.splitBolus;
  var st=$('s-spl');
  if(S.splitBolus){st.classList.add('on')}else{st.classList.remove('on')}
  $('spl-set').style.display=S.splitBolus?'block':'none';
  save();
};

A.tglRem=function(){
  S.reminder=!S.reminder;
  var rt=$('s-rem');
  if(S.reminder){rt.classList.add('on')}else{rt.classList.remove('on')}
  save();
};

A.tglCorr=function(){
  S.corrNotify=!S.corrNotify;
  var ct=$('s-corr');
  if(S.corrNotify){ct.classList.add('on')}else{ct.classList.remove('on')}
  save();
};

A.tglB2A=function(){
  if(S.b2alert===false){S.b2alert=true}else{S.b2alert=false}
  var bt=$('s-b2a');
  if(S.b2alert!==false){bt.classList.add('on')}else{bt.classList.remove('on')}
  save();
};

/* ---------- DOUGHNUT RING CHARTS ---------- */
function drawRing(canvasId,val,max,color,label){
  var cvs=$(canvasId);
  if(!cvs)return null;
  var pct=max>0?Math.min(val/max,1):0;
  var remain=1-pct;
  if(typeof Chart==='undefined')return null;

  var chart=new Chart(cvs.getContext('2d'),{
    type:'doughnut',
    data:{
      datasets:[{
        data:[pct,remain],
        backgroundColor:[color,'rgba(42,42,54,0.5)'],
        borderWidth:0
      }]
    },
    options:{
      responsive:false,
      cutout:'78%',
      rotation:-90,
      circumference:360,
      plugins:{tooltip:{enabled:false},legend:{display:false}},
      animation:{duration:600}
    }
  });
  return chart;
}

function destroyRings(){
  for(var i=0;i<ringCharts.length;i++){
    if(ringCharts[i])ringCharts[i].destroy();
  }
  ringCharts=[];
}

/* ---------- HOME ---------- */
A.rHome=function(){
  var ds=todayStr();
  var dn=['Domenica','Lunedi','Martedi','Mercoledi','Giovedi','Venerdi','Sabato'];
  var now=new Date();
  $('h-date').textContent=dn[now.getDay()]+' '+dateLbl(ds);
  var dt=todayDT();
  var bg=$('h-badge');
  bg.textContent=dt.toUpperCase();
  bg.className='badge '+(dt==='gym'?'badge-g':'badge-b');

  // IOB
  $('h-iob').textContent=calcIOB().toFixed(1)+' U';

  // Macros
  var meals=todayMeals();
  var tot={kcal:0,carb:0,prot:0,fat:0};
  var ate={kcal:0,carb:0,prot:0,fat:0};
  var dd=D[ds];
  for(var i=0;i<meals.length;i++){
    var mm=calcM(meals[i].foods);
    tot.kcal+=mm.kcal;tot.carb+=mm.carb;tot.prot+=mm.prot;tot.fat+=mm.fat;
    if(dd&&dd.consumed&&dd.consumed[i]){
      ate.kcal+=mm.kcal;ate.carb+=mm.carb;ate.prot+=mm.prot;ate.fat+=mm.fat;
    }
  }

  // Ring charts (P, C, G)
  destroyRings();
  var rh='<div class="ring-box"><canvas id="rng-p" width="80" height="80"></canvas>';
  rh+='<div class="ring-val" style="color:#64D68A">'+r1(ate.prot)+'g</div>';
  rh+='<div class="ring-lbl">Proteine</div></div>';
  rh+='<div class="ring-box"><canvas id="rng-c" width="80" height="80"></canvas>';
  rh+='<div class="ring-val" style="color:#FBBC2C">'+r1(ate.carb)+'g</div>';
  rh+='<div class="ring-lbl">Carboidrati</div></div>';
  rh+='<div class="ring-box"><canvas id="rng-f" width="80" height="80"></canvas>';
  rh+='<div class="ring-val" style="color:#A78BFA">'+r1(ate.fat)+'g</div>';
  rh+='<div class="ring-lbl">Grassi</div></div>';
  $('h-rings').innerHTML=rh;

  // draw rings after DOM updated
  setTimeout(function(){
    var c1=drawRing('rng-p',ate.prot,tot.prot,'#64D68A','P');
    var c2=drawRing('rng-c',ate.carb,tot.carb,'#FBBC2C','C');
    var c3=drawRing('rng-f',ate.fat,tot.fat,'#A78BFA','G');
    if(c1)ringCharts.push(c1);
    if(c2)ringCharts.push(c2);
    if(c3)ringCharts.push(c3);
  },50);

  // Bars
  var bars=[
    {l:'Calorie',c:ate.kcal,t:tot.kcal,cl:'#64D68A'},
    {l:'Carboidrati',c:ate.carb,t:tot.carb,cl:'#FBBC2C'},
    {l:'Proteine',c:ate.prot,t:tot.prot,cl:'#6B94F0'},
    {l:'Grassi',c:ate.fat,t:tot.fat,cl:'#A78BFA'}
  ];
  var bh='';
  for(var b=0;b<bars.length;b++){
    var pct=bars[b].t>0?Math.min(100,(bars[b].c/bars[b].t)*100):0;
    bh+='<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:12px;color:#9898A6"><span>'+bars[b].l+'</span><span>'+r1(bars[b].c)+'/'+r1(bars[b].t)+'</span></div>';
    bh+='<div class="pbar"><div class="fill" style="width:'+pct+'%;background:'+bars[b].cl+'"></div></div></div>';
  }
  $('h-bars').innerHTML=bh;

  // Next meal
  var nowMin=now.getHours()*60+now.getMinutes();
  var nextMeal=null,nextIdx=-1;
  for(var j=0;j<meals.length;j++){
    if(dd&&dd.consumed&&dd.consumed[j])continue;
    var tp=meals[j].time.split(':');
    var mMin=parseInt(tp[0])*60+parseInt(tp[1]);
    if(mMin>=nowMin-30){nextMeal=meals[j];nextIdx=j;break}
  }

  if(nextMeal){
    var nm=calcM(nextMeal.foods);
    $('h-next').innerHTML='<div style="font-size:17px;font-weight:700;margin-bottom:4px">'+nextMeal.name+' — '+nextMeal.time+'</div>'+
      '<div style="font-size:13px;color:#9898A6">'+r1(nm.kcal)+' kcal · C '+r1(nm.carb)+'g · P '+r1(nm.prot)+'g · G '+r1(nm.fat)+'g</div>'+
      '<div style="display:flex;gap:8px;margin-top:10px">'+
      '<button class="btn btn-sm btn-bl" onclick="A.showBolo('+nextIdx+')">💉 Calcola Bolo</button>'+
      '<button class="btn btn-sm btn-g" onclick="A.go(\'oggi\')">📋 Vai a Oggi</button></div>';

    var gly=lastGly();
    var bo=calcBolus(nextMeal.foods,gly);
    var bhtml='<div class="bolo">';
    if(bo.split){
      bhtml+='<div class="brow"><span class="blbl">Bolo 1a — '+(S.splitStart||60)+'% inizio pasto</span><span class="bval" style="color:#64D68A">'+bo.b1a.toFixed(1)+' U</span></div>';
      bhtml+='<div class="brow"><span class="blbl">Bolo 1b — '+(S.splitEnd||40)+'% fine pasto</span><span class="bval" style="color:#FBBC2C">'+bo.b1b.toFixed(1)+' U</span></div>';
    }else{
      bhtml+='<div class="brow"><span class="blbl">Bolo 1 (Carb + Corr)</span><span class="bval" style="color:#64D68A">'+bo.b1.toFixed(1)+' U</span></div>';
    }
    bhtml+='<div class="brow"><span class="blbl">Bolo 2 FPU — dopo '+(S.reminderDelay||150)+' min</span><span class="bval" style="color:#A78BFA">'+bo.b2.toFixed(1)+' U</span></div>';
    if(bo.corr>0) bhtml+='<div style="font-size:11px;color:#6B6B7A;margin-top:4px">Correzione: +'+ bo.corr.toFixed(2)+' U ('+(gly||'?')+' → '+S.target+')</div>';
    bhtml+='</div>';
    $('h-bolo').innerHTML=bhtml;
  }else{
    $('h-next').innerHTML='<div style="color:#6B6B7A;text-align:center;padding:16px">Tutti i pasti completati! 🎉</div>';
    $('h-bolo').innerHTML='';
  }
};

/* ---------- OGGI ---------- */
A.rOggi=function(){
  var ds=todayStr();
  var dt=todayDT();
  $('o-dtype').innerHTML=
    '<button class="'+(dt==='gym'?'og':'')+'" onclick="A.setTodDT(\'gym\')">🏋️ GYM</button>'+
    '<button class="'+(dt==='rest'?'ob':'')+'" onclick="A.setTodDT(\'rest\')">😴 RIPOSO</button>';

  var meals=todayMeals();
  var dd=D[ds]||{};
  var con=dd.consumed||{};
  var h='';
  for(var i=0;i<meals.length;i++){
    var ml=meals[i];var m=calcM(ml.foods);
    var dn=con[i];
    h+='<div class="mc'+(dn?' done':'')+'" data-mi="'+i+'">';
    h+='<div class="swipe-bar"></div>';
    h+='<div style="display:flex;align-items:center;justify-content:space-between">';
    h+='<div><div class="mn">'+ml.name+'</div><div class="mt">'+ml.time+'</div></div>';
    h+='<div style="display:flex;gap:6px">';
    if(!dn){h+='<button class="btn btn-sm btn-g" onclick="A.togMeal('+i+',true)">✓</button>'}
    else{h+='<button class="btn btn-sm btn-o" onclick="A.togMeal('+i+',false)">↩️</button>'}
    h+='</div></div>';
    h+='<div class="mm">';
    h+='<span style="color:#64D68A">'+r1(m.kcal)+' kcal</span>';
    h+='<span style="color:#FBBC2C">C '+r1(m.carb)+'g</span>';
    h+='<span style="color:#6B94F0">P '+r1(m.prot)+'g</span>';
    h+='<span style="color:#A78BFA">G '+r1(m.fat)+'g</span></div>';
    h+='<div class="mf">';
    for(var f=0;f<ml.foods.length;f++){
      h+=ml.foods[f].n+' '+ml.foods[f].g+'g';
      if(f<ml.foods.length-1)h+='<br>';
    }
    h+='</div><div class="ma">';
    h+='<button class="btn btn-sm btn-o" onclick="A.editOggi('+i+')">✏️ Modifica</button>';
    if(!dn) h+='<button class="btn btn-sm btn-bl" onclick="A.showBolo('+i+')">💉 Bolo</button>';
    if(dn) h+='<button class="btn btn-sm btn-bl" onclick="A.viewBolo('+i+')">👁 Bolo</button>';
    /* B1b pending button */
    if(dn&&dd.pendingB1b&&dd.pendingB1b[''+i]){
      var pb1b=dd.pendingB1b[''+i];
      h+='<button class="btn btn-sm" style="background:rgba(251,188,44,.2);color:#FBBC2C;font-weight:700" onclick="A.confirmB1b('+i+')">💉 B1b Fine Pasto: '+pb1b.units.toFixed(1)+' U</button>';
    }
    if(dn) h+='<button class="btn btn-sm btn-v" onclick="A.addExtraFood('+i+')">+ Aggiungi Cibo</button>';
    h+='<button class="btn btn-sm" style="background:rgba(239,107,107,.15);color:#EF6B6B" onclick="A.delTodayMeal('+i+')">🗑️</button>';
    h+='</div></div>';
  }
  $('o-meals').innerHTML=h;
  setupSwipe();
};

A.setTodDT=function(t){
  var ds=todayStr();
  setDT(ds,t);
  if(!D[ds])D[ds]={};
  D[ds].meals=deepCopy(planM(t));
  D[ds].consumed={};
  save();A.rOggi();A.rHome();
};

A.togMeal=function(i,done){
  var ds=todayStr();
  if(!D[ds])D[ds]={};
  if(!D[ds].consumed)D[ds].consumed={};
  if(done){
    D[ds].consumed[i]=true;
  }else{delete D[ds].consumed[i]}
  save();A.rOggi();A.rHome();
};

/* ---------- DELETE TODAY MEAL ---------- */
A.delTodayMeal=function(i){
  var ds=todayStr();
  if(!D[ds])D[ds]={};
  if(!D[ds].meals)D[ds].meals=deepCopy(todayMeals());
  var ml=D[ds].meals[i];
  if(!ml)return;
  var con=D[ds].consumed&&D[ds].consumed[i];

  if(!confirm('Eliminare "'+ml.name+'"?'))return;

  /* Check for associated bolus if meal was completed */
  if(con&&D[ds].boluses&&D[ds].boluses.length>0){
    var bo=calcBolus(ml.foods,null);
    if(bo.b1>0){
      if(confirm('Vuoi rimuovere anche il bolo ('+bo.b1.toFixed(1)+' U) dall\'insulina attiva?')){
        /* Remove the bolus closest to this meal's insulin amount */
        var found=-1;
        for(var b=D[ds].boluses.length-1;b>=0;b--){
          if(Math.abs(D[ds].boluses[b].units-bo.b1)<0.05){found=b;break}
        }
        if(found>=0) D[ds].boluses.splice(found,1);
        A.notify('Pasto e bolo eliminati ✓');
      }else{
        A.notify('Pasto eliminato, bolo mantenuto');
      }
    }
  }else{
    A.notify('Pasto eliminato ✓');
  }

  /* Remove meal and shift consumed indexes */
  D[ds].meals.splice(i,1);
  if(D[ds].consumed){
    var newCon={};
    var ks=Object.keys(D[ds].consumed);
    for(var c=0;c<ks.length;c++){
      var ci=parseInt(ks[c]);
      if(ci<i) newCon[ci]=true;
      if(ci>i) newCon[ci-1]=true;
    }
    D[ds].consumed=newCon;
  }
  save();A.rOggi();A.rHome();
};

/* ---------- ADD EXTRA FOOD TO COMPLETED MEAL ---------- */
var extraMealIdx=-1;
var extraOldMacros=null;

A.addExtraFood=function(i){
  extraMealIdx=i;
  var ds=todayStr();
  if(!D[ds]||!D[ds].meals)return;
  var ml=D[ds].meals[i];if(!ml)return;
  extraOldMacros=calcM(ml.foods);
  editIdx=i;editCtx='oggi';
  $('me-title').textContent='Aggiungi a — '+ml.name;
  $('me-name').value=ml.name;
  $('me-time').value=ml.time;
  tmpFoods=deepCopy(ml.foods);
  rEditFoods();A.openMdl('m-edit');
};

A.saveGly=function(){
  var val=parseInt($('i-gly').value);
  if(isNaN(val)||val<30||val>600){A.notify('Valore non valido');return}
  var ds=todayStr();
  if(!D[ds])D[ds]={};
  if(!D[ds].glycemia)D[ds].glycemia=[];
  D[ds].glycemia.push({time:Date.now(),value:val});
  save();$('i-gly').value='';
  A.notify('Glicemia: '+val+' mg/dL');
  A.rHome();
  /* Mod 3: Correction bolus alert */
  if(S.corrNotify&&val>S.target){
    var corr=r2((val-S.target)/S.isf);
    setTimeout(function(){
      A.showCorrAlert(val,corr);
    },600);
  }
};

/* ---------- CORRECTION ALERT ---------- */
A.showCorrAlert=function(gly,corr){
  var iob=calcIOB();
  var net=r2(corr-iob);if(net<0)net=0;
  var h='<div style="text-align:center;margin-bottom:12px">';
  h+='<div style="font-size:42px;margin-bottom:4px">⚠️</div>';
  h+='<div style="font-size:18px;font-weight:700;color:#FBBC2C">Glicemia Alta</div></div>';
  h+='<div style="background:#24242E;border-radius:12px;padding:14px;margin-bottom:10px">';
  h+='<div class="brow"><span class="blbl">Glicemia attuale</span><span class="bval" style="color:#EF6B6B">'+gly+' mg/dL</span></div>';
  h+='<div class="brow"><span class="blbl">Target</span><span class="bval" style="color:#64D68A">'+S.target+' mg/dL</span></div>';
  h+='<div style="height:1px;background:#2A2A36;margin:6px 0"></div>';
  h+='<div class="brow"><span class="blbl">Correzione calcolata</span><span class="bval" style="color:#FBBC2C">'+corr.toFixed(2)+' U</span></div>';
  if(iob>0){
    h+='<div class="brow"><span class="blbl">IOB attivo</span><span class="bval" style="color:#6B94F0">-'+iob.toFixed(2)+' U</span></div>';
    h+='<div class="brow"><span class="blbl">Correzione netta</span><span class="bval" style="color:#64D68A">'+net.toFixed(2)+' U</span></div>';
  }
  h+='</div>';
  h+='<div style="font-size:11px;color:#6B6B7A;text-align:center">Formula: ('+gly+' - '+S.target+') / '+S.isf+' = '+corr.toFixed(2)+' U</div>';
  $('corr-detail').innerHTML=h;
  A.openMdl('m-corr');
};

/* ---------- SWIPE TO COMPLETE ---------- */
function setupSwipe(){
  var cards=qsa('#o-meals .mc');
  for(var i=0;i<cards.length;i++){
    (function(card){
      var sx=0;
      card.addEventListener('touchstart',function(e){
        var t=e.touches[0];sx=t.clientX;
      },{passive:true});
      card.addEventListener('touchmove',function(e){
        var dx=e.touches[0].clientX-sx;
        var bar=card.querySelector('.swipe-bar');
        if(dx>10&&bar){
          bar.style.width=Math.min(dx,card.offsetWidth)+'px';
          if(dx>50) card.classList.add('swiping');
        }
      },{passive:true});
      card.addEventListener('touchend',function(e){
        var ex=e.changedTouches[0].clientX;
        var dx=ex-sx;
        var bar=card.querySelector('.swipe-bar');
        card.classList.remove('swiping');
        if(bar) bar.style.width='0';
        if(dx>=100){
          var mi=parseInt(card.getAttribute('data-mi'));
          if(!isNaN(mi)){
            card.classList.add('swipe-done');
            if(navigator.vibrate) navigator.vibrate(50);
            setTimeout(function(){A.togMeal(mi,true)},300);
          }
        }
      },{passive:true});
    })(cards[i]);
  }
}

/* ---------- BOLUS DETAIL ---------- */
var _boloTmpSplitA=60;
var _boloTmpSplitB=40;

function renderBoloContent(ml,gly,splitA,splitB){
  var bo=calcBolus(ml.foods,gly);
  /* Override split with temp values */
  if(bo.split){
    bo.b1a=r2(bo.b1*(splitA/100));
    bo.b1b=r2(bo.b1*(splitB/100));
  }
  var h='<div style="font-size:17px;font-weight:700;margin-bottom:12px">'+ml.name+'</div>';
  h+='<div style="font-size:13px;color:#9898A6;margin-bottom:12px">C '+bo.m.carb+'g · P '+bo.m.prot+'g · G '+bo.m.fat+'g';
  if(gly) h+=' · Glicemia: '+gly+' mg/dL';
  h+='</div><div class="bolo">';
  if(bo.split){
    h+='<div class="brow"><span class="blbl">Bolo 1a — '+splitA+'% INIZIO</span><span class="bval" style="color:#64D68A">'+bo.b1a.toFixed(2)+' U</span></div>';
    h+='<div class="brow"><span class="blbl">Bolo 1b — '+splitB+'% FINE</span><span class="bval" style="color:#FBBC2C">'+bo.b1b.toFixed(2)+' U</span></div>';
    h+='<div style="font-size:11px;color:#6B6B7A;padding:4px 0">Totale B1: '+bo.b1.toFixed(2)+' U (carb '+bo.cb.toFixed(2)+' + corr '+bo.corr.toFixed(2)+')</div>';
  }else{
    h+='<div class="brow"><span class="blbl">Bolo 1 (Carb+Corr)</span><span class="bval" style="color:#64D68A">'+bo.b1.toFixed(2)+' U</span></div>';
  }
  h+='<div style="height:1px;background:#2A2A36;margin:8px 0"></div>';
  h+='<div class="brow"><span class="blbl">Bolo 2 FPU — dopo '+(S.reminderDelay||150)+' min</span><span class="bval" style="color:#A78BFA">'+bo.b2.toFixed(2)+' U</span></div>';
  h+='<div style="font-size:11px;color:#6B6B7A">FPU: ('+bo.m.fat+'g G + '+bo.m.prot+'g P) / '+S.gpr+' = '+bo.b2.toFixed(2)+' U</div>';
  h+='<div style="font-size:11px;color:#FBBC2C;margin-top:6px">⚠️ B1b (fine pasto) e B2 (FPU) entrano nell\'IOB solo dopo conferma separata</div>';
  h+='</div>';
  var iob=calcIOB();
  if(iob>0) h+='<div style="background:rgba(107,148,240,.1);padding:10px;border-radius:8px;font-size:13px;margin-top:8px">⚠️ IOB attivo: <strong>'+iob.toFixed(1)+' U</strong> (solo frazioni confermate)</div>';
  return h;
}

A.showBolo=function(i){
  var meals=todayMeals();var ml=meals[i];if(!ml)return;
  var gly=lastGly();
  _boloTmpSplitA=S.splitStart||60;
  _boloTmpSplitB=S.splitEnd||40;
  $('bo-detail').innerHTML=renderBoloContent(ml,gly,_boloTmpSplitA,_boloTmpSplitB);
  /* Split % editor */
  var sh='';
  if(S.splitBolus){
    sh+='<div style="background:#24242E;border-radius:10px;padding:10px;margin-top:8px">';
    sh+='<div style="font-size:12px;font-weight:600;color:#9898A6;margin-bottom:6px">Modifica Split %</div>';
    sh+='<div style="display:flex;gap:8px;align-items:center">';
    sh+='<div style="flex:1"><label class="inp-lbl">Inizio %</label><input type="number" class="inp" id="bo-sp1" value="'+_boloTmpSplitA+'" inputmode="numeric" oninput="A.updBoloSplit('+i+')"></div>';
    sh+='<div style="flex:1"><label class="inp-lbl">Fine %</label><input type="number" class="inp" id="bo-sp2" value="'+_boloTmpSplitB+'" inputmode="numeric" oninput="A.updBoloSplit('+i+')"></div>';
    sh+='</div></div>';
  }
  $('bo-split-edit').innerHTML=sh;
  /* Show confirm button */
  $('bo-actions').innerHTML='<button class="btn btn-g btn-bk" style="margin-top:12px" onclick="A.confirmBolo()">Conferma Bolo</button>';
  $('m-bolo').setAttribute('data-mi',''+i);
  A.openMdl('m-bolo');
};

/* View-only bolus for completed meals */
A.viewBolo=function(i){
  var meals=todayMeals();var ml=meals[i];if(!ml)return;
  var gly=lastGly();
  var splitA=S.splitStart||60;
  var splitB=S.splitEnd||40;
  $('bo-detail').innerHTML=renderBoloContent(ml,gly,splitA,splitB);
  /* Show pending status */
  var ds=todayStr();var dd=D[ds]||{};
  var statusH='';
  if(dd.pendingB1b&&dd.pendingB1b[''+i]){
    statusH+='<div style="background:rgba(251,188,44,.1);padding:10px;border-radius:8px;font-size:13px;margin-top:8px;color:#FBBC2C">⏳ B1b in attesa: <strong>'+dd.pendingB1b[''+i].units.toFixed(1)+' U</strong> (fine pasto)</div>';
  }
  $('bo-split-edit').innerHTML=statusH;
  /* No confirm button, just close */
  $('bo-actions').innerHTML='<button class="btn btn-o btn-bk" style="margin-top:12px" onclick="A.closeMdl(\'m-bolo\')">Chiudi</button>';
  $('m-bolo').setAttribute('data-mi',''+i);
  A.openMdl('m-bolo');
};

A.updBoloSplit=function(i){
  var a=parseInt($('bo-sp1').value)||0;
  var b=parseInt($('bo-sp2').value)||0;
  if(a+b!==100){
    /* auto-adjust the other */
    b=100-a;
    $('bo-sp2').value=b;
  }
  _boloTmpSplitA=a;_boloTmpSplitB=b;
  var meals=todayMeals();var ml=meals[i];if(!ml)return;
  var gly=lastGly();
  $('bo-detail').innerHTML=renderBoloContent(ml,gly,a,b);
};

A.confirmBolo=function(){
  var i=parseInt($('m-bolo').getAttribute('data-mi'));
  var ds=todayStr();
  if(!D[ds])D[ds]={};
  var meals=todayMeals();
  if(meals[i]){
    var gly=lastGly();var bo=calcBolus(meals[i].foods,gly);
    if(!D[ds].boluses)D[ds].boluses=[];
    /* Save split % used at confirmation time */
    if(S.splitBolus){
      S.splitStart=_boloTmpSplitA;
      S.splitEnd=_boloTmpSplitB;
      /* Recalc with current split */
      var b1a=r2(bo.b1*(_boloTmpSplitA/100));
      var b1b=r2(bo.b1*(_boloTmpSplitB/100));
      /* Register ONLY B1a (inizio pasto) in IOB */
      D[ds].boluses.push({time:Date.now(),units:b1a,type:'b1a'});
      /* Store pending B1b for later confirmation */
      if(!D[ds].pendingB1b)D[ds].pendingB1b={};
      D[ds].pendingB1b[''+i]={units:b1b,pct:_boloTmpSplitB};
      A.notify('B1a '+b1a.toFixed(1)+'U → IOB · B1b '+b1b.toFixed(1)+'U in attesa');
    }else{
      /* No split: register entire B1 */
      D[ds].boluses.push({time:Date.now(),units:bo.b1,type:'b1'});
      A.notify('Bolo B1 confermato ✓');
    }
    /* Schedule B2 reminder (will require separate confirmation via confirmB2) */
    if(S.reminder&&bo.b2>0) schedRem(meals[i].name,bo.b2);
    save();
  }
  A.togMeal(i,true);A.closeMdl('m-bolo');
};

/* Confirm B1b (fine pasto) → add to IOB */
A.confirmB1b=function(i){
  var ds=todayStr();
  if(!D[ds]||!D[ds].pendingB1b||!D[ds].pendingB1b[''+i])return;
  var pb=D[ds].pendingB1b[''+i];
  if(!D[ds].boluses)D[ds].boluses=[];
  D[ds].boluses.push({time:Date.now(),units:pb.units,type:'b1b'});
  delete D[ds].pendingB1b[''+i];
  save();A.rOggi();A.rHome();
  A.notify('B1b '+pb.units.toFixed(1)+' U → IOB ✓');
};

/* ---------- REMINDERS ---------- */
function schedRem(name,units){
  var delay=(S.reminderDelay||150)*60000;
  if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
    setTimeout(function(){
      try{
        new Notification('Bolo 2 — '+name,{body:units.toFixed(1)+' U (FPU)',tag:'bolo2-'+Date.now()});
      }catch(e){}
      /* Always also trigger in-app alert */
      inAppRem(name,units);
    },delay);
  }else if(typeof Notification!=='undefined'&&Notification.permission==='default'){
    try{
      Notification.requestPermission(function(p){
        if(p==='granted') schedRem(name,units);
        else setTimeout(function(){inAppRem(name,units)},delay);
      });
    }catch(e){setTimeout(function(){inAppRem(name,units)},delay)}
  }else{
    setTimeout(function(){inAppRem(name,units)},delay);
  }
}

var _pendingB2={name:'',units:0};

function inAppRem(n,u){
  /* Store pending B2 for confirmation */
  _pendingB2={name:n,units:u};
  /* Mod 5: Enhanced in-app alert with vibration + sound + modal */
  if(S.b2alert!==false){
    /* Vibration */
    if(navigator.vibrate){
      navigator.vibrate([200,100,200,100,300]);
    }
    /* Audio beep */
    try{
      var actx=new (window.AudioContext||window.webkitAudioContext)();
      var osc=actx.createOscillator();
      var gain=actx.createGain();
      osc.connect(gain);gain.connect(actx.destination);
      osc.frequency.value=880;osc.type='sine';
      gain.gain.value=0.3;
      osc.start();
      setTimeout(function(){osc.stop();actx.close()},500);
    }catch(e){}
  }
  /* Show persistent modal */
  var h='<div style="text-align:center;margin-bottom:12px">';
  h+='<div style="font-size:48px;margin-bottom:8px">💉</div>';
  h+='<div style="font-size:20px;font-weight:800;color:#A78BFA">Bolo 2 — FPU</div>';
  h+='<div style="font-size:15px;color:#E8E8ED;margin-top:6px">'+n+'</div></div>';
  h+='<div style="background:#24242E;border-radius:12px;padding:16px;text-align:center;margin-bottom:12px">';
  h+='<div style="font-size:36px;font-weight:800;color:#A78BFA">'+u.toFixed(1)+' U</div>';
  h+='<div style="font-size:13px;color:#9898A6;margin-top:4px">Somministrare ora</div></div>';
  h+='<div style="font-size:11px;color:#FBBC2C;text-align:center">Premi "Conferma" per registrare nell\'IOB</div>';
  $('b2-alert-detail').innerHTML=h;
  A.openMdl('m-b2alert');
}

/* Confirm B2 → add to IOB */
A.confirmB2=function(){
  if(_pendingB2.units>0){
    var ds=todayStr();
    if(!D[ds])D[ds]={};
    if(!D[ds].boluses)D[ds].boluses=[];
    D[ds].boluses.push({time:Date.now(),units:_pendingB2.units,type:'b2'});
    save();
    A.notify('Bolo 2 confermato: '+_pendingB2.units.toFixed(1)+' U → IOB');
    _pendingB2={name:'',units:0};
    A.rHome();
  }
  A.closeMdl('m-b2alert');
};

/* ---------- EDIT MEAL ---------- */
A.editOggi=function(i){
  editIdx=i;editCtx='oggi';
  var ds=todayStr();
  if(!D[ds])D[ds]={};
  if(!D[ds].meals)D[ds].meals=deepCopy(todayMeals());
  var ml=D[ds].meals[i];if(!ml)return;
  $('me-title').textContent='Modifica — '+ml.name;
  $('me-name').value=ml.name;
  $('me-time').value=ml.time;
  tmpFoods=deepCopy(ml.foods);
  rEditFoods();A.openMdl('m-edit');
};

A.editPiano=function(i){
  editIdx=i;editCtx='piano';
  var ml=planM(pianoDT)[i];if(!ml)return;
  $('me-title').textContent='Modifica — '+ml.name;
  $('me-name').value=ml.name;$('me-time').value=ml.time;
  tmpFoods=deepCopy(ml.foods);
  rEditFoods();A.openMdl('m-edit');
};

function rEditFoods(){
  var h='';
  for(var i=0;i<tmpFoods.length;i++){
    var fd=findF(tmpFoods[i].n);
    var ov=tmpFoods[i].ov;
    var k=ov&&ov.k!==undefined?safeNum(ov.k):(fd?dbK(fd):0);
    var ca=ov&&ov.ca!==undefined?safeNum(ov.ca):(fd?dbCA(fd):0);
    var p=ov&&ov.p!==undefined?safeNum(ov.p):(fd?dbP(fd):0);
    var f=ov&&ov.f!==undefined?safeNum(ov.f):(fd?dbF(fd):0);
    h+='<div class="fe-row"><span class="fn">'+tmpFoods[i].n+'</span>';
    h+='<input type="number" class="inp fg" value="'+tmpFoods[i].g+'" inputmode="numeric" style="width:65px;padding:6px 8px;font-size:14px" oninput="A.updTmpG('+i+',this.value)">';
    h+='<span style="font-size:12px;color:#6B6B7A">g</span>';
    h+='<button class="btn btn-sm btn-o" style="padding:4px 8px;font-size:11px;margin-left:4px" onclick="A.tglNutr('+i+')">📝</button>';
    h+='<button class="fx" onclick="A.rmTmpF('+i+')">✕</button></div>';
    h+='<div class="fe-nutr" id="fe-nutr-'+i+'" style="display:none;padding:4px 0 8px;border-bottom:1px solid #2A2A36">';
    h+='<div style="font-size:11px;color:#9898A6;margin-bottom:4px">Valori per 100g (modifica per questo pasto):</div>';
    h+='<div style="display:flex;gap:4px;flex-wrap:wrap">';
    h+='<div style="flex:1;min-width:60px"><label class="inp-lbl">Kcal</label><input type="number" class="inp" style="padding:5px 6px;font-size:12px" value="'+k+'" inputmode="decimal" oninput="A.updTmpNutr('+i+',\'k\',this.value)"></div>';
    h+='<div style="flex:1;min-width:60px"><label class="inp-lbl">Carb</label><input type="number" class="inp" style="padding:5px 6px;font-size:12px" value="'+ca+'" inputmode="decimal" oninput="A.updTmpNutr('+i+',\'ca\',this.value)"></div>';
    h+='<div style="flex:1;min-width:60px"><label class="inp-lbl">Prot</label><input type="number" class="inp" style="padding:5px 6px;font-size:12px" value="'+p+'" inputmode="decimal" oninput="A.updTmpNutr('+i+',\'p\',this.value)"></div>';
    h+='<div style="flex:1;min-width:60px"><label class="inp-lbl">Grassi</label><input type="number" class="inp" style="padding:5px 6px;font-size:12px" value="'+f+'" inputmode="decimal" oninput="A.updTmpNutr('+i+',\'f\',this.value)"></div>';
    h+='</div></div>';
  }
  if(!tmpFoods.length) h='<div style="text-align:center;color:#6B6B7A;padding:12px">Nessun alimento</div>';
  $('me-foods').innerHTML=h;
}
A.updTmpG=function(i,v){var g=parseInt(v);if(!isNaN(g)&&g>0)tmpFoods[i].g=g};
A.rmTmpF=function(i){tmpFoods.splice(i,1);rEditFoods()};
A.tglNutr=function(i){
  var el=$('fe-nutr-'+i);
  if(!el)return;
  el.style.display=el.style.display==='none'?'block':'none';
};
A.updTmpNutr=function(i,key,v){
  var val=parseFloat(v);
  if(isNaN(val))return;
  if(!tmpFoods[i].ov){
    var fd=findF(tmpFoods[i].n);
    if(fd){tmpFoods[i].ov={k:dbK(fd),ca:dbCA(fd),p:dbP(fd),f:dbF(fd),fi:dbFi(fd)}}
    else{tmpFoods[i].ov={k:0,ca:0,p:0,f:0,fi:0}}
  }
  tmpFoods[i].ov[key]=val;
};

A.saveEdit=function(){
  var name=$('me-name').value.trim();
  var time=$('me-time').value;
  if(!name){A.notify('Inserisci un nome');return}
  var ml={name:name,time:time,foods:deepCopy(tmpFoods)};
  if(editCtx==='oggi'){
    var ds=todayStr();
    if(!D[ds])D[ds]={};
    if(!D[ds].meals)D[ds].meals=deepCopy(todayMeals());
    var wasComplete=D[ds].consumed&&D[ds].consumed[editIdx];
    D[ds].meals[editIdx]=ml;save();A.rOggi();A.rHome();
    /* Mod 4: show delta bolus if meal was completed */
    if(wasComplete&&extraOldMacros){
      var newM=calcM(ml.foods);
      var deltaCarb=newM.carb-extraOldMacros.carb;
      var deltaFP=(newM.fat+newM.prot)-(extraOldMacros.fat+extraOldMacros.prot);
      if(deltaCarb>0||deltaFP>0){
        var gly=lastGly();
        var deltaB1=deltaCarb>0?r2(deltaCarb/S.icr):0;
        var deltaB2=deltaFP>0?r2(deltaFP/S.gpr):0;
        if(deltaB1>0){
          if(!D[ds].boluses)D[ds].boluses=[];
          D[ds].boluses.push({time:Date.now(),units:deltaB1,type:'b1-extra'});
          save();
        }
        A.showDeltaBolo(ml.name,deltaCarb,deltaFP,deltaB1,deltaB2);
        if(S.reminder&&deltaB2>0) schedRem(ml.name+' (extra)',deltaB2);
      }
      extraMealIdx=-1;extraOldMacros=null;
    }
  }else if(editCtx==='agenda'){
    /* Mod 2: save meal edit for agenda day */
    if(!D[agendaEditDay])D[agendaEditDay]={};
    if(!D[agendaEditDay].meals){
      var adt=getDT(agendaEditDay);
      D[agendaEditDay].meals=deepCopy(planM(adt));
    }
    D[agendaEditDay].meals[editIdx]=ml;save();
    A.selDay(agendaEditDay);
  }else{
    var d=actD();
    if(pianoDT==='gym')d.gym[editIdx]=ml;else d.rest[editIdx]=ml;
    lsS('dp_diets',diets);A.rPiano();
  }
  A.closeMdl('m-edit');A.notify('Pasto salvato ✓');
};

/* ---------- DELTA BOLO MODAL ---------- */
A.showDeltaBolo=function(name,dCarb,dFP,dB1,dB2){
  var h='<div style="text-align:center;margin-bottom:12px">';
  h+='<div style="font-size:42px;margin-bottom:4px">🍽️</div>';
  h+='<div style="font-size:18px;font-weight:700;color:#A78BFA">Bolo Aggiuntivo</div>';
  h+='<div style="font-size:13px;color:#9898A6">'+name+'</div></div>';
  h+='<div style="background:#24242E;border-radius:12px;padding:14px;margin-bottom:10px">';
  if(dCarb>0){
    h+='<div class="brow"><span class="blbl">Carb extra</span><span style="color:#FBBC2C;font-weight:600">+'+r1(dCarb)+'g</span></div>';
    h+='<div class="brow"><span class="blbl">Bolo 1 aggiuntivo</span><span class="bval" style="color:#64D68A">'+dB1.toFixed(2)+' U</span></div>';
  }
  if(dFP>0){
    h+='<div style="height:1px;background:#2A2A36;margin:6px 0"></div>';
    h+='<div class="brow"><span class="blbl">G+P extra</span><span style="color:#A78BFA;font-weight:600">+'+r1(dFP)+'g</span></div>';
    h+='<div class="brow"><span class="blbl">Bolo 2 aggiuntivo</span><span class="bval" style="color:#A78BFA">'+dB2.toFixed(2)+' U</span></div>';
    h+='<div style="font-size:11px;color:#6B6B7A;margin-top:4px">Timer Bolo 2 avviato — '+(S.reminderDelay||150)+' min</div>';
  }
  h+='</div>';
  $('delta-detail').innerHTML=h;
  A.openMdl('m-delta');
};

/* ---------- ADD FOOD MODAL ---------- */
A.openAddFood=function(){
  rRecentFreq();
  rCats();$('f-srch').value='';A.filterF();
  A.closeMdl('m-edit');A.openMdl('m-addfood');
};

/* Recent & Frequent Foods */
function getUsedFoods(){
  var counts={};var recents=[];
  var ks=Object.keys(D);
  for(var i=0;i<ks.length;i++){
    var dd=D[ks[i]];if(!dd||!dd.meals)continue;
    for(var m=0;m<dd.meals.length;m++){
      var foods=dd.meals[m].foods;if(!foods)continue;
      for(var f=0;f<foods.length;f++){
        var name=foods[f].n;
        if(!counts[name]) counts[name]={count:0,last:ks[i]};
        counts[name].count++;
        if(ks[i]>counts[name].last) counts[name].last=ks[i];
      }
    }
  }
  /* recent: sorted by last date desc, top 8 */
  var all=Object.keys(counts);
  all.sort(function(a,b){return counts[b].last>counts[a].last?1:(counts[b].last<counts[a].last?-1:0)});
  var rec=[];for(var r=0;r<Math.min(all.length,8);r++) rec.push(all[r]);
  /* frequent: sorted by count desc, top 8 */
  all.sort(function(a,b){return counts[b].count-counts[a].count});
  var freq=[];for(var q=0;q<Math.min(all.length,8);q++) freq.push(all[q]);
  return{recent:rec,frequent:freq};
}

function rRecentFreq(){
  var data=getUsedFoods();
  var h='';
  if(data.recent.length>0){
    h+='<div style="margin-bottom:10px"><div style="font-size:12px;font-weight:600;color:#9898A6;margin-bottom:6px">🕐 Recenti</div>';
    h+='<div style="display:flex;gap:6px;flex-wrap:wrap">';
    for(var i=0;i<data.recent.length;i++){
      var esc=data.recent[i].replace(/'/g,"\\'");
      h+='<div class="chip" onclick="A.pickFood(\''+esc+'\')">'+data.recent[i]+'</div>';
    }
    h+='</div></div>';
  }
  if(data.frequent.length>0){
    h+='<div style="margin-bottom:10px"><div style="font-size:12px;font-weight:600;color:#9898A6;margin-bottom:6px">⭐ Più usati</div>';
    h+='<div style="display:flex;gap:6px;flex-wrap:wrap">';
    for(var j=0;j<data.frequent.length;j++){
      var esc2=data.frequent[j].replace(/'/g,"\\'");
      h+='<div class="chip" onclick="A.pickFood(\''+esc2+'\')">'+data.frequent[j]+'</div>';
    }
    h+='</div></div>';
  }
  $('f-recent').innerHTML=h;
}

function rCats(){
  var cats={};var all=allFoods();
  for(var i=0;i<all.length;i++) cats[all[i].c]=true;
  var h='<div class="chip on" onclick="A.selCat(this,\'\')">Tutti</div>';
  var ks=Object.keys(cats);
  for(var j=0;j<ks.length;j++) h+='<div class="chip" onclick="A.selCat(this,\''+ks[j]+'\')">'+ks[j]+'</div>';
  $('f-cats').innerHTML=h;selCat='';
}

A.selCat=function(el,c){
  selCat=c;
  var ch=qsa('#f-cats .chip');
  for(var i=0;i<ch.length;i++)ch[i].classList.remove('on');
  el.classList.add('on');A.filterF();
};

A.filterF=function(){
  var q=$('f-srch').value.trim();
  var all=allFoods();var res=[];
  for(var i=0;i<all.length;i++){
    if(selCat&&all[i].c!==selCat)continue;
    if(q&&!fuzzy(q,all[i].n))continue;
    res.push(all[i]);if(res.length>=50)break;
  }
  var h='';
  for(var j=0;j<res.length;j++){
    var fd=res[j];
    var esc=fd.n.replace(/'/g,"\\'");
    h+='<div class="si-item" onclick="A.pickFood(\''+esc+'\')">';
    h+='<div class="sn">'+fd.n+'</div>';
    h+='<div class="sm">'+fd.k+' kcal · C'+fd.ca+' P'+fd.p+' G'+fd.f+' — '+fd.c+'</div></div>';
  }
  if(!res.length) h='<div style="text-align:center;color:#6B6B7A;padding:16px">Nessun risultato</div>';
  $('f-res').innerHTML=h;
};

A.pickFood=function(name){
  selFood=findF(name);if(!selFood)return;
  $('fg-title').textContent=selFood.n;
  $('fg-info').textContent='Per 100g: '+selFood.k+' kcal · C'+selFood.ca+' P'+selFood.p+' G'+selFood.f;
  /* Portions quick-select */
  var ph='';
  if(selFood.por&&selFood.por.length>0){
    ph+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">';
    ph+='<div class="chip on" onclick="A.selPortion(this,100)">100g</div>';
    for(var i=0;i<selFood.por.length;i++){
      var po=selFood.por[i];
      ph+='<div class="chip" onclick="A.selPortion(this,'+po.g+')">'+po.l+' ('+po.g+'g)</div>';
    }
    ph+='</div>';
  }
  $('fg-portions').innerHTML=ph;
  $('fg-g').value=100;A.prevGrams();
  A.closeMdl('m-addfood');A.openMdl('m-grams');
};

A.selPortion=function(el,g){
  $('fg-g').value=Math.round(g);
  A.prevGrams();
  var ch=qsa('#fg-portions .chip');
  for(var i=0;i<ch.length;i++)ch[i].classList.remove('on');
  el.classList.add('on');
};

A.prevGrams=function(){
  if(!selFood)return;
  var g=parseInt($('fg-g').value)||0;var r=g/100;
  $('fg-prev').textContent=r1(selFood.k*r)+' kcal · C'+r1(selFood.ca*r)+'g · P'+r1(selFood.p*r)+'g · G'+r1(selFood.f*r)+'g';
};

A.confirmFood=function(){
  if(!selFood)return;
  var g=parseInt($('fg-g').value);
  if(isNaN(g)||g<=0){A.notify('Inserisci i grammi');return}
  tmpFoods.push({n:selFood.n,g:g});
  A.closeMdl('m-grams');A.openMdl('m-edit');
  rEditFoods();A.notify(selFood.n+' aggiunto');
};

/* ---------- BARCODE ---------- */
var _bcInterval=null;
var _bcHasDet=typeof BarcodeDetector!=='undefined';

A.startScan=function(){
  A.closeMdl('m-addfood');A.openMdl('m-barcode');
  $('bc-res').innerHTML='';$('bc-man').value='';
  $('bc-status').textContent='';

  if(!_bcHasDet){
    $('bc-status').innerHTML='<span style="color:#FBBC2C">BarcodeDetector non supportato — usa 📸 Scatta Foto o inserisci il codice</span>';
  }

  if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){
    navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}})
    .then(function(stream){
      bcStream=stream;
      var vid=$('bc-vid');
      vid.srcObject=stream;
      vid.setAttribute('playsinline','');
      vid.muted=true;
      vid.play().catch(function(){});

      if(_bcHasDet){
        $('bc-status').textContent='Inquadra il barcode...';
        var det=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});
        _bcInterval=setInterval(function(){
          if(!bcStream){clearInterval(_bcInterval);_bcInterval=null;return}
          if(vid.readyState<2)return; /* HAVE_CURRENT_DATA */
          det.detect(vid).then(function(bc){
            if(bc.length>0){
              clearInterval(_bcInterval);_bcInterval=null;
              $('bc-man').value=bc[0].rawValue;
              $('bc-status').innerHTML='<span style="color:#64D68A">Trovato: '+bc[0].rawValue+'</span>';
              if(navigator.vibrate)navigator.vibrate(100);
              A.lookupBC();
            }
          }).catch(function(e){
            $('bc-status').innerHTML='<span style="color:#FBBC2C">Scansione lenta... prova 📸 Scatta Foto</span>';
          });
        },600);
      }
    }).catch(function(e){
      $('bc-status').innerHTML='<span style="color:#EF6B6B">Camera non disponibile: '+(e.message||'errore')+'</span>';
    });
  }else{
    $('bc-status').innerHTML='<span style="color:#EF6B6B">Camera non supportata — usa 📸 o codice manuale</span>';
  }
};

A.stopScan=function(){
  if(_bcInterval){clearInterval(_bcInterval);_bcInterval=null}
  if(bcStream){var tr=bcStream.getTracks();for(var i=0;i<tr.length;i++)tr[i].stop();bcStream=null}
  var vid=$('bc-vid');if(vid)vid.srcObject=null;
};

/* Snap photo from live video → detect barcode on still frame */
A.snapBarcode=function(){
  var vid=$('bc-vid');
  if(vid&&vid.readyState>=2&&bcStream){
    /* Capture frame to canvas */
    var cvs=document.createElement('canvas');
    cvs.width=vid.videoWidth;cvs.height=vid.videoHeight;
    cvs.getContext('2d').drawImage(vid,0,0);
    $('bc-status').textContent='Analizzando foto...';
    if(_bcHasDet){
      var det=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});
      det.detect(cvs).then(function(bc){
        if(bc.length>0){
          $('bc-man').value=bc[0].rawValue;
          $('bc-status').innerHTML='<span style="color:#64D68A">Trovato: '+bc[0].rawValue+'</span>';
          if(navigator.vibrate)navigator.vibrate(100);
          A.lookupBC();
        }else{
          $('bc-status').innerHTML='<span style="color:#FBBC2C">Nessun barcode trovato — riprova o inserisci il codice</span>';
        }
      }).catch(function(){
        $('bc-status').innerHTML='<span style="color:#EF6B6B">Errore analisi — inserisci il codice manualmente</span>';
      });
    }else{
      $('bc-status').innerHTML='<span style="color:#FBBC2C">BarcodeDetector non disponibile — inserisci il codice</span>';
    }
  }else{
    /* Fallback: open native file picker */
    $('bc-file').click();
  }
};

/* Handle photo from native file picker (iOS camera) */
A.onBCFile=function(inp){
  if(!inp.files||!inp.files[0])return;
  $('bc-status').textContent='Analizzando immagine...';
  var img=new Image();
  img.onload=function(){
    var cvs=document.createElement('canvas');
    cvs.width=img.width;cvs.height=img.height;
    cvs.getContext('2d').drawImage(img,0,0);
    if(_bcHasDet){
      var det=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});
      det.detect(cvs).then(function(bc){
        if(bc.length>0){
          $('bc-man').value=bc[0].rawValue;
          $('bc-status').innerHTML='<span style="color:#64D68A">Trovato: '+bc[0].rawValue+'</span>';
          if(navigator.vibrate)navigator.vibrate(100);
          A.lookupBC();
        }else{
          $('bc-status').innerHTML='<span style="color:#FBBC2C">Nessun barcode — inserisci il codice manualmente</span>';
        }
      }).catch(function(){
        $('bc-status').innerHTML='<span style="color:#EF6B6B">Errore — inserisci il codice</span>';
      });
    }else{
      $('bc-status').innerHTML='<span style="color:#FBBC2C">BarcodeDetector non disponibile — inserisci il codice</span>';
    }
  };
  img.src=URL.createObjectURL(inp.files[0]);
  inp.value='';
};

A.lookupBC=function(){
  var code=$('bc-man').value.trim();
  if(!code){A.notify('Inserisci un codice');return}
  $('bc-res').innerHTML='<div style="color:#9898A6">Cercando...</div>';
  fetch('https://world.openfoodfacts.org/api/v0/product/'+code+'.json')
  .then(function(r){return r.json()})
  .then(function(data){
    if(data.status===1&&data.product){
      var p=data.product;var nm=p.nutriments||{};
      var fd={n:p.product_name||'Prodotto '+code,c:'Barcode',
        k:Math.round(nm['energy-kcal_100g']||0),
        ca:r1(nm.carbohydrates_100g||0),p:r1(nm.proteins_100g||0),
        f:r1(nm.fat_100g||0),fi:r1(nm.fiber_100g||0)};
      window._bcFood=fd;
      $('bc-res').innerHTML='<div style="background:#24242E;padding:12px;border-radius:10px">'+
        '<div style="font-size:15px;font-weight:600;margin-bottom:4px">'+fd.n+'</div>'+
        '<div style="font-size:12px;color:#9898A6">'+fd.k+' kcal · C'+fd.ca+' P'+fd.p+' G'+fd.f+'</div>'+
        '<button class="btn btn-sm btn-g" style="margin-top:8px" onclick="A.addBC()">Aggiungi</button>'+
        '<button class="btn btn-sm btn-o" style="margin-top:8px;margin-left:6px" onclick="A.saveBC()">Salva</button></div>';
    }else{$('bc-res').innerHTML='<div style="color:#EF6B6B">Non trovato</div>'}
  }).catch(function(){$('bc-res').innerHTML='<div style="color:#EF6B6B">Errore rete</div>'});
};

A.addBC=function(){
  if(!window._bcFood)return;selFood=window._bcFood;
  var ex=false;for(var i=0;i<cFoods.length;i++){if(cFoods[i].n===selFood.n){ex=true;break}}
  if(!ex){cFoods.push(selFood);lsS('dp_cfood',cFoods)}
  A.stopScan();A.closeMdl('m-barcode');
  $('fg-title').textContent=selFood.n;$('fg-info').textContent='Per 100g: '+selFood.k+' kcal';
  $('fg-g').value=100;A.prevGrams();A.openMdl('m-grams');
};

A.saveBC=function(){
  if(!window._bcFood)return;var fd=window._bcFood;
  var ex=false;for(var i=0;i<cFoods.length;i++){if(cFoods[i].n===fd.n){ex=true;break}}
  if(!ex){cFoods.push(fd);lsS('dp_cfood',cFoods);A.notify('Salvato ✓')}
  else A.notify('Già presente');
};

/* ---------- CUSTOM FOODS ---------- */
A.openCFood=function(){rCFList();
  $('cf-name').value='';$('cf-cat').value='';$('cf-kcal').value='';
  $('cf-carb').value='';$('cf-prot').value='';$('cf-fat').value='';$('cf-fib').value='';
  A.openMdl('m-cfood');
};

function rCFList(){
  var h='';
  for(var i=0;i<cFoods.length;i++){
    var fd=cFoods[i];
    h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #2A2A36">';
    h+='<div><div style="font-size:14px">'+fd.n+'</div>';
    h+='<div style="font-size:11px;color:#6B6B7A">'+fd.k+' kcal · C'+fd.ca+' P'+fd.p+' G'+fd.f+'</div></div>';
    h+='<button class="fx" onclick="A.delCF('+i+')">✕</button></div>';
  }
  if(!cFoods.length) h='<div style="color:#6B6B7A;text-align:center;padding:8px">Nessuno</div>';
  $('cf-list').innerHTML=h;
}

A.saveCF=function(){
  var name=$('cf-name').value.trim();
  if(!name){A.notify('Inserisci un nome');return}
  cFoods.push({n:name,c:$('cf-cat').value.trim()||'Personalizzato',
    k:parseFloat($('cf-kcal').value)||0,ca:parseFloat($('cf-carb').value)||0,
    p:parseFloat($('cf-prot').value)||0,f:parseFloat($('cf-fat').value)||0,
    fi:parseFloat($('cf-fib').value)||0});
  lsS('dp_cfood',cFoods);rCFList();$('cf-name').value='';A.notify('Aggiunto ✓');
};

A.delCF=function(i){cFoods.splice(i,1);lsS('dp_cfood',cFoods);rCFList()};

/* ---------- AGENDA ---------- */
A.rAgenda=function(){
  var mo=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  $('cal-mo').textContent=mo[calM]+' '+calY;
  var first=new Date(calY,calM,1);
  var startD=first.getDay()||7;
  var dim=new Date(calY,calM+1,0).getDate();
  var tds=todayStr();
  var h='';var dn=['L','M','M','G','V','S','D'];
  for(var d=0;d<7;d++) h+='<div class="ch">'+dn[d]+'</div>';
  for(var e=1;e<startD;e++) h+='<div class="cd"></div>';
  for(var i=1;i<=dim;i++){
    var ds=calY+'-'+pad(calM+1)+'-'+pad(i);
    var cls='cd';if(ds===tds)cls+=' tod';
    var dd=D[ds];var dotH='';
    if(dd&&dd.dayType) dotH='<div class="dot '+(dd.dayType==='gym'?'dot-g':'dot-b')+'"></div>';
    var avg='';
    if(dd&&dd.glycemia&&dd.glycemia.length>0){
      var s=0;for(var g=0;g<dd.glycemia.length;g++)s+=dd.glycemia[g].value;
      var a=Math.round(s/dd.glycemia.length);
      var gc=a<70||a>180?'#EF6B6B':'#64D68A';
      avg='<div style="font-size:8px;color:'+gc+'">'+a+'</div>';
    }
    h+='<div class="'+cls+'" onclick="A.selDay(\''+ds+'\')">'+i+avg+dotH+'</div>';
  }
  $('cal-g').innerHTML=h;
};

A.calNav=function(dir){
  calM+=dir;
  if(calM<0){calM=11;calY--}
  if(calM>11){calM=0;calY++}
  A.rAgenda();
};

A.selDay=function(ds){
  agendaEditDay=ds;
  var det=$('ag-detail');det.style.display='block';
  var dd=D[ds]||{};var dt=dd.dayType||'gym';
  var h='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">';
  h+='<span style="font-size:16px;font-weight:700">'+dateLbl(ds)+'</span>';
  h+='<span class="badge '+(dt==='gym'?'badge-g':'badge-b')+'">'+dt.toUpperCase()+'</span></div>';
  h+='<div class="dtype" style="margin-bottom:10px">';
  h+='<button class="'+(dt==='gym'?'og':'')+'" onclick="A.setAgDT(\''+ds+'\',\'gym\')">🏋️ GYM</button>';
  h+='<button class="'+(dt==='rest'?'ob':'')+'" onclick="A.setAgDT(\''+ds+'\',\'rest\')">😴 RIPOSO</button></div>';
  if(dd.glycemia&&dd.glycemia.length>0){
    h+='<div class="card-hd">Glicemia</div>';
    for(var g=0;g<dd.glycemia.length;g++){
      var t=new Date(dd.glycemia[g].time);
      h+='<div style="font-size:13px;color:#9898A6">'+pad(t.getHours())+':'+pad(t.getMinutes())+' — <strong>'+dd.glycemia[g].value+'</strong> mg/dL</div>';
    }
  }
  /* Mod 2: Show meals for this day (plan or custom) */
  var meals=dd.meals?dd.meals:deepCopy(planM(dt));
  h+='<div class="card-hd" style="margin-top:12px">Pasti</div>';
  for(var mi=0;mi<meals.length;mi++){
    var ml=meals[mi];var mc=calcM(ml.foods);
    h+='<div style="background:#24242E;border-radius:10px;padding:10px 12px;margin-bottom:6px">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between">';
    h+='<div><div style="font-size:14px;font-weight:600">'+ml.name+'</div>';
    h+='<div style="font-size:12px;color:#9898A6">'+ml.time+'</div></div>';
    h+='<button class="btn btn-sm btn-o" onclick="A.editAgMeal('+mi+')">✏️</button></div>';
    h+='<div style="font-size:11px;color:#6B6B7A;margin-top:4px">'+r1(mc.kcal)+' kcal · C'+r1(mc.carb)+' P'+r1(mc.prot)+' G'+r1(mc.fat)+'</div>';
    h+='</div>';
  }
  /* Totals */
  var tot={kcal:0,carb:0,prot:0,fat:0};
  for(var ti=0;ti<meals.length;ti++){
    var tm=calcM(meals[ti].foods);
    tot.kcal+=tm.kcal;tot.carb+=tm.carb;tot.prot+=tm.prot;tot.fat+=tm.fat;
  }
  h+='<div style="background:#1C1C24;border-radius:10px;padding:10px;margin-top:6px;display:flex;justify-content:space-around;text-align:center;font-size:12px">';
  h+='<div><div style="font-weight:700;color:#64D68A">'+r1(tot.kcal)+'</div>kcal</div>';
  h+='<div><div style="font-weight:700;color:#FBBC2C">'+r1(tot.carb)+'g</div>carb</div>';
  h+='<div><div style="font-weight:700;color:#6B94F0">'+r1(tot.prot)+'g</div>prot</div>';
  h+='<div><div style="font-weight:700;color:#A78BFA">'+r1(tot.fat)+'g</div>grassi</div></div>';
  if(!dd.meals){
    h+='<button class="btn btn-sm btn-g btn-bk" style="margin-top:8px" onclick="A.initAgMeals(\''+ds+'\')">📝 Personalizza pasti</button>';
  }
  det.innerHTML=h;
};

A.initAgMeals=function(ds){
  if(!D[ds])D[ds]={};
  var dt=getDT(ds);
  D[ds].meals=deepCopy(planM(dt));
  save();A.selDay(ds);A.notify('Pasti copiati da piano ✓');
};

A.editAgMeal=function(i){
  var ds=agendaEditDay;
  if(!D[ds])D[ds]={};
  if(!D[ds].meals){
    var adt=getDT(ds);
    D[ds].meals=deepCopy(planM(adt));
    save();
  }
  editIdx=i;editCtx='agenda';
  var ml=D[ds].meals[i];if(!ml)return;
  $('me-title').textContent='Modifica — '+ml.name;
  $('me-name').value=ml.name;$('me-time').value=ml.time;
  tmpFoods=deepCopy(ml.foods);
  rEditFoods();A.openMdl('m-edit');
};

A.setAgDT=function(ds,t){setDT(ds,t);A.rAgenda();A.selDay(ds);
  if(ds===todayStr()){A.rOggi();A.rHome()}
};

/* ---------- PIANO ---------- */
A.rPiano=function(){
  var ks=Object.keys(diets);var h='';
  for(var i=0;i<ks.length;i++) h+='<div class="dpill '+(ks[i]===actDiet?'on':'')+'" onclick="A.swDiet(\''+ks[i].replace(/'/g,"\\'")+'\')">'+ks[i]+'</div>';
  $('d-sel').innerHTML=h;
  $('p-dtype').innerHTML=
    '<button class="'+(pianoDT==='gym'?'og':'')+'" onclick="A.setPDT(\'gym\')">🏋️ GYM</button>'+
    '<button class="'+(pianoDT==='rest'?'ob':'')+'" onclick="A.setPDT(\'rest\')">😴 RIPOSO</button>';
  var meals=planM(pianoDT);
  var tot={kcal:0,carb:0,prot:0,fat:0};var mh='';
  for(var j=0;j<meals.length;j++){
    var ml=meals[j];var m=calcM(ml.foods);
    tot.kcal+=m.kcal;tot.carb+=m.carb;tot.prot+=m.prot;tot.fat+=m.fat;
    mh+='<div class="mc"><div style="display:flex;align-items:center;justify-content:space-between">';
    mh+='<div><div class="mn">'+ml.name+'</div><div class="mt">'+ml.time+'</div></div>';
    mh+='<button class="btn btn-sm btn-o" onclick="A.editPiano('+j+')">✏️</button></div>';
    mh+='<div class="mm"><span style="color:#64D68A">'+r1(m.kcal)+' kcal</span>';
    mh+='<span style="color:#FBBC2C">C '+r1(m.carb)+'g</span>';
    mh+='<span style="color:#6B94F0">P '+r1(m.prot)+'g</span>';
    mh+='<span style="color:#A78BFA">G '+r1(m.fat)+'g</span></div>';
    mh+='<div class="mf">';
    for(var f=0;f<ml.foods.length;f++){mh+=ml.foods[f].n+' '+ml.foods[f].g+'g';if(f<ml.foods.length-1)mh+=' · '}
    mh+='</div><div class="ma"><button class="btn btn-sm btn-o" onclick="A.rmPlanMeal('+j+')">🗑️ Rimuovi</button></div></div>';
  }
  var th='<div class="card" style="background:#24242E"><div style="display:flex;justify-content:space-around;text-align:center">';
  th+='<div><div style="font-size:18px;font-weight:700;color:#64D68A">'+r1(tot.kcal)+'</div><div style="font-size:11px;color:#9898A6">kcal</div></div>';
  th+='<div><div style="font-size:18px;font-weight:700;color:#FBBC2C">'+r1(tot.carb)+'g</div><div style="font-size:11px;color:#9898A6">carb</div></div>';
  th+='<div><div style="font-size:18px;font-weight:700;color:#6B94F0">'+r1(tot.prot)+'g</div><div style="font-size:11px;color:#9898A6">prot</div></div>';
  th+='<div><div style="font-size:18px;font-weight:700;color:#A78BFA">'+r1(tot.fat)+'g</div><div style="font-size:11px;color:#9898A6">grassi</div></div></div></div>';
  $('p-meals').innerHTML=th+mh;
};

A.setPDT=function(t){pianoDT=t;A.rPiano()};
A.swDiet=function(n){actDiet=n;lsS('dp_active',actDiet);A.rPiano();A.rHome();A.rOggi()};
A.newDiet=function(){
  var n=prompt('Nome nuova dieta:');if(!n||!n.trim())return;n=n.trim();
  if(diets[n]){A.notify('Nome già esistente');return}
  diets[n]={gym:deepCopy(DEF_GYM),rest:deepCopy(DEF_REST)};
  actDiet=n;lsS('dp_diets',diets);lsS('dp_active',actDiet);A.rPiano();A.notify('Creata "'+n+'"');
};
A.renDiet=function(){
  var n=prompt('Nuovo nome per "'+actDiet+'":');if(!n||!n.trim())return;n=n.trim();
  if(diets[n]){A.notify('Nome già esistente');return}
  diets[n]=diets[actDiet];delete diets[actDiet];actDiet=n;
  lsS('dp_diets',diets);lsS('dp_active',actDiet);A.rPiano();
};
A.delDiet=function(){
  if(Object.keys(diets).length<=1){A.notify('Serve almeno una dieta');return}
  if(!confirm('Eliminare "'+actDiet+'"?'))return;
  delete diets[actDiet];actDiet=Object.keys(diets)[0];
  lsS('dp_diets',diets);lsS('dp_active',actDiet);A.rPiano();
};
A.addMealPlan=function(){
  var d=actD();var ml=pianoDT==='gym'?d.gym:d.rest;
  ml.push({name:'Nuovo Pasto',time:'12:00',foods:[]});
  lsS('dp_diets',diets);A.rPiano();A.editPiano(ml.length-1);
};
A.rmPlanMeal=function(i){
  var d=actD();var ml=pianoDT==='gym'?d.gym:d.rest;
  if(!confirm('Eliminare "'+ml[i].name+'"?'))return;
  ml.splice(i,1);lsS('dp_diets',diets);A.rPiano();A.notify('Pasto eliminato ✓');
};

/* ---------- IMPORT / EXPORT ---------- */
A.expDiet=function(){
  var d=actD();
  var json=JSON.stringify({format:'dieta-pro-v4',name:actDiet,gym:d.gym,rest:d.rest},null,2);
  if(navigator.clipboard){
    navigator.clipboard.writeText(json).then(function(){A.notify('JSON copiato ✓')}).catch(function(){prompt('Copia:',json)});
  }else{prompt('Copia:',json)}
};

A.impDiet=function(){
  var raw=$('imp-txt').value.trim();
  if(!raw){A.notify('Incolla il JSON');return}
  try{
    var data=JSON.parse(raw);
    if(data.format!=='dieta-pro-v4'){A.notify('Formato non valido');return}
    var n=data.name||('Import '+new Date().toLocaleTimeString());
    if(diets[n])n=n+' (2)';
    diets[n]={gym:data.gym,rest:data.rest};actDiet=n;
    lsS('dp_diets',diets);lsS('dp_active',actDiet);
    A.closeMdl('m-import');A.rPiano();A.notify('Importata "'+n+'" ✓');
  }catch(e){A.notify('Errore JSON: '+e.message)}
};

/* ---------- REORDER ---------- */
A.openReorder=function(ctx){
  reCtx=ctx;var meals;
  if(ctx==='oggi')meals=todayMeals();else meals=planM(pianoDT);
  reList=[];
  for(var i=0;i<meals.length;i++) reList.push({idx:i,name:meals[i].name,time:meals[i].time});
  rReorder();A.openMdl('m-reorder');
};

function rReorder(){
  var h='';
  for(var i=0;i<reList.length;i++){
    h+='<div class="ro-item"><div class="rn">'+reList[i].name+' <span style="color:#6B6B7A;font-size:12px">'+reList[i].time+'</span></div>';
    h+='<div class="ra"><button class="rb" onclick="A.reMove('+i+',-1)">▲</button>';
    h+='<button class="rb" onclick="A.reMove('+i+',1)">▼</button></div></div>';
  }
  $('re-list').innerHTML=h;
}

A.reMove=function(i,dir){
  var ni=i+dir;if(ni<0||ni>=reList.length)return;
  var tmp=reList[i];reList[i]=reList[ni];reList[ni]=tmp;rReorder();
};

A.saveReorder=function(){
  var meals;
  if(reCtx==='oggi'){
    var ds=todayStr();if(!D[ds])D[ds]={};
    if(!D[ds].meals)D[ds].meals=deepCopy(todayMeals());
    meals=D[ds].meals;
  }else{var d=actD();meals=pianoDT==='gym'?d.gym:d.rest}
  var nm=[];
  for(var i=0;i<reList.length;i++) nm.push(meals[reList[i].idx]);
  if(reCtx==='oggi'){D[todayStr()].meals=nm;save();A.rOggi();A.rHome()}
  else{var d2=actD();if(pianoDT==='gym')d2.gym=nm;else d2.rest=nm;lsS('dp_diets',diets);A.rPiano()}
  A.closeMdl('m-reorder');A.notify('Ordine salvato ✓');
};

/* ---------- DIARIO ---------- */
A.rDiario=function(){
  var days=[];var now=new Date();
  for(var i=6;i>=0;i--){var d=new Date(now);d.setDate(d.getDate()-i);days.push(d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()))}
  var labels=[],gData=[],gCols=[];
  for(var j=0;j<days.length;j++){
    var ds=days[j];labels.push(ds.split('-').slice(1).join('/'));
    var dd=D[ds];
    if(dd&&dd.glycemia&&dd.glycemia.length>0){
      var s=0;for(var g=0;g<dd.glycemia.length;g++)s+=dd.glycemia[g].value;
      var avg=Math.round(s/dd.glycemia.length);
      gData.push(avg);gCols.push(avg>180||avg<70?'#EF6B6B':'#64D68A');
    }else{gData.push(null);gCols.push('#64D68A')}
  }
  if(glyChart){glyChart.destroy();glyChart=null}
  if(typeof Chart!=='undefined'){
    try{
      glyChart=new Chart($('ch-gly').getContext('2d'),{
        type:'line',
        data:{labels:labels,datasets:[{label:'Glicemia',data:gData,borderColor:'#64D68A',backgroundColor:'rgba(100,214,138,0.1)',fill:true,tension:0.3,pointRadius:5,pointBackgroundColor:gCols,spanGaps:true}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false},tooltip:{enabled:true}},
          scales:{y:{min:50,max:300,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#9898A6',font:{size:11}}},
                  x:{grid:{display:false},ticks:{color:'#9898A6',font:{size:11}}}}}
      });
    }catch(e){}
  }
  var tG=0,cG=0,inR=0;
  for(var k=0;k<days.length;k++){
    var dd2=D[days[k]];
    if(dd2&&dd2.glycemia){for(var gl=0;gl<dd2.glycemia.length;gl++){
      tG+=dd2.glycemia[gl].value;cG++;
      if(dd2.glycemia[gl].value>=70&&dd2.glycemia[gl].value<=180)inR++;
    }}
  }
  var aG=cG>0?Math.round(tG/cG):'--';
  var tir=cG>0?Math.round((inR/cG)*100):'--';
  $('di-stats').innerHTML='<div class="srow">'+
    '<div class="sbox"><div class="sv" style="color:#64D68A">'+aG+'</div><div class="sl">Media mg/dL</div></div>'+
    '<div class="sbox"><div class="sv" style="color:#6B94F0">'+tir+'%</div><div class="sl">TIR (70-180)</div></div>'+
    '<div class="sbox"><div class="sv">'+cG+'</div><div class="sl">Misurazioni</div></div></div>';
  var hh='';
  for(var z=days.length-1;z>=0;z--){
    var dds=days[z];var ddh=D[dds];if(!ddh)continue;
    hh+='<div class="card" style="margin-top:10px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">';
    hh+='<span style="font-weight:600">'+dateLbl(dds)+'</span>';
    if(ddh.dayType) hh+='<span class="badge '+(ddh.dayType==='gym'?'badge-g':'badge-b')+'">'+ddh.dayType.toUpperCase()+'</span>';
    hh+='</div>';
    if(ddh.glycemia&&ddh.glycemia.length>0){
      hh+='<div style="font-size:12px;color:#9898A6">';
      for(var hg=0;hg<ddh.glycemia.length;hg++){
        var ht=new Date(ddh.glycemia[hg].time);
        hh+=pad(ht.getHours())+':'+pad(ht.getMinutes())+' → '+ddh.glycemia[hg].value;
        if(hg<ddh.glycemia.length-1) hh+=' · ';
      }
      hh+=' mg/dL</div>';
    }
    hh+='</div>';
  }
  $('di-hist').innerHTML=hh;
};

/* ---------- CSV EXPORT ---------- */
A.expCSV=function(){
  var rows=['Data,Tipo,Ora,Glicemia,Pasto,Kcal,Carb,Prot,Grassi'];
  var ks=Object.keys(D).sort();
  for(var i=0;i<ks.length;i++){
    var ds=ks[i];var dd=D[ds];if(!dd)continue;
    var tp=dd.dayType||'gym';
    if(dd.glycemia){for(var g=0;g<dd.glycemia.length;g++){
      var t=new Date(dd.glycemia[g].time);
      rows.push(ds+','+tp+','+pad(t.getHours())+':'+pad(t.getMinutes())+','+dd.glycemia[g].value+',,,,');
    }}
    if(dd.meals){for(var m=0;m<dd.meals.length;m++){
      var ml=dd.meals[m];var mc=calcM(ml.foods);
      rows.push(ds+','+tp+','+ml.time+',,'+ml.name+','+mc.kcal+','+mc.carb+','+mc.prot+','+mc.fat);
    }}
  }
  var csv=rows.join('\n');
  if(navigator.clipboard){
    navigator.clipboard.writeText(csv).then(function(){A.notify('CSV copiato ✓')}).catch(function(){dlCSV(csv)});
  }else{dlCSV(csv)}
};

function dlCSV(csv){
  var b=new Blob([csv],{type:'text/csv'});
  var u=URL.createObjectURL(b);var a=document.createElement('a');
  a.href=u;a.download='dieta_ale_export.csv';a.click();URL.revokeObjectURL(u);
}

/* ---------- MODALS ---------- */
A.openMdl=function(id){$(id).classList.add('show')};
A.closeMdl=function(id){$(id).classList.remove('show')};

document.addEventListener('click',function(e){
  if(e.target.classList.contains('mbg')){
    e.target.classList.remove('show');A.stopScan();
  }
});

/* ---------- RESET ---------- */
A.resetAll=function(){
  if(!confirm('Cancellare TUTTI i dati?'))return;
  if(!confirm('Sei sicuro? Perdi tutto.'))return;
  localStorage.removeItem('dp_s');localStorage.removeItem('dp_d');
  localStorage.removeItem('dp_diets');localStorage.removeItem('dp_active');
  localStorage.removeItem('dp_cfood');location.reload();
};

/* ---------- INIT ---------- */
function init(){
  S=lsG('dp_s',deepCopy(DEF_S));
  D=lsG('dp_d',{});
  diets=lsG('dp_diets',{});
  actDiet=lsG('dp_active','Cut');
  cFoods=lsG('dp_cfood',[]);

  if(!diets[actDiet]) diets[actDiet]={gym:deepCopy(DEF_GYM),rest:deepCopy(DEF_REST)};
  lsS('dp_diets',diets);

  loadSettings();
  var now=new Date();calY=now.getFullYear();calM=now.getMonth();

  A.rHome();A.rOggi();A.rAgenda();A.rPiano();A.rDiario();

  setInterval(save,30000);

  document.addEventListener('input',function(){readSettings()});
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden'){
      if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
      save();
    }
  });
  window.addEventListener('pagehide',function(){save()});
}

/* ---------- CHART.JS DYNAMIC LOAD + BOOT ---------- */
function loadChart(cb){
  if(typeof Chart!=='undefined'){cb();return}
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
  s.onload=function(){cb()};
  s.onerror=function(){cb()};
  document.body.appendChild(s);
}

loadChart(function(){
  try{init()}catch(e){
    var d=document.getElementById('crash-screen');
    if(!d){d=document.createElement('div');d.id='crash-screen';document.body.appendChild(d)}
    d.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#1a0000;color:#ff4444;padding:32px 20px;font-family:monospace;font-size:14px;overflow:auto';
    d.innerHTML='<h2 style="color:#ff6666">Errore Init</h2><p>'+e.message+'</p><pre style="font-size:11px;color:#ff8888;margin-top:12px">'+(e.stack||'')+'</pre>';
  }
});
