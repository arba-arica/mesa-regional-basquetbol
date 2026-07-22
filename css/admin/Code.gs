/**
 * APPS SCRIPT — Mesa Regional Básquetbol XV Región
 * ================================================
 * Publica como Web App:
 *   Implementar → Nueva implementación → Aplicación web
 *   Ejecutar como: Yo
 *   Quién tiene acceso: Cualquier persona
 *
 * Copia la URL /exec resultante y pégala en index.html
 * donde dice: const GAS_URL = ""
 *
 * ESTRUCTURA DEL SHEET (una pestaña por sección):
 *   noticias   → id | titulo | extracto | imagen_url | fecha | categoria | activo
 *   clubes     → id | nombre | ciudad | logo_url | activo
 *   videos     → id | titulo | youtube_url | categoria | activo
 *   reglamentos→ id | nombre | descripcion | pdf_url | activo
 *   redes      → plataforma | url | activo
 *   config     → clave | valor   (fila 1: password_hash | TU_PASSWORD)
 */

const SHEET_NAME = SpreadsheetApp.getActiveSpreadsheet();
const ADMIN_PASSWORD = getConfig('password_hash') || 'Admin2026*';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getConfig(clave) {
  try {
    const sheet = SHEET_NAME.getSheetByName('config');
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === clave) return data[i][1];
    }
    return null;
  } catch (e) { return null; }
}

function sheetToJSON(sheetName) {
  const sheet = SHEET_NAME.getSheetByName(sheetName);
  if (!sheet) return [];
  const [headers, ...rows] = sheet.getDataRange().getValues();
  return rows
    .filter(r => r[headers.indexOf('activo')] !== false && r[headers.indexOf('activo')] !== 'FALSE')
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i] === '' ? null : r[i]; });
      return obj;
    });
}

function getNextId(sheetName) {
  const sheet = SHEET_NAME.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return 1;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues()
    .map(r => parseInt(r[0]) || 0);
  return Math.max(...ids) + 1;
}

