/* ==========================================================================
   MATCHES.JS — Buscador de verificación de jugadores
   Conecta a un Google Sheet vía Apps Script Web App.

   Para activarlo:
   1. Crea el Sheet con columnas: RUT | Nombre | Club | Categoría | Estado
   2. En Apps Script, publica un doGet(e) que reciba ?rut=XXXXXXXX y devuelva
      JSON: { encontrado: true/false, nombre, club, categoria, estado }
   3. Pega la URL del Web App (termina en /exec) en PLAYER_API_URL.
   Mientras PLAYER_API_URL esté vacío, el buscador avisa "Próximamente".
   ========================================================================== */

(function(){
  'use strict';

  const PLAYER_API_URL = ""; // Ej: "https://script.google.com/macros/s/XXXXX/exec"

  const form = document.getElementById('playerSearchForm');
  if(!form) return;

  const input = document.getElementById('playerRut');
  const resultBox = document.getElementById('playerResult');
  const searchBtn = document.getElementById('playerSearchBtn');

  function showResult(html, type){
    resultBox.hidden = false;
    resultBox.className = 'player-result ' + type;
    resultBox.innerHTML = html;
  }

  function normalizeRut(value){
    return value.trim().replace(/\s+/g, '').toUpperCase();
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    const rut = normalizeRut(input.value);

    if(!rut){
      showResult('Ingresa un RUT para buscar.', 'warn');
      input.focus();
      return;
    }

    if(!PLAYER_API_URL){
      showResult('El buscador estará disponible próximamente, cuando se cargue la base de jugadores habilitados.', 'warn');
      return;
    }

    searchBtn.disabled = true;
    searchBtn.textContent = 'Buscando…';
    showResult('Buscando…', 'loading');

    try{
      const res = await fetch(PLAYER_API_URL + '?rut=' + encodeURIComponent(rut));
      if(!res.ok) throw new Error('Respuesta no válida del servidor');
      const data = await res.json();

      if(data.encontrado){
        showResult(
          '<strong>' + data.nombre + '</strong><br>' +
          'Club: ' + data.club + '<br>' +
          'Categoría: ' + data.categoria + '<br>' +
          'Estado: ' + data.estado,
          'success'
        );
      } else {
        showResult('No encontramos ese RUT en la base de jugadores habilitados. Verifica que esté bien escrito o consulta con tu club.', 'error');
      }
    } catch(err){
      showResult('No pudimos conectar con el sistema de verificación. Intenta nuevamente en unos minutos.', 'error');
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = 'Buscar →';
    }
  });

})();
