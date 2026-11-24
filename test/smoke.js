'use strict';
const path=require('path');
globalThis.window=globalThis;
function anyProxy(){
 const f=function(){return anyProxy();};
 return new Proxy(f,{
  get(t,p){if(p===Symbol.toPrimitive)return ()=>0;return anyProxy();},
  apply(){return anyProxy();},
  set(){return true;}
 });
}
function fakeCanvas(){
 const c={width:960,height:540,style:{},dataset:{},_ctx:null,
  getContext(){if(!c._ctx)c._ctx=anyProxy();return c._ctx;},
  addEventListener(){},
  getBoundingClientRect(){return {left:0,top:0,width:c.width,height:c.height};}};
 return c;
}
function fakeEl(id){
 return {id,style:{},dataset:{},textContent:'',innerHTML:'',width:168,height:168,
  classList:{_s:new Set(),add(c){this._s.add(c);},remove(c){this._s.delete(c);},toggle(c,f){if(f===undefined){this._s.has(c)?this._s.delete(c):this._s.add(c);}else if(f)this._s.add(c);else this._s.delete(c);},contains(c){return this._s.has(c);}},
  getContext(){return anyProxy();},
  addEventListener(){},appendChild(){},
  getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}};
}
const els={};
globalThis.document={
 createElement:()=>fakeCanvas(),
 getElementById:id=>els[id]||(els[id]=fakeEl(id)),
 addEventListener(){},
 body:fakeEl('body')
};
const base=path.join(__dirname,'..','js');
for(const f of ['util.js','input.js','audio.js','world.js','entities.js','missions.js','render.js','game.js'])require(path.join(base,f));
const U=globalThis.U,Input=globalThis.Input,World=globalThis.World,E=globalThis.E,Game=globalThis.Game,Missions=globalThis.Missions;
let pass=0,fail=0;
function ok(cond,name){
 if(cond){pass++;console.log('PASS  '+name);}
 else{fail++;console.log('FAIL  '+name);}
}
function frames(g,n,dt){for(let i=0;i<n;i++)g.update(dt||1/60);}
function newGame(){
 const c=fakeCanvas();
 const g=new Game(c,{});
 g.minimapCanvas=fakeCanvas();
 g.start();
 return g;
}
function press(code){Input.keys[code]=true;}
function release(code){Input.keys[code]=false;}
function clearKeys(){for(const k in Input.keys)Input.keys[k]=false;Input.mouse.down=false;}
function tap(g,code){Input.keys[code]=false;g.update(1/60);Input.keys[code]=true;g.update(1/60);Input.keys[code]=false;g.update(1/60);}

ok(U.segRect(0,0,10,0,{x:5,y:-1,w:2,h:2})===true,'util.segRect hit');
ok(U.segRect(0,0,10,0,{x:20,y:0,w:5,h:5})===false,'util.segRect miss');
ok(U.obbOverlap({x:0,y:0,w:10,h:4,ang:0},{x:8,y:0,w:10,h:4,ang:0})===true,'util.obbOverlap hit');
ok(U.obbOverlap({x:0,y:0,w:10,h:4,ang:0},{x:30,y:0,w:10,h:4,ang:0})===false,'util.obbOverlap miss');
ok(U.obbOverlap({x:24,y:190,w:42,h:22,ang:-1.57},U.rectOBB({x:175.2,y:175.2,w:309.6,h:309.6}))===false,'util.obbOverlap: voiture vs bâtiment (coin haut-gauche) pas de faux positif');
ok(U.circleRect(5,5,2,{x:0,y:0,w:10,h:10})===true,'util.circleRect inside');
ok(U.circleRect(20,20,2,{x:0,y:0,w:10,h:10})===false,'util.circleRect outside');

{
 const w=World.build();
 let roadOk=true;
 for(const b of w.buildings){
  for(let i=0;i<=World.N;i++){
   if(U.rectsOverlap(b,{x:i*World.PITCH,y:0,w:World.ROAD,h:World.H}))roadOk=false;
   if(U.rectsOverlap(b,{x:0,y:i*World.PITCH,w:World.W,h:World.ROAD}))roadOk=false;
  }
 }
 ok(roadOk,'world: aucun bâtiment sur une route ('+w.buildings.length+' bâtiments)');
 ok(w.buildings.some(b=>b.type==='hospital')&&w.buildings.some(b=>b.type==='police')&&w.buildings.some(b=>b.type==='bank'),'world: hôpital + commissariat + banque présents');
 ok(w.parked.length>20,'world: voitures garées présentes ('+w.parked.length+')');
 let interiorOk=true;
 for(const b of w.buildings){
  const it=World.makeInterior(b);
  if(!it||it.solids.length<4||it.spawns.length<1||!it.entry)interiorOk=false;
 }
 ok(interiorOk,'world: intérieurs générés pour tous les bâtiments');
}

