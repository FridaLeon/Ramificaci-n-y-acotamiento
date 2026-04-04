/* ─── NAVIGATION ─── */
var currentPage='portada';
function goTo(id){
  document.getElementById(currentPage).classList.remove('active');
  document.getElementById('nav-'+currentPage).classList.remove('active');
  document.getElementById(id).classList.add('active');
  document.getElementById('nav-'+id).classList.add('active');
  currentPage=id;
  window.scrollTo(0,0);
  if(id==='desarrollo'){setTimeout(function(){initMap();initTree();},120);}
  if(id==='introduccion'){setTimeout(drawIntroTree,220);}
  if(id==='cuestionario'){buildQuiz();}
  // Hide PDF button on quiz page
  var fab=document.getElementById('pdf-fab');
  if(fab){fab.style.display=(id==='cuestionario')?'none':'flex';}
}

/* ─── PDF MODAL ─── */
var PDF_SECTIONS=[
  {chk:'chk-portada',      id:'portada'},
  {chk:'chk-introduccion', id:'introduccion'},
  {chk:'chk-desarrollo',   id:'desarrollo'},
  {chk:'chk-conclusiones', id:'conclusiones'},
  {chk:'chk-referencias',  id:'referencias'}
];

function openPdfModal(){
  document.getElementById('pdf-modal').classList.add('open');
  document.body.style.overflow='hidden';
}
function closePdfModal(){
  document.getElementById('pdf-modal').classList.remove('open');
  document.body.style.overflow='';
}

