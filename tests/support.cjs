const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function harness({legacy=false,app=false}={}){
  let seed=73,nextId=0,now=0;
  const random=()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646};
  const frames=new Map(),timers=new Map(),lastBall={x:240,y:280};
  const ctx={fillStyle:'',fillRect(x,y,w,h){for(const n of [x,y,w,h])assert.ok(Number.isFinite(n),'Coordenadas finitas');if(this.fillStyle==='#ffffff'||this.fillStyle==='#fff3cf'){lastBall.x=x+w/2;lastBall.y=y+h/2}},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){},arc(){},fill(){}};
  class Element{
    constructor(tag='DIV'){this.events=new Map();this.children=[];this.nodes=new Map();this.tagName=tag;this.dataset={};this.value='';this.style={};this.textContent='';this.innerHTML='';this.open=false;this.classes=new Set();this.classList={add:(v)=>this.classes.add(v),remove:v=>this.classes.delete(v),contains:v=>this.classes.has(v),toggle:v=>{this.classes.has(v)?this.classes.delete(v):this.classes.add(v)}};this.bounds={left:0,top:0,width:480,height:560};}
    set innerHTML(value){this.html=value;this.children=[];this.nodes?.clear()}
    get innerHTML(){return this.html}
    addEventListener(name,fn){if(!this.events.has(name))this.events.set(name,new Set());this.events.get(name).add(fn)}
    removeEventListener(name,fn){this.events.get(name)?.delete(fn)}
    dispatch(name,options={}){const e={preventDefault(){this.defaultPrevented=true},cancelable:true,target:this,...options};for(const fn of this.events.get(name)||[])fn(e);this['on'+name]?.(e);return e}
    querySelector(selector){if(selector==='canvas'){const found=this.children.find(c=>c.tagName==='CANVAS');if(found)return found;}if(!this.nodes.has(selector))this.nodes.set(selector,new Element(selector==='canvas'?'CANVAS':'BUTTON'));return this.nodes.get(selector)}
    querySelectorAll(){return []}
    append(...nodes){this.children.push(...nodes)}
    replaceChildren(...nodes){this.children=[...nodes]}
    setAttribute(name,value){this[name]=value}
    setPointerCapture(){}
    hasPointerCapture(){return false}
    getContext(){return ctx}
    getBoundingClientRect(){return this.bounds}
    closest(selector){return selector==='[data-i]'&&this.dataset.i!==undefined?this:null}
    focus(){}
    showModal(){this.open=true}
    close(){this.open=false;this.dispatch('close')}
    scrollIntoView(){}
  }
  const document=new Element();document.createElement=t=>new Element(t.toUpperCase());document.getElementById=id=>document.querySelector('#'+id);document.documentElement=new Element('HTML');const window=new Element();if(!legacy)window.PointerEvent=function(){};
  const math=Object.create(Math);math.random=random;
  function timeout(fn,ms=0,repeat=false){const id=++nextId;timers.set(id,{fn,at:now+ms,repeat:repeat?ms:0});return id}
  const localStorage=new Map();
  const sandbox={window,document,Math:math,Set,console,performance:{now:()=>now},localStorage:{getItem:k=>localStorage.get(k)||null,setItem:(k,v)=>localStorage.set(k,v)},setTimeout:timeout,clearTimeout:id=>timers.delete(id),setInterval:(fn,ms)=>timeout(fn,ms,true),clearInterval:id=>timers.delete(id),requestAnimationFrame(fn){const id=++nextId;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id)};
  vm.createContext(sandbox);
  for(const name of ['icons','input','snake','mines','powerups','retro','screen',...(app?['app']:[])]){
    let source=fs.readFileSync(path.join(__dirname,'../public/'+name+'.js'),'utf8');
    if(name==='retro')source=source.replace('const armory=window.ArcadiaPowerups.create();','const armory=window.ArcadiaPowerups.create();window.testArmory=armory;').replace('return {update,draw,control:()=>({x:player.x,y:player.y})};','return {update,draw,control:()=>({x:player.x,y:player.y}),inspect:()=>({bullets,foes,enemies,shields,player})};').replace('window.ArcadiaRetro={games:collection,mount};','window.ArcadiaRetro={games:collection,mount,shooter,breaker,pong};').replace('const env = {ctx,state,beep,burst,finish,points,hud};','window.testState=state;const env = {ctx,state,beep,burst,finish,points,hud};').replace("const game = id==='galaxy'||id==='invaders'?shooter(env,id==='invaders'):id==='breakout'?breaker(env):pong(env);","const game = id==='galaxy'||id==='invaders'?shooter(env,id==='invaders'):id==='breakout'?breaker(env):pong(env);window.testGame=game;");
    vm.runInContext(source,sandbox,{filename:name+'.js'});
  }
  const state={running:true,paused:false,ended:false,time:0,keys:new Set(),pointer:null,touching:false,points:0,lives:3,level:1,firePulse:0};
  const env={ctx,state,beep(){},burst(){},finish(message){state.ended=true;state.message=message},points(n){state.points+=n},hud(){}};
  function advance(time){assert.ok(time>=now,'El reloj no retrocede');let guard=0;while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>time)break;if(++guard>10000)throw Error('Timer loop');const[id,t]=next;now=t.at;if(t.repeat)t.at+=t.repeat;else timers.delete(id);t.fn();}now=time;const queue=[...frames.values()];frames.clear();queue.forEach(fn=>fn(now));}
  function pointer(element,type,x,y,id=1,more={}){const event={pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:y,target:element,...more};element.dispatch(type,event);window.dispatch(type,event);}
  function cell(i){const c=new Element('BUTTON');c.dataset.i=String(i);return c}
  return {api:window.ArcadiaRetro,input:window.ArcadiaInput,snake:window.ArcadiaSnake,mines:window.ArcadiaMines,env,lastBall,host:new Element(),document,window,frames,timers,advance,pointer,cell,eval:code=>vm.runInContext(code,sandbox),now:()=>now};
}
module.exports={harness};
