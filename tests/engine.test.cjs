const assert=require('node:assert/strict');
const {Match,DECK,power,piece,envido,flor,handWinner}=require('../dist/truco-engine.js');
const c=(n,s='Oros')=>({n,s});
let seed=17;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const noFlowers=()=>[[c(1,'Espadas'),c(3),c(4,'Bastos')],[c(4),c(5,'Copas'),c(6,'Bastos')],[c(2),c(3,'Bastos'),c(5,'Espadas')],[c(6),c(7,'Bastos'),c(4,'Espadas')]];
function setup(hands=noFlowers(),mano=0){const g=new Match({count:hands.length,rng});g.hands=hands.map(h=>h.slice());g.original=hands.map(h=>h.slice());g.vira=c(4,'Copas');g.mano=mano;g.turn=mano;g.leader=mano;return g}
assert.equal(DECK.length,40);const shuffled=new Match({rng});assert.equal(new Set(shuffled.hands.flat().concat(shuffled.vira).map(x=>x.n+x.s)).size,13);
let g=setup();assert.equal(g.name(1),'Rival derecho');assert.deepEqual(g.order(),[0,1,2,3]);assert(g.canEnvido(0));assert(g.canTruco(0));assert.equal(g.play(1,0),false);assert.equal(g.play(0,9),false);
for(let p=0;p<4;p++){assert.equal(g.turn,p);assert(g.play(p,0));if(p<3)assert.equal(g.play(p,0),false)}
assert.equal(g.phase,'baza-over');g.resolveBaza();assert.equal(g.turn,0);assert.equal(g.results[0],0);
for(let p=0;p<4;p++)assert(g.play(p,1));g.resolveBaza();assert.equal(g.phase,'hand-over');assert.equal(g.results.length,2);assert.equal(g.played[0].length,2);const scores=g.scores.slice();g.nextHand();assert.equal(g.mano,1);assert.equal(g.turn,1);assert.deepEqual(g.scores,scores);assert.equal(g.played.flat().length,0);
const v=c(4);assert(power(c(11),v)>power(c(10),v));assert(power(c(10),v)>power(c(1,'Espadas'),v));assert(power(c(1,'Espadas'),v)>power(c(1,'Bastos'),v));assert(power(c(7,'Espadas'),v)>power(c(7),v));assert(power(c(3),v)>power(c(2),v));assert(power(c(12,'Copas'),v)>power(c(7,'Copas'),v));assert.equal(piece(c(12),c(11)),2);assert.equal(piece(c(12),c(10)),1);
assert.equal(envido([c(7),c(6),c(12,'Bastos')],c(4,'Espadas')),33);assert.equal(flor([c(11),c(10),c(4,'Bastos')],v),100);
for(const [results,expected] of [[[0,0],0],[[1,1],1],[[0,null],0],[[null,1],1],[[0,1],null],[[null,null],null],[[0,1,null],0],[[1,0,null],1],[[null,null,null],0],[[null,null,1],1]])assert.equal(handWinner(results,0),expected,JSON.stringify(results));
// Requests go to both opponents. A single rejection cannot score or release play.
g=setup();g.call(0,'envido');assert.deepEqual(g.pending.targets,[1,3]);assert.equal(g.play(0,0),false);assert.equal(g.respond(2,'yes'),false);assert(g.respond(1,'no'));assert.deepEqual(g.scores,[0,0]);assert(g.pending);assert.equal(g.respond(1,'yes'),false);assert(g.respond(3,'no'));assert.equal(g.pending,null);assert.deepEqual(g.scores,[0,0]);assert.equal(g.turn,0);assert(g.notice.text.includes('finalizar la mano'));assert.equal(g.respond(3,'no'),false);g.endHand(0,1,'test');assert.deepEqual(g.scores,[2,0],'cobro una sola vez al terminar la mano');assert.equal(g.endHand(0,1,'test'),false);
// Rival asks you AND your partner. Partner can still accept after you refuse.
g=setup(noFlowers(),1);g.call(1,'envido');assert.deepEqual(g.pending.targets,[2,0]);assert(g.canRespond(0));assert(g.canRespond(2));g.respond(0,'no');assert.equal(g.scores[1],0);g.respond(2,'yes');assert.equal(g.pending,null);assert.equal(g.scores.reduce((a,b)=>a+b),0);assert.equal(g.awards.length,1);assert.equal(g.turn,1);
// Re-raises reset the two target responses and preserve the accepted stake on refusal.
g=setup();g.call(0,'envido');g.respond(1,'raise',3);assert.equal(g.pending.amount,5);assert.deepEqual(g.pending.targets,[2,0]);g.respond(2,'no');assert.deepEqual(g.scores,[0,0]);g.respond(0,'no');assert.deepEqual(g.scores,[0,0]);g.endHand(1,1,'test');assert.deepEqual(g.scores,[0,3]);
g=setup();g.call(0,'truco');g.respond(1,'yes');assert.equal(g.trucoValue,3);g.play(0,0);g.call(1,'truco');g.respond(0,'raise');assert.equal(g.pending.amount,9);g.respond(1,'raise');assert.equal(g.pending.amount,24);g.respond(0,'no');assert.deepEqual(g.scores,[0,0]);g.respond(2,'no');assert.deepEqual(g.scores,[0,9]);
// An opponent's hidden flower must never disable mano's Envido/Truco.
const flowers=noFlowers();flowers[1]=[c(7,'Bastos'),c(6,'Bastos'),c(5,'Bastos')];g=setup(flowers);assert(g.canEnvido(0));assert(g.canTruco(0));assert(g.call(0,'envido'));assert.deepEqual(g.scores,[0,0]);assert(!g.florDeclared[1]);
// Flowers require explicit declarations; no payment from dealing or playing another hand.
const myFlor=noFlowers();myFlor[0]=[c(7),c(6),c(5)];g=setup(myFlor);assert(g.canEnvido(0));assert(g.canTruco(0));assert.equal(g.play(0,0),false);assert.deepEqual(g.scores,[0,0]);assert(g.callFlor(0));assert.deepEqual(g.scores,[0,0]);assert.equal(g.speech[0],'Flor');for(const p of [1,2]){g.respond(p,'no');assert.deepEqual(g.scores,[0,0])}g.respond(3,'no');assert.deepEqual(g.scores,[0,0]);assert.equal(g.awards[0].points,3);assert(g.notice.text.includes('flor cantada'));assert(g.canPlay(0));assert.equal(g.callFlor(0),false);g.endHand(0,1,'test');assert.deepEqual(g.scores,[4,0]);
// A ley reserves for one card only. Pie must declare in the first card.
g=setup(myFlor);assert(g.declareLaw(0,'aley'));assert(g.play(0,0));for(let p=1;p<4;p++)assert(g.play(p,0));g.resolveBaza();g.turn=0;assert.equal(g.canPlay(0),false);assert(g.callFlor(0));
g=setup(myFlor,1);g.turn=0;assert.equal(g.pie(),0);assert.equal(g.declareLaw(0,'aley'),false);assert.equal(g.declareLaw(0,'mixed'),false);assert.equal(g.declareLaw(0,'sinley'),false);assert(g.callFlor(0));
// Explicit flower interrupts an envite, but does not silently award its refusal point.
g=setup(flowers);g.call(0,'envido');g.callFlor(1);assert.equal(g.pending.kind,'flor');for(const p of [2,3,0])g.respond(p,'no');assert.deepEqual(g.scores,[0,0]);assert.equal(g.awards.length,1);
// Flor y Truco resumes the requested canto only after declaring and paying flor.
g=setup(myFlor);g.callFlor(0,{kind:'truco',p:0});for(const p of [1,2,3])g.respond(p,'no');assert.equal(g.pending.kind,'truco');assert.equal(g.pending.amount,3);assert.equal(g.scores[0],0);
// Immediate match completion at an envite refusal; no following card or double award.
g=setup();g.scores=[23,0];g.call(0,'envido');g.respond(1,'no');g.respond(3,'no');assert.equal(g.matchWinner,null);assert.equal(g.scores[0],23);assert(g.canPlay(0));g.endHand(0,1,'test');assert.equal(g.matchWinner,0);assert.equal(g.play(0,0),false);assert.equal(g.nextHand(),false);assert.equal(g.scores[0],24);
g=setup();g.scores=[11,0];g.call(0,'envido');g.respond(1,'no');g.respond(3,'no');assert.equal(g.scores[0],11);assert.equal(g.matchWinner,null);g.endHand(1,1,'test');assert.deepEqual(g.scores,[12,1]);