function executePrint(){
  /* 1 ── Collect selected sections */
  var selected=[];
  PDF_SECTIONS.forEach(function(s){
    if(document.getElementById(s.chk).checked) selected.push(s.id);
  });
  if(selected.length===0){alert('Selecciona al menos una sección para incluir en el PDF.');return;}
  closePdfModal();

  /* 2 ── Mark which pages to show */
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('print-include');});
  selected.forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.classList.add('print-include');
  });

  /* 3 ── Only pre-process if desarrollo is selected */
  var needsDes = selected.indexOf('desarrollo')!==-1;
  if(!needsDes){ setTimeout(function(){window.print();setTimeout(cleanupPrint,1200);},150); return; }

  /* 4 ── Make sure map and tree are rendered before we snapshot them */
  initMap();

  /* Render complete B&B tree */
  initTree();
  var allVis=[];
  for(var k=0;k<tN.length;k++) allVis.push(k);
  renderTree(allVis);

  /* Render intro tree fully too */
  var itc=document.getElementById('intro-tree');
  if(itc){iProg=iN.length;clearInterval(iT);rIT(itc,itc.getContext('2d'));}

  /* 5 ── Small delay so canvas pixels are ready, then snapshot */
  setTimeout(function(){

    /* ── 5a: MAP snapshot ── */
    var mapC=document.getElementById('map-canvas');
    /* Draw the optimal route on the map for the PDF */
    mapShowOptimal();
    var mapImg=null;
    if(mapC && mapC.width>0){
      try{ mapImg=mapC.toDataURL('image/png'); }catch(e){}
    }

    /* ── 5b: TREE snapshot ── */
    var treeC=document.getElementById('tree-canvas');
    var treeImg=null;
    if(treeC && treeC.width>0){
      try{ treeImg=treeC.toDataURL('image/png'); }catch(e){}
    }

    /* ── 5c: Inject a hidden print-only block inside #desarrollo ── */
    var old=document.getElementById('pdf-static-block');
    if(old) old.parentNode.removeChild(old);

    var div=document.createElement('div');
    div.id='pdf-static-block';

    /* Map image */
    var mapHTML='<div class="pdf-static-section"><h3 class="pdf-static-h">🗺️ Mapa de la Gira — Ruta Óptima</h3>';
    if(mapImg){
      mapHTML+='<img src="'+mapImg+'" class="pdf-static-img" alt="Mapa gira Café Tacvba">';
    } else {
      mapHTML+=mapFallbackTable();
    }
    mapHTML+='<p class="pdf-static-caption">Ruta óptima: CDMX → PUE → QRO → GDL → MTY → CDMX | 2,180 km totales</p></div>';

    /* All step panels as static text */
    var stepsHTML='<div class="pdf-static-section"><h3 class="pdf-static-h">Resolución Paso a Paso con Branch &amp; Bound</h3>';
    var stepTitles=[
      'Paso 0 — Nodo Raíz: Construimos la Matriz Inicial',
      'Paso 1 — Reducción de Filas y Columnas',
      'Paso 2 — Primera Ramificación: ¿Qué tramo definimos primero?',
      'Paso 3 — Evaluar N1: El bus va de Guadalajara a Monterrey',
      'Paso 4 — Profundización: Completando el itinerario de la gira',
      'Paso 5 — ¡El Itinerario Óptimo de la Gira está confirmado!'
    ];
    var stepBodies=[
      '<p>El manager de Café Tacvba presenta la matriz de distancias entre las 5 ciudades sede. El <strong>nodo raíz</strong> del árbol B&B representa el espacio completo de posibles itinerarios — todavía no se ha decidido el orden de visita de ninguna ciudad.</p><pre class="pdf-code">Matriz de costos de la gira C[5×5] (km):\n          CDMX  GDL   MTY   PUE   QRO\nCDMX (1) [  ∞    540   920   130   200 ]\nGDL  (2) [ 540    ∞    460   670   340 ]\nMTY  (3) [ 920   460    ∞   1050   730 ]\nPUE  (4) [ 130   670  1050    ∞    330 ]\nQRO  (5) [ 200   340   730   330    ∞  ]\n\nItinerario actual: sin definir (∅)\nLB: pendiente | Rutas posibles: (5-1)!/2 = 12</pre>',
      '<p>Para obtener la cota inferior del nodo raíz, reducimos la matriz restando el mínimo de cada fila y luego de cada columna.</p><pre class="pdf-code">REDUCCIÓN DE FILAS:\nFila 1 (CDMX): mín(540,920,130,200)=130  → -130\nFila 2 (GDL):  mín(540,460,670,340)=340  → -340\nFila 3 (MTY):  mín(920,460,1050,730)=460 → -460\nFila 4 (PUE):  mín(130,670,1050,330)=130 → -130\nFila 5 (QRO):  mín(200,340,730,330)=200  → -200\n               ─────────────────────\n               Σ filas = 1,260 km\n\nREDUCCIÓN DE COLUMNAS:\nCol MTY (3): mín(790,120,920,530)=120     → -120\nOtras columnas: mínimos ya son 0\n               Σ cols = 120 km\n\n══ LB RAÍZ = 1,260 + 120 = 1,380 km ══</pre><p><strong>Interpretación:</strong> El autobús no puede recorrer menos de 1,380 km en ningún itinerario posible.</p>',
      '<p>Elegimos el tramo con mayor "penalización" por no incluirlo. Para cada celda con valor 0 en la matriz reducida calculamos: mín(fila sin col) + mín(col sin fila).</p><pre class="pdf-code">Tramos candidatos (celdas con valor 0):\n──────────────────────────────────────────────────\nCDMX→PUE (1→4): 70+130 = 200\nGDL→QRO  (2→5): 0+70   =  70\nMTY→GDL  (3→2): 270+140= 410\nGDL→MTY  (2→3): 0+530  = 530  ◄ MÁXIMO → elegido\nPUE→CDMX (4→1): 0+0    =   0\nQRO→CDMX (5→1): 0+0    =   0\n──────────────────────────────────────────────────\nCreamos dos subproblemas:\n  N1: incluir GDL→MTY  → LB(N1) = a calcular\n  N2: excluir GDL→MTY  → LB(N2) = 1,380+530 = 1,910 km</pre>',
      '<p>Al incluir el tramo GDL→MTY (2→3), eliminamos fila 2 y columna 3, ponemos ∞ en (3,2) para evitar subtour y reducimos la submatriz.</p><pre class="pdf-code">Submatriz tras confirmar GDL→MTY:\n          CDMX  GDL   PUE   QRO\nCDMX (1) [  ∞    410     0    70 ]\nMTY  (3) [ 460    ∞    590   270 ]  ← (3,2)=∞\nPUE  (4) [   0   540    ∞    200 ]\nQRO  (5) [   0   140   130    ∞  ]\n\nReducción filas: MTY(3)=270 → Σ=270\nReducción cols:  GDL(2)=140 → Σ=140\n\nLB(N1) = 1,380+0+270+140 = 1,790 km\nTramos confirmados: { GDL→MTY }</pre>',
      '<p>El algoritmo continúa ramificando, podando nodos cuyo LB supera el mejor costo conocido o que generan subtours.</p><pre class="pdf-code">Árbol de búsqueda — Gira Café Tacvba:\n══════════════════════════════════════════════════\nNodo    Tramos confirmados            LB       Estado\n──────────────────────────────────────────────────\nRaíz    { }                           1,380 km Explorado\nN1      { GDL→MTY }                   1,790 km Explorado\nN2      { ¬GDL→MTY }                  1,910 km PODADO ✂\nN3      { GDL→MTY, PUE→CDMX }        1,790 km Explorado\nN4      { GDL→MTY, CDMX→PUE }        ∞        PODADO ✂ subtour\nN5      { GDL→MTY, QRO→CDMX }        1,790 km Explorado\nN6      { GDL→MTY, ¬QRO→CDMX }       1,910 km PODADO ✂\nN7      { ..., QRO→GDL }             1,790 km Explorado\nN8      { ..., MTY→CDMX }            ∞        PODADO ✂ subtour\nN9      { ..., CDMX→QRO }            1,860 km Explorado\nN10     { ..., ¬CDMX→QRO }           1,910 km PODADO ✂\nN11     { ..., MTY→QRO }             1,790 km Explorado\nN12 ★   Itinerario completo           2,180 km ← ÓPTIMO\n══════════════════════════════════════════════════\nNodos explorados: 13 de 64 → ahorro del 80%</pre>',
      '<p>El algoritmo terminó. La cola de nodos activos está vacía y el itinerario óptimo está confirmado matemáticamente.</p><pre class="pdf-code">🎸 ITINERARIO ÓPTIMO — CAFÉ TACVBA "CUATRO CAMINOS: LA VUELTA"\n══════════════════════════════════════════════════════\nOrden de sedes: CDMX → PUE → QRO → GDL → MTY → CDMX\n\nDesglose de tramos:\n  CDMX → PUE  :   130 km  (concierto en Puebla)\n  PUE  → QRO  :   330 km  (concierto en Querétaro)\n  QRO  → GDL  :   340 km  (concierto en Guadalajara)\n  GDL  → MTY  :   460 km  (concierto en Monterrey)\n  MTY  → CDMX :   920 km  (regreso a Ciudad de México)\n                ──────────\n  TOTAL        : 2,180 km  ✓\n\nGarantía matemática: ningún otro orden produce\nun recorrido menor a 2,180 km.\n══════════════════════════════════════════════════════</pre>'
    ];
    for(var si=0;si<6;si++){
      stepsHTML+='<div class="pdf-step-block"><div class="pdf-step-num">Paso '+si+'</div><div class="pdf-step-title">'+stepTitles[si]+'</div>'+stepBodies[si]+'</div>';
    }
    stepsHTML+='</div>';

    /* Tree image */
    var treeHTML='<div class="pdf-static-section"><h3 class="pdf-static-h">Árbol de Branch &amp; Bound — Planificación de la Gira</h3>';
    if(treeImg){
      treeHTML+='<img src="'+treeImg+'" class="pdf-static-img" alt="Árbol Branch and Bound">';
    } else {
      treeHTML+=treeFallbackText();
    }
    treeHTML+='<p class="pdf-static-caption">Verde = nodos explorados | Naranja = cotas altas | Rojo = podados | Dorado ★ = óptimo encontrado</p></div>';

    div.innerHTML = mapHTML + stepsHTML + treeHTML;
    document.getElementById('desarrollo').appendChild(div);

    /* 6 ── Print */
    setTimeout(function(){
      window.print();
      setTimeout(cleanupPrint, 1200);
    },300);

  }, 350);
}

