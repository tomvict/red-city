(function(){
window.addEventListener('load',()=>{
 const canvas=document.getElementById('game');
 const SCALE=0.5;
 function resize(){
  canvas.width=Math.max(320,Math.ceil(window.innerWidth*SCALE));
  canvas.height=Math.max(240,Math.ceil(window.innerHeight*SCALE));
  canvas.dataset.scale=String(SCALE);
 }
 resize();
 window.addEventListener('resize',resize);
 const game=new Game(canvas);
 globalThis.game=game;
 Input.init(canvas);
 game.minimapCanvas=document.getElementById('minimap');
 const menu=document.getElementById('menu');
 const over=document.getElementById('over');
 if(menu)menu.addEventListener('click',()=>game.start());
 if(over)over.addEventListener('click',()=>game.start());
 window.addEventListener('keydown',()=>{AudioSys.init();AudioSys.resume();});
 const crtBtn=document.getElementById('crtBtn');
 if(crtBtn)crtBtn.addEventListener('click',e=>{e.stopPropagation();game.toggleCRT();});
 let last=performance.now();
 function frame(t){
  let dt=(t-last)/1000;
  last=t;
  if(dt>0.05)dt=0.05;
  game.update(dt);
  game.render();
  Input.endFrame();
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
});
})();