// Se baraja y reparte otra vez al comenzar una mano.
g=new Match({rng});const oldDeal=g.original.flat().concat(g.vira).map(x=>x.n+x.s).join('|');
g.endHand(0,1,'test');assert(g.nextHand());const newDeal=g.original.flat().concat(g.vira).map(x=>x.n+x.s).join('|');
assert.notEqual(newDeal,oldDeal);assert.equal(new Set(g.original.flat().concat(g.vira).map(x=>x.n+x.s)).size,13);
assert(g.history.some(x=>x.includes('Barajando')));
// Matar tapado: último jugador de la segunda vuelta lanza dos; la segunda queda oculta.
function coveredHand(bluff=false){
 const hs=[[c(4),c(6),c(7,'Bastos')],[c(1,'Espadas'),c(4,'Copas'),c(5,'Espadas')],[c(2,'Bastos'),c(5,'Bastos'),c(6,'Copas')],[c(3,'Copas'),c(6,'Espadas'),c(7)]];
 const m=setup(hs,1);for(const p of [1,2,3,0])assert(m.play(p,0));
 assert(m.resolveBaza());assert.deepEqual(m.results,[1]);assert.equal(m.canPlayCovered(1),false);
 for(const p of [1,2,3])assert(m.play(p,1));
 assert(m.canPlayCovered(0));assert.equal(m.playCovered(1,1,2),false);
 assert(m.playCovered(0,bluff?1:2,bluff?2:1));
 assert.equal(m.played[0].length,3);assert.equal(m.coveredPlay.revealed,false);assert.equal(m.phase,'baza-over');
 assert(m.resolveBaza());assert.equal(m.coveredPlay.didKill,!bluff);
 if(m.phase!=='hand-over'&&m.phase!=='match-over'){
  let guard=0;while(m.phase==='playing'&&guard++<4){const p=m.turn;assert.notEqual(p,0,'jugador tapado no juega de nuevo');assert(m.play(p,2))}
  if(m.phase==='baza-over')assert(m.resolveBaza());
 }
 assert(['hand-over','match-over'].includes(m.phase));assert.equal(m.coveredPlay.revealed,true);
 assert.equal(m.scores[0]+m.scores[1],1);
 return m;
}
assert(coveredHand(false).history.some(x=>x.includes('sí mató')));
assert(coveredHand(true).history.some(x=>x.includes('embuste')));

