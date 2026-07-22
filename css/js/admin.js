/* ==========================================================================
   ADMIN.JS — Panel de administración Mesa Regional Básquetbol XV Región
   ========================================================================== */

(function () {
  'use strict';

  let GAS_URL = localStorage.getItem('mrb_gas_url') || 'https://script.google.com/macros/s/AKfycbzxmL9fdZi5Ex5boZWjM6mlmAbItskgSByCInixHvqaNFGFzU8_H-ACK50CKNjoZ5J8/exec';
  let _adminAutenticado = false;
  let _adminPassword = '';
  let _modalSaveFn = null;
  let _tabActual = 'noticias';
  let _gasData = { noticias: [], clubes: [], videos: [], reglamentos: [], redes: [] };

  // ── ESTILOS ────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .adm-tab{padding:14px 18px;background:transparent;border:none;border-bottom:3px solid transparent;color:rgba(255,255,255,.45);font-family:'Inter',sans-serif;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .15s}
    .adm-tab:hover{color:rgba(255,255,255,.8)}
    .adm-tab.active{color:#7FA8FF;border-bottom-color:#1E5FD9}
    .adm-btn-add{padding:10px 18px;background:#1E5FD9;color:#fff;border:none;border-radius:8px;font-family:'Inter',sans-serif;font-weight:700;font-size:13px;cursor:pointer}
    .adm-btn-add:hover{background:#143C8C}
    .adm-btn-save{padding:12px 20px;background:#1E5FD9;color:#fff;border:none;border-radius:10px;font-family:'Inter',sans-serif;font-weight:700;font-size:14px;cursor:pointer}
    .adm-btn-save:hover{background:#143C8C}
    .adm-btn-del{padding:6px 12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:7px;color:#fca5a5;font-size:12px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif}
    .adm-btn-edit{padding:6px 12px;background:rgba(30,95,217,.1);border:1px solid rgba(30,95,217,.25);border-radius:7px;color:#7FA8FF;font-size:12px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;margin-right:6px}
    .adm-item{background:#122035;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:12px}
    .adm-item-info{flex:1;min-width:0}
    .adm-item-title{font-size:14px;font-weight:700;color:#fff;margin-bottom:3px}
    .adm-item-sub{font-size:12px;color:rgba(255,255,255,.4)}
    .adm-label{font-size:11px;font-weight:700;color:rgba(255,255,255,.4);letter-spacing:.6px;text-transform:uppercase;display:block;margin-bottom:6px}
    .adm-input,.adm-textarea,.adm-select{width:100%;padding:12px 14px;background:#0A1628;border:1.5px solid rgba(255,255,255,.1);border-radius:10px;color:#fff;font-family:'Inter',sans-serif;font-size:14px;outline:none;margin-bottom:14px;transition:border-color .15s;-webkit-appearance:none}
    .adm-input:focus,.adm-textarea:focus,.adm-select:focus{border-color:#1E5FD9}
    .adm-textarea{resize:vertical;min-height:80px}
    .adm-select option{background:#122035}
    .adm-empty{text-align:center;padding:40px 20px;color:rgba(255,255,255,.3);font-size:14px}
    #adm-modal-overlay.open{display:flex!important}
    @keyframes admFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .adm-section{animation:admFadeUp .2s ease}
  `;
  document.head.appendChild(style);

  // ── UTILIDADES ─────────────────────────────────────────────────────────────
  function admToast(msg, tipo) {
    const el = document.getElementById('adm-toast');
    if (!el) return;
    el.textContent = msg;
    el.style.background = tipo === 'err' ? '#dc2626' : tipo === 'ok' ? '#16a34a' : '#1E5FD9';
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(10px)'; }, 3000);
  }

  function ytThumb(url) {
    if (!url) return '';
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return m ? 'https://img.youtube.com/vi/' + m[1] + '/mqdefault.jpg' : '';
  }

  function setContent(html) {
    const el = document.getElementById('adm-content');
    if (el) el.innerHTML = html;
  }

  // ── GAS API ────────────────────────────────────────────────────────────────
  async function gasGet() {
    if (!GAS_URL) return null;
    try {
      const r = await fetch(GAS_URL + '?action=all');
      const json = await r.json();
      return json.success ? json.data : null;
    } catch (e) { return null; }
  }

  async function gasPost(action, data) {
    if (!GAS_URL) {
      admToast('Configura la URL del Apps Script en la pestaña Config', 'err');
      return { success: false };
    }
    try {
      const r = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, password: _adminPassword, ...data }),
      });
      const json = await r.json();
      if (json.success) {
        admToast('Guardado correctamente', 'ok');
        await cargarDatos();
      } else {
        admToast(json.message || 'Error al guardar', 'err');
      }
      return json;
    } catch (e) {
      admToast('Error de conexion', 'err');
      return { success: false };
    }
  }

  async function cargarDatos() {
    const data = await gasGet();
    if (data) { _gasData = data; renderSeccionActiva(); }
  }

  // ── PANEL: ABRIR / CERRAR ──────────────────────────────────────────────────
  window.abrirAdmin = function () {
    const overlay = document.getElementById('admin-overlay');
    overlay.style.display = 'block';
    overlay.innerHTML = _adminAutenticado ? buildPanelHTML() : buildLoginHTML();
    if (_adminAutenticado) initPanel();
  };

  window.cerrarAdmin = function () {
    document.getElementById('admin-overlay').style.display = 'none';
  };

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  function buildLoginHTML() {
    return `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;">
      <div style="width:100%;max-width:360px;background:#122035;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:36px 28px;">
        <div style="text-align:center;margin-bottom:28px;">
          <img src="img/logo-mesa-regional.png" alt="Logo" style="height:60px;margin:0 auto 14px;display:block;object-fit:contain;">
          <div style="font-family:'Anton',sans-serif;font-size:18px;letter-spacing:2px;color:#fff;text-transform:uppercase;">Panel Admin</div>
          <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:4px;">Mesa Regional Basquetbol XV Region</div>
        </div>
        <label class="adm-label">Contrasena</label>
        <input type="password" id="admin-pwd-input" placeholder="••••••••" class="adm-input" onkeypress="if(event.key==='Enter')doAdminLogin();">
        <div id="admin-login-error" style="display:none;color:#fca5a5;font-size:13px;font-weight:600;margin-bottom:10px;">Contrasena incorrecta</div>
        <button onclick="doAdminLogin()" class="adm-btn-save" style="width:100%;margin-bottom:8px;">Ingresar</button>
        <button onclick="cerrarAdmin()" style="width:100%;padding:12px;background:transparent;color:rgba(255,255,255,.35);border:1px solid rgba(255,255,255,.1);border-radius:10px;font-family:'Inter',sans-serif;font-weight:600;font-size:13px;cursor:pointer;">Cancelar</button>
      </div>
    </div>`;
  }

  window.doAdminLogin = async function () {
    const input = document.getElementById('admin-pwd-input');
    const errEl = document.getElementById('admin-login-error');
    const pwd = input ? input.value.trim() : '';
    if (!pwd) return;
    _adminPassword = pwd;

    if (!GAS_URL) {
      const localPwd = localStorage.getItem('mrb_local_pwd') || 'Admin2026*';
      if (pwd === localPwd) {
        _adminAutenticado = true;
        document.getElementById('admin-overlay').innerHTML = buildPanelHTML();
        initPanel();
        admToast('Sin GAS URL. Configurala en la pestana Config', 'err');
      } else {
        if (errEl) errEl.style.display = 'block';
      }
      return;
    }

    const res = await gasPost('login', {});
    if (res && res.success) {
      _adminAutenticado = true;
      document.getElementById('admin-overlay').innerHTML = buildPanelHTML();
      initPanel();
    } else {
      if (errEl) errEl.style.display = 'block';
    }
  };

  // ── PANEL HTML ─────────────────────────────────────────────────────────────
  function buildPanelHTML() {
    return `<div style="min-height:100vh;">
      <div style="background:#122035;border-bottom:1px solid rgba(255,255,255,.08);padding:0 20px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;">
        <div style="font-family:'Anton',sans-serif;font-size:16px;letter-spacing:2px;color:#fff;text-transform:uppercase;">Panel Admin</div>
        <div style="display:flex;gap:10px;align-items:center;">
          <span style="font-size:12px;color:rgba(255,255,255,.4);">Mesa Regional</span>
          <button onclick="cerrarAdmin()" style="padding:7px 14px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:8px;color:#fca5a5;font-size:12px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;">Salir</button>
        </div>
      </div>
      <div style="background:#0A1628;border-bottom:1px solid rgba(255,255,255,.06);padding:0 20px;display:flex;gap:4px;overflow-x:auto;">
        <button class="adm-tab active" onclick="admTab('noticias',this)">Noticias</button>
        <button class="adm-tab" onclick="admTab('clubes',this)">Clubes</button>
        <button class="adm-tab" onclick="admTab('videos',this)">Videos</button>
        <button class="adm-tab" onclick="admTab('reglamentos',this)">Reglamentos</button>
        <button class="adm-tab" onclick="admTab('redes',this)">Redes</button>
        <button class="adm-tab" onclick="admTab('config',this)">Config</button>
      </div>
      <div style="padding:20px;max-width:800px;margin:0 auto;" id="adm-content">
        <div style="text-align:center;padding:40px;color:rgba(255,255,255,.4);">Cargando datos...</div>
      </div>
    </div>`;
  }

  async function initPanel() {
    _tabActual = 'noticias';
    await cargarDatos();
    renderNoticias();
  }

  window.admTab = function (tab, btn) {
    _tabActual = tab;
    document.querySelectorAll('.adm-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderSeccionActiva();
  };

  function renderSeccionActiva() {
    switch (_tabActual) {
      case 'noticias':    renderNoticias(); break;
      case 'clubes':      renderClubes(); break;
      case 'videos':      renderVideos(); break;
      case 'reglamentos': renderReglamentos(); break;
      case 'redes':       renderRedes(); break;
      case 'config':      renderConfig(); break;
    }
  }

  // ── RENDER SECCIONES ───────────────────────────────────────────────────────
  function renderNoticias() {
    const items = _gasData.noticias || [];
    let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div style="font-family:'Anton',sans-serif;font-size:20px;color:#fff;text-transform:uppercase;">Noticias</div>
      <button class="adm-btn-add" onclick="admOpenModal('noticia',null)">+ Nueva noticia</button>
    </div>`;
    if (!items.length) {
      html += '<div class="adm-empty">Sin noticias. Crea la primera.</div>';
    } else {
      items.forEach(n => {
        html += `<div class="adm-item">
          ${n.imagen_url ? `<img src="${n.imagen_url}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;flex-shrink:0;" onerror="this.style.display='none'">` : ''}
          <div class="adm-item-info">
            <div class="adm-item-title">${n.titulo || '(sin titulo)'}</div>
            <div class="adm-item-sub">${n.categoria || ''} · ${n.fecha || ''}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="adm-btn-edit" onclick="admOpenModal('noticia','${n.id}')">Editar</button>
            <button class="adm-btn-del" onclick="admEliminar('deleteNoticia','${n.id}','la noticia')">Eliminar</button>
          </div>
        </div>`;
      });
    }
    setContent(html);
  }

  function renderClubes() {
    const items = _gasData.clubes || [];
    let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div style="font-family:'Anton',sans-serif;font-size:20px;color:#fff;text-transform:uppercase;">Clubes de la region</div>
      <button class="adm-btn-add" onclick="admOpenModal('club',null)">+ Nuevo club</button>
    </div>
    <div style="background:rgba(30,95,217,.08);border:1px solid rgba(30,95,217,.2);border-radius:8px;padding:10px 14px;font-size:12px;color:#7FA8FF;margin-bottom:16px;">
      Para imagenes de Google Drive: sube la foto, clic derecho, Obtener enlace, Cualquier persona, copia el ID y usa: https://drive.google.com/uc?id=TU_ID
    </div>`;
    if (!items.length) {
      html += '<div class="adm-empty">Sin clubes registrados.</div>';
    } else {
      items.forEach(c => {
        html += `<div class="adm-item">
          ${c.logo_url ? `<img src="${c.logo_url}" style="width:44px;height:44px;object-fit:contain;border-radius:6px;flex-shrink:0;background:rgba(255,255,255,.05);" onerror="this.style.display='none'">` : ''}
          <div class="adm-item-info">
            <div class="adm-item-title">${c.nombre || '(sin nombre)'}</div>
            <div class="adm-item-sub">${c.ciudad || ''}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="adm-btn-edit" onclick="admOpenModal('club','${c.id}')">Editar</button>
            <button class="adm-btn-del" onclick="admEliminar('deleteClub','${c.id}','el club')">Eliminar</button>
          </div>
        </div>`;
      });
    }
    setContent(html);
  }

  function renderVideos() {
    const items = _gasData.videos || [];
    let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div style="font-family:'Anton',sans-serif;font-size:20px;color:#fff;text-transform:uppercase;">Videos destacados</div>
      <button class="adm-btn-add" onclick="admOpenModal('video',null)">+ Nuevo video</button>
    </div>`;
    if (!items.length) {
      html += '<div class="adm-empty">Sin videos. Agrega el primero.</div>';
    } else {
      items.forEach(v => {
        const thumb = ytThumb(v.youtube_url);
        html += `<div class="adm-item">
          ${thumb ? `<img src="${thumb}" style="width:72px;height:44px;object-fit:cover;border-radius:6px;flex-shrink:0;" onerror="this.style.display='none'">` : ''}
          <div class="adm-item-info">
            <div class="adm-item-title">${v.titulo || '(sin titulo)'}</div>
            <div class="adm-item-sub">${v.categoria || ''}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="adm-btn-edit" onclick="admOpenModal('video','${v.id}')">Editar</button>
            <button class="adm-btn-del" onclick="admEliminar('deleteVideo','${v.id}','el video')">Eliminar</button>
          </div>
        </div>`;
      });
    }
    setContent(html);
  }

  function renderReglamentos() {
    const items = _gasData.reglamentos || [];
    let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div style="font-family:'Anton',sans-serif;font-size:20px;color:#fff;text-transform:uppercase;">Reglamentos</div>
      <button class="adm-btn-add" onclick="admOpenModal('reglamento',null)">+ Nuevo reglamento</button>
    </div>`;
    if (!items.length) {
      html += '<div class="adm-empty">Sin reglamentos.</div>';
    } else {
      items.forEach(r => {
        html += `<div class="adm-item">
          <div style="width:40px;height:40px;background:#122035;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#7FA8FF;font-family:'Roboto Mono',monospace;font-size:10px;font-weight:700;flex-shrink:0;">PDF</div>
          <div class="adm-item-info">
            <div class="adm-item-title">${r.nombre || '(sin nombre)'}</div>
            <div class="adm-item-sub">${r.descripcion || ''}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <a href="${r.pdf_url}" target="_blank" style="padding:6px 12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:7px;color:rgba(255,255,255,.6);font-size:12px;font-weight:700;text-decoration:none;">Ver</a>
            <button class="adm-btn-edit" onclick="admOpenModal('reglamento','${r.id}')">Editar</button>
            <button class="adm-btn-del" onclick="admEliminar('deleteReglamento','${r.id}','el reglamento')">Eliminar</button>
          </div>
        </div>`;
      });
    }
    setContent(html);
  }

  function renderRedes() {
    const items = _gasData.redes || [];
    const plataformas = items.length ? items : [
      { plataforma: 'Instagram', url: '' },
      { plataforma: 'Facebook', url: '' },
      { plataforma: 'YouTube', url: '' },
    ];
    let html = `<div style="font-family:'Anton',sans-serif;font-size:20px;color:#fff;text-transform:uppercase;margin-bottom:16px;">Redes sociales</div>`;
    plataformas.forEach(r => {
      html += `<div class="adm-item" style="flex-wrap:wrap;gap:10px;">
        <div class="adm-item-info">
          <div class="adm-item-title">${r.plataforma}</div>
          <div class="adm-item-sub">${r.url || 'Sin URL configurada'}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
          <input type="url" id="red-${r.plataforma}" value="${r.url || ''}" placeholder="https://..." class="adm-input" style="width:200px;margin-bottom:0;">
          <button class="adm-btn-save" onclick="admGuardarRed('${r.plataforma}')">Guardar</button>
        </div>
      </div>`;
    });
    setContent(html);
  }

  function renderConfig() {
    let html = `<div style="font-family:'Anton',sans-serif;font-size:20px;color:#fff;text-transform:uppercase;margin-bottom:16px;">Configuracion</div>
    <div style="background:#122035;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:20px;margin-bottom:16px;">
      <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;">URL del Apps Script</div>
      <div style="font-size:12px;color:rgba(255,255,255,.4);margin-bottom:14px;">Pega aqui la URL /exec de tu Web App publicada.</div>
      <label class="adm-label">GAS URL</label>
      <input type="text" id="cfg-gas-url" value="${GAS_URL}" placeholder="https://script.google.com/macros/s/.../exec" class="adm-input">
      <button onclick="admGuardarGasUrl()" class="adm-btn-save" style="width:100%;">Guardar URL</button>
    </div>
    <div style="background:#122035;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:20px;">
      <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;">Cambiar contrasena</div>
      <label class="adm-label">Nueva contrasena</label>
      <input type="password" id="cfg-pwd-nueva" placeholder="Nueva contrasena" class="adm-input">
      <label class="adm-label">Confirmar</label>
      <input type="password" id="cfg-pwd-confirm" placeholder="Repetir contrasena" class="adm-input">
      <button onclick="admCambiarPassword()" class="adm-btn-save" style="width:100%;">Guardar contrasena</button>
    </div>`;
    setContent(html);
  }

  // ── MODAL DE EDICION ───────────────────────────────────────────────────────
  window.admOpenModal = function (tipo, id) {
    const overlay = document.getElementById('adm-modal-overlay');
    overlay.classList.add('open');
    overlay.style.display = 'flex';

    let titulo = '', body = '';
    const lista = _gasData[tipo + 's'] || _gasData[tipo + 'es'] || [];
    const item = id ? lista.find(x => String(x.id) === String(id)) : null;

    switch (tipo) {
      case 'noticia':
        titulo = id ? 'Editar noticia' : 'Nueva noticia';
        body = `
          <label class="adm-label">Titulo</label>
          <input type="text" id="m-titulo" class="adm-input" value="${item ? (item.titulo || '') : ''}">
          <label class="adm-label">Extracto</label>
          <textarea id="m-extracto" class="adm-textarea">${item ? (item.extracto || '') : ''}</textarea>
          <label class="adm-label">URL de imagen (Google Drive o externa)</label>
          <input type="url" id="m-imagen" class="adm-input" value="${item ? (item.imagen_url || '') : ''}" placeholder="https://drive.google.com/uc?id=...">
          <label class="adm-label">Fecha</label>
          <input type="date" id="m-fecha" class="adm-input" value="${item ? (item.fecha || '') : new Date().toISOString().split('T')[0]}">
          <label class="adm-label">Categoria</label>
          <select id="m-categoria" class="adm-select">
            ${['General','Torneos','Seleccion','Clubes','Reglamentos'].map(c =>
              `<option value="${c}" ${item && item.categoria === c ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>`;
        _modalSaveFn = async () => {
          const d = {
            titulo: document.getElementById('m-titulo').value.trim(),
            extracto: document.getElementById('m-extracto').value.trim(),
            imagen_url: document.getElementById('m-imagen').value.trim(),
            fecha: document.getElementById('m-fecha').value,
            categoria: document.getElementById('m-categoria').value,
          };
          if (!d.titulo) { admToast('El titulo es obligatorio', 'err'); return; }
          const res = await gasPost(id ? 'updateNoticia' : 'createNoticia', id ? { id, ...d } : d);
          if (res.success) { admCloseModal(); renderNoticias(); }
        };
        break;

      case 'club':
        titulo = id ? 'Editar club' : 'Nuevo club';
        body = `
          <label class="adm-label">Nombre del club</label>
          <input type="text" id="m-nombre" class="adm-input" value="${item ? (item.nombre || '') : ''}">
          <label class="adm-label">Ciudad</label>
          <input type="text" id="m-ciudad" class="adm-input" value="${item ? (item.ciudad || '') : ''}" placeholder="Arica">
          <label class="adm-label">URL del logo</label>
          <input type="url" id="m-logo" class="adm-input" value="${item ? (item.logo_url || '') : ''}" placeholder="https://drive.google.com/uc?id=...">`;
        _modalSaveFn = async () => {
          const d = {
            nombre: document.getElementById('m-nombre').value.trim(),
            ciudad: document.getElementById('m-ciudad').value.trim(),
            logo_url: document.getElementById('m-logo').value.trim(),
          };
          if (!d.nombre) { admToast('El nombre es obligatorio', 'err'); return; }
          const res = await gasPost(id ? 'updateClub' : 'createClub', id ? { id, ...d } : d);
          if (res.success) { admCloseModal(); renderClubes(); }
        };
        break;

      case 'video':
        titulo = id ? 'Editar video' : 'Nuevo video';
        body = `
          <label class="adm-label">Titulo</label>
          <input type="text" id="m-titulo" class="adm-input" value="${item ? (item.titulo || '') : ''}">
          <label class="adm-label">URL de YouTube</label>
          <input type="url" id="m-yt-url" class="adm-input" value="${item ? (item.youtube_url || '') : ''}" placeholder="https://youtube.com/watch?v=...">
          <label class="adm-label">Categoria</label>
          <select id="m-categoria" class="adm-select">
            ${['General','Partidos','Entrenamientos','Resumenes','Highlights'].map(c =>
              `<option value="${c}" ${item && item.categoria === c ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>`;
        _modalSaveFn = async () => {
          const d = {
            titulo: document.getElementById('m-titulo').value.trim(),
            youtube_url: document.getElementById('m-yt-url').value.trim(),
            categoria: document.getElementById('m-categoria').value,
          };
          if (!d.titulo || !d.youtube_url) { admToast('Titulo y URL son obligatorios', 'err'); return; }
          const res = await gasPost(id ? 'updateVideo' : 'createVideo', id ? { id, ...d } : d);
          if (res.success) { admCloseModal(); renderVideos(); }
        };
        break;

      case 'reglamento':
        titulo = id ? 'Editar reglamento' : 'Nuevo reglamento';
        body = `
          <label class="adm-label">Nombre del documento</label>
          <input type="text" id="m-nombre" class="adm-input" value="${item ? (item.nombre || '') : ''}">
          <label class="adm-label">Descripcion breve</label>
          <input type="text" id="m-desc" class="adm-input" value="${item ? (item.descripcion || '') : ''}">
          <label class="adm-label">URL del PDF</label>
          <input type="url" id="m-pdf" class="adm-input" value="${item ? (item.pdf_url || '') : ''}" placeholder="https://...">`;
        _modalSaveFn = async () => {
          const d = {
            nombre: document.getElementById('m-nombre').value.trim(),
            descripcion: document.getElementById('m-desc').value.trim(),
            pdf_url: document.getElementById('m-pdf').value.trim(),
          };
          if (!d.nombre || !d.pdf_url) { admToast('Nombre y URL son obligatorios', 'err'); return; }
          const res = await gasPost(id ? 'updateReglamento' : 'createReglamento', id ? { id, ...d } : d);
          if (res.success) { admCloseModal(); renderReglamentos(); }
        };
        break;
    }

    overlay.innerHTML = `
      <div style="background:#122035;border:1px solid rgba(255,255,255,.1);border-radius:16px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;padding:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <div style="font-family:'Anton',sans-serif;font-size:18px;color:#fff;text-transform:uppercase;">${titulo}</div>
          <button onclick="admCloseModal()" style="background:none;border:none;color:rgba(255,255,255,.5);font-size:20px;cursor:pointer;">x</button>
        </div>
        ${body}
        <div style="display:flex;gap:10px;margin-top:6px;">
          <button onclick="admModalSave()" class="adm-btn-save" style="flex:1;">Guardar</button>
          <button onclick="admCloseModal()" style="flex:1;padding:12px;background:transparent;color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.15);border-radius:10px;font-family:'Inter',sans-serif;font-weight:700;font-size:14px;cursor:pointer;">Cancelar</button>
        </div>
      </div>`;
  };

  window.admCloseModal = function () {
    const overlay = document.getElementById('adm-modal-overlay');
    if (overlay) { overlay.classList.remove('open'); overlay.style.display = 'none'; overlay.innerHTML = ''; }
    _modalSaveFn = null;
  };

  window.admModalSave = async function () {
    if (_modalSaveFn) await _modalSaveFn();
  };

  window.admEliminar = function (action, id, nombre) {
    if (!confirm('Eliminar ' + nombre + '? Esta accion no se puede deshacer.')) return;
    gasPost(action, { id }).then(() => renderSeccionActiva());
  };

  window.admGuardarRed = async function (plataforma) {
    const input = document.getElementById('red-' + plataforma);
    if (!input) return;
    await gasPost('updateRed', { plataforma, url: input.value.trim() });
  };

  window.admGuardarGasUrl = function () {
    const input = document.getElementById('cfg-gas-url');
    if (!input) return;
    GAS_URL = input.value.trim();
    localStorage.setItem('mrb_gas_url', GAS_URL);
    admToast('URL guardada. Recarga la pagina para activarla.', 'ok');
  };

  window.admCambiarPassword = async function () {
    const nueva = document.getElementById('cfg-pwd-nueva');
    const conf = document.getElementById('cfg-pwd-confirm');
    if (!nueva || !conf) return;
    if (nueva.value !== conf.value) { admToast('Las contrasenas no coinciden', 'err'); return; }
    if (nueva.value.length < 6) { admToast('Minimo 6 caracteres', 'err'); return; }
    const res = await gasPost('changePassword', { nuevaPassword: nueva.value });
    if (res.success) { _adminPassword = nueva.value; nueva.value = ''; conf.value = ''; }
  };

  // ── CARGA AUTOMATICA AL INICIAR ────────────────────────────────────────────
  window.MRB = window.MRB || {};
  window.MRB.getGasUrl = () => GAS_URL;
  window.MRB.getGasData = () => _gasData;

  if (GAS_URL) {
    gasGet().then(data => {
      if (!data) return;
      _gasData = data;
      if (typeof window.injectGasNoticias === 'function') window.injectGasNoticias(data.noticias);
      if (typeof window.injectGasClubes === 'function') window.injectGasClubes(data.clubes);
      if (typeof window.injectGasVideos === 'function') window.injectGasVideos(data.videos);
      if (typeof window.injectGasReglamentos === 'function') window.injectGasReglamentos(data.reglamentos);
      if (typeof window.injectGasRedes === 'function') window.injectGasRedes(data.redes);
    });
  }

})();
