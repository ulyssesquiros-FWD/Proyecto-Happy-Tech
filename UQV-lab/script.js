/* script.js
   Versión completa sin iconos "analizando":
   - Persistencia localStorage
   - Subida y parseo Excel/CSV (SheetJS)
   - Clasificación y reglas (rechazo/alerta)
   - CRUD, export JSON/CSV
   - Tema claro/oscuro con persistencia y atajo 'T'
   - No se usan iconos de "analizando"
*/

const STORAGE_KEY = 'happytech_records_v1';
const THEME_KEY = 'happytech_theme_v1';

// Palabras clave
const PALABRAS_RECHAZO = ["china", "shenzhen", "shanghai", "beijing", "guangzhou", "cantón", "republica popular china", "made in china"];
const PALABRAS_ALERTA = ["asia", "oriente", "aliexpress", "alibaba", "importado de oriente", "dhgate"];

// Rubros heurísticos
const RUBROS = {
  "Accesorios": ["cable","mouse","teclado","monitor","hdmi","usb"],
  "Software": ["licencia","software","programa","suscripción","suscripcion"],
  "Servicios": ["consultoría","asesoría","servicio","mantenimiento","soporte","limpieza","luz","agua","internet","alquiler"],
  "Mantenimiento": ["mantenimiento","reparación","reparacion","reparar"],
  "Hardware": ["laptop","notebook","servidor","pc","computadora","impresora","pantalla","memoria"],
  "Marketing": ["anuncio","publicidad","meta ads","google ads","campaña","marketing","redes sociales"],
  "Inventario": ["stock","compra al por mayor","importación","importacion","importado"]
};

// DOM
const gastoInput = document.getElementById('gastoInput');
const fechaInput = document.getElementById('fechaInput');
const montoInput = document.getElementById('montoInput');
const monedaInput = document.getElementById('monedaInput');
const procesarBtn = document.getElementById('procesarBtn');
const addManualBtn = document.getElementById('addManualBtn');

const pantallaEspera = document.getElementById('pantallaEspera');
const loading = document.getElementById('loading');
const resultadoTarjeta = document.getElementById('resultadoTarjeta');

const valMonto = document.getElementById('valMonto');
const valMoneda = document.getElementById('valMoneda');
const valFecha = document.getElementById('valFecha');
const valRubro = document.getElementById('valRubro');
const valProveedor = document.getElementById('valProveedor');
const valConcepto = document.getElementById('valConcepto');
const jsonOutput = document.getElementById('jsonOutput');

const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadLog = document.getElementById('uploadLog');

const recordsTableBody = document.querySelector('#recordsTable tbody');
const btnExportJSON = document.getElementById('btnExportJSON');
const btnExportCSV = document.getElementById('btnExportCSV');
const btnClearAll = document.getElementById('btnClearAll');

const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const themeLabel = document.getElementById('themeLabel');

let records = loadRecords();

// Inicializar tema y UI
initTheme();
renderTable();
updateInitialView();

// Listeners
procesarBtn.addEventListener('click', async () => { await handleProcesarClick(); });
addManualBtn.addEventListener('click', async () => { await handleProcesarClick(true); });

fileInput.addEventListener('change', handleFile);
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag'); });
uploadArea.addEventListener('dragleave', e => { uploadArea.classList.remove('drag'); });
uploadArea.addEventListener('drop', e => { e.preventDefault(); uploadArea.classList.remove('drag'); const f = e.dataTransfer.files[0]; if(f) parseFile(f); });

btnExportJSON.addEventListener('click', exportJSON);
btnExportCSV.addEventListener('click', exportCSV);
btnClearAll.addEventListener('click', clearAll);

themeToggle.addEventListener('click', toggleTheme);
document.addEventListener('keydown', (e) => {
  const active = document.activeElement;
  if(e.key.toLowerCase() === 't' && active && !['INPUT','TEXTAREA','SELECT'].includes(active.tagName)){
    e.preventDefault();
    toggleTheme();
  }
});

