const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('./support.cjs');
const player={x:240,y:510,w:24,h:24};
function pickup(armory,type){armory.state.drops.push({type,x:240,y:510,w:26,h:26});armory.update(0,player);}

test('Cápsulas: cada cuatro bajas cae un poder, todavía sin activar',()=>{
  const a=harness().window.ArcadiaPowerups.create(),types=[];
  for(let i=1;i<=20;i++){
    const drop=a.destroyed(240,200);
    assert.equal(Boolean(drop),i%4===0);
    if(drop)types.push(drop.type);
  }
  assert.deepEqual(types,['triple','rapid','laser','shield','triple']);
  assert.equal(a.state.weapon,'normal');assert.equal(a.state.shieldTime,0);
});

test('Las cápsulas caen, requieren contacto y desaparecen al perderlas',()=>{
  const a=harness().window.ArcadiaPowerups.create();
  for(let i=0;i<4;i++)a.destroyed(240,430);
  a.update(.5,player);assert.equal(a.state.weapon,'normal');assert.equal(a.state.drops[0].y,462.5);
  a.update(.5,player);assert.equal(a.state.weapon,'triple');assert.equal(a.state.drops.length,0);
  for(let i=0;i<4;i++)a.destroyed(20,430);
  a.update(3,player);assert.equal(a.state.drops.length,0);assert.equal(a.state.weapon,'triple');
});

test('Armas: triple en abanico, ráfaga doble rápida y láser de doble daño',()=>{
  const a=harness().window.ArcadiaPowerups.create(),normal=a.interval();
  assert.equal(a.shoot(240,510).length,1);
  pickup(a,'triple');const triple=a.shoot(240,510);assert.equal(triple.length,3);assert.deepEqual(Array.from(triple,b=>b.vx),[0,-120,120]);
  pickup(a,'rapid');assert.equal(a.shoot(240,510).length,2);assert.ok(a.interval()<normal/2);
  pickup(a,'laser');const [laser]=a.shoot(240,510);assert.equal(laser.damage,2);assert.equal(laser.pierce,3);
});

test('Recoger reemplaza o renueva el arma; el escudo es independiente y todo caduca',()=>{
  const a=harness().window.ArcadiaPowerups.create();
  pickup(a,'triple');a.update(8,player);assert.equal(a.state.weaponTime,4);
  pickup(a,'triple');assert.equal(a.state.weaponTime,12);
  pickup(a,'shield');pickup(a,'laser');assert.equal(a.state.weapon,'laser');assert.equal(a.state.shieldTime,12);
  a.update(12,player);assert.equal(a.state.weapon,'normal');assert.equal(a.state.weaponTime,0);assert.equal(a.absorb(),false);
});

test('Los impactos reales generan cápsulas en ambos juegos y el daño parcial no cuenta como baja',()=>{
  for(const invaders of [false,true]){
    const h=harness(),game=h.api.shooter(h.env,invaders),a=h.window.testArmory;
    const world=game.inspect();world.shields.length=0;
    for(const enemy of world.enemies.slice(0,4)){
      enemy.seed=0;
      const hit=()=>{const [b]=a.shoot(enemy.x,enemy.y+16);game.inspect().bullets.push(b);game.update(0);};
      if(enemy.hp===2){const kills=a.state.kills;hit();assert.equal(a.state.kills,kills);}
      hit();
    }
    assert.equal(a.state.kills,4);assert.equal(a.state.drops.length,1);assert.equal(a.state.weapon,'normal');
    game.draw();
  }
});

test('Ambos juegos recogen al arrastrar y disparan el arma nueva de inmediato',()=>{
  for(const invaders of [false,true]){
    const h=harness(),game=h.api.shooter(h.env,invaders),a=h.window.testArmory;
    h.env.state.touching=true;game.update(0);
    a.state.drops.push({type:'triple',x:300,y:510,w:26,h:26});
    h.env.state.pointer={x:300};game.update(.01);
    const shots=game.inspect().bullets.filter(b=>b.type==='triple');
    assert.equal(shots.length,3);assert.ok(shots.find(b=>b.vx<0).x<292);assert.ok(shots.find(b=>b.vx>0).x>308);
    assert.equal(a.state.drops.length,0);game.draw();
  }
});

test('El láser daña una sola vez a cada enemigo y se detiene tras atravesar tres',()=>{
  const h=harness(),game=h.api.shooter(h.env,false),a=h.window.testArmory;
  pickup(a,'laser');const world=game.inspect(),[beam]=a.shoot(240,116);beam.vy=0;
  world.bullets.push(beam);
  world.enemies.splice(0,world.enemies.length,...[0,1,2,3].map(()=>({baseX:240,baseY:100,x:240,y:100,w:25,h:23,hp:5,seed:0,row:0})));
  game.update(0);assert.deepEqual(Array.from(game.inspect().enemies,n=>n.hp),[3,3,3,5]);assert.equal(game.inspect().bullets.length,0);
  const [second]=a.shoot(240,116);second.vy=0;game.inspect().enemies.splice(1);game.inspect().bullets.push(second);
  game.update(0);const hp=game.inspect().enemies[0].hp;
  game.update(0);assert.equal(game.inspect().enemies[0].hp,hp);
});

test('Escudo absorbe un golpe, conserva el arma y el siguiente impacto quita vida y mejoras',()=>{
  for(const invaders of [false,true]){
    const h=harness(),game=h.api.shooter(h.env,invaders),a=h.window.testArmory;
    pickup(a,'triple');pickup(a,'shield');game.draw();
    const hit=dt=>{game.inspect().foes.push({x:240,y:510,w:5,h:12,vx:0,vy:0});game.update(dt);};
    hit(0);assert.equal(h.env.state.lives,3);assert.equal(a.state.shieldTime,0);assert.equal(a.state.weapon,'triple');
    hit(1.01);assert.equal(h.env.state.lives,2);assert.equal(a.state.weapon,'normal');
  }
});

test('Los poderes y cápsulas sobreviven al cambio de oleada',()=>{
  for(const invaders of [false,true]){
    const h=harness(),game=h.api.shooter(h.env,invaders),a=h.window.testArmory;
    pickup(a,'rapid');a.state.drops.push({type:'shield',x:20,y:60,w:26,h:26});game.inspect().enemies.length=0;
    for(let i=0;i<80;i++)game.update(1/60);
    assert.equal(h.env.state.level,2);assert.equal(a.state.weapon,'rapid');assert.ok(a.state.weaponTime>10);assert.equal(a.state.drops.length,1);
  }
});

test('Pausar congela la duración y caída; reiniciar no conserva poderes',()=>{
  const h=harness(),api={score(){},record(){},status(){}};
  let stop=h.api.mount('galaxy',h.host,api);h.advance(0);
  h.pointer(h.host.querySelector('canvas'),'pointerdown',240,500);
  const a=h.window.testArmory;pickup(a,'triple');a.state.drops.push({type:'shield',x:20,y:60,w:26,h:26});
  h.advance(16);h.advance(32);h.host.querySelector('.arcade-pause').onclick();
  const remaining=a.state.weaponTime,y=a.state.drops[0].y;
  h.advance(5000);h.advance(10000);assert.equal(a.state.weaponTime,remaining);assert.equal(a.state.drops[0].y,y);
  h.host.querySelector('.arcade-pause').onclick();h.advance(10016);h.advance(10032);assert.ok(a.state.weaponTime<remaining);
  stop();stop=h.api.mount('galaxy',h.host,api);assert.equal(h.window.testArmory.state.weapon,'normal');assert.equal(h.window.testArmory.state.drops.length,0);stop();assert.equal(h.frames.size,0);
});
