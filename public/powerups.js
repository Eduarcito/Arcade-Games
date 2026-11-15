/* Mejoras recogibles de las naves. Todo el tiempo avanza con la partida. */
(() => {
  'use strict';
  const types = {
    triple: {letter:'T',name:'TRIPLE',color:'#a5f18b',duration:12},
    rapid: {letter:'R',name:'RÁFAGA',color:'#ffd47e',duration:12},
    laser: {letter:'L',name:'LÁSER',color:'#d8a0ff',duration:12},
    shield: {letter:'E',name:'ESCUDO',color:'#83e8ff',duration:12}
  };
  const order=['triple','rapid','laser','shield'];
  function create(){
    const state={weapon:'normal',weaponTime:0,shieldTime:0,kills:0,dropIndex:0,drops:[],notice:'',noticeTime:0};
    function destroyed(x,y){
      state.kills++;
      if(state.kills%4!==0)return null;
      const type=order[state.dropIndex++%order.length];
      const drop={type,x:Math.max(20,Math.min(460,x)),y:Math.max(30,Math.min(430,y)),w:26,h:26};
      state.drops.push(drop);return drop;
    }
    function update(dt,player){
      state.weaponTime=Math.max(0,state.weaponTime-dt);
      state.shieldTime=Math.max(0,state.shieldTime-dt);
      state.noticeTime=Math.max(0,state.noticeTime-dt);
      if(state.weaponTime===0)state.weapon='normal';
      const collected=[];
      state.drops=state.drops.filter(drop=>{
        drop.y+=65*dt;
        if(Math.abs(drop.x-player.x)<(drop.w+player.w)/2&&Math.abs(drop.y-player.y)<(drop.h+player.h)/2){
          const info=types[drop.type];
          if(drop.type==='shield')state.shieldTime=info.duration;
          else{state.weapon=drop.type;state.weaponTime=info.duration;}
          state.notice=info.name;state.noticeTime=1.2;collected.push(drop.type);return false;
        }
        return drop.y<590;
      });
      return collected;
    }
    function shoot(x,y){
      const bullet=(offset,vx,vy=-440,damage=1,pierce=1)=>({x:x+offset,y:y-16,w:4,h:13,vx,vy,damage,pierce,hits:new Set(),type:state.weapon});
      if(state.weapon==='triple')return [bullet(0,0),bullet(-8,-120),bullet(8,120)];
      if(state.weapon==='rapid')return [bullet(-7,0,-500),bullet(7,0,-500)];
      if(state.weapon==='laser'){const beam=bullet(0,0,-620,2,3);beam.w=8;beam.h=30;return [beam];}
      return [bullet(0,0)];
    }
    function interval(){return state.weapon==='rapid'?.09:state.weapon==='laser'?.26:.19;}
    function absorb(){if(state.shieldTime<=0)return false;state.shieldTime=0;state.notice='ESCUDO ABSORBIÓ EL GOLPE';state.noticeTime=1.2;return true;}
    function loseLife(){state.weapon='normal';state.weaponTime=0;state.shieldTime=0;state.noticeTime=0;}
    return {state,destroyed,update,shoot,interval,absorb,loseLife};
  }
  function draw(ctx,state,time,player){
    for(const drop of state.drops){
      const info=types[drop.type],size=26,pulse=1+Math.sin(time*5)*.12;
      ctx.fillStyle='#101d33';ctx.fillRect(drop.x-16,drop.y-16,32,32);
      ctx.strokeStyle=info.color;ctx.lineWidth=2;ctx.strokeRect(drop.x-size/2,drop.y-size/2,size,size);
      ctx.fillStyle=info.color;ctx.font='bold 20px monospace';ctx.textAlign='center';ctx.fillText(info.letter,drop.x,drop.y+7);
      ctx.fillRect(drop.x-3,drop.y-22*pulse,6,3);ctx.textAlign='left';
    }
    if(state.shieldTime>0){ctx.strokeStyle=types.shield.color;ctx.lineWidth=2;ctx.globalAlpha=.65+Math.sin(time*4)*.2;ctx.beginPath();ctx.arc(player.x,player.y,23,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
    const bar=(type,remaining,x)=>{const info=types[type];ctx.fillStyle='#101d33';ctx.fillRect(x,8,180,32);ctx.fillStyle=info.color;ctx.font='bold 13px monospace';ctx.textAlign='left';ctx.fillText(`${info.name} ${Math.ceil(remaining)}s`,x+7,25);ctx.fillStyle='#34425b';ctx.fillRect(x+7,31,166,3);ctx.fillStyle=info.color;ctx.fillRect(x+7,31,166*remaining/info.duration,3);};
    if(state.weapon!=='normal')bar(state.weapon,state.weaponTime,10);
    if(state.shieldTime>0)bar('shield',state.shieldTime,290);
    if(state.noticeTime>0){ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillStyle='#edf8d7';ctx.fillText(state.notice,240,472);ctx.textAlign='left';}
    ctx.lineWidth=1;
  }
  window.ArcadiaPowerups={create,draw,types};
})();