function findRowById(sheetName, id) {
  const sheet = SHEET_NAME.getSheetByName(sheetName);
  if (!sheet) return -1;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function cors(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function ok(data) {
  return cors(ContentService
    .createTextOutput(JSON.stringify({ success: true, data }))
    .setMimeType(ContentService.MimeType.JSON));
}

function fail(msg) {
  return cors(ContentService
    .createTextOutput(JSON.stringify({ success: false, message: msg }))
    .setMimeType(ContentService.MimeType.JSON));
}

// ─── GET: lectura pública (no requiere autenticación) ─────────────────────────

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'all';

  switch (action) {
    case 'noticias':
      return ok(sheetToJSON('noticias').sort((a, b) =>
        new Date(b.fecha) - new Date(a.fecha)));

    case 'clubes':
      return ok(sheetToJSON('clubes'));

    case 'videos':
      return ok(sheetToJSON('videos'));

    case 'reglamentos':
      return ok(sheetToJSON('reglamentos'));

    case 'redes':
      return ok(sheetToJSON('redes'));

    case 'all':
    default:
      return ok({
        noticias:    sheetToJSON('noticias').sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
        clubes:      sheetToJSON('clubes'),
        videos:      sheetToJSON('videos'),
        reglamentos: sheetToJSON('reglamentos'),
        redes:       sheetToJSON('redes'),
      });
  }
}

// ─── POST: escritura (requiere contraseña) ────────────────────────────────────

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return fail('JSON inválido');
  }

  const { action, password, ...data } = body;

  // Verificar contraseña admin
  const pwd = getConfig('password_hash') || ADMIN_PASSWORD;
  if (password !== pwd) return fail('Contraseña incorrecta');

  switch (action) {

    // ── LOGIN ──
    case 'login':
      return ok({ autenticado: true });

    // ── NOTICIAS ──
    case 'createNoticia': {
      const sheet = SHEET_NAME.getSheetByName('noticias');
      const id = getNextId('noticias');
      sheet.appendRow([
        id,
        data.titulo || '',
        data.extracto || '',
        data.imagen_url || '',
        data.fecha || new Date().toISOString().split('T')[0],
        data.categoria || 'General',
        true
      ]);
      return ok({ id, message: 'Noticia creada' });
    }
    case 'updateNoticia': {
      const row = findRowById('noticias', data.id);
      if (row < 0) return fail('Noticia no encontrada');
      const sheet = SHEET_NAME.getSheetByName('noticias');
      sheet.getRange(row, 2, 1, 5).setValues([[
        data.titulo || '',
        data.extracto || '',
        data.imagen_url || '',
        data.fecha || '',
        data.categoria || 'General'
      ]]);
      return ok({ message: 'Noticia actualizada' });
    }
    case 'deleteNoticia': {
      const row = findRowById('noticias', data.id);
      if (row < 0) return fail('Noticia no encontrada');
      SHEET_NAME.getSheetByName('noticias').deleteRow(row);
      return ok({ message: 'Noticia eliminada' });
    }

    // ── CLUBES ──
    case 'createClub': {
      const sheet = SHEET_NAME.getSheetByName('clubes');
      const id = getNextId('clubes');
      sheet.appendRow([id, data.nombre || '', data.ciudad || '', data.logo_url || '', true]);
      return ok({ id, message: 'Club creado' });
    }
    case 'updateClub': {
      const row = findRowById('clubes', data.id);
      if (row < 0) return fail('Club no encontrado');
      SHEET_NAME.getSheetByName('clubes').getRange(row, 2, 1, 3).setValues([[
        data.nombre || '', data.ciudad || '', data.logo_url || ''
      ]]);
      return ok({ message: 'Club actualizado' });
    }
    case 'deleteClub': {
      const row = findRowById('clubes', data.id);
      if (row < 0) return fail('Club no encontrado');
      SHEET_NAME.getSheetByName('clubes').deleteRow(row);
      return ok({ message: 'Club eliminado' });
    }

    // ── VIDEOS ──
    case 'createVideo': {
      const sheet = SHEET_NAME.getSheetByName('videos');
      const id = getNextId('videos');
      sheet.appendRow([id, data.titulo || '', data.youtube_url || '', data.categoria || 'General', true]);
      return ok({ id, message: 'Video creado' });
    }
    case 'updateVideo': {
      const row = findRowById('videos', data.id);
      if (row < 0) return fail('Video no encontrado');
      SHEET_NAME.getSheetByName('videos').getRange(row, 2, 1, 3).setValues([[
        data.titulo || '', data.youtube_url || '', data.categoria || 'General'
      ]]);
      return ok({ message: 'Video actualizado' });
    }
    case 'deleteVideo': {
      const row = findRowById('videos', data.id);
      if (row < 0) return fail('Video no encontrado');
      SHEET_NAME.getSheetByName('videos').deleteRow(row);
      return ok({ message: 'Video eliminado' });
    }

    // ── REGLAMENTOS ──
    case 'createReglamento': {
      const sheet = SHEET_NAME.getSheetByName('reglamentos');
      const id = getNextId('reglamentos');
      sheet.appendRow([id, data.nombre || '', data.descripcion || '', data.pdf_url || '', true]);
      return ok({ id, message: 'Reglamento creado' });
    }
    case 'updateReglamento': {
      const row = findRowById('reglamentos', data.id);
      if (row < 0) return fail('Reglamento no encontrado');
      SHEET_NAME.getSheetByName('reglamentos').getRange(row, 2, 1, 3).setValues([[
        data.nombre || '', data.descripcion || '', data.pdf_url || ''
      ]]);
      return ok({ message: 'Reglamento actualizado' });
    }
    case 'deleteReglamento': {
      const row = findRowById('reglamentos', data.id);
      if (row < 0) return fail('Reglamento no encontrado');
      SHEET_NAME.getSheetByName('reglamentos').deleteRow(row);
      return ok({ message: 'Reglamento eliminado' });
    }

    // ── REDES SOCIALES ──
    case 'updateRed': {
      const sheet = SHEET_NAME.getSheetByName('redes');
      const data2 = sheet.getDataRange().getValues();
      for (let i = 1; i < data2.length; i++) {
        if (data2[i][0] === data.plataforma) {
          sheet.getRange(i + 1, 2).setValue(data.url);
          return ok({ message: 'Red social actualizada' });
        }
      }
      // Si no existe, la crea
      sheet.appendRow([data.plataforma, data.url, true]);
      return ok({ message: 'Red social creada' });
    }

    // ── CAMBIAR CONTRASEÑA ──
    case 'changePassword': {
      const sheet = SHEET_NAME.getSheetByName('config');
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === 'password_hash') {
          sheet.getRange(i + 1, 2).setValue(data.nuevaPassword);
          return ok({ message: 'Contraseña actualizada' });
        }
      }
      sheet.appendRow(['password_hash', data.nuevaPassword]);
      return ok({ message: 'Contraseña configurada' });
    }

    default:
      return fail('Acción no reconocida: ' + action);
  }
}

// ─── SETUP: crea las pestañas si no existen ───────────────────────────────────
// Ejecuta esta función UNA SOLA VEZ manualmente desde el editor de Apps Script
// para inicializar la estructura del Sheet.

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheets = {
    noticias:    ['id', 'titulo', 'extracto', 'imagen_url', 'fecha', 'categoria', 'activo'],
    clubes:      ['id', 'nombre', 'ciudad', 'logo_url', 'activo'],
    videos:      ['id', 'titulo', 'youtube_url', 'categoria', 'activo'],
    reglamentos: ['id', 'nombre', 'descripcion', 'pdf_url', 'activo'],
    redes:       ['plataforma', 'url', 'activo'],
    config:      ['clave', 'valor'],
  };

  Object.entries(sheets).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }
  });

  // Contraseña inicial
  const config = ss.getSheetByName('config');
  const configData = config.getDataRange().getValues();
  const hasPwd = configData.some(r => r[0] === 'password_hash');
  if (!hasPwd) {
    config.appendRow(['password_hash', 'Admin2026*']);
  }

  // Redes sociales iniciales
  const redes = ss.getSheetByName('redes');
  if (redes.getLastRow() <= 1) {
    redes.appendRow(['Instagram', '', true]);
    redes.appendRow(['Facebook', '', true]);
    redes.appendRow(['YouTube', '', true]);
  }

  // Reglamento inicial (el PDF real del Torneo Apertura)
  const reglamentos = ss.getSheetByName('reglamentos');
  if (reglamentos.getLastRow() <= 1) {
    reglamentos.appendRow([
      1,
      'Reglamento Torneo Apertura 2026',
      'Bases oficiales vigentes para todas las categorías',
      'https://lwsyntjhbcdfuhfjdjqf.supabase.co/storage/v1/object/public/documentos/Bases_Torneo_Apertura_ARBA_2026_v3.pdf',
      true
    ]);
  }

  Logger.log('✅ Sheets inicializadas correctamente');
}