// Nuevos envites a tantos fijos, revidadas y falta del equipo delantero.
g=setup();g.scores=[17,8];assert.equal(g.falta(),7);
assert(g.call(0,'envido',5));assert.equal(g.pending.amount,5);assert.equal(g.pending.decline,1);
assert(g.respond(1,'raise',4));assert.equal(g.pending.amount,9);assert.equal(g.pending.decline,5);
assert(g.respond(2,'raiseFalta'));assert.equal(g.pending.amount,7);assert.equal(g.pending.decline,9);
assert.equal(g.pending.isFalta,true);assert.equal(g.respond(1,'raise',2),false);
assert(g.respond(1,'no'));assert(g.respond(3,'no'));assert.deepEqual(g.scores,[17,8]);
assert.equal(g.awards[0].points,9);assert(g.endHand(1,1,'test'));assert.deepEqual(g.scores,[26,8]);
assert.equal(g.matchWinner,0,'envite se cobra antes del truco, incluso si este gana el rival');
g=setup();g.scores=[18,10];assert(g.call(0,'envido','falta'));
assert.equal(g.pending.amount,6);assert.equal(g.pending.decline,1);assert(g.respond(1,'no'));assert(g.respond(3,'no'));assert.equal(g.awards[0].points,1);
assert.equal(g.scores[0],18);assert(g.endHand(0,1,'test'));assert.equal(g.scores[0],20);
g=setup();assert.equal(g.call(0,'envido',0),false);assert.equal(g.call(0,'envido',25),false);
assert(g.call(0,'envido',24));assert.equal(g.pending.amount,24);


