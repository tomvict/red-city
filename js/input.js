(function(){
const Input={
 keys:{},
 mouse:{x:0,y:0,down:false,clicked:false},
 init(canvas){
  window.addEventListener('keydown',e=>{
   Input.keys[e.code]=true;
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  });
  window.addEventListener('keyup',e=>{Input.keys[e.code]=false;});
  canvas.addEventListener('mousemove',e=>{
   const r=canvas.getBoundingClientRect(),s=parseFloat(canvas.dataset.scale||'1');
   Input.mouse.x=(e.clientX-r.left)/s;Input.mouse.y=(e.clientY-r.top)/s;
  });
  canvas.addEventListener('mousedown',e=>{if(e.button===0){Input.mouse.down=true;Input.mouse.clicked=true;}});
  window.addEventListener('mouseup',e=>{if(e.button===0)Input.mouse.down=false;});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
 },
 down(...codes){return codes.some(c=>Input.keys[c]);},
 endFrame(){Input.mouse.clicked=false;},
 moveVec(){
  let x=0,y=0;
  if(Input.down('KeyA','ArrowLeft'))x-=1;
  if(Input.down('KeyD','ArrowRight'))x+=1;
  if(Input.down('KeyW','ArrowUp'))y-=1;
  if(Input.down('KeyS','ArrowDown'))y+=1;
  if(x&&y){const l=Math.hypot(x,y);x/=l;y/=l;}
  return {x,y};
 }
};
globalThis.Input=Input;
})();
