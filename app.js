/* ==========================================================================
   APP.JS — Orquestador principal
   Header sticky/blur, menú móvil, smooth scroll, nav activo, carga de datos
   ========================================================================== */

(function(){
  'use strict';

  /* ============ Header: blur al hacer scroll ============ */
  const header = document.querySelector('.site-header');
  function handleHeaderScroll(){
    if(!header) return;
    if(window.scrollY > 24){
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }
  window.addEventListener('scroll', handleHeaderScroll, { passive: true });
  handleHeaderScroll();

  /* ============ Menú móvil (drawer) ============ */
  const menuToggle = document.querySelector('.menu-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  const drawerClose = document.querySelector('.mobile-drawer-close');
  const drawerBackdrop = document.querySelector('.drawer-backdrop');

  function openDrawer(){
    if(!drawer) return;
    drawer.classList.add('is-open');
    drawerBackdrop.classList.add('is-open');
    menuToggle.classList.add('is-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer(){
    if(!drawer) return;
    drawer.classList.remove('is-open');
    drawerBackdrop.classList.remove('is-open');
    menuToggle.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if(menuToggle){
    menuToggle.addEventListener('click', function(){
      if(drawer.classList.contains('is-open')) closeDrawer();
      else openDrawer();
    });
  }
  if(drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if(drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  document.querySelectorAll('.mobile-links a').forEach(function(link){
    link.addEventListener('click', closeDrawer);
  });

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') closeDrawer();
  });

  /* ============ Resaltar enlace de navegación activo según sección visible ============ */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('nav.links a, .mobile-links a');

  function highlightActiveNav(){
    let currentId = '';
    sections.forEach(function(sec){
      const rect = sec.getBoundingClientRect();
      if(rect.top <= 120 && rect.bottom >= 120){
        currentId = sec.id;
      }
    });
    navLinks.forEach(function(link){
      const href = link.getAttribute('href') || '';
      if(href === '#' + currentId){
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
  window.addEventListener('scroll', highlightActiveNav, { passive: true });
  highlightActiveNav();

  /* ============ Buscador del header: redirige a la sección de jugadores ============ */
  const navSearchForm = document.querySelector('.nav-search');
  if(navSearchForm){
    navSearchForm.addEventListener('submit', function(e){
      e.preventDefault();
      const input = navSearchForm.querySelector('input');
      const playerInput = document.getElementById('playerRut');
      if(playerInput && input && input.value.trim()){
        playerInput.value = input.value.trim();
      }
      const target = document.getElementById('jugadores');
      if(target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ============ Scroll reveal: anima secciones al entrar en viewport ============ */
  const revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    const observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function(el){ observer.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('is-visible'); });
  }

  /* ============ Año dinámico en el footer ============ */
  const yearEl = document.getElementById('currentYear');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============ Carga de datos: noticias ============ */
  async function loadNews(){
    const grid = document.getElementById('newsGrid');
    if(!grid) return;
    try{
      const res = await fetch('data/news.json');
      const items = await res.json();
      if(!items.length){
        grid.innerHTML = '<div class="empty-state"><strong>Sin noticias publicadas</strong>Vuelve pronto para ver las últimas novedades de la Mesa Regional.</div>';
        return;
      }
      grid.innerHTML = items.map(function(n, i){
        const isFeatured = n.destacada;
        const dateFmt = new Date(n.fecha + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
        return (
          '<article class="news-card' + (isFeatured ? ' featured' : '') + ' reveal">' +
            '<div class="news-img">' + (n.imagen ? '<img src="' + n.imagen + '" alt="' + n.titular + '" loading="lazy">' : 'Imagen' + (isFeatured ? ' destacada' : '')) + '</div>' +
            '<div class="news-body">' +
              '<div class="news-meta"><span>' + n.categoria + '</span><span class="date">' + dateFmt + '</span></div>' +
              '<h3>' + n.titular + '</h3>' +
              (isFeatured && n.extracto ? '<p>' + n.extracto + '</p>' : '') +
              '<a href="' + n.enlace + '" class="news-link">Leer ' + (isFeatured ? 'noticia completa' : 'más') + ' →</a>' +
            '</div>' +
          '</article>'
        );
      }).join('');
      observeNewElements(grid);
    } catch(err){
      grid.innerHTML = '<div class="empty-state"><strong>No pudimos cargar las noticias</strong>Intenta recargar la página en unos minutos.</div>';
    }
  }

  /* ============ Carga de datos: torneos por categoría ============ */
  async function loadTournaments(){
    const grid = document.getElementById('catGrid');
    if(!grid) return;
    try{
      const res = await fetch('data/matches.json');
      const items = await res.json();
      grid.innerHTML = items.map(function(t){
        const statusLabel = t.estado === 'activo' ? 'En curso' : 'Por programar';
        return (
          '<div class="cat-card reveal">' +
            '<div class="cat-label">' + t.categoria + '</div>' +
            '<div class="cat-name">' + t.genero + '</div>' +
            '<span class="cat-status ' + t.estado + '">' + statusLabel + '</span>' +
            '<a href="' + t.enlace + '" target="_blank" rel="noopener" class="cat-link">Ver programación →</a>' +
          '</div>'
        );
      }).join('');
      observeNewElements(grid);
    } catch(err){
      grid.innerHTML = '<div class="empty-state"><strong>No pudimos cargar los torneos</strong>Intenta recargar la página en unos minutos.</div>';
    }
  }

  /* ============ Carga de datos: equipos/clubes ============ */
  async function loadTeams(){
    const grid = document.getElementById('teamsGrid');
    if(!grid) return;
    try{
      const res = await fetch('data/teams.json');
      const items = await res.json();
      if(!items.length){
        grid.innerHTML = '<div class="empty-state"><strong>Aún no hay clubes registrados</strong>Esta sección se actualizará cuando se confirme la nómina de participantes.</div>';
        return;
      }
      grid.innerHTML = items.map(function(team){
        return (
          '<div class="team-card reveal">' +
            '<div class="team-crest">' + (team.logo ? '<img src="' + team.logo + '" alt="' + team.nombre + '">' : team.nombre.charAt(0)) + '</div>' +
            '<h3>' + team.nombre + '</h3>' +
            '<span>' + team.ciudad + '</span>' +
          '</div>'
        );
      }).join('');
      observeNewElements(grid);
    } catch(err){
      grid.innerHTML = '<div class="empty-state"><strong>No pudimos cargar los clubes</strong>Intenta recargar la página en unos minutos.</div>';
    }
  }

  /* Vuelve a observar elementos cargados dinámicamente para el scroll reveal */
  function observeNewElements(container){
    const els = container.querySelectorAll('.reveal');
    if('IntersectionObserver' in window){
      const observer = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      els.forEach(function(el){ observer.observe(el); });
    } else {
      els.forEach(function(el){ el.classList.add('is-visible'); });
    }
  }

  loadNews();
  loadTournaments();
  loadTeams();

})();