// Reglas Solé: pasar segunda o tercera; pasar primera obliga las tres.
g=setup();assert(g.playPassed(0,0));assert(g.played[0][0].passed);assert.equal(g.passAll[0],true);
for(const p of [1,2,3])assert(g.play(p,0));assert(g.resolveBaza());if(g.turn===0)assert(g.play(0,1));else{while(g.turn!==0&&g.phase==='playing')assert(g.play(g.turn,1));if(g.phase==='playing')assert(g.play(0,1))}
assert(g.played[0][1].passed,'pasar la primera obliga seguir pasando');
// Reservada: puede envidar, jugar sin ley ni cantar flor.
const reservedCards=noFlowers();reservedCards[0]=[c(11,'Copas'),c(10,'Copas'),c(4,'Oros')];
g=setup(reservedCards);g.vira=c(6,'Copas');assert(g.hasReserved(0));assert(g.canPlay(0));assert(g.canEnvido(0));
assert(g.call(0,'envido'));assert.equal(g.pending.kind,'envido');
// Dos flores opuestas: abrir envite, no resolver flor por comparación automática.
const doubleFlowers=noFlowers();doubleFlowers[0]=[c(4),c(5),c(6)];
doubleFlowers[1]=[c(5,'Bastos'),c(6,'Bastos'),c(7,'Bastos')];
g=setup(doubleFlowers);assert(g.callFlor(0));assert(g.respond(1,'flor'));assert(g.respond(2,'no'));assert(g.respond(3,'no'));
assert.equal(g.pending.kind,'flor-choice');assert.deepEqual(g.scores,[0,0]);
assert(g.respond(0,'florEnvido'));assert.equal(g.pending.kind,'flor-envite');
assert(g.respond(1,'yes'));assert.equal(g.pending,null);
assert.equal(g.awards.length,2);assert.deepEqual(g.scores,[0,0]);
g.endHand(0,1,'test');assert(g.scores[1]>=5);

// Random hands: 100 complete matches, all explicit human/bot responses and flowers.
for(let run=0;run<100;run++){
 const m=new Match({count:run%2?2:4,rng});let steps=0;
 while(m.matchWinner===null&&steps++<20000){
  let ok;
  if(m.phase==='hand-over')ok=m.nextHand();else if(m.phase==='baza-over')ok=m.resolveBaza();
  else if(m.pending){const p=m.pending.targets.find(w=>!m.pending.responses[w]);if(p===0){if(m.pending.kind==='flor')ok=m.respond(0,m.hasFlor(0)?'flor':'no');else if(['flor-choice','flor-achico'].includes(m.pending.kind))ok=m.respond(0,'florEnvido');else if(m.pending.kind==='flor-envite')ok=m.respond(0,'yes');else if(m.needsFlor(0))ok=m.callFlor(0);else ok=m.respond(0,'yes')}else ok=m.botAction(p)}
  else if(m.turn===0)ok=m.needsFlor(0)?m.callFlor(0):m.play(0,m.hands[0].findIndex(Boolean));else ok=m.botAction();
  assert(ok,`stuck: run ${run}, step ${steps}, phase ${m.phase}`);
 }
 assert(m.matchWinner!==null);assert(steps<20000);assert(m.results.length<=3);
}
console.log('Passed: turnos, barajado, tantos al final, matar tapado y embuste, flores, 12/24 y 100 partidas.');