function mapFallbackTable(){
  return '<table class="pdf-map-table"><thead><tr><th>De \\ Hacia</th><th>CDMX</th><th>GDL</th><th>MTY</th><th>PUE</th><th>QRO</th></tr></thead><tbody>'
    +'<tr><td><strong>CDMX</strong></td><td>—</td><td>540</td><td>920</td><td>130</td><td>200</td></tr>'
    +'<tr><td><strong>GDL</strong></td><td>540</td><td>—</td><td>460</td><td>670</td><td>340</td></tr>'
    +'<tr><td><strong>MTY</strong></td><td>920</td><td>460</td><td>—</td><td>1050</td><td>730</td></tr>'
    +'<tr><td><strong>PUE</strong></td><td>130</td><td>670</td><td>1050</td><td>—</td><td>330</td></tr>'
    +'<tr><td><strong>QRO</strong></td><td>200</td><td>340</td><td>730</td><td>330</td><td>—</td></tr>'
    +'</tbody></table>'
    +'<p style="margin-top:.5rem;font-size:.85rem;color:#555">Ruta óptima: <strong>CDMX → PUE (130) → QRO (330) → GDL (340) → MTY (460) → CDMX (920) = 2,180 km</strong></p>';
}

function treeFallbackText(){
  return '<pre class="pdf-code" style="font-size:7.5pt">Árbol B&B — Gira Café Tacvba:\n'
    +'Raíz {LB=1380}──┬── N1 incl(GDL→MTY) {LB=1790}\n'
    +'                │        ├── N3 incl(PUE→CDMX) {LB=1790}\n'
    +'                │        │       ├── N7 incl(QRO→GDL) {LB=1790}\n'
    +'                │        │       │       └── N11 incl(MTY→QRO) {LB=1790}\n'
    +'                │        │       │               └── N12 ★ ÓPTIMO: 2,180 km\n'
    +'                │        │       └── N8 incl(MTY→CDMX) ∞ PODADO (subtour)\n'
    +'                │        ├── N4 incl(CDMX→PUE) ∞ PODADO (subtour)\n'
    +'                │        ├── N5 incl(QRO→CDMX) {LB=1790}\n'
    +'                │        │       ├── N9  incl(CDMX→QRO) {LB=1860}\n'
    +'                │        │       └── N10 excl(CDMX→QRO) 1910 PODADO\n'
    +'                │        └── N6 excl(QRO→CDMX) 1910 PODADO\n'
    +'                └── N2 excl(GDL→MTY) {LB=1910} PODADO\n'
    +'</pre>';
}

function cleanupPrint(){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('print-include');});
  var bl=document.getElementById('pdf-static-block');
  if(bl) bl.parentNode.removeChild(bl);
}

/* ─── CURSOR ─── */
var curEl=document.getElementById('cur'),ringEl=document.getElementById('cur-ring');
var mx=-100,my=-100,rx=-100,ry=-100;
document.addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;curEl.style.left=mx+'px';curEl.style.top=my+'px';});
(function ringLoop(){rx+=(mx-rx)*.13;ry+=(my-ry)*.13;ringEl.style.left=rx+'px';ringEl.style.top=ry+'px';requestAnimationFrame(ringLoop);})();
document.addEventListener('mouseover',function(e){if(e.target.closest('button,a,.obj-card,.idx-card,.badge,.q-opt'))curEl.classList.add('big');});
document.addEventListener('mouseout',function(e){if(e.target.closest('button,a,.obj-card,.idx-card,.badge,.q-opt'))curEl.classList.remove('big');});

/* ─── STARS ─── */
(function(){
  var c=document.getElementById('star-c'),ctx=c.getContext('2d'),stars=[];
  function resize(){c.width=c.offsetWidth||window.innerWidth;c.height=c.offsetHeight||window.innerHeight;stars=[];for(var i=0;i<130;i++)stars.push({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.5+.3,a:Math.random(),da:(Math.random()*.007+.002)*(Math.random()<.5?1:-1),vx:(Math.random()-.5)*.05,vy:(Math.random()-.5)*.05});}
  function draw(){if(!c.width){requestAnimationFrame(draw);return;}ctx.clearRect(0,0,c.width,c.height);stars.forEach(function(s){s.x=(s.x+s.vx+c.width)%c.width;s.y=(s.y+s.vy+c.height)%c.height;s.a+=s.da;if(s.a>=1||s.a<=0)s.da*=-1;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle='rgba(245,234,216,'+Math.max(.05,s.a).toFixed(2)+')';ctx.fill();});requestAnimationFrame(draw);}
  resize();draw();window.addEventListener('resize',resize);
})();