{
 const g=newGame();
 const p=g.player;
 g.cars=g.cars.filter(c=>U.dist(c.x,c.y,p.x,p.y)>500);
 const y0=p.y;
 press('KeyW');
 for(let i=0;i<60;i++){g.hitstop=0;g.update(1/60);}
 release('KeyW');
 ok(p.y<y0-100,'joueur: déplacement vers le haut ('+Math.round(y0-p.y)+'px)');
 const b=g.world.buildings[0];
 p.x=b.x+b.w/2;p.y=b.y-16;press('KeyS');frames(g,90);release('KeyS');
 ok(!U.pointInRect(p.x,p.y,{x:b.x,y:b.y,w:b.w,h:b.h}),'joueur: collision mur du bâtiment respectée');
 ok(g.state==='playing','game: état playing après start');
 clearKeys();
}

{
 const g=newGame();
 const p=g.player;
 const c=g.cars[0];
 const dp=c.doorPoints()[0];
 p.x=dp.x;p.y=dp.y;
 tap(g,'KeyE');
 ok(p.driving===c,'voiture: E monte dans la voiture');
 const cx=c.x,cy=c.y;
 let maxD=0;
 press('KeyW');
 for(let i=0;i<120;i++){g.update(1/60);maxD=Math.max(maxD,U.dist(c.x,c.y,cx,cy));}
 release('KeyW');
 ok(maxD>40,'voiture: conduite avance ('+Math.round(maxD)+'px max)');
 tap(g,'KeyE');
 ok(p.driving===null,'voiture: E fait sortir du véhicule');
 clearKeys();
}

{
 const g=newGame();
 const p=g.player;
 p.weapon='pistol';p.weapons.pistol.ammo=60;
 const e=new E.Enemy({x:p.x+130,y:p.y,kind:'gang',weapon:'pistol',hp:55});
 g.enemies.push(e);
 g.peds.push(new E.Ped({x:p.x+200,y:p.y,color:'#fff'}));
 g.update(1/60);
 Input.mouse.x=e.x-g.cam.x;Input.mouse.y=e.y-g.cam.y;
 Input.mouse.down=true;
 frames(g,90);
 Input.mouse.down=false;
 ok(e.dead,'combat: le pistolet tue un ennemi');
 ok(g.wanted>=1,'combat: tirer en public augmente le wanted ('+g.wanted+'★)');
 ok(g.particles.length>0||g.corpses.length>0,'combat: gore (particules/cadavres)');
 clearKeys();
}

{
 const g=newGame();
 const p=g.player;
 p.weapon='fists';
 const e=new E.Enemy({x:p.x+28,y:p.y,kind:'gang',weapon:'melee',hp:55});
 g.enemies.push(e);
 Input.mouse.down=true;
 for(let i=0;i<150&&!e.dead;i++){g.update(1/60);Input.mouse.x=e.x-g.cam.x;Input.mouse.y=e.y-g.cam.y;}
 Input.mouse.down=false;
 ok(e.dead,'combat: les poings tuent en un coup');
 clearKeys();
}

{
 const g=newGame();
 const c=g.cars[0];
 c.hp=10;
 g.explode(c.x,c.y,200,300,true);
 ok(c.dead,'explosion: détruit une voiture proche');
 ok(g.wanted>=2,'explosion: +wanted si causée par le joueur');
 clearKeys();
}

{
 const g=newGame();
 g.addWanted(3);
 frames(g,600);
 const cops=g.enemies.filter(e=>e.kind==='cop'&&!e.dead).length;
 ok(cops>0,'police: des flics spawnent avec 3 étoiles ('+cops+')');
 clearKeys();
}

{
 const g=newGame();
 const before=g.cars.filter(c=>c.ai&&c.ai.mode==='traffic').map(c=>({c,x:c.x,y:c.y}));
 frames(g,300);
 const moved=before.some(o=>U.dist(o.c.x,o.c.y,o.x,o.y)>30);
 ok(moved,'trafic: les voitures civiles roulent');
}

