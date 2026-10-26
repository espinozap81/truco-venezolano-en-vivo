const assert=require('node:assert/strict');
const {Match,DECK,power,piece,envido,flor,handWinner}=require('../dist/truco-engine.js');
const c=(n,s='Oros')=>({n,s});
let seed=17;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
function setup(hands,mano=0){const g=new Match({count:hands.length,rng});g.hands=hands.map(h=>h.slice());g.original=hands.map(h=>h.slice());g.vira=c(4,'Copas');g.mano=mano;g.turn=mano;g.leader=mano;g.florDone=true;return g}
assert.equal(DECK.length,40);
const g=new Match({rng});assert.equal(new Set(g.hands.flat().concat(g.vira).map(x=>x.n+x.s)).size,13);
assert.equal(g.play(1,0),false,'reject out-of-turn play');assert.equal(g.play(0,8),false);assert.equal(g.play(0,0),true);assert.equal(g.turn,1);assert.equal(g.play(0,0),false);
assert.equal(g.canEnvido(0),false,'played own card closes envido');assert.equal(g.canEnvido(1),!g.original.some(h=>flor(h,g.vira)),'pie can still envidar before own card');
const v=c(4);assert(power(c(11),v)>power(c(10),v));assert(power(c(10),v)>power(c(1,'Espadas'),v));assert(power(c(1,'Espadas'),v)>power(c(1,'Bastos'),v));assert(power(c(7,'Espadas'),v)>power(c(7),v));assert(power(c(3),v)>power(c(2),v));assert(power(c(12,'Copas'),v)>power(c(7,'Copas'),v));assert.equal(piece(c(12),c(11)),2);assert.equal(piece(c(12),c(10)),1);
assert.equal(envido([c(7),c(6),c(12,'Bastos')],c(4,'Espadas')),33);assert.equal(envido([c(11),c(7,'Bastos'),c(12,'Copas')],v),37);assert.equal(flor([c(11),c(10),c(4,'Bastos')],v),100);
for(const [results,expected] of [[[0,0],0],[[1,1],1],[[0,null],0],[[null,1],1],[[0,1],null],[[null,null],null],[[0,1,null],0],[[1,0,null],1],[[null,null,null],0],[[null,null,1],1]])assert.equal(handWinner(results,0),expected,JSON.stringify(results));
let t=setup([[c(1,'Espadas'),c(3),c(4,'Bastos')],[c(4),c(5),c(6,'Bastos')],[c(2),c(3,'Bastos'),c(5,'Bastos')],[c(6),c(7,'Bastos'),c(4,'Espadas')]]);
assert(t.call(0,'envido'));assert.equal(t.play(0,0),false,'pending canto blocks cards');assert.equal(t.respond(2,'yes'),false,'only responder may answer');assert(t.respond(1,'raise',3));assert.equal(t.pending.amount,5);assert(t.respond(0,'yes'));assert.equal(t.turn,0,'envite resumes original turn');assert(t.envidoAward);
assert(t.play(0,0));assert(t.play(1,0));assert(t.play(2,0));assert(t.play(3,0));assert.equal(t.phase,'baza-over');assert(t.resolveBaza());assert.equal(t.results[0],0);assert.equal(t.turn,0);assert.equal(t.played[0].length,1);
assert(t.play(0,1));assert(t.play(1,1));assert(t.play(2,1));assert(t.play(3,1));t.resolveBaza();assert.equal(t.phase,'hand-over','two wins end before third');assert.equal(t.played[0].length,2);const score=t.scores.slice();t.nextHand();assert.deepEqual(t.scores,score);assert.equal(t.mano,1);assert.equal(t.turn,1);assert.equal(t.played.flat().length,0);
t=setup([[c(3),c(5),c(4)],[c(2),c(6),c(7)]]);assert(t.call(0,'truco'));assert(t.respond(1,'yes'));assert.equal(t.trucoValue,3);assert.equal(t.canTruco(0),false);t.play(0,0);assert(t.canTruco(1));assert(t.call(1,'truco'));assert(t.respond(0,'raise'));assert.equal(t.pending.amount,9);assert(t.respond(1,'raise'));assert.equal(t.pending.amount,24);assert(t.respond(0,'no'));assert.equal(t.scores[1],9,'reject vale juego pays previously accepted nine');
t=new Match({rng});t.scores=[11,0];t.envidoAward=null;t.endHand(0,1,'test');assert.equal(t.scores[0],12);assert.equal(t.matchWinner,null);t.nextHand();t.scores=[23,0];t.envidoAward=null;t.endHand(0,1,'test');assert.equal(t.matchWinner,0);assert.equal(t.nextHand(),false);
t=new Match({rng});t.scores=[23,23];t.envidoAward={team:1,points:2,text:'envite'};t.endHand(0,1,'test');assert.equal(t.matchWinner,1,'envido scores before truco');assert.equal(t.scores[0],23);
// Seeded full games exercise rotation, bots, pardas, calls, and finite progress.
for(let run=0;run<100;run++){const m=new Match({count:run%2?2:4,rng});let steps=0;while(m.matchWinner===null&&steps++<20000){if(m.phase==='hand-over')m.nextHand();else if(m.phase==='baza-over')m.resolveBaza();else if(m.pending){m.respond(m.pending.responder,'yes')}else if(m.turn===0)m.play(0,m.hands[0].findIndex(Boolean));else m.botAction();}assert(m.matchWinner!==null,'game must finish');assert(steps<20000);assert(m.results.length<=3);}
console.log('Engine checks passed: turns, deck, vira, envido, raises, pardas, 12/24, 100 complete matches.');
