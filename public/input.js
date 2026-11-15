/* Entrada compartida: un solo dedo, captura y cancelación de gestos. */
(() => {
  'use strict';
  function track(element, handlers = {}) {
    let active = null, last = null, disposed = false;
    const remove = [];
    function listen(target, name, fn, options) {
      target.addEventListener(name, fn, options);
      remove.push(() => target.removeEventListener(name, fn, options));
    }
    const point = (event, type, target) => ({x:event.clientX, y:event.clientY, type, target:target || event.target});
    function prevent(event) { if (event.cancelable) event.preventDefault(); }
    function begin(id, p, event) {
      if (disposed || active !== null) return false;
      if (handlers.start?.(p) === false) return false;
      active = id; last = p; prevent(event); return true;
    }
    function move(id, p, event) {
      if (active !== id || active === null) return;
      last = p; prevent(event); handlers.move?.(p);
    }
    function end(id, cancelled, event) {
      if (active !== id || active === null) return;
      active = null;
      if (event) prevent(event);
      handlers.end?.({...last, cancelled});
      try { if (element.hasPointerCapture?.(id)) element.releasePointerCapture(id); } catch {}
    }
    if ('PointerEvent' in window) {
      listen(element, 'pointerdown', event => {
        if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
        if (begin(event.pointerId, point(event,event.pointerType || 'mouse'),event)) {
          try { element.setPointerCapture(event.pointerId); } catch {}
        }
      });
      // Window listeners also cover browsers where pointer capture is unavailable.
      listen(window, 'pointermove', event => move(event.pointerId,point(event,event.pointerType || 'mouse'),event), {passive:false});
      listen(window, 'pointerup', event => {
        move(event.pointerId,point(event,event.pointerType || 'mouse'),event);
        end(event.pointerId,false,event);
      }, {passive:false});
      listen(window, 'pointercancel', event => end(event.pointerId,true,event));
      listen(element, 'lostpointercapture', event => end(event.pointerId,true,event));
    } else {
      // Older touch browsers use the same gesture rules and never switch fingers.
      listen(element, 'touchstart', event => {
        const touch=event.changedTouches[0];
        if(touch)begin(touch.identifier,point(touch,'touch',event.target),event);
      }, {passive:false});
      listen(element, 'touchmove', event => {
        const touch=Array.from(event.changedTouches).find(t=>t.identifier===active);
        if(touch)move(touch.identifier,point(touch,'touch',event.target),event);
      }, {passive:false});
      for(const type of ['touchend','touchcancel'])listen(element,type,event=>{
        const touch=Array.from(event.changedTouches).find(t=>t.identifier===active);
        if(!touch)return;
        if(type==='touchend')move(touch.identifier,point(touch,'touch',event.target),event);
        end(touch.identifier,type==='touchcancel',event);
      }, {passive:false});
      listen(element,'mousedown',event=>{if(event.button===0)begin('mouse',point(event,'mouse'),event)});
      listen(window,'mousemove',event=>move('mouse',point(event,'mouse'),event));
      listen(window,'mouseup',event=>{move('mouse',point(event,'mouse'),event);end('mouse',false,event)});
    }
    const cancel = () => end(active,true);
    listen(window,'blur',cancel);
    listen(document,'visibilitychange',()=>{if(document.hidden)cancel()});
    return {
      cancel,
      destroy() { if(disposed)return;cancel();disposed=true;remove.forEach(fn=>fn()); }
    };
  }

  function swipe(element, onDirection, {continuous=false, threshold=16} = {}) {
    let origin, consumed=false;
    return track(element, {
      start(p) { origin=p;consumed=false; },
      move(p) {
        if(consumed || !origin)return;
        const dx=p.x-origin.x,dy=p.y-origin.y;
        if(Math.max(Math.abs(dx),Math.abs(dy))<threshold)return;
        // Avoid guessing when a gesture is almost exactly diagonal.
        if(Math.abs(Math.abs(dx)-Math.abs(dy))<3)return;
        onDirection(Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp');
        origin=p;consumed=!continuous;
      },
      end() { origin=null; }
    });
  }
  window.ArcadiaInput={track,swipe};
})();