function setupMission(g,type){
 const m=g.missions.list.find(m=>m.def.type===type);
 ok(!!m,'mission '+type+': définition trouvée');
 g.player.x=m.booth.x;g.player.y=m.booth.y;
 tap(g,'KeyE');
 ok(g.missions.active===m,'mission '+type+': acceptée à la cabine');
 g.player.x=m.building.door.x;g.player.y=m.building.door.y;
 tap(g,'KeyE');
 ok(g.inside&&g.inside.mission===m,'mission '+type+': intérieur de mission lancé');
 return m;
}
{
 const g=newGame();
 const m=setupMission(g,'killall');
 ok(m.roomEnemies.length>=4,'mission killall: ennemis spawnes dans le bâtiment ('+m.roomEnemies.length+')');
 for(const e of [...m.roomEnemies])g.killHuman(e,'bullet',true);
 frames(g,5);
 ok(m.state==='done','mission killall: terminée quand tous les ennemis sont morts');
 ok(g.player.money>=m.def.reward,'mission killall: récompense payée ($'+g.player.money+')');
 clearKeys();
}
{
 const g=newGame();
 const m=setupMission(g,'retrieve');
 ok(g.obj&&g.obj.item&&!g.obj.item.taken,'mission retrieve: objet présent');
 g.player.x=g.obj.item.x;g.player.y=g.obj.item.y;
 tap(g,'KeyE');
 ok(g.obj.item.taken&&g._itemTaken,'mission retrieve: objet ramassé');
 const inter=g.inside.building.interior;
 g.player.x=inter.entry.x;g.player.y=inter.entry.y;
 tap(g,'KeyE');
 ok(g.inside===null&&m.state==='done','mission retrieve: terminée en ressortant');
 clearKeys();
}
{
 const g=newGame();
 const m=setupMission(g,'rescue');
 const h=g.obj.hostage;
 ok(h&&!h.freed,'mission rescue: otage présent');
 g.player.x=h.x;g.player.y=h.y;
 tap(g,'KeyE');
 ok(h.freed,'mission rescue: otage libéré');
 const inter=g.inside.building.interior;
 g.player.x=inter.entry.x;g.player.y=inter.entry.y;
 tap(g,'KeyE');
 ok(m.state==='done','mission rescue: terminée en ressortant avec l\'otage');
 clearKeys();
}
{
 const g=newGame();
 const m=setupMission(g,'rescue');
 g.killHuman(g.obj.hostage,'bullet',true);
 frames(g,5);
 ok(m.state==='failed','mission rescue: échoue si l\'otage meurt');
 clearKeys();
}
{
 const g=newGame();
 const m=setupMission(g,'destroy');
 const d=g.obj.device;
 ok(d&&!d.armed,'mission destroy: dispositif présent');
 g.player.x=d.x;g.player.y=d.y;
 tap(g,'KeyE');
 ok(d.armed&&d.fuse>0,'mission destroy: dispositif armé (fusible '+d.fuse.toFixed(1)+'s)');
 g.player.maxhp=1e9;g.player.hp=1e9;
 frames(g,240);
 ok(d.done&&m.state==='done','mission destroy: explosion puis mission terminée');
 clearKeys();
}

{
 const g=newGame();
 const b=g.world.buildings.find(b=>!(g.missions.active&&g.missions.active.building===b));
 g.player.x=b.door.x;g.player.y=b.door.y;
 tap(g,'KeyE');
 ok(g.inside!==null,'bâtiment: entrée dans un bâtiment quelconque');
 const inter=g.inside.building.interior;
 g.player.x=inter.entry.x;g.player.y=inter.entry.y;
 tap(g,'KeyE');
 ok(g.inside===null,'bâtiment: sortie OK');
 clearKeys();
}

{
 const g=newGame();
 const before=g.crt;
 g.toggleCRT();
 ok(g.crt===!before,'CRT: toggle on/off fonctionne');
 ok(document.body.classList.contains('crt')===g.crt,'CRT: classe body synchronisée');
 g.toggleCRT();
 clearKeys();
}

{
 const g=newGame();
 let threw=null;
 try{for(let i=0;i<120;i++){g.update(1/60);}g.render();}catch(e){threw=e;}
 ok(threw===null,'render: 120 frames + render sans exception'+(threw?(' -> '+threw.message):''));
 clearKeys();
}

{
 const g=newGame();
 const p=g.player;
 g.damagePlayer(999,'test',0,0);
 ok(g.state==='dead','mort: game over quand PV à 0');
 tap(g,'KeyR');
 ok(g.state==='playing','mort: R relance la partie');
 clearKeys();
}

console.log('---');
console.log(pass+' PASS, '+fail+' FAIL');
process.exit(fail?1:0);
