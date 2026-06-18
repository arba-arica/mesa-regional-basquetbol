/* ==========================================================================
   ANIMATIONS.JS — Microinteracciones y utilidades de animación
   Nota: no incluye un "stats dashboard" con cifras de competencia (partidos,
   aficionados, promedios) porque esos datos no existen todavía. El contador
   animado queda disponible como utilidad para cuando haya cifras reales
   que mostrar (ej: cantidad de categorías activas, clubes inscritos).
   ========================================================================== */

(function(){
  'use strict';

  function animateCounter(el, target, duration){
    duration = duration || 1400;
    const start = 0;
    const startTime = performance.now();

    function step(now){
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(start + (target - start) * eased);
      el.textContent = value.toLocaleString('es-CL');
      if(progress < 1){
        requestAnimationFrame(step);
      } else {
        el.textContent = target.toLocaleString('es-CL');
      }
    }
    requestAnimationFrame(step);
  }

  window.MRB = window.MRB || {};
  window.MRB.animateCounter = animateCounter;

  const counterEls = document.querySelectorAll('[data-counter]');
  if(counterEls.length && 'IntersectionObserver' in window){
    const counterObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          const target = parseInt(entry.target.getAttribute('data-counter'), 10);
          if(!isNaN(target)) animateCounter(entry.target, target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counterEls.forEach(function(el){ counterObserver.observe(el); });
  }

  const tiltCards = document.querySelectorAll('.cat-card, .team-card, .video-card');
  tiltCards.forEach(function(card){
    card.addEventListener('mousemove', function(e){
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = 'perspective(800px) rotateY(' + (x * 4) + 'deg) rotateX(' + (y * -4) + 'deg) translateY(-4px)';
    });
    card.addEventListener('mouseleave', function(){
      card.style.transform = '';
    });
  });

})();