/* ─── GRID ─── */
(function(){
  var c=document.getElementById('grid-c'),ctx=c.getContext('2d'),off=0;
  function resize(){c.width=c.offsetWidth||window.innerWidth;c.height=c.offsetHeight||window.innerHeight;}
  function draw(){if(!c.width){requestAnimationFrame(draw);return;}ctx.clearRect(0,0,c.width,c.height);var step=62,o=off%step;ctx.strokeStyle='rgba(184,115,51,1)';ctx.lineWidth=.5;for(var x=o;x<c.width;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke();}for(var y=o;y<c.height;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke();}ctx.fillStyle='rgba(212,160,23,.22)';for(var xi=o;xi<c.width;xi+=step)for(var yi=o;yi<c.height;yi+=step){ctx.beginPath();ctx.arc(xi,yi,1.4,0,Math.PI*2);ctx.fill();}off+=.16;requestAnimationFrame(draw);}
  resize();draw();window.addEventListener('resize',resize);
})();

/* ─── STEP TABS ─── */
function showStep(idx,btn){document.querySelectorAll('.stab').forEach(function(b){b.classList.remove('active');});document.querySelectorAll('.spanel').forEach(function(p){p.classList.remove('active');});btn.classList.add('active');document.getElementById('sp'+idx).classList.add('active');}

/* ─── INTRO TREE ─── */
var iN=[{x:.50,y:.10,label:'Raíz',sub:'LB=1380',c:'#1a6b5a',p:-1},{x:.27,y:.37,label:'N1',sub:'LB=1790',c:'#1a6b5a',p:0},{x:.73,y:.37,label:'N2',sub:'LB=1910',c:'#b87333',p:0},{x:.13,y:.66,label:'N3',sub:'LB=1790',c:'#1a6b5a',p:1},{x:.42,y:.66,label:'N4 ✕',sub:'SUBTOUR',c:'#8b3a1e',p:1},{x:.58,y:.66,label:'N5',sub:'LB=1790',c:'#1a6b5a',p:2},{x:.87,y:.66,label:'N6 ✕',sub:'PODADO',c:'#8b3a1e',p:2},{x:.13,y:.92,label:'★ ÓPT',sub:'2180 km',c:'#d4a017',p:3}];
var iProg=0,iT=null;
function drawIntroTree(){var canvas=document.getElementById('intro-tree');if(!canvas)return;var ctx=canvas.getContext('2d');canvas.width=canvas.offsetWidth||580;canvas.height=290;iProg=0;clearInterval(iT);iT=setInterval(function(){iProg++;rIT(canvas,ctx);if(iProg>=iN.length)clearInterval(iT);},280);}
function rIT(canvas,ctx){var W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);ctx.fillStyle='#fafaf7';ctx.fillRect(0,0,W,H);for(var i=1;i<iProg;i++){var n=iN[i],par=iN[n.p];ctx.beginPath();ctx.strokeStyle=n.c==='#8b3a1e'?'rgba(139,58,30,.35)':'rgba(26,107,90,.45)';ctx.lineWidth=1.8;ctx.setLineDash(n.c==='#8b3a1e'?[5,4]:[]);ctx.moveTo(par.x*W,par.y*H+18);ctx.lineTo(n.x*W,n.y*H-18);ctx.stroke();ctx.setLineDash([]);}for(var j=0;j<iProg;j++){var nd=iN[j],nx=nd.x*W,ny=nd.y*H;ctx.shadowColor='rgba(0,0,0,.18)';ctx.shadowBlur=8;ctx.beginPath();ctx.ellipse(nx,ny,46,18,0,0,Math.PI*2);ctx.fillStyle=nd.c;ctx.fill();ctx.shadowBlur=0;if(j===iProg-1){ctx.strokeStyle='#d4a017';ctx.lineWidth=2.5;ctx.stroke();}ctx.fillStyle='white';ctx.textAlign='center';ctx.font='bold 9px Space Mono,monospace';ctx.fillText(nd.label,nx,ny-2);ctx.font='7.5px Space Mono,monospace';ctx.fillStyle='rgba(255,255,255,.8)';ctx.fillText(nd.sub,nx,ny+9);}}

