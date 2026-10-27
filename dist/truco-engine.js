/* Motor de práctica: decisiones de equipo y cobros explícitos. */
(function(root){
'use strict';
const SUITS=['Oros','Copas','Espadas','Bastos'];
const DECK=SUITS.flatMap(s=>[1,2,3,4,5,6,7,10,11,12].map(n=>({n,s})));
const team=p=>p%2;
function piece(c,v){if(c.s!==v.s)return 0;if(c.n===(v.n===11?12:11))return 2;if(c.n===(v.n===10?12:10))return 1;return 0}
function power(c,v){const p=piece(c,v);if(p)return 100+p;if(c.n===1&&c.s==='Espadas')return 99;if(c.n===1&&c.s==='Bastos')return 98;if(c.n===7&&c.s==='Espadas')return 97;if(c.n===7&&c.s==='Oros')return 96;return ({3:90,2:89,1:88,12:87,11:86,10:85,7:84,6:83,5:82,4:81})[c.n]}
const index=c=>c.n>=10?0:c.n;
function envido(hand,v){const p=hand.find(c=>piece(c,v));if(p)return (piece(p,v)===2?30:29)+Math.max(...hand.filter(c=>c!==p).map(index));let best=Math.max(...hand.map(index));for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)if(hand[i].s===hand[j].s)best=Math.max(best,20+index(hand[i])+index(hand[j]));return best}
function flor(hand,v){const ps=hand.filter(c=>piece(c,v));if(ps.length===2)return 100;if(ps.length===1){const rest=hand.filter(c=>c!==ps[0]);if(rest[0].s===rest[1].s)return (piece(ps[0],v)===2?30:29)+rest.reduce((a,c)=>a+index(c),0)}if(hand.every(c=>c.s===hand[0].s))return 20+hand.reduce((a,c)=>a+index(c),0);return 0}
function handWinner(rs,manoTeam){if(rs.length<2)return null;const [a,b,c]=rs;if(a!==null&&(b===a||b===null))return a;if(a===null&&b!==null)return b;if(rs.length<3)return null;if(c!==null)return c;return a!==null?a:b!==null?b:manoTeam}
class Match{
 constructor({count=4,rng=Math.random}={}){this.count=count===2?2:4;this.rng=rng;this.scores=[0,0];this.mano=0;this.handNo=0;this.matchWinner=null;this.history=[];this.events=[];this.eventId=0;this.callId=0;this.notice=null;this.nextHand()}
 name(p){return this.count===2?['Tú','Rival'][p]:['Tú','Rival derecho','Tu compañero','Rival izquierdo'][p]}
 order(start=this.mano){return Array.from({length:this.count},(_,i)=>(start+i)%this.count)}
 pie(){return (this.mano+this.count-1)%this.count}
 log(text){this.message=text;this.history.push(text);this.history=this.history.slice(-80)}
 emit(type,text,p=null,extra={}){const ev={id:++this.eventId,type,text,p,...extra};this.events.push(ev);this.events=this.events.slice(-100);this.log(text);return ev}
 say(p,text){this.speech[p]=text;return this.emit('canto',this.name(p)+': «'+text+'».',p)}
 receipt(text){this.notice=this.emit('notice',text)}
 error(text){this.lastError=text;return false}
 nextHand(){
  if(this.matchWinner!==null)return false;if(this.handNo)this.mano=(this.mano+1)%this.count;
  this.handNo++;const d=DECK.map(c=>({...c}));for(let i=d.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[d[i],d[j]]=[d[j],d[i]]}
  this.hands=Array.from({length:this.count},()=>[]);for(let i=0;i<3;i++)for(const p of this.order())this.hands[p].push(d.pop());
  this.original=this.hands.map(h=>h.slice());this.vira=d.pop();this.played=Array.from({length:this.count},()=>[]);this.coveredPlay=null;
  this.baza=[];this.results=[];this.turn=this.mano;this.leader=this.mano;this.phase='playing';this.pending=null;this.trucoValue=1;this.lastTrucoTeam=null;
  this.envidoDone=false;this.florResolved=false;this.law=Array(this.count).fill(null);this.florDeclared=Array(this.count).fill(false);
  this.speech=Array(this.count).fill('');this.awards=[];this.handResult=null;this.lastError='';this.notice=null;
  this.emit('shuffle','Barajando las 40 cartas para la mano '+this.handNo+'.');this.emit('hand','Mano '+this.handNo+': abre '+this.name(this.mano)+'.');return true;
 }
 hasFlor(p){return flor(this.original[p],this.vira)>0}
 atTurn(p){return this.phase==='playing'&&!this.pending&&this.turn===p}
 needsFlor(p){return this.hasFlor(p)&&!this.florDeclared[p]}
 canPlay(p){return this.atTurn(p)&&(!this.needsFlor(p)||(!this.played[p].length&&['aley','mixed'].includes(this.law[p])&&p!==this.pie()))}
 canPlayCovered(p){return this.count===4&&this.canPlay(p)&&this.results.length===1&&this.baza.length===this.count-1&&this.played[p].length===1&&this.hands[p].filter(Boolean).length===2&&!this.coveredPlay}
 canEnvido(p){return this.atTurn(p)&&!this.envidoDone&&!this.played[p].length&&!this.florResolved}
 nextTruco(){return ({1:3,3:6,6:9,9:24})[this.trucoValue]||null}
 canTruco(p){return this.atTurn(p)&&this.nextTruco()!==null&&this.lastTrucoTeam!==team(p)}
 canRespond(p){return this.phase==='playing'&&!!this.pending&&this.pending.targets.includes(p)&&!this.pending.responses[p]}
 canDeclare(p){return this.atTurn(p)||this.canRespond(p)}
 declareLaw(p,mode){
  if(!this.canDeclare(p)||this.played[p].length||!['aley','mixed','sinley'].includes(mode)||this.florDeclared[p])return false;
  if(mode==='sinley'&&this.hasFlor(p))return this.error('Tienes flor: canta Flor o resérvala con A ley.');
  if(mode!=='sinley'&&p===this.pie())return this.error('El pie debe cantar su flor en la primera carta.');
  this.law[p]=mode;this.say(p,({aley:'A ley',mixed:'A ley o sin ley',sinley:'Sin ley'})[mode]);return true;
 }
 makeRequest(kind,from,amount,decline,extra={}){return {id:++this.callId,kind,from,amount,decline,targets:this.order(from+1).filter(p=>team(p)!==team(from)),responses:{},...extra}}
 callName(v){return ({3:'Truco',6:'Retruco',9:'Vale 9',24:'Vale juego'})[v]||'Truco'}
 falta(){return Math.max(1,24-Math.max(...this.scores))}
 call(p,kind,points=2){
  if(kind==='envido'){
   if(!this.canEnvido(p))return false;
   if(this.needsFlor(p)&&!['aley','mixed'].includes(this.law[p]))return this.error('Canta Flor o A ley antes del envite.');
   const isFalta=points==='falta';
   if(!isFalta&&(!Number.isInteger(points)||points<1||points>24))return this.error('Los tantos deben estar entre 1 y 24.');
   this.envidoDone=true;const mode=['aley','mixed'].includes(this.law[p])?'open':'sinley';
   const amount=isFalta?this.falta():points;
   const canto=isFalta?'Envido la falta':points===2?'Envido':'Envido '+points+' tantos';
   this.pending=this.makeRequest(kind,p,amount,1,{mode,isFalta,canto});
   this.say(p,mode==='open'?'A ley o sin ley, '+canto:canto);
  }else if(kind==='truco'){
   if(!this.canTruco(p))return false;if(this.needsFlor(p))return this.error('Debes cantar tu flor antes de cantar Truco.');
   this.pending=this.makeRequest(kind,p,this.nextTruco(),this.trucoValue);this.say(p,this.callName(this.nextTruco()));
  }else return false;return true;
 }
 callFlor(p,follow=null){
  if(!this.canDeclare(p)||!this.hasFlor(p)||this.florDeclared[p]||this.florResolved||this.played[p].length>1)return false;
  const previous=this.pending;this.florDeclared[p]=true;this.law[p]='flor';this.say(p,'Flor');this.envidoDone=true;
  const resume=previous?.kind==='truco'?previous:null,targets=this.order(p+1).filter(who=>who!==p);
  this.pending={id:++this.callId,kind:'flor',from:p,amount:3,decline:0,targets,responses:{},resume,follow};
  if(previous?.kind==='envido')this.emit('info','El envite pendiente se anula al cantarse Flor.',p);
  for(const who of targets){if(this.florDeclared[who])this.pending.responses[who]='flor';else if(this.law[who]==='sinley')this.pending.responses[who]='no'}
  if(targets.every(who=>this.pending.responses[who]))this.finishFlor();return true;
 }
 award(t,points,reason,p=null){
  if(this.matchWinner!==null||!Number.isInteger(points)||points<=0)return false;
  const item={team:t,points,reason,p};this.awards.push(item);
  const msg='Canto resuelto: '+reason+'. Los '+points+' tantos de '+(t===0?'tu equipo':'los rivales')+' se anotarán al finalizar la mano.';
  this.emit('pending-score',msg,p,item);this.receipt(msg);return true;
 }
 settleHand(){
  for(const item of this.awards){
   if(this.matchWinner!==null)break;
   this.scores[item.team]+=item.points;
   this.emit('score',(item.team===0?'Tu equipo':'Rivales')+' +'+item.points+' · '+item.reason+'. Marcador '+this.scores[0]+' — '+this.scores[1]+'.',item.p,item);
   this.checkMatch();
  }
 }
 checkMatch(){const t=this.scores.findIndex(s=>s>=24);if(t<0)return false;this.matchWinner=t;this.phase='match-over';this.pending=null;this.handResult=(t===0?'Tu equipo':'Rivales')+' gana la partida.';return true}
 finishFlor(){
  const q=this.pending;if(!q||q.kind!=='flor')return false;
  const holders=this.order().filter(p=>this.florDeclared[p]),teams=new Set(holders.map(team));let winner=holders[0],points=3;
  if(teams.size===1)points=holders.length*3;else for(const p of holders)if(flor(this.original[p],this.vira)>flor(this.original[winner],this.vira))winner=p;
  this.pending=null;this.florResolved=true;this.award(team(winner),points,teams.size===1?'flor cantada':'comparación de flores',winner);
  if(q.resume)this.pending=q.resume;
  if(q.follow?.kind==='truco')this.call(q.follow.p,'truco');
  if(q.follow?.kind==='respond'&&this.pending)this.respond(q.follow.p,q.follow.choice,q.follow.extra);
  return true;
 }
 respond(p,choice,extra=2){
  if(!this.canRespond(p))return false;const q=this.pending;
  if(q.kind==='flor'){
   if(choice==='flor'&&this.hasFlor(p)){this.florDeclared[p]=true;this.law[p]='flor';q.responses[p]='flor';this.say(p,'Flor')}
   else if(choice==='no'&&!this.hasFlor(p)){q.responses[p]='no';this.law[p]='sinley';this.say(p,'Sin flor')}
   else return this.error(this.hasFlor(p)?'Tienes flor: debes cantarla.':'No tienes flor en esta mano.');
   if(q.targets.every(who=>q.responses[who]))this.finishFlor();return true;
  }
  if(!['yes','no','raise','raiseFalta'].includes(choice))return false;
  if(this.needsFlor(p)&&choice!=='no')return this.error('Canta tu flor antes de responder.');
  if(choice==='raise'||choice==='raiseFalta'){
   if(choice==='raiseFalta'&&(q.kind!=='envido'||q.isFalta))return this.error('No se puede volver a envidar la falta.');
   if(q.kind==='envido'&&q.isFalta)return this.error('La falta es el envite máximo.');
   if(choice==='raise'&&(!Number.isInteger(extra)||extra<1||extra>24))return false;
   const isFalta=choice==='raiseFalta',amount=isFalta?this.falta():q.kind==='truco'?({3:6,6:9,9:24})[q.amount]:q.amount+extra;
   if(!amount||amount>24)return this.error('La apuesta excede el límite de 24 tantos.');
   if(q.kind==='truco'){this.trucoValue=q.amount;this.lastTrucoTeam=team(q.from)}
   const canto=isFalta?'Quiero y la falta':q.kind==='truco'?this.callName(amount):extra===2?'Quiero y Envido':'Quiero y '+extra+' tantos más';
   this.pending=this.makeRequest(q.kind,p,amount,q.amount,{mode:q.mode,isFalta,canto});
   this.say(p,canto);return true;
  }
  if(choice==='no'){
   q.responses[p]='no';this.say(p,'No quiero');if(!q.targets.every(who=>q.responses[who]==='no'))return true;
   this.pending=null;if(q.kind==='truco')this.endHand(team(q.from),q.decline,'Truco no querido por el equipo contrario');else this.award(team(q.from),q.decline,'envite no querido por el equipo contrario',q.from);return true;
  }
  q.responses[p]='yes';this.say(p,q.kind==='envido'&&q.mode==='open'?'Sin ley, quiero':'Quiero');this.pending=null;
  if(q.kind==='truco'){this.trucoValue=q.amount;this.lastTrucoTeam=team(q.from);this.receipt(this.name(p)+' aceptó '+this.callName(q.amount)+' por su equipo. Se juega a '+q.amount+' tantos.')}
  else{let winner=this.mano,best=-1;for(const who of this.order()){const n=envido(this.original[who],this.vira);if(n>best){best=n;winner=who}}this.award(team(winner),q.amount,'envite querido'+(q.isFalta?' (la falta)':'')+': '+this.name(winner)+' tiene '+best,winner)}
  return true;
 }
 play(p,slot){
  if(!this.canPlay(p)||!Number.isInteger(slot)||!this.hands[p][slot])return false;
  const c=this.hands[p][slot];this.hands[p][slot]=null;this.played[p].push(c);this.baza.push({p,c});this.emit('card',this.name(p)+' juega '+c.n+' de '+c.s+'.',p);
  if(this.baza.length===this.count)this.phase='baza-over';
  else{
   this.turn=(p+1)%this.count;
   if(this.results.length===2&&this.coveredPlay&&this.turn===this.coveredPlay.p)this.turn=(this.turn+1)%this.count;
  }
  return true;
 }
 playCovered(p,hiddenSlot,topSlot){
  if(!this.canPlayCovered(p)||!Number.isInteger(hiddenSlot)||!Number.isInteger(topSlot)||hiddenSlot===topSlot||!this.hands[p][hiddenSlot]||!this.hands[p][topSlot])return this.error('Solo el último jugador de la segunda vuelta puede matar tapado con sus dos cartas restantes.');
  const hidden=this.hands[p][hiddenSlot],top=this.hands[p][topSlot];
  this.hands[p][hiddenSlot]=null;this.hands[p][topSlot]=null;
  this.played[p].push(hidden,top);
  this.coveredPlay={p,hidden,top,didKill:null,revealed:false};
  this.baza.push({p,c:hidden});this.phase='baza-over';
  this.emit('card',this.name(p)+' mata tapado: juega segunda y tercera carta juntas. Se comprueba al terminar la mano.',p);
  return true;
 }
 resolveBaza(){
  if(this.phase!=='baza-over')return false;
  const best=Math.max(...this.baza.map(x=>power(x.c,this.vira))),top=this.baza.filter(x=>power(x.c,this.vira)===best),tied=new Set(top.map(x=>team(x.p))).size>1,winner=tied?null:team(top[0].p);
  this.results.push(winner);this.leader=top[0].p;
  if(this.results.length===2&&this.coveredPlay){
   const covered=this.coveredPlay,opponents=this.baza.filter(x=>team(x.p)!==team(covered.p));
   covered.didKill=opponents.length>0&&power(covered.hidden,this.vira)>Math.max(...opponents.map(x=>power(x.c,this.vira)));
   this.emit('baza','Baza 2: matar tapado. Se verificará al terminar la mano.');
  }else this.emit('baza','Baza '+this.results.length+': '+(tied?'parda.':this.name(top[0].p)+' gana.'));
  const result=handWinner(this.results,team(this.mano));if(result!==null){this.endHand(result,this.trucoValue,'Mano decidida');return true}
  this.baza=[];this.turn=this.leader;this.phase='playing';
  if(this.results.length===2&&this.coveredPlay){
   this.baza.push({p:this.coveredPlay.p,c:this.coveredPlay.top});
   if(this.turn===this.coveredPlay.p)this.turn=(this.turn+1)%this.count;
  }
  return true;
 }
 endHand(winner,points,reason){
  if(['hand-over','match-over'].includes(this.phase))return false;
  this.pending=null;this.phase='hand-over';
  if(this.coveredPlay){
   this.coveredPlay.revealed=true;
   this.emit('reveal','Matar tapado: '+(this.coveredPlay.didKill?'sí mató al contrario.':'era un embuste o no alcanzó para matar.')+' Carta oculta: '+this.coveredPlay.hidden.n+' de '+this.coveredPlay.hidden.s+'.',this.coveredPlay.p);
  }
  this.award(winner,points,reason);this.settleHand();
  this.handResult=reason+': '+(winner===0?'tu equipo':'rivales')+' gana el Truco de esta mano. Tantos anotados al finalizar: '+this.awards.map(a=>(a.team===0?'nosotros ':'rivales ')+a.points+' ('+a.reason+')').join(', ')+'.';
  if(this.coveredPlay)this.handResult+=' Matar tapado: '+(this.coveredPlay.didKill?'era cierto.':'no mató: embuste.');
  if(this.matchWinner!==null)this.handResult+=(this.matchWinner===0?' Tu equipo':' Los rivales')+' gana la partida.';
  return true;
 }
 botAction(p=null){
  if(this.phase!=='playing')return false;
  if(this.pending){
   const q=this.pending,who=p??q.targets.find(w=>w!==0&&!q.responses[w]);if(who===undefined||who===0||!this.canRespond(who))return false;
   if(q.kind==='flor')return this.respond(who,this.hasFlor(who)?'flor':'no');
   if(this.needsFlor(who))return this.callFlor(who,q.kind==='truco'?{kind:'respond',p:who,choice:'yes'}:null);
   const strength=q.kind==='envido'?envido(this.original[who],this.vira):Math.max(...this.hands[who].filter(Boolean).map(c=>power(c,this.vira)));
   return this.respond(who,strength>=(q.kind==='envido'?(q.isFalta?31:25):89)?'yes':'no');
  }
  const who=this.turn;if(who===0)return false;if(this.needsFlor(who))return this.callFlor(who);
  if(this.canEnvido(who)&&envido(this.original[who],this.vira)>=29&&this.rng()<.3)return this.call(who,'envido',this.rng()<.13?'falta':2);
  if(this.canTruco(who)&&Math.max(...this.hands[who].filter(Boolean).map(c=>power(c,this.vira)))>=98&&this.rng()<.15)return this.call(who,'truco');
  const available=this.hands[who].map((c,i)=>({c,i})).filter(x=>x.c).sort((a,b)=>power(a.c,this.vira)-power(b.c,this.vira));
  if(this.canPlayCovered(who)&&this.rng()<.20){
   const a=this.hands[who].map((c,i)=>({c,i})).filter(x=>x.c);
   const hidden=this.rng()<.5?a[0]:a[1],top=a.find(x=>x.i!==hidden.i);
   return this.playCovered(who,hidden.i,top.i);
  }
  const best=this.baza.length?Math.max(...this.baza.map(x=>power(x.c,this.vira))):0,highest=this.baza.filter(x=>power(x.c,this.vira)===best),partnerWinning=highest.length&&highest.every(x=>team(x.p)===team(who));
  const pick=partnerWinning?available[0]:available.find(x=>power(x.c,this.vira)>best)||available[0];return this.play(who,pick.i);
 }
}
const api={Match,DECK,power,piece,envido,flor,handWinner,team};if(typeof module!=='undefined')module.exports=api;root.TrucoEngine=api;
})(typeof window==='undefined'?globalThis:window);
