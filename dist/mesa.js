(function(){
'use strict';
let session=null,timer=null,timerKey='',fast=false,soundOn=true,backColor='blue',audio=null;
const $=s=>document.querySelector(s);
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,id,cls='',disabled=false)=>`<button class="mesa-button ${cls}" id="${id}" ${disabled?'disabled':''}>${label}</button>`;
function html(el,value){if(el&&el._markup!==value){el.innerHTML=value;el._markup=value}}
function text(el,value){if(el&&el.textContent!==String(value))el.textContent=String(value)}
function stopTimer(){clearTimeout(timer);timer=null;timerKey=''}
function sound(type){
 if(!soundOn)return;
 try{
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  audio=audio||new C();if(audio.state==='suspended')audio.resume().catch(()=>{});
  const sounds={card:[280,160],shuffle:[175,240,195,255],envido:[345,420,500],truco:[220,278,340],flor:[490,590],win:[390,510,650,780]};
  const tones=sounds[type]||sounds.card;
  tones.forEach((hz,i)=>{
   const oscillator=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+i*.095;
   oscillator.type=type==='card'?'triangle':'sine';
   oscillator.frequency.setValueAtTime(hz,start);
   gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.029,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+.087);
   oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+.1);
  });
 }catch{}
}
function soundEvents(){
 if(!session)return;const g=session.match,previous=session.lastSoundEvent||0;
 for(const ev of g.events.filter(e=>e.id>previous)){
  const type=ev.type==='shuffle'?'shuffle':ev.type==='card'?'card':ev.type==='canto'?
   (/envido|falta|tantos/i.test(ev.text)?'envido':/truco|retruco|vale/i.test(ev.text)?'truco':'flor'):ev.type==='score'?'win':null;
  if(type)sound(type);
 }
 session.lastSoundEvent=g.eventId;
}
function leave(){stopTimer();const old=session;session=null;$('#mesaDemo')?.remove();document.body.style.overflow=old?.bodyOverflow||'';if($('.app'))$('.app').inert=old?.appInert||false;old?.onClose?.()}
function start({renderCard,onClose,count=4,match=null}={}){
 if(session)leave();session={match:match||new TrucoEngine.Match({count}),renderCard,onClose,bodyOverflow:document.body.style.overflow,appInert:$('.app')?.inert||false,handKey:'',noticeSeen:0,showLog:false,modal:null,error:'',lawNext:null,lastSoundEvent:0};
 document.body.style.overflow='hidden';if($('.app'))$('.app').inert=true;
 const root=document.createElement('section');root.id='mesaDemo';root.className='mesa-demo';root.dataset.back=backColor;root.setAttribute('aria-label','Mesa de Truco de prueba');document.body.append(root);mount();draw();$('#mesaExit').focus();
}
function card(c){return session.renderCard([c.n===1?'As':c.n===10?'Sota':c.n===11?'Caballo':c.n===12?'Rey':String(c.n),c.s])}
function mount(){
 const g=session.match,positions=g.count===2?[0,2]:[0,3,2,1];
 $('#mesaDemo').innerHTML=`<header class="mesa-toolbar"><div class="mesa-brand">Truco Venezolano<small>MESA AZUL · CANTOS POR EQUIPOS</small></div><div class="mesa-toolbar-actions"><label class="speed-label"><input id="mesaFast" type="checkbox" ${fast?'checked':''}>Prueba rápida</label><label class="back-choice">Dorso <select id="mesaBackColor" aria-label="Color del dorso"><option value="blue" ${backColor==='blue'?'selected':''}>Azul</option><option value="red" ${backColor==='red'?'selected':''}>Rojo</option></select></label>${button(soundOn?'🔊 Sonido':'🔇 Silencio','mesaSound')}${button('Ensayar','mesaPractice')}${button('Historial','mesaLog')}${button('⛶','mesaFullscreen')}${button('Salir','mesaExit')}</div></header>
 <div class="mesa-stage"><div class="mesa-wood"><div class="mesa-cloth"><div class="mesa-watermark">TRUCO<small>VENEZOLANO</small></div></div></div>
 ${positions.map((pos,p)=>`<div id="mesaSeat${p}" class="mesa-seat pos-${pos} ${p%2===0?'partner':''}"><span class="person-icon">${['PE','RD','TC','RI'][p]}</span><div><b>${safe(g.name(p))}</b><small></small></div></div><div id="mesaSpeech${p}" class="mesa-speech pos-${pos}" hidden></div><div id="mesaPile${p}" class="mesa-pile pos-${pos}" aria-label="Cartas jugadas por ${safe(g.name(p))}"></div>${p?`<div id="mesaBacks${p}" class="mesa-backs pos-${pos}"></div>`:''}`).join('')}
 <div class="mesa-corner-score rival-score" id="mesaScore1" aria-label="Puntuación de rivales"><span>RIVALES</span><strong>0</strong><small>FUERA · META 24</small><em></em></div>
 <div class="mesa-corner-score our-score" id="mesaScore0" aria-label="Puntuación de tu equipo"><span>TU EQUIPO</span><strong>0</strong><small>FUERA · META 24</small><em></em></div>
 <div class="mesa-round-info" id="mesaRound"></div><section class="mesa-call-panel" id="mesaCallPanel" aria-label="Avisos y respuestas de cantos" hidden></section>
 <div class="mesa-vira" id="mesaVira">VIRA<div></div></div><div class="mesa-deck"><div class="mesa-back"></div><div class="mesa-shuffle-hands" aria-hidden="true"><span class="shuffle-hand shuffle-left">🫲</span><span class="shuffle-hand shuffle-right">🫱</span></div><span class="deck-title">MAZO</span></div></div>
 <div class="mesa-status" id="mesaStatus" role="status" aria-live="polite"></div>
 <footer class="mesa-foreground"><div class="mesa-controls" id="mesaControls"></div><div><div class="mesa-hand" id="mesaHand"></div><div class="mesa-hint" id="mesaHint"></div></div><div class="mesa-meta" id="mesaMeta"></div></footer>
 <aside class="mesa-history" id="mesaHistory" hidden></aside><div id="mesaModalRoot"></div>`;
 $('#mesaDemo').onclick=onClick;
 $('#mesaFast').onchange=e=>{fast=e.target.checked;stopTimer();draw()};
  $('#mesaBackColor').onchange=e=>{backColor=e.target.value;$('#mesaDemo').dataset.back=backColor};
 $('#mesaFullscreen').setAttribute('aria-label','Alternar pantalla completa');
 session.handKey='';
}
function syncCards(){
 const g=session.match;
 if(session.handKey!==String(g.handNo)){
  session.handKey=String(g.handNo);session.noticeSeen=0;
  for(let p=0;p<g.count;p++){
   const pile=$('#mesaPile'+p);pile.replaceChildren();pile._count=0;
   const placeholder=document.createElement('div');placeholder.className='mesa-empty';placeholder.textContent=p===0?'Tu espacio':p===2?'Compañero':'Rival';pile.append(placeholder);
   if(p){const backs=$('#mesaBacks'+p);backs.innerHTML='<span class="mesa-back"></span>'.repeat(3)}
  }
  $('#mesaHand').innerHTML=g.hands[0].map((c,i)=>`<div class="mesa-hand-slot" data-slot="${i}"><button class="mesa-hand-card" data-mesa-card="${i}" style="--tilt:${(i-1)*5}deg" aria-label="Jugar ${c.n} de ${safe(c.s)}">${card(c)}<span class="slot-number">${i+1}</span></button></div>`).join('');
  $('#mesaVira > div').innerHTML=card(g.vira);
   const deck=$('.mesa-deck');deck.classList.remove('reshuffling');void deck.offsetWidth;deck.classList.add('reshuffling');
 }
 for(let p=0;p<g.count;p++){
  const pile=$('#mesaPile'+p),cs=g.played[p];
  while(pile._count<cs.length){
   const i=pile._count,c=cs[i];pile.querySelector('.mesa-empty')?.remove();
   const covered=g.coveredPlay?.p===p&&i>=1;
    const hidden=covered&&i===1&&!g.coveredPlay.revealed;
    const el=document.createElement('div');el.className='mesa-played'+(hidden?' covered':'');el.style.setProperty('--i',covered&&i===2&&!g.coveredPlay.revealed?1:i);
    el.dataset.playedKey=g.handNo+'-'+p+'-'+i;
    el.title=hidden?'Segunda carta tapada: se revelará al terminar la mano':c.passed?'Carta pasada boca abajo':`Carta ${i+1}: ${c.n} de ${c.s}`;
    el.innerHTML=(hidden||c.passed?'<div class="mesa-covered-back" aria-label="Carta pasada"></div>':card(c))+`<span class="baza-tag">${hidden?'?':i+1}</span>`;pile.append(el);pile._count++;
  }
  if(g.coveredPlay?.p===p&&g.coveredPlay.revealed){
    const hidden=pile.querySelector('[data-played-key="'+g.handNo+'-'+p+'-1"]');
    const top=pile.querySelector('[data-played-key="'+g.handNo+'-'+p+'-2"]');
    if(hidden&&hidden.classList.contains('covered')){hidden.classList.remove('covered');hidden.innerHTML=card(cs[1])+'<span class="baza-tag">2</span>';hidden.title='Carta 2 revelada: '+cs[1].n+' de '+cs[1].s;}
    if(top)top.style.setProperty('--i',2);
   }
   if(p){const backs=$('#mesaBacks'+p),n=g.hands[p].filter(Boolean).length;while(backs.children.length>n)backs.lastElementChild.remove();backs.setAttribute('aria-label',n+' cartas ocultas')}
 }
 g.hands[0].forEach((c,i)=>{
  const slot=$(`#mesaHand [data-slot="${i}"]`),b=slot.querySelector('button');
  if(!c&&b)slot.innerHTML='<div class="mesa-hand-empty">Jugada</div>';
  if(c&&b)b.disabled=!g.canPlay(0)||waitingNotice()||!!session.modal;
 });
}
function waitingNotice(){return !!session.match.notice&&session.match.notice.id>session.noticeSeen}
function draw(){
 if(!session)return;const g=session.match;syncCards();
 const targets=g.pending?g.pending.targets.filter(p=>!g.pending.responses[p]):g.phase==='playing'?[g.turn]:[];
 for(let p=0;p<g.count;p++){
  const seat=$('#mesaSeat'+p);seat.classList.toggle('active',targets.includes(p));
  text(seat.querySelector('small'),(p===g.mano?'Mano · ':p===g.pie()?'Pie · ':'')+(targets.includes(p)?g.pending?'Debe responder':p===0?'Tu turno':'Pensando…':p%2===0?'Tu equipo':'Rivales'));
  const speech=$('#mesaSpeech'+p);speech.hidden=!g.speech[p];text(speech,g.speech[p]);
 }
 for(let t=0;t<2;t++){
  const score=$('#mesaScore'+t);text(score.querySelector('strong'),g.scores[t]);text(score.querySelector('small'),(g.scores[t]>=12?'DENTRO':'FUERA')+' · META 24');
  const finished=['hand-over','match-over'].includes(g.phase),last=finished?g.awards.filter(a=>a.team===t).at(-1):null;
   text(score.querySelector('em'),last?'+'+last.points+' '+last.reason:g.awards.some(a=>a.team===t)?'Tantos pendientes hasta cerrar la mano':'Entrada a 12');
 }
 const round=g.phase==='hand-over'||g.phase==='match-over'?'Mano terminada':`Ronda ${Math.min(g.results.length+1,3)} / 3`;
 html($('#mesaRound'),`<b>Mano ${g.handNo} · ${round}</b><span>Truco: ${g.trucoValue} tanto${g.trucoValue===1?'':'s'}</span><small>${g.results.map((t,i)=>`${i+1}: ${i===1&&g.coveredPlay&&!g.coveredPlay.revealed?'Tapada':t===null?'Parda':t===0?'Nosotros':'Rivales'}`).join(' · ')||'Turno hacia la derecha'}</small>`);
 const disabled=waitingNotice()||!!session.modal;
 const florButton=g.hasFlor(0)&&!g.florDeclared[0];
 html($('#mesaControls'),`${button('Envido','mesaEnvido','',!g.canEnvido(0)||disabled)}${button('Envido X / Falta','mesaEnvidoOptions','',!g.canEnvido(0)||disabled)}${button(florButton?'Flor y '+g.callName(g.nextTruco()):g.callName(g.nextTruco()),'mesaTruco','',!g.canTruco(0)||disabled)}${button('Flor','mesaFlor',florButton?'gold':'',!florButton||!g.canDeclare(0)||disabled)}${button('Pasar carta','mesaPass','',!g.canPlay(0)||disabled)}${button('Matar tapado','mesaCover','',!g.canPlayCovered(0)||disabled)}${button('A ley / Sin ley','mesaLaw','',!g.canDeclare(0)||!!g.played[0].length||g.florDeclared[0]||disabled)}${button('Ir al mazo','mesaFold','',!g.atTurn(0)||disabled)}${button('Tomo de reglas','mesaTomo')}`);
 const flowerHint=g.hasReserved(0)&&!g.florDeclared[0]?'Tienes Flor Reservada (las dos piezas): puedes mantenerla oculta.':g.needsFlor(0)?g.played[0].length?'Debes cantar tu flor antes de la segunda carta.':g.law[0]?'Flor anunciada con A ley.':'Tienes flor: cántala o anuncia A ley.':'';
 let status=session.error||flowerHint||(!g.pending&&g.atTurn(0)?'Tu turno: canta o elige una carta.':!g.pending&&g.phase==='playing'?g.name(g.turn)+' está pensando…':'');
 if(g.pending)status=g.pending.kind==='flor'?'Flor en la mesa · cada jugador debe declararla o responder Sin flor.':'Canto pendiente · las cartas esperan la respuesta del equipo.';
 if(waitingNotice())status='Canto resuelto · los tantos se anotarán al terminar la mano. Pulsa Continuar.';
 if(['hand-over','match-over'].includes(g.phase))status=g.handResult;
  if(g.coveredPlay&&!g.coveredPlay.revealed)status='Matar tapado: la segunda carta está oculta hasta finalizar la mano.';
 text($('#mesaStatus'),status);text($('#mesaHint'),g.canPlay(0)&&!disabled?'Pulsa una de tus cartas':g.phase==='playing'?'Las cartas esperan el turno y la resolución de los cantos':'Las cartas quedan fijas hasta el siguiente reparto');
 html($('#mesaMeta'),'<b>Turno: tú → derecha → enfrente → izquierda.</b><br>Un Quiero acepta por el equipo.<br>Se necesitan dos No quiero para rechazar.');
 renderCall();
 $('#mesaHistory').hidden=!session.showLog;
 if(session.showLog)html($('#mesaHistory'),'<b>Cantos, tantos y jugadas</b>'+g.history.slice(-24).reverse().map(s=>`<p>${safe(s)}</p>`).join(''));
 scheduleNext();
}
function requestTitle(q){const g=session.match;return q.kind==='flor'?'¡Flor!':q.kind==='flor-choice'?'¿Envidar tu flor?':q.kind==='flor-achico'?'¿Tu flor también es chica?':q.kind==='flor-envite'?'Envite entre flores':q.kind==='envido'?(q.canto||'¡Envido!'):g.callName(q.amount)}
function renderCall(){
 const g=session.match,panel=$('#mesaCallPanel');let body='';
 if(waitingNotice())body=`<div class="call-eyebrow">CANTO RESUELTO</div><h3>Tantos pendientes</h3><p role="status">${safe(g.notice.text)}</p>${button('Continuar','mesaNoticeContinue','gold')}`;
 else if(['hand-over','match-over'].includes(g.phase))body=`<div class="call-eyebrow">${g.phase==='match-over'?'FIN DE PARTIDA':'FIN DE MANO'}</div><h3>${g.phase==='match-over'?(g.matchWinner===0?'¡Ganó tu equipo!':'Ganaron los rivales'):'Mano terminada'}</h3><p>${safe(g.handResult)}</p><b>${g.scores[0]} — ${g.scores[1]}</b><p>${g.awards.map(a=>(a.team===0?'Nosotros':'Rivales')+' +'+a.points+' ('+safe(a.reason)+')').join('<br>')}</p>${button(g.phase==='match-over'?'Nueva partida':'Siguiente mano','mesaNext','gold')}`;
 else if(g.pending){
  const q=g.pending,responding=g.canRespond(0);
  const rows=q.targets.map(p=>`<li><span>${safe(g.name(p))}</span><b>${q.responses[p]==='no'?(q.kind==='flor'?'Sin flor':'No quiero'):q.responses[p]==='flor'?'Flor':q.responses[p]==='reserve'?'Reservada':q.responses[p]==='yes'?'Quiero':'Esperando respuesta'}</b></li>`).join('');
  body=`<div class="call-eyebrow">${q.kind==='flor'?'FLOR CANTADA':q.targets.includes(0)?'AVISO A TI Y A TU COMPAÑERO':'SOLICITUD AL EQUIPO CONTRARIO'}</div><h3>${safe(g.name(q.from))}: ${requestTitle(q)}</h3><p>${q.kind==='flor'?'Declara tu Flor o guarda la Reservada. Se anotará al cierre.':['flor-choice','flor-achico'].includes(q.kind)?'Las flores contrarias pueden envidarse o achicarse.':q.amount+' tantos en juego · '+q.decline+' si no se quiere.'}</p><ul class="call-responses">${rows}</ul>`;
  if(responding){
   if(q.kind==='flor')body+=g.hasReserved(0)?
    button('Cantar Flor','mesaReplyFlor','gold')+button('Mantener Reservada','mesaFlorReserve'):
    button(g.hasFlor(0)?'Flor tengo':'Sin flor',g.hasFlor(0)?'mesaReplyFlor':'mesaNo','gold');
    else if(q.kind==='flor-choice'||q.kind==='flor-achico')body+=button('Mi flor envida','mesaFlorEnvido','gold')+button('Mi flor es chica','mesaFlorAchico');
   else if(g.needsFlor(0))body+=`<p>Tienes flor. Debes cantarla antes de querer.</p>${button(q.kind==='truco'?'Con flor, quiero':'Con ley / Flor','mesaReplyFlor','gold')}${button('No quiero','mesaNo')}`;
   else{
    const prefix=q.kind==='envido'&&q.mode==='open'?'Sin ley, ':'';
    body+=`<div class="call-actions">${button(prefix+'Quiero','mesaYes','gold')}${button('No quiero','mesaNo')}${['envido','flor-envite'].includes(q.kind)&&!q.isFalta?'<label>Más tantos <input id="mesaRaiseAmount" type="number" value="2" min="1" max="24" aria-label="Tantos adicionales"></label>':''}${['envido','flor-envite'].includes(q.kind)&&!q.isFalta?button('Quiero y tantas más','mesaRaise'):q.kind==='truco'&&q.amount<24?button(g.callName(({3:6,6:9,9:24})[q.amount]),'mesaRaise'):''}${['envido','flor-envite'].includes(q.kind)&&!q.isFalta?button('Quiero y la falta','mesaRaiseFalta','gold'):''}</div>`;
   }
  }else if(q.responses[0]==='no')body+='<p class="call-reminder">Ya dijiste No quiero. Tu compañero todavía puede aceptar.</p>';
 }
 panel.hidden=!body;html(panel,body);$('#mesaRound').hidden=!!body;
}
function scheduleNext(){soundEvents();
 if(!session)return;
 const g=session.match;if(waitingNotice()||session.modal||['hand-over','match-over'].includes(g.phase)){stopTimer();return}
 let key='',fn,delay;
 if(g.phase==='baza-over'){key=g.handNo+'-baza-'+g.results.length;fn=()=>g.resolveBaza();delay=fast?350:1800}
 else if(g.pending){const p=g.pending.targets.find(p=>p!==0&&!g.pending.responses[p]);if(p!==undefined){key='reply-'+g.pending.id+'-'+p;fn=()=>g.botAction(p);delay=fast?800:3500+Math.floor(Math.random()*2501)}}
 else if(g.turn!==0){key=g.handNo+'-turn-'+g.turn+'-'+g.results.length+'-'+g.eventId;fn=()=>g.botAction();delay=fast?550:3000+Math.floor(Math.random()*3001)}
 if(!key){stopTimer();return}if(timer&&timerKey===key)return;
 stopTimer();const current=session;timerKey=key;timer=setTimeout(()=>{timer=null;timerKey='';if(session!==current)return;fn();draw()},delay);
}
function run(fn){const g=session.match;session.error='';g.lastError='';const ok=fn();if(ok===false&&g.lastError)session.error=g.lastError;draw()}
function closeModal(){session.modal=null;$('#mesaModalRoot').replaceChildren();draw()}
function dialog(title,body,actions){
 stopTimer();session.modal=title;$('#mesaModalRoot').innerHTML=`<div class="mesa-overlay"><section class="mesa-dialog" role="dialog" aria-modal="true" aria-labelledby="mesaDialogTitle"><div class="eyebrow">MESA DE PRUEBA</div><h2 id="mesaDialogTitle">${title}</h2>${body}<div class="mesa-dialog-actions">${actions}</div></section></div>`;$('#mesaModalRoot button')?.focus();
}
function lawDialog(next=null){
 session.lawNext=next;const g=session.match,first=!g.played[0].length;
 dialog('Elige tu canto',`<p>${g.hasFlor(0)?'Tienes flor. Puedes cantarla ahora o reservarla con A ley antes de tu primera carta.':'A ley y A ley o sin ley anuncian la posibilidad de flor. Sin ley declara que no tienes flor.'}</p><p class="mesa-help-note">El pie canta su flor en la primera carta. Una flor reservada debe cantarse antes de la segunda carta o antes de cantar o querer Truco.</p>`,button('A ley','mesaLawA','',!first||g.pie()===0)+button('A ley o sin ley','mesaLawMixed','',!first||g.pie()===0)+button('Sin ley','mesaLawNone','',g.hasFlor(0)||!first)+(g.hasFlor(0)?button('Flor','mesaLawFlor','gold'):'')+button('Volver','mesaCloseModal'));
}
function practice(kind){
 const g=new TrucoEngine.Match({count:4}),c=(n,s)=>({n,s});
 const hands=kind==='flor'?[[c(7,'Oros'),c(6,'Oros'),c(5,'Oros')],[c(4,'Copas'),c(5,'Bastos'),c(6,'Espadas')],[c(1,'Copas'),c(2,'Bastos'),c(3,'Espadas')],[c(4,'Bastos'),c(5,'Espadas'),c(6,'Copas')]]:[[c(7,'Oros'),c(6,'Oros'),c(5,'Bastos')],[c(4,'Oros'),c(5,'Copas'),c(6,'Espadas')],[c(1,'Copas'),c(2,'Bastos'),c(3,'Espadas')],[c(4,'Bastos'),c(5,'Espadas'),c(6,'Copas')]];
 if(kind==='covered'){
   const coverHands=[[c(4,'Oros'),c(6,'Oros'),c(7,'Bastos')],[c(1,'Espadas'),c(4,'Copas'),c(5,'Espadas')],[c(2,'Bastos'),c(5,'Bastos'),c(6,'Copas')],[c(3,'Copas'),c(6,'Espadas'),c(7,'Oros')]];
   g.hands=coverHands.map(h=>h.slice());g.original=coverHands.map(h=>h.slice());g.vira=c(4,'Copas');
   g.mano=1;g.turn=1;g.leader=1;
   for(const p of [1,2,3,0])g.play(p,0);
   g.resolveBaza();
   for(const p of [1,2,3])g.play(p,1);
  }else{g.hands=hands.map(h=>h.slice());g.original=hands.map(h=>h.slice());g.vira=c(4,'Espadas');}
 if(kind==='envite'){g.mano=1;g.turn=1;g.leader=1;g.call(1,'envido')}
 session.match=g;session.lastSoundEvent=0;session.modal=null;session.noticeSeen=0;session.error='';mount();draw();
}
function openTome(){
 const g=session.match;
 const current=g.pending?g.pending.kind==='flor'?'Hay una Flor anunciada: corresponde declarar Flor o responder según tus cartas.':
  ['flor-choice','flor-achico','flor-envite'].includes(g.pending.kind)?'Hay dos Flores contrarias: decide si envidar, achicar, querer o replicar.':
  'Hay un canto pendiente: primero se decide la apuesta; luego continúan las cartas.':
  g.phase==='hand-over'?'Terminó la mano. Antes del siguiente reparto, revisa los tantos y las cartas.':
  g.atTurn(0)?'Es tu turno en la ronda '+Math.min(3,g.results.length+1)+'. '+(!g.played[0].length?'Puedes cantar Envite y Truco antes de tu primera carta.': 'Puedes jugar o pasar una carta; pasar desde la primera obliga a pasar las tres.'):'Espera tu turno o el cierre de la ronda.';
 const chapters=[
  ['I · Preparación','Se juega con 40 cartas españolas, tres para cada participante y una vira. La vira determina las piezas Perico y Perica. Se baraja nuevamente en cada mano.','El Mano comienza y el orden continúa hacia la derecha. Los compañeros se ubican frente a frente.'],
  ['II · Las cartas y su fuerza','La Vira señala la pinta. Las piezas superan a las cartas ordinarias. Entre las cartas restantes también existe un orden de jerarquía que puede depender de la pinta.','Para decidir una ronda se comparan las cartas en mesa. Las cartas pasadas carecen de fuerza para el Truco.'],
  ['III · Antes de la primera carta','Al inicio de la mano se revisan las cartas para determinar si hay Flor, Flor Reservada y la fuerza del Envite. Los cantos del Envite se realizan en la primera vuelta y antes de cerrar esa oportunidad.','Se permite cantar Truco desde el primer turno. Los jugadores deben responder los cantos antes de seguir jugando cartas.'],
  ['IV · Envite y sus aumentos','Envido querido: dos tantos en el canto inicial habitual; no querido: uno para quien lo propuso. El canto puede especificar más tantos y aceptar una subida permite aumentar lo disputado.','Quiero y tantos más propone una subida. Envido la falta reemplaza la apuesta por los puntos que le faltan al equipo delantero para llegar a la meta. Si se rechaza una subida, se cobran los tantos anteriores aceptados.'],
  ['V · Flor común','Flor: tres cartas de la misma pinta o una pieza junto a dos cartas de la misma pinta. La Flor debe declararse al jugar la primera carta, o anunciarse A ley para declararla antes de la segunda.','Cada flor válida del mismo equipo aporta tres tantos; se deben mostrar al cierre para cobrarlos. El Pie tiene obligaciones especiales al declarar.'],
  ['VI · Flor Reservada','Se forma con Perico y Perica más una tercera carta cualquiera. A diferencia de una Flor ordinaria, puede mantenerse sin declarar al comienzo, sin pronunciar A ley.','Puede participar en Envites sin revelar su tenencia. Su cobro depende de los cantos y de si existe Flor contraria correctamente declarada. El libro contempla casos donde cobra un tanto de Envite y tres de Flor al cierre.'],
  ['VII · Flores en equipos contrarios','Cuando hay Flor en ambos equipos se abre una disputa entre Flores. El jugador que tiene prioridad de Mano puede decir Mi flor envida o Mi flor es chica.','Se puede querer, no querer o aumentar el Envite. Si ambas flores se achican, la de mayor valor gana tres tantos. Las situaciones con Reservada tienen excepciones.'],
  ['VIII · Pasar cartas','Pasar significa jugar boca abajo. La carta pierde fuerza para el Truco, pero conserva su participación en el Envite. Puede pasarse la segunda o la tercera por separado.','Si decides pasar tu primera carta, quedas obligado a pasar las tres. Es una estrategia de ocultamiento, no una carta ganadora.'],
  ['IX · Matar tapado','Esta jugada es distinta de pasar: quien corresponde en la segunda vuelta puede presentar sus dos últimas cartas juntas, escondiendo una debajo de la otra, según las condiciones aplicables.','Puede tratarse de una jugada real o un embuste. Al terminar la mano debe comprobarse la carta que quedó oculta.'],
  ['X · Rondas, pardas y final','Cada jugador dispone de tres cartas y normalmente se resuelve el Truco con hasta tres rondas. La mano puede decidirse antes de la tercera, y los empates o pardas determinan prioridades especiales.','Los tantos del Envite y la Flor se resuelven antes del Truco. En esta prueba, el marcador visible se actualiza al cerrar la mano, y el objetivo es 24 tantos.'],
  ['XI · Estrategia práctica','No siempre conviene matar una carta rival: pasar una carta fuerte después de ganar una ronda puede invitar al rival a cantar Truco. Conocer la posición de Mano y Pie ayuda a decidir cuándo cantar.','Las señas entre compañeros, el juego a ley, las flores rivales y el manejo de la Reservada hacen que dos manos iguales se jueguen de maneras distintas.'],
  ['XII · Alcance de esta demo','El tomo explica las situaciones principales a partir del libro de Francisco A. Solé, en palabras propias. No reproduce el texto completo del libro.','La demo todavía simplifica algunas jugadas especiales, la resolución avanzada de pardas y parte de los Envites con ley. Conserva temporalmente la variante de doble rechazo por equipo.']
 ];
 const body='<div class="tomo-intro"><b>Tu situación actual</b><p>'+safe(current)+'</p><p class="mesa-help-note">Guía de jugadas basada en El Juego de Truco Venezolano, de Francisco A. Solé. Las reglas están resumidas; la demo no reproduce el libro.</p></div>'+
 chapters.map(([heading,a,b],i)=>'<details class="tomo-chapter" '+(i===0?'open':'')+'><summary>'+safe(heading)+'</summary><p>'+safe(a)+'</p><p>'+safe(b)+'</p></details>').join('')+
 '<p class="mesa-help-note">Referencia: <a href="https://es.scribd.com/document/1054730709/El-Libro-El-Juego-de-Truco-de-Francisco-a-Sole" target="_blank" rel="noopener noreferrer">Consultar obra de Francisco A. Solé</a>. Las variantes regionales se deben acordar antes de una partida real.</p>';
 dialog('Tomo de reglas · Solé',body,button('Volver a la mesa','mesaCloseModal','gold'));
 $('#mesaDialogTitle').closest('.mesa-dialog').classList.add('tomo-dialog');
}