/* ─── MAP ─── */
var cities=[{name:'CDMX',x:400,y:270},{name:'GDL',x:230,y:185},{name:'MTY',x:470,y:100},{name:'PUE',x:480,y:300},{name:'QRO',x:360,y:190}];
var distM=[[0,540,920,130,200],[540,0,460,670,340],[920,460,0,1050,730],[130,670,1050,0,330],[200,340,730,330,0]];
var optRoute=[0,3,4,1,2,0],mapCanvas,mapCtx,mapTimer=null;
function initMap(){mapCanvas=document.getElementById('map-canvas');if(!mapCanvas)return;mapCanvas.width=mapCanvas.offsetWidth||760;mapCanvas.height=390;drawMapBase();}
function drawMapBase(){var W=mapCanvas.width,H=mapCanvas.height;mapCtx=mapCanvas.getContext('2d');var g=mapCtx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#cce4f5');g.addColorStop(1,'#a8d0e6');mapCtx.fillStyle=g;mapCtx.fillRect(0,0,W,H);[[90,55,130,95,'rgba(140,180,100,.2)'],[280,28,190,135,'rgba(120,170,90,.17)'],[550,65,150,88,'rgba(140,180,100,.19)'],[45,265,115,105,'rgba(130,175,95,.19)'],[610,235,125,125,'rgba(120,170,90,.17)']].forEach(function(p){mapCtx.beginPath();mapCtx.ellipse(p[0]+p[2]/2,p[1]+p[3]/2,p[2]/2,p[3]/2,0,0,Math.PI*2);mapCtx.fillStyle=p[4];mapCtx.fill();});mapCtx.strokeStyle='rgba(255,255,255,.32)';mapCtx.lineWidth=.5;for(var x=0;x<W;x+=75){mapCtx.beginPath();mapCtx.moveTo(x,0);mapCtx.lineTo(x,H);mapCtx.stroke();}for(var y=0;y<H;y+=75){mapCtx.beginPath();mapCtx.moveTo(0,y);mapCtx.lineTo(W,y);mapCtx.stroke();}mapCtx.strokeStyle='rgba(0,0,0,.35)';mapCtx.lineWidth=2;mapCtx.beginPath();mapCtx.moveTo(25,H-22);mapCtx.lineTo(115,H-22);mapCtx.stroke();mapCtx.fillStyle='#444';mapCtx.font='9px Space Mono,monospace';mapCtx.textAlign='center';mapCtx.fillText('~350 km',70,H-10);drawCities();}
function drawCities(){cities.forEach(function(c){mapCtx.beginPath();mapCtx.arc(c.x+2,c.y+2,11,0,Math.PI*2);mapCtx.fillStyle='rgba(0,0,0,.18)';mapCtx.fill();mapCtx.beginPath();mapCtx.arc(c.x,c.y,11,0,Math.PI*2);mapCtx.fillStyle='#8b3a1e';mapCtx.fill();mapCtx.strokeStyle='white';mapCtx.lineWidth=2.5;mapCtx.stroke();mapCtx.beginPath();mapCtx.arc(c.x,c.y,16,0,Math.PI*2);mapCtx.strokeStyle='rgba(139,58,30,.28)';mapCtx.lineWidth=1.2;mapCtx.stroke();mapCtx.fillStyle='#1a1008';mapCtx.font='bold 12px Crimson Pro,serif';mapCtx.textAlign='center';mapCtx.fillText(c.name,c.x,c.y+27);});}
function drawRoute(route,color,width,alpha,dashed){mapCtx.save();mapCtx.strokeStyle=color;mapCtx.lineWidth=width;mapCtx.globalAlpha=alpha;if(dashed)mapCtx.setLineDash([9,5]);for(var k=0;k<route.length-1;k++){var a=cities[route[k]],b=cities[route[k+1]];mapCtx.beginPath();mapCtx.moveTo(a.x,a.y);mapCtx.lineTo(b.x,b.y);mapCtx.stroke();var ang=Math.atan2(b.y-a.y,b.x-a.x),mx2=a.x*.44+b.x*.56,my2=a.y*.44+b.y*.56;mapCtx.beginPath();mapCtx.moveTo(mx2,my2);mapCtx.lineTo(mx2-11*Math.cos(ang-Math.PI/6),my2-11*Math.sin(ang-Math.PI/6));mapCtx.lineTo(mx2-11*Math.cos(ang+Math.PI/6),my2-11*Math.sin(ang+Math.PI/6));mapCtx.closePath();mapCtx.fillStyle=color;mapCtx.fill();}mapCtx.setLineDash([]);mapCtx.restore();drawCities();}
function mapShowAll(){stopMapAnim();drawMapBase();var rs=[[0,1,2,3,4,0],[0,1,3,2,4,0],[0,2,1,4,3,0],[0,3,1,2,4,0],[0,4,3,2,1,0]],cs=['#4a7fa5','#5a8a4a','#a55a4a','#7a4a9a','#4a9a9a'];rs.forEach(function(r,i){drawRoute(r,cs[i],2,.58,true);});document.getElementById('map-status').textContent='🕸 5 posibles rutas de gira de las 12 totales. La óptima se muestra con "Ruta óptima".';}
function mapShowOptimal(){stopMapAnim();drawMapBase();drawRoute(optRoute,'#1a6b5a',4,.95,false);var t=0;for(var k=0;k<optRoute.length-1;k++)t+=distM[optRoute[k]][optRoute[k+1]];document.getElementById('map-status').textContent='⭐ Gira óptima de Café Tacvba: CDMX→PUE→QRO→GDL→MTY→CDMX | Total: '+t+' km';}
var mapStep2=0;
function mapAnimate(){stopMapAnim();drawMapBase();mapStep2=0;var segs=[[0,3],[3,4],[4,1],[1,2],[2,0]],legs=[130,330,340,460,920],labs=['CDMX','PUE','QRO','GDL','MTY','CDMX'];function step(){if(mapStep2>=segs.length){document.getElementById('map-status').textContent='🎸 ¡Gira completa! Café Tacvba recorrió 2,180 km en su tour nacional.';return;}drawMapBase();for(var i=0;i<=mapStep2;i++)drawRoute([segs[i][0],segs[i][1]],'#1a6b5a',4,.92,false);var cur=cities[segs[mapStep2][1]];mapCtx.beginPath();mapCtx.arc(cur.x,cur.y,22,0,Math.PI*2);mapCtx.strokeStyle='#d4a017';mapCtx.lineWidth=3;mapCtx.stroke();document.getElementById('map-status').textContent='🎵 '+labs.slice(0,mapStep2+2).join(' → ')+' | +'+legs[mapStep2]+' km en autobús';mapStep2++;mapTimer=setTimeout(step,920);}step();}
function mapClear(){stopMapAnim();drawMapBase();document.getElementById('map-status').textContent='';}
function stopMapAnim(){if(mapTimer){clearTimeout(mapTimer);mapTimer=null;}}

/* ─── B&B TREE ─── */
var tN=[{px:.500,py:.045,label:'Raíz',sub:'LB=1,380 km',c:'#1a6b5a',par:-1,el:'',pruned:false},{px:.260,py:.185,label:'N1:incl(2→3)',sub:'LB=1,790 km',c:'#1a6b5a',par:0,el:'incluir 2→3',pruned:false},{px:.740,py:.185,label:'N2:excl(2→3)',sub:'LB=1,910 km',c:'#b87333',par:0,el:'excluir 2→3',pruned:false},{px:.130,py:.355,label:'N3:incl(4→1)',sub:'LB=1,790 km',c:'#1a6b5a',par:1,el:'incluir 4→1',pruned:false},{px:.390,py:.355,label:'N4:incl(1→4)',sub:'✕ SUBTOUR',c:'#8b3a1e',par:1,el:'incluir 1→4',pruned:true},{px:.620,py:.355,label:'N5:incl(5→1)',sub:'LB=1,790 km',c:'#1a6b5a',par:2,el:'incluir 5→1',pruned:false},{px:.860,py:.355,label:'N6:excl(5→1)',sub:'✕ PODADO',c:'#8b3a1e',par:2,el:'excluir 5→1',pruned:true},{px:.065,py:.530,label:'N7:incl(5→2)',sub:'LB=1,790 km',c:'#1a6b5a',par:3,el:'incluir 5→2',pruned:false},{px:.200,py:.530,label:'N8:incl(3→1)',sub:'✕ SUBTOUR',c:'#8b3a1e',par:3,el:'incluir 3→1',pruned:true},{px:.570,py:.530,label:'N9:incl(1→5)',sub:'LB=1,860 km',c:'#b87333',par:5,el:'incluir 1→5',pruned:false},{px:.700,py:.530,label:'N10:excl(1→5)',sub:'✕ PODADO',c:'#8b3a1e',par:5,el:'excluir 1→5',pruned:true},{px:.065,py:.720,label:'N11:incl(3→5)',sub:'LB=1,790 km',c:'#1a6b5a',par:7,el:'incluir 3→5',pruned:false},{px:.065,py:.920,label:'★ ÓPTIMO',sub:'2,180 km ✓',c:'#d4a017',par:11,el:'CDMX→...→CDMX',pruned:false}];
var tInfo=['📍 Nodo Raíz: LB=1260(filas)+120(cols)=1,380 km. Mínimo absoluto posible.','🔀 Ramificamos arco (2→3) GDL→MTY — mayor penalización=530.','🔀 N2 excluye (2→3). LB=1,910 km. Exploramos N1 primero.','🔀 Desde N1, arco (4→1) PUE→CDMX. N3 hereda LB=1,790 km.','✂️ N4 incluye (1→4): formaría subtour 1→4→1. PODADO.','🔀 Desde N2, incluir (5→1) QRO→CDMX → N5 con LB=1,790 km.','✂️ N6 excluye (5→1). LB sube demasiado. PODADO.','🔀 Desde N3, incluir (5→2) QRO→GDL → N7.','✂️ N8 incluye (3→1): formaría subtour. PODADO.','🔀 N9 incluye (1→5) CDMX→QRO. LB=1,860. Aún competitivo.','✂️ N10 excluye (1→5). LB supera nuestro bound. PODADO.','🔀 N11 incluye (3→5) MTY→QRO. La ruta se completa.','🏆 ÓPTIMO: CDMX→PUE→QRO→GDL→MTY→CDMX=2,180 km. 13 de 64 nodos (ahorro 80%).'];
var tStep=0,tAutoTimer=null,tAutoOn=false,tCanvas2,tCtx2;
function initTree(){tCanvas2=document.getElementById('tree-canvas');if(!tCanvas2)return;tCanvas2.width=tCanvas2.offsetWidth||800;tCanvas2.height=540;tCtx2=tCanvas2.getContext('2d');tStep=0;renderTree([]);document.getElementById('tree-info').textContent='Presiona ▶ para comenzar.';}
function renderTree(vis){var W=tCanvas2.width,H=tCanvas2.height;tCtx2.clearRect(0,0,W,H);tCtx2.fillStyle='#fafaf8';tCtx2.fillRect(0,0,W,H);for(var i=0;i<vis.length;i++){var nd=tN[vis[i]];if(nd.par<0)continue;var par=tN[nd.par],nx=nd.px*W,ny=nd.py*H,px2=par.px*W,py2=par.py*H;tCtx2.beginPath();tCtx2.strokeStyle=nd.pruned?'rgba(139,58,30,.3)':'rgba(26,107,90,.42)';tCtx2.lineWidth=1.8;tCtx2.setLineDash(nd.pruned?[5,4]:[]);var cpx=(nx+px2)/2,cpy=(ny+py2)/2;tCtx2.moveTo(px2,py2+17);tCtx2.quadraticCurveTo(cpx,cpy,nx,ny-17);tCtx2.stroke();tCtx2.setLineDash([]);tCtx2.fillStyle='#999';tCtx2.font='7.5px Space Mono,monospace';tCtx2.textAlign='center';tCtx2.fillText(nd.el,(nx+px2)/2+8,(ny+py2)/2-4);}for(var j=0;j<vis.length;j++){var vn=tN[vis[j]],vx=vn.px*W,vy=vn.py*H,isNew=(j===vis.length-1);tCtx2.shadowColor='rgba(0,0,0,.18)';tCtx2.shadowBlur=10;tCtx2.beginPath();tCtx2.ellipse(vx,vy,54,18,0,0,Math.PI*2);tCtx2.fillStyle=vn.c;tCtx2.fill();tCtx2.shadowBlur=0;if(isNew){tCtx2.beginPath();tCtx2.ellipse(vx,vy,60,24,0,0,Math.PI*2);tCtx2.strokeStyle=vn.c==='#d4a017'?'#f0c040':'rgba(212,160,23,.65)';tCtx2.lineWidth=2.5;tCtx2.stroke();}tCtx2.fillStyle='white';tCtx2.textAlign='center';tCtx2.font='bold 8px Space Mono,monospace';tCtx2.fillText(vn.label,vx,vy-2);tCtx2.font='7px Space Mono,monospace';tCtx2.fillStyle='rgba(255,255,255,.8)';tCtx2.fillText(vn.sub,vx,vy+9);}}
function treeNext(){if(tStep>=tN.length)return;tStep++;var vis=[];for(var i=0;i<tStep;i++)vis.push(i);renderTree(vis);document.getElementById('tree-info').textContent=tInfo[tStep-1]||'';}
function treeReset(){clearInterval(tAutoTimer);tAutoOn=false;document.getElementById('autobtn').textContent='⏩ Auto';tStep=0;if(tCtx2){tCtx2.clearRect(0,0,tCanvas2.width,tCanvas2.height);renderTree([]);}document.getElementById('tree-info').textContent='Presiona "▶ Siguiente nodo" para construir el árbol paso a paso.';}
function treeAuto(){if(tAutoOn){clearInterval(tAutoTimer);tAutoOn=false;document.getElementById('autobtn').textContent='⏩ Auto';}else{tAutoOn=true;document.getElementById('autobtn').textContent='⏸ Pausar';tAutoTimer=setInterval(function(){if(tStep>=tN.length){clearInterval(tAutoTimer);tAutoOn=false;document.getElementById('autobtn').textContent='⏩ Auto';return;}treeNext();},820);}}

/* ─── QUIZ ─── */
var QUIZ=[
  {q:'¿Cuál es el objetivo principal del Problema del Agente Viajero (TSP)?',opts:['Maximizar el número de ciudades visitadas en un tiempo límite.','Minimizar la distancia total recorriendo cada ciudad exactamente una vez y regresando al origen.','Encontrar la ruta más rápida entre dos ciudades específicas.','Minimizar el costo de los vuelos entre ciudades.'],correct:1,explain:'El TSP busca la ruta de menor costo que visita cada nodo del grafo <strong>exactamente una vez</strong> y regresa al punto de partida. Esta es la formulación clásica del problema.'},
  {q:'¿Cuántas rutas posibles existen para un TSP con 5 ciudades?',opts:['5! = 120 rutas','(5-1)!/2 = 12 rutas','5 × 4 = 20 rutas','2⁵ = 32 rutas'],correct:1,explain:'Para n ciudades, el número de rutas en TSP simétrico es <strong>(n-1)!/2</strong>. Con n=5: (4!)/2 = 24/2 = <strong>12 rutas</strong>. El factor (n-1) fija la ciudad de inicio y el /2 elimina rutas inversas equivalentes.'},
  {q:'¿Qué es la "poda" (pruning) en Branch & Bound?',opts:['Dividir un problema en dos subproblemas más pequeños.','Calcular la cota inferior de un nodo del árbol.','Eliminar ramas del árbol cuya cota inferior supera la mejor solución conocida.','Seleccionar el arco con mayor peso para incluirlo primero.'],correct:2,explain:'La <strong>poda</strong> descarta ramas completas del árbol cuando su LB es mayor o igual a la mejor solución factible encontrada. Así se evita explorar regiones que no pueden contener el óptimo.'},
  {q:'¿Cuál es la cota inferior (LB) del nodo raíz en el problema de las 5 ciudades mexicanas?',opts:['1,260 km','1,790 km','2,180 km','1,380 km'],correct:3,explain:'La reducción de la matriz produce: <strong>1,260 km</strong> (reducción de filas) + <strong>120 km</strong> (reducción de columnas) = <strong>1,380 km</strong>. Este es el límite inferior global: ninguna ruta puede costar menos.'},
  {q:'¿Qué significa que un arco genere un "subtour" en el TSP?',opts:['Que el arco tiene el menor costo en la matriz.','Que incluir ese arco formaría un ciclo que no recorre todas las ciudades.','Que el arco conecta dos ciudades muy alejadas.','Que el arco ya fue incluido en la solución óptima.'],correct:1,explain:'Un <strong>subtour</strong> es un ciclo que cierra un subconjunto de ciudades antes de visitar todas. Por ejemplo, incluir (1→4) y (4→1) formaría el ciclo 1→4→1 sin pasar por las demás ciudades. Estos nodos se podan inmediatamente.'},
  {q:'¿Cuál es la solución óptima del TSP para las 5 ciudades mexicanas?',opts:['CDMX→GDL→MTY→PUE→QRO→CDMX con 2,580 km','CDMX→QRO→GDL→MTY→PUE→CDMX con 2,190 km','CDMX→PUE→QRO→GDL→MTY→CDMX con 2,180 km','CDMX→MTY→GDL→QRO→PUE→CDMX con 2,380 km'],correct:2,explain:'La ruta óptima es <strong>CDMX→PUE→QRO→GDL→MTY→CDMX</strong>: 130+330+340+460+920 = <strong>2,180 km</strong>. B&B confirmó que ningún nodo con LB menor puede mejorarla.'},
  {q:'¿Qué ventaja principal tiene Branch & Bound sobre la fuerza bruta?',opts:['Siempre encuentra la solución en tiempo polinomial.','Encuentra una solución aproximada mucho más rápido.','Elimina sistemáticamente regiones del espacio de búsqueda que no pueden contener el óptimo.','Usa programación dinámica para reutilizar cálculos previos.'],correct:2,explain:'La principal ventaja de B&B es la <strong>poda inteligente</strong>: al calcular cotas inferiores ajustadas, descarta grandes regiones del árbol sin evaluarlas. En nuestro ejemplo, solo se exploraron 13 de 64 nodos (ahorro del 80%), manteniendo la garantía de optimalidad.'},
  {q:'¿Cuál es la complejidad en el peor caso de Branch & Bound para el TSP?',opts:['O(n²)','O(n log n)','O(n!)','O(2ⁿ)'],correct:2,explain:'En el peor caso, B&B para TSP tiene complejidad <strong>O(n!)</strong> — equivalente a la fuerza bruta — porque el árbol podría explorar todas las permutaciones. En la práctica la poda lo hace mucho más eficiente, pero para n > 60 se prefieren heurísticas.'},
  {q:'¿Cómo se calcula la cota inferior en Branch & Bound para TSP?',opts:['Sumando todas las distancias de la matriz de costos.','Reduciendo la matriz: restando el mínimo de cada fila y luego de cada columna.','Calculando la distancia promedio entre ciudades.','Multiplicando el número de ciudades por la distancia mínima global.'],correct:1,explain:'La <strong>reducción de matriz</strong> (Little et al., 1963) resta el mínimo de cada fila y luego de cada columna. La suma de todos los valores restados es la cota inferior, garantizando que el costo real de cualquier ruta sea al menos igual a esa cota.'},
  {q:'¿Cuál método de programación entera es el más apropiado cuando solo hay 2 variables de decisión enteras?',opts:['Branch & Bound para TSP','Planos de corte de Gomory','Método Gráfico','Branch & Bound para PI general'],correct:2,explain:'El <strong>Método Gráfico</strong> es el más adecuado con únicamente 2 variables enteras: permite visualizar la región factible en un plano 2D e identificar la solución óptima directamente. Para más variables se requieren métodos algebraicos como B&B o Gomory.'}
];
var quizBuilt=false,userAnswers=[];

function buildQuiz(){
  if(quizBuilt)return;
  quizBuilt=true;
  userAnswers=new Array(QUIZ.length).fill(-1);
  var container=document.getElementById('quiz-questions');
  var html='',letters=['A','B','C','D'];
  for(var i=0;i<QUIZ.length;i++){
    var q=QUIZ[i];
    html+='<div class="q-card" id="qcard-'+i+'">';
    html+='<div class="q-num">Pregunta '+(i+1)+' de '+QUIZ.length+'</div>';
    html+='<div class="q-text">'+q.q+'</div>';
    html+='<div class="q-options" id="qopts-'+i+'">';
    for(var j=0;j<q.opts.length;j++){
      html+='<div class="q-opt" id="qopt-'+i+'-'+j+'" onclick="selOpt('+i+','+j+')">';
      html+='<span class="opt-letter">'+letters[j]+'</span>';
      html+='<span class="opt-text">'+q.opts[j]+'</span>';
      html+='</div>';
    }
    html+='</div>';
    html+='<div class="q-explanation" id="qexp-'+i+'"></div>';
    html+='</div>';
  }
  container.innerHTML=html;
}

function selOpt(qIdx,optIdx){
  if(document.getElementById('quiz-submit-btn').disabled)return;
  userAnswers[qIdx]=optIdx;
  var opts=document.querySelectorAll('#qopts-'+qIdx+' .q-opt');
  opts.forEach(function(o){o.classList.remove('selected');});
  document.getElementById('qopt-'+qIdx+'-'+optIdx).classList.add('selected');
}

function gradeQuiz(){
  var unanswered=0;
  for(var i=0;i<QUIZ.length;i++){if(userAnswers[i]===-1)unanswered++;}
  if(unanswered>0){alert('⚠️ Tienes '+unanswered+' pregunta(s) sin responder. Por favor responde todas antes de calificar.');return;}
  var correct=0;
  for(var i=0;i<QUIZ.length;i++){
    var q=QUIZ[i],chosen=userAnswers[i],isOk=(chosen===q.correct);
    if(isOk)correct++;
    var opts=document.querySelectorAll('#qopts-'+i+' .q-opt');
    opts.forEach(function(o){o.classList.remove('selected');});
    document.getElementById('qopt-'+i+'-'+q.correct).classList.add('correct');
    if(!isOk)document.getElementById('qopt-'+i+'-'+chosen).classList.add('wrong');
    for(var j=0;j<q.opts.length;j++){
      (function(ii,jj){document.getElementById('qopt-'+ii+'-'+jj).onclick=null;})(i,j);
    }
    var expEl=document.getElementById('qexp-'+i);
    expEl.innerHTML='<strong>✔ Respuesta correcta: '+['A','B','C','D'][q.correct]+'.</strong> '+q.explain;
    expEl.classList.add('visible');
  }
  document.getElementById('quiz-submit-btn').disabled=true;
  var pct=Math.round((correct/QUIZ.length)*100);
  var sb=document.getElementById('score-big'),sm=document.getElementById('score-msg'),panel=document.getElementById('score-panel');
  sb.textContent=correct+' / '+QUIZ.length+'  ('+pct+'%)';
  sb.className='score-big';
  if(pct>=90){sb.classList.add('excellent');sm.textContent='🏆 ¡Excelente! Dominas el tema de Ramificación y Acotamiento para TSP.';}
  else if(pct>=70){sb.classList.add('good');sm.textContent='✅ ¡Muy bien! Tienes una buena comprensión del método. Revisa las preguntas incorrectas.';}
  else if(pct>=50){sb.classList.add('regular');sm.textContent='📖 Regular. Te recomendamos revisar las secciones de Introducción y Desarrollo.';}
  else{sb.classList.add('poor');sm.textContent='📚 Necesitas repasar el contenido. Vuelve a leer las secciones antes de intentarlo de nuevo.';}
  panel.classList.add('visible');
  window.scrollTo({top:0,behavior:'smooth'});
}

function retryQuiz(){
  userAnswers=new Array(QUIZ.length).fill(-1);
  quizBuilt=false;
  document.getElementById('score-panel').classList.remove('visible');
  document.getElementById('quiz-submit-btn').disabled=false;
  buildQuiz();
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ─── INIT ─── */
window.addEventListener('load',function(){setTimeout(drawIntroTree,400);});
window.addEventListener('resize',function(){if(currentPage==='desarrollo'){initMap();if(tCanvas2){tCanvas2.width=tCanvas2.offsetWidth||800;}}});