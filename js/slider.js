/* ==========================================================================
   SLIDER.JS — Inicialización del hero slider (Swiper.js)
   ========================================================================== */

(function(){
  'use strict';

  if(typeof Swiper === 'undefined'){
    console.warn('Swiper.js no se cargó correctamente. El hero mostrará solo la primera diapositiva.');
    return;
  }

  const heroSwiper = new Swiper('.hero-slider .swiper', {
    loop: true,
    speed: 600,
    autoplay: {
      delay: 6500,
      disableOnInteraction: false,
      pauseOnMouseEnter: true
    },
    pagination: {
      el: '.hero-slider .swiper-pagination',
      clickable: true
    },
    navigation: {
      nextEl: '.hero-slider .swiper-button-next',
      prevEl: '.hero-slider .swiper-button-prev'
    },
    a11y: {
      enabled: true,
      prevSlideMessage: 'Diapositiva anterior',
      nextSlideMessage: 'Siguiente diapositiva',
      paginationBulletMessage: 'Ir a la diapositiva {{index}}'
    },
    keyboard: { enabled: true },
    on: {
      init: function(){
        const activeSlide = document.querySelector('.swiper-slide-active .hero-slide-inner');
        if(activeSlide) restartTextAnimation(activeSlide);
      },
      slideChangeTransitionStart: function(){
        const activeSlide = document.querySelector('.swiper-slide-active .hero-slide-inner');
        if(activeSlide) restartTextAnimation(activeSlide);
      }
    }
  });

  function restartTextAnimation(container){
    const children = container.children;
    Array.from(children).forEach(function(child){
      child.style.animation = 'none';
      void child.offsetWidth;
      child.style.animation = '';
    });
  }

  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    heroSwiper.autoplay.stop();
  }

})();