function onClick(e){
 const target=e.target.closest('button');if(!target||target.disabled)return;const id=target.id,g=session.match;
 if(target.dataset.mesaCard!==undefined){if(waitingNotice()||session.modal)return;run(()=>g.play(0,+target.dataset.mesaCard));return}
 if(id==='mesaExit'){leave();return}
  if(id==='mesaFlorEnvido'||id==='mesaFlorAchico'){run(()=>g.respond(0,id==='mesaFlorEnvido'?'florEnvido':'achico'));return}
  if(id==='mesaFlorReserve'){run(()=>g.respond(0,'reserve'));return}
  if(id==='mesaPass'){
   if(!g.canPlay(0))return;
   const available=g.hands[0].map((c,i)=>({c,i})).filter(x=>x.c);
   const warning=!g.played[0].length?'<p class="mesa-help-note">Si pasas tu primera carta, debes pasar también las otras dos.</p>':'<p>Puedes pasar esta carta sin mostrarla: no tiene fuerza para ganar esta ronda, pero conserva su valor en el Envite.</p>';
   dialog('Pasar una carta',warning+'<p>Selecciona la carta que colocarás boca abajo.</p>',
    available.map(x=>button('Pasar '+x.c.n+' de '+safe(x.c.s),'mesaPassSlot'+x.i,'gold')).join('')+button('Cancelar','mesaCloseModal'));
   return;
  }
  if(id.startsWith('mesaPassSlot')){
   const slot=Number(id.slice('mesaPassSlot'.length));
   session.modal=null;$('#mesaModalRoot').replaceChildren();run(()=>g.playPassed(0,slot));return;
  }
  if(id==='mesaSound'){soundOn=!soundOn;target.textContent=soundOn?'🔊 Sonido':'🔇 Silencio';if(soundOn)sound('card');return}
 if(id==='mesaTomo'){openTome();return}
  if(id==='mesaLog'){session.showLog=!session.showLog;draw();return}
 if(id==='mesaFullscreen'){(async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#mesaDemo').requestFullscreen()}catch{dialog('Pantalla completa','<p>La mesa ocupa la ventana. Este navegador no permite ocultar sus barras.</p>',button('Continuar','mesaCloseModal','gold'))}})();return}
 if(id==='mesaNoticeContinue'){session.noticeSeen=g.notice?.id||0;draw();return}
  if(id==='mesaCover'){
   if(!g.canPlayCovered(0))return;
   const left=g.hands[0].map((c,i)=>({c,i})).filter(x=>x.c);
   dialog('Matar tapado','<p>Jugarás tu segunda y tercera carta a la vez. Elige qué carta dejar oculta debajo. La carta superior quedará a la vista. Puede ser un embuste: al terminar la mano se comprueba si realmente mató.</p>',
    left.map(x=>button('Tapar '+x.c.n+' de '+safe(x.c.s),'mesaCoverSlot'+x.i,'gold')).join('')+button('Cancelar','mesaCloseModal'));
   return;
  }
  if(id.startsWith('mesaCoverSlot')){
   const hidden=Number(id.slice('mesaCoverSlot'.length)),top=g.hands[0].findIndex((c,i)=>c&&i!==hidden);
   session.modal=null;$('#mesaModalRoot').replaceChildren();run(()=>g.playCovered(0,hidden,top));return;
  }
 if(id==='mesaNext'){stopTimer();if(g.phase==='match-over'){session.match=new TrucoEngine.Match({count:g.count});session.handKey='';session.lastSoundEvent=0}else g.nextHand();draw();return}
 if(id==='mesaCloseModal'){session.lawNext=null;closeModal();return}
 if(id==='mesaEnvido'){if(g.needsFlor(0)&&!['aley','mixed'].includes(g.law[0]))lawDialog('envido');else run(()=>g.call(0,'envido'));return}
  if(id==='mesaEnvidoOptions'){
   if(!g.canEnvido(0))return;
   if(g.needsFlor(0)&&!['aley','mixed'].includes(g.law[0])){lawDialog('envido');return}
   dialog('Cantar Envite','<p>Elige tantos entre 1 y 24 o apuesta la falta del equipo que va adelante: '+g.falta()+' tantos.</p><label>Tantos <input type="number" id="mesaBetAmount" min="1" max="24" value="4"></label>',
    button('Envido tantos','mesaBetExact','gold')+button('Envido la falta','mesaBetFalta')+button('Cancelar','mesaCloseModal'));
   return;
  }
  if(id==='mesaBetExact'||id==='mesaBetFalta'){
   const value=id==='mesaBetFalta'?'falta':Number($('#mesaBetAmount')?.value);
   session.modal=null;$('#mesaModalRoot').replaceChildren();run(()=>g.call(0,'envido',value));return;
  }
 if(id==='mesaTruco'){run(()=>g.needsFlor(0)?g.callFlor(0,{kind:'truco',p:0}):g.call(0,'truco'));return}
 if(id==='mesaFlor'){run(()=>g.pending?.kind==='flor'?g.respond(0,'flor'):g.callFlor(0));return}
 if(id==='mesaLaw'){lawDialog();return}
 if(['mesaLawA','mesaLawMixed','mesaLawNone','mesaLawFlor'].includes(id)){
  const next=session.lawNext;session.lawNext=null;session.modal=null;$('#mesaModalRoot').replaceChildren();
  run(()=>{if(id==='mesaLawFlor')return g.callFlor(0);const ok=g.declareLaw(0,({mesaLawA:'aley',mesaLawMixed:'mixed',mesaLawNone:'sinley'})[id]);if(ok&&next==='envido')return g.call(0,'envido');return ok});return;
 }
 if(id==='mesaReplyFlor'){run(()=>g.pending?.kind==='flor'?g.respond(0,'flor'):g.callFlor(0,g.pending?.kind==='truco'?{kind:'respond',p:0,choice:'yes'}:null));return}
 if(id==='mesaYes'||id==='mesaNo'||id==='mesaRaise'||id==='mesaRaiseFalta'){
   const extra=Number($('#mesaRaiseAmount')?.value||2);
   run(()=>g.respond(0,id==='mesaYes'?'yes':id==='mesaNo'?'no':id==='mesaRaiseFalta'?'raiseFalta':'raise',extra));return;
  }
 if(id==='mesaFold'){dialog('¿Ir al mazo?',`<p>Los rivales sumarán ${g.trucoValue} tantos por el truco.</p>`,button('Seguir jugando','mesaCloseModal','gold')+button('Ir al mazo','mesaConfirmFold'));return}
 if(id==='mesaConfirmFold'){session.modal=null;$('#mesaModalRoot').replaceChildren();run(()=>g.endHand(1,g.trucoValue,'Tu equipo fue al mazo'));return}
 if(id==='mesaPractice'){dialog('Ensayar una jugada','<p>Empieza una partida de práctica con una situación concreta. Se reinicia el marcador de esta prueba.</p>',button('Tengo flor','mesaPracticeFlor','gold')+button('Me envidan','mesaPracticeEnvite')+button('Envidar a rivales bajos','mesaPracticeNo')+button('Matar tapado','mesaPracticeCovered')+button('Volver','mesaCloseModal'));return}
 if(id.startsWith('mesaPractice')){practice(id==='mesaPracticeFlor'?'flor':id==='mesaPracticeEnvite'?'envite':id==='mesaPracticeCovered'?'covered':'no');return}
 if(id==='mesaHelp'){dialog('Cantos y turnos','<p>El orden es tú → rival derecho → compañero → rival izquierdo. El mano rota en cada reparto. Quien gana la ronda abre la siguiente.</p><p>Envido y Truco están disponibles desde el primer turno. A ley permite reservar la flor hasta antes de la segunda carta; el pie debe cantarla en la primera. Canta tu flor antes de Truco o de aceptarlo.</p><p>El envite llega a ambos contrarios: cualquiera puede aceptar; para rechazar deben decir No quiero los dos. Los tantos se anotan solo al terminar la mano; la respuesta queda en la mesa hasta pulsar Continuar.</p><p>La flor se declara con el botón Flor; los tantos se pagan al terminar la mano. Si hay flores rivales se comparan por tres tantos, sin contra flor. Una flor interrumpe y anula un envite pendiente sin ley.</p><p class="mesa-help-note">Práctica con bots. Después de la primera ronda, el último jugador de la segunda puede tirar juntas las dos cartas restantes con Matar tapado: la segunda queda debajo de la tercera, y puede ser un embuste. Se comprueba al finalizar la mano. Se baraja de nuevo en cada reparto. Entrada a 12 indica Fuera/Dentro; meta 24. Incluye Envido por tantos, Quiero y tantos más y Envido / Quiero y la falta; aún faltan subidas de flor. Los cantos A ley de esta prueba reservan la flor; no implementan toda la negociación de envites con ley del reglamento completo.</p>',button('Volver','mesaCloseModal','gold'))}
}
window.MesaDemo={start,leave};
})();
