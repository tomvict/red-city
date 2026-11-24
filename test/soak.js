'use strict';
const path=require('path');
globalThis.window=globalThis;
function anyProxy(){const f=function(){return anyProxy();};return new Proxy(f,{get(t,p){if(p===Symbol.toPrimitive)return ()=>0;return anyProxy();},apply(){return anyProxy();},set(){return true;}});}
function fakeCanvas(){const c={width:960,height:540,style:{},dataset:{},_ctx:null,getContext(){if(!c._ctx)c._ctx=anyProxy();return c._ctx;},addEventListener(){},getBoundingClientRect(){return{left:0,top:0,width:c.width,height:c.height};}};return c;}
function fakeEl(id){return{id,style:{},dataset:{},textContent:'',innerHTML:'',width:168,height:168,classList:{_s:new Set(),add(c){this._s.add(c);},remove(c){this._s.delete(c);},toggle(c,f){if(f===undefined){this._s.has(c)?this._s.delete(c):this._s.add(c);}else if(f)this._s.add(c);else this._s.delete(c);},contains(c){return this._s.has(c);}},getContext(){return anyProxy();},addEventListener(){},appendChild(){},getBoundingClientRect(){return{left:0,top:0,width:100,height:100};}};}
const els={};
globalThis.document={createElement:()=>fakeCanvas(),getElementById:id=>els[id]||(els[id]=fakeEl(id)),addEventListener(){},body:fakeEl('body')};
const base=path.join(__dirname,'..','js');
for(const f of ['util.js','input.js','audio.js','world.js','entities.js','missions.js','render.js','game.js'])require(path.join(base,f));
const U=globalThis.U,Input=globalThis.Input,E=globalThis.E,Game=globalThis.Game;
const KEYS=['KeyW','KeyA','KeyS','KeyD','KeyE','Space','KeyC','KeyM','KeyP'];
let seed=12345;
function srand(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;}
let errors=0,framesTotal=0;
for(let run=0;run<6;run++){
 const g=new Game(fakeCanvas(),{});
 g.minimapCanvas=fakeCanvas();
 g.start();
 for(let i=0;i<1500;i++){
  for(const k of KEYS)Input.keys[k]=srand()<0.25;
  Input.mouse.down=srand()<0.5;
  Input.mouse.x=srand()*960;Input.mouse.y=srand()*540;
  if(srand()<0.02&&g.missions.active===null){
   const avail=g.missions.list.filter(m=>m.state==='available');
   if(avail.length){const m=avail[(srand()*avail.length)|0];g.player.x=m.booth.x;g.player.y=m.booth.y;}
  }
  if(srand()<0.01&&!g.inside){
   const b=g.world.buildings[(srand()*g.world.buildings.length)|0];
   g.player.x=b.door.x;g.player.y=b.door.y;
  }
  if(srand()<0.01)g.addWanted(1);
  if(srand()<0.005&&g.state==='dead')g.start();
  try{
   g.update(1/60);
   if(i%30===0)g.render();
  }catch(e){
   errors++;
   console.log('ERROR run',run,'frame',i,'state',g.state,'inside',!!g.inside,'driving',!!g.player.driving,':',e.message);
   console.log(e.stack.split('\n').slice(0,4).join('\n'));
   break;
  }
  framesTotal++;
 }
 Input.keys={};
}
console.log('---');
console.log('soak: '+framesTotal+' frames simulées, '+errors+' erreur(s)');
process.exit(errors?1:0);
