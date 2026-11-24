(function(){
const DEFS=[
 {id:'cleanup',type:'killall',name:'NETTOYAGE',desc:'Entrepôt : éliminez tout le monde.',reward:1200,count:6,pref:'warehouse'},
 {id:'briefcase',type:'retrieve',name:'LA MALLETTE',desc:'Banque : récupérez la mallette et ressortez.',reward:1500,pref:'bank'},
 {id:'hostage',type:'rescue',name:'OTAGE',desc:'Libérez l\'otage et escortez-le dehors.',reward:1800,pref:'bar'},
 {id:'bomb',type:'destroy',name:'SABOTAGE',desc:'Commissariat : faites sauter le dispositif.',reward:2200,pref:'police'},
 {id:'hit',type:'killall',name:'RÈGLEMENT DE COMPTES',desc:'Bureaux : tuez la cible et ses gardes.',reward:2000,count:5,pref:'office'},
 {id:'files',type:'retrieve',name:'DOSSIERS',desc:'Hôpital : volez les dossiers et ressortez.',reward:1400,pref:'hospital'},
 {id:'witness',type:'rescue',name:'LE TÉMOIN',desc:'Exfiltrez le témoin du restaurant.',reward:1600,pref:'restaurant'},
 {id:'plant',type:'destroy',name:'LA BOMBE',desc:'Faites sauter la bombe dans la banque.',reward:2500,pref:'bank'}
];
const Missions={
 DEFS,
 init(world){
  const list=[],used=new Set();
  for(const def of DEFS){
   let b=null;
   const cands=world.buildings.filter(x=>x.type===def.pref&&!used.has(x.id));
   if(cands.length)b=U.choice(cands);
   else{
    const rest=world.buildings.filter(x=>!used.has(x.id));
    b=rest.length?U.choice(rest):world.buildings[0];
   }
   used.add(b.id);
   const off={'n':[0,-1],'s':[0,1],'w':[-1,0],'e':[1,0]}[b.door.side];
   const perp=(b.door.side==='n'||b.door.side==='s')?[1,0]:[0,1];
   let bp=null;
   for(const d of [64,88,112])for(const s of [0,34,-34]){
    const x=b.door.x+off[0]*d+perp[0]*s,y=b.door.y+off[1]*d+perp[1]*s;
    let bad=false;
    for(const c of world.parked)if(U.dist2(x,y,c.x,c.y)<42*42){bad=true;break;}
    if(!bad)for(const sol of world.solids)if(U.pointInRect(x,y,sol)){bad=true;break;}
    if(!bad){bp={x,y};break;}
   }
   if(!bp)bp={x:b.door.x+off[0]*64,y:b.door.y+off[1]*64};
   const booth={x:bp.x,y:bp.y,mission:null};
   const m={def,building:b,booth,state:'available',roomEnemies:[]};
   booth.mission=m;
   world.booths.push(booth);
   list.push(m);
  }
  return {list,active:null};
 },
 update(g){
  const m=g.missions.active;
  if(!m)return;
  if(m.def.type==='killall'&&m.roomEnemies.length&&m.roomEnemies.every(e=>e.dead))g.completeMission(m);
 }
};
globalThis.Missions=Missions;
})();