// Manejo principal al click
async function handleProcesarClick(manual = false){
  const gastoTexto = gastoInput.value.trim();
  const btn = procesarBtn;

  if(!gastoTexto && !manual){
    alert("Por favor, ingresa la descripción del gasto o usa 'Agregar manual' con datos mínimos.");
    return;
  }

  // UI: carga
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando analítica...';
  pantallaEspera.classList.add('hidden');
  resultadoTarjeta.classList.add('hidden');
  loading.classList.remove('hidden');

  try {
    await delay(600); // latencia simulada

    const resultadoObj = procesarTextoAvanzado({
      texto: gastoTexto,
      fecha: fechaInput.value,
      monto: montoInput.value ? parseFloat(montoInput.value) : null,
      moneda: monedaInput.value
    });

    mostrarResultadoVisual(resultadoObj);

    // Guardar registro
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    const record = { id, ...resultadoObj, createdAt: new Date().toISOString() };
    records.unshift(record);
    saveRecords();
    renderTable();

    // limpiar inputs si no es edición
    clearInputs();

  } catch (err) {
    console.error(err);
    alert("Ocurrió un error al procesar la descripción.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-robot"></i> Analizar Gasto';
    loading.classList.add('hidden');
  }
}

/**
 * Procesamiento principal (tu lógica adaptada)
 */
function procesarTextoAvanzado({ texto = '', fecha = null, monto = null, moneda = null }) {
  const textoOriginal = texto || '';
  const textoLower = textoOriginal.toLowerCase();

  // 1. Extracción de Monto y Moneda (si no vienen)
  let montoDetectado = monto;
  let monedaDetectada = moneda || null;

  const matchMontoMoneda = textoOriginal.match(/(\$|€|₡)?\s*(\d{1,3}(?:[,\.]\d{3})*(?:[\.,]\d{2})?)\s*(USD|CRC|EUR|dolares|dólares|colones)?/i);
  if (matchMontoMoneda && !montoDetectado) {
    montoDetectado = parseFloat(matchMontoMoneda[2].replace(/,/g, ''));
  }
  if (!monedaDetectada && matchMontoMoneda) {
    if (matchMontoMoneda[1] === '$' || /usd|dolar|dólar/i.test(textoOriginal)) monedaDetectada = "USD";
    else if (matchMontoMoneda[1] === '₡' || /crc|colones/i.test(textoOriginal)) monedaDetectada = "CRC";
    else if (matchMontoMoneda[1] === '€' || /eur|euros/i.test(textoOriginal)) monedaDetectada = "EUR";
    else monedaDetectada = "USD";
  }

  // 2. Extracción de Proveedor
  let proveedor = null;
  const matchProveedor = textoOriginal.match(/(?:a proveedor|a la empresa|con|a)\s+([A-Z0-9][a-zA-Z0-9\s,\.&\-]+?)(?=\s+por|\s+el|\s+para|\s+USD|\s+CRC|\$|€|\.|$)/i);
  if (matchProveedor && matchProveedor[1] && matchProveedor[1].trim().length > 2) {
    proveedor = matchProveedor[1].trim();
  } else {
    const alt = textoOriginal.match(/proveedor[:\s\-]*([A-Za-z0-9\.\-\s&]+)/i);
    if (alt && alt[1]) proveedor = alt[1].trim();
  }
  if (!proveedor) proveedor = "Happy Tech Proveedores";

  // 3. Fecha
  let fechaFinal = fecha || null;
  const matchFechaISO = textoOriginal.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (matchFechaISO) fechaFinal = matchFechaISO[0];
  if (!fechaFinal) fechaFinal = new Date().toISOString().split('T')[0];

  // 4. Clasificación automática de Rubro (heurística extendida)
  let rubro = "Operaciones";
  const lower = textoLower;
  for (const [r, palabras] of Object.entries(RUBROS)) {
    if (palabras.some(p => lower.includes(p))) { rubro = r; break; }
  }
  if (/laptop|notebook|servidor|pc|computadora|impr|impresora/i.test(lower)) rubro = "Inventario";

  // 5. Auditoría de Cumplimiento (Regla China)
  let estado = "APROBADO";
  let notas = null;

  const tieneRechazo = PALABRAS_RECHAZO.some(p => lower.includes(p));
  const tieneAlerta = PALABRAS_ALERTA.some(p => lower.includes(p));

  if (tieneRechazo) {
    estado = "RECHAZADO / ALERTA DE CUMPLIMIENTO";
    notas = "El texto contiene referencias explícitas a origen o sede en territorio chino, violando la política interna.";
  } else if (tieneAlerta) {
    estado = "ALERTA DE CUMPLIMIENTO - REQUIERE REVISIÓN MANUAL";
    notas = "Se detectaron términos ambiguos que sugieren origen asiático sin confirmación exacta. Requiere revisión manual.";
  }

  // Concepto truncado para vista
  const concepto = textoOriginal.length > 200 ? textoOriginal.substring(0, 200) + "..." : textoOriginal;

  return {
    monto: isNaN(montoDetectado) ? null : montoDetectado,
    moneda: monedaDetectada || null,
    proveedor: proveedor,
    fecha: fechaFinal,
    concepto: concepto,
    rubro: rubro,
    estado: estado,
    notas: notas,
    descripcion: textoOriginal
  };
}

/* Mostrar resultado en UI */
function mostrarResultadoVisual(datos) {
  pantallaEspera.classList.add('hidden');
  resultadoTarjeta.classList.remove('hidden');

  valMonto.textContent = datos.monto != null ? Number(datos.monto).toLocaleString() : '-';
  valMoneda.textContent = datos.moneda || '-';
  valFecha.textContent = datos.fecha || '-';
  valRubro.textContent = datos.rubro || '-';
  valProveedor.textContent = datos.proveedor || '-';
  valConcepto.textContent = datos.concepto || '-';

  const estadoBadge = document.getElementById('estadoBadge');
  const statusIcon = document.getElementById('statusIcon');
  const notasVisual = document.getElementById('notasVisual');

  if (datos.estado && datos.estado.includes("RECHAZADO")) {
    estadoBadge.textContent = datos.estado;
    estadoBadge.style.color = 'var(--danger)';
    statusIcon.className = 'fas fa-times-circle';
    statusIcon.style.color = 'var(--danger)';
  } else if (datos.estado && datos.estado.includes("ALERTA")) {
    estadoBadge.textContent = datos.estado;
    estadoBadge.style.color = '#f59e0b';
    statusIcon.className = 'fas fa-exclamation-triangle';
    statusIcon.style.color = '#f59e0b';
  } else {
    estadoBadge.textContent = datos.estado || 'APROBADO';
    estadoBadge.style.color = 'var(--success)';
    statusIcon.className = 'fas fa-check-circle';
    statusIcon.style.color = 'var(--success)';
  }
  notasVisual.textContent = datos.notas || "El gasto cumple con todas las normativas de la empresa.";

  jsonOutput.textContent = JSON.stringify(datos, null, 2);
}

/* Mostrar la pantalla de espera (sin resultado) */
function updateInitialView(){
  if(records.length) {
    pantallaEspera.classList.add('hidden');
    mostrarResultadoVisual(records[0]);
  } else {
    pantallaEspera.classList.remove('hidden');
    resultadoTarjeta.classList.add('hidden');
  }
}

/* Helpers UI */
function showLoading(){ loading.classList.remove('hidden'); resultadoTarjeta.classList.add('hidden'); pantallaEspera.classList.add('hidden'); }
function hideLoading(){ loading.classList.add('hidden'); }
function clearInputs(){ gastoInput.value=''; montoInput.value=''; fechaInput.value=''; monedaInput.value='USD'; }

/* Persistence */
function saveRecords(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
function loadRecords(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}

/* Tabla y CRUD */
function renderTable(){
  recordsTableBody.innerHTML = '';
  records.forEach((r, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${r.fecha || '-'}</td>
      <td>${r.monto != null ? r.monto : '-'}</td>
      <td>${r.moneda || '-'}</td>
      <td>${r.rubro || '-'}</td>
      <td>${r.proveedor || '-'}</td>
      <td>${r.estado || '-'}</td>
      <td>
        <button class="action-btn" data-id="${r.id}" data-action="view" title="Ver"><i class="fas fa-eye"></i></button>
        <button class="action-btn" data-id="${r.id}" data-action="edit" title="Editar"><i class="fas fa-edit"></i></button>
        <button class="action-btn" data-id="${r.id}" data-action="delete" title="Eliminar"><i class="fas fa-trash"></i></button>
      </td>
    `;
    recordsTableBody.appendChild(tr);
  });

  // Delegación
  recordsTableBody.querySelectorAll('.action-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const rec = records.find(x => x.id === id);
      if(action === 'view') {
        mostrarResultadoVisual(rec);
      } else if(action === 'edit') {
        openEdit(rec);
      } else if(action === 'delete') {
        if(confirm('Eliminar registro?')) {
          records = records.filter(x => x.id !== id);
          saveRecords();
          renderTable();
          if(!records.length) updateInitialView();
        }
      }
    };
  });
}

function openEdit(rec){
  gastoInput.value = rec.descripcion || '';
  fechaInput.value = rec.fecha || '';
  montoInput.value = rec.monto || '';
  monedaInput.value = rec.moneda || 'USD';

  if(confirm('Al guardar se reemplazará el registro actual. Continuar?')){
    records = records.filter(x => x.id !== rec.id);
    saveRecords();
    renderTable();
  }
}

/* File handling con SheetJS */
function handleFile(e){
  const f = e.target.files[0];
  if(f) parseFile(f);
}

function parseFile(file){
  uploadLog.textContent = `Procesando ${file.name} ...`;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const data = ev.target.result;
    let workbook;
    try {
      workbook = XLSX.read(data, { type: 'binary' });
    } catch(err){
      uploadLog.textContent = 'Error leyendo archivo: ' + err.message;
      return;
    }
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const mapped = json.map(row => {
      const descripcion = row.descripcion || row.Descripcion || row.description || row.Description || '';
      const fecha = row.fecha || row.Fecha || row.date || '';
      const monto = row.monto || row.Monto || row.amount || '';
      const moneda = row.moneda || row.Moneda || row.currency || 'USD';
      const proveedor = row.proveedor || row.Proveedor || row.supplier || '';
      return { descripcion: String(descripcion), fecha: String(fecha), monto: monto ? parseFloat(monto) : null, moneda, proveedor };
    });

    let added = 0;
    for(const r of mapped){
      if(!r.descripcion) continue;
      const parsed = procesarTextoAvanzado({ texto: r.descripcion, fecha: r.fecha, monto: r.monto, moneda: r.moneda });
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
      records.unshift({ id, ...parsed, createdAt: new Date().toISOString() });
      added++;
    }
    saveRecords();
    renderTable();
    uploadLog.textContent = `Importado ${added} registros desde ${file.name}`;

    if(records.length) {
      pantallaEspera.classList.add('hidden');
      mostrarResultadoVisual(records[0]);
    }
  };

  reader.readAsBinaryString(file);
}

/* Export */
function exportJSON(){
  const data = JSON.stringify(records, null, 2);
  downloadFile(data, 'application/json', 'happytech_records.json');
}
function exportCSV(){
  if(!records.length){ alert('No hay registros para exportar'); return; }
  const headers = ['id','fecha','monto','moneda','rubro','proveedor','estado','notas','descripcion','createdAt'];
  const rows = records.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, 'text/csv', 'happytech_records.csv');
}
function downloadFile(content, mime, filename){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 500);
}

/* Utilities */
function delay(ms){ return new Promise(res => setTimeout(res, ms)); }

function clearAll(){
  if(!confirm('Eliminar todos los registros guardados localmente?')) return;
  records = [];
  saveRecords();
  renderTable();
  updateInitialView();
}

/* Inicial: vista inicial ya actualizada por updateInitialView */

/* ---------------------------
   Tema: alternar claro/oscuro
   --------------------------- */

function initTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  if(saved === 'light') applyLightTheme();
  else if(saved === 'dark') applyDarkTheme();
  else {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    if(prefersLight) applyLightTheme();
    else applyDarkTheme();
  }
}

function applyLightTheme(){
  document.documentElement.classList.add('light-theme');
  themeToggle.setAttribute('aria-pressed','true');
  themeIcon.className = 'fas fa-sun';
  themeLabel.textContent = 'Modo Claro';
  localStorage.setItem(THEME_KEY, 'light');
}

function applyDarkTheme(){
  document.documentElement.classList.remove('light-theme');
  themeToggle.setAttribute('aria-pressed','false');
  themeIcon.className = 'fas fa-moon';
  themeLabel.textContent = 'Modo Oscuro';
  localStorage.setItem(THEME_KEY, 'dark');
}

function toggleTheme(){
  if(document.documentElement.classList.contains('light-theme')) applyDarkTheme();
  else applyLightTheme();
}
