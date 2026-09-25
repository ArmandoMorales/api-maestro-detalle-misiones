const $ = sel => document.querySelector(sel);
let estudiantes = [];

const EJEMPLO = {
  maestro: {
    carnet: '1890-23-16029',
    nombre: 'Armando Cecilio Morales Sagastume',
    correo: 'amoraless32@miumg.edu.gt'
  },
  detalle: [
    { misionId: 1, estado: true },
    { misionId: 2, estado: true },
    { misionId: 3, estado: true },
    { misionId: 4, estado: true },
    { misionId: 5, estado: true }
  ]
};

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function api(path, options) {
  const res = await fetch(API_URL + path, options);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function cargarEstudiantes() {
  $('#estado').textContent = 'Cargando… (si el servidor estaba dormido puede tardar ~40 s)';
  $('#estado').classList.remove('hidden');
  try {
    const { ok, data } = await api('/api/estudiantes');
    if (!ok) throw new Error(data.mensaje || 'Error al cargar');
    estudiantes = data;
    renderStats();
    renderEstudiantes();
    $('#estado').classList.add('hidden');
  } catch (err) {
    $('#estado').textContent = 'No se pudo conectar con la API: ' + err.message;
  }
}

async function cargarMisiones() {
  try {
    const { data } = await api('/api/misiones');
    $('#statMisiones').textContent = data.length;
    $('#tablaMisiones').innerHTML = data.map(m => `
      <tr><td>${m.MisionID}</td><td>${escapeHtml(m.Nombre)}</td><td>${escapeHtml(m.Descripcion)}</td></tr>`).join('');
  } catch (_) {
    $('#tablaMisiones').innerHTML = '<tr><td colspan="3">No se pudo cargar el catálogo.</td></tr>';
  }
}

function renderStats() {
  const total = estudiantes.length;
  const promedio = total ? estudiantes.reduce((a, e) => a + e.resumen.porcentaje, 0) / total : 0;
  $('#statTotal').textContent = total;
  $('#statPromedio').textContent = promedio.toFixed(1) + ' %';
  $('#statCompletos').textContent = estudiantes.filter(e => e.resumen.porcentaje === 100).length;
}

function renderEstudiantes() {
  const q = $('#buscar').value.trim().toLowerCase();
  const lista = estudiantes.filter(e =>
    e.carnet.toLowerCase().includes(q) || e.nombre.toLowerCase().includes(q));

  if (!lista.length) {
    $('#listaEstudiantes').innerHTML = '<p class="vacio">Sin resultados.</p>';
    return;
  }

  $('#listaEstudiantes').innerHTML = lista.map(e => {
    const r = e.resumen;
    const clase = r.porcentaje === 100 ? 'full' : r.porcentaje >= 50 ? 'mid' : 'low';
    return `
      <article class="card">
        <header>
          <div>
            <h3>${escapeHtml(e.nombre)}</h3>
            <small>${escapeHtml(e.carnet)} · ${escapeHtml(e.correo)}</small>
          </div>
          <span class="pct ${clase}">${r.porcentaje}%</span>
        </header>
        <div class="bar"><div class="fill ${clase}" style="width:${r.porcentaje}%"></div></div>
        <p class="conteo"><b>${r.completadas}</b> completadas · <b>${r.pendientes}</b> pendientes</p>
        <ul class="misiones">
          ${e.misiones.map(m => `
            <li class="${m.estado ? 'done' : 'todo'}">
              <span>${m.estado ? '✔' : '○'}</span> ${escapeHtml(m.nombre)}
            </li>`).join('')}
        </ul>
      </article>`;
  }).join('');
}

async function enviarRegistro() {
  const out = $('#respuesta');
  out.classList.remove('hidden', 'error', 'exito');
  let body;
  try {
    body = JSON.parse($('#jsonInput').value);
  } catch (err) {
    out.classList.add('error');
    out.textContent = 'JSON mal formado: ' + err.message;
    return;
  }
  out.textContent = 'Enviando…';
  try {
    const { ok, status, data } = await api('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    out.classList.add(ok ? 'exito' : 'error');
    out.textContent = `HTTP ${status}\n` + JSON.stringify(data, null, 2);
    if (ok) cargarEstudiantes();
  } catch (err) {
    out.classList.add('error');
    out.textContent = 'Error de red: ' + err.message;
  }
}

document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === btn));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('hidden', p.id !== 'tab-' + btn.dataset.tab));
}));

$('#buscar').addEventListener('input', renderEstudiantes);
$('#recargar').addEventListener('click', cargarEstudiantes);
$('#enviar').addEventListener('click', enviarRegistro);
$('#ejemplo').addEventListener('click', () => { $('#jsonInput').value = JSON.stringify(EJEMPLO, null, 2); });

$('#apiUrl').textContent = API_URL;
$('#jsonInput').value = JSON.stringify(EJEMPLO, null, 2);
cargarMisiones();
cargarEstudiantes();
