// Palabras clave para la regla crítica de cumplimiento (Procedencia China)
const PALABRAS_RECHAZO = ["china", "shenzhen", "shanghai", "beijing", "guangzhou", "cantón", "republica popular china"];
const PALABRAS_ALERTA = ["asia", "oriente", "aliexpress", "alibaba", "importado de oriente", "dhgate"];

document.getElementById('procesarBtn').addEventListener('click', async () => {
    const gastoTexto = document.getElementById('gastoInput').value.trim();
    const btn = document.getElementById('procesarBtn');
    
    const pantallaEspera = document.getElementById('pantallaEspera');
    const loading = document.getElementById('loading');
    const resultadoTarjeta = document.getElementById('resultadoTarjeta');
    
    if (!gastoTexto) {
        alert("Por favor, ingresa la descripción del gasto.");
        return;
    }

    // UI: Estado de Carga
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando analítica...';
    pantallaEspera.classList.add('hidden');
    resultadoTarjeta.classList.add('hidden');
    loading.classList.remove('hidden');

    try {
        // Simulación de latencia de red realista (800ms)
        await new Promise(resolve => setTimeout(resolve, 800));

        // Procesamiento funcional con RegEx y reglas de Happy Tech
        const resultadoObj = procesarTextoAvanzado(gastoTexto);

        // Renderizar en UI
        mostrarResultadoVisual(resultadoObj);

    } catch (error) {
        console.error("Error:", error);
        alert("Ocurrió un error al procesar la descripción.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-robot"></i> Analizar Gasto';
        loading.classList.add('hidden');
    }
});

/**
 * Función que extrae datos mediante patrones (RegEx) y aplica políticas contables
 */
function procesarTextoAvanzado(texto) {
    const textoLower = texto.toLowerCase();

    // 1. Extracción de Monto y Moneda
    let monto = null;
    let moneda = null;

    const matchMontoMoneda = texto.match(/(\$|€|₡)?\s*(\d{1,3}(?:[,\.]\d{3})*(?:[\.,]\d{2})?)\s*(USD|CRC|EUR|dolares|dólares|colones)?/i);
    
    if (matchMontoMoneda) {
        monto = parseFloat(matchMontoMoneda[2].replace(/,/g, ''));
        
        if (matchMontoMoneda[1] === '$' || /usd|dolar|dólar/i.test(texto)) moneda = "USD";
        else if (matchMontoMoneda[1] === '₡' || /crc|colones/i.test(texto)) moneda = "CRC";
        else if (matchMontoMoneda[1] === '€' || /eur|euros/i.test(texto)) moneda = "EUR";
        else moneda = "USD"; 
    }

    // 2. Extracción de Proveedor
    let proveedor = null;
    const matchProveedor = texto.match(/(?:a proveedor|a la empresa|con|a)\s+([A-Z0-9][a-zA-Z0-9\s,\.]+?)(?=\s+por|\s+el|\s+para|\s+USD|\s+CRC|\$|\.|$)/);
    if (matchProveedor && matchProveedor[1].trim().length > 2) {
        proveedor = matchProveedor[1].trim();
    } else {
        proveedor = "Happy Tech Proveedores";
    }

    // 3. Extracción de Fecha
    let fecha = null;
    const matchFechaISO = texto.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (matchFechaISO) {
        fecha = matchFechaISO[0];
    } else {
        fecha = new Date().toISOString().split('T')[0]; 
    }

    // 4. Clasificación automática de Rubro
    let rubro = "Operaciones";
    if (/laptop|teclado|mouse|componente|hardware|stock|dispositivo|pantalla|memoria/i.test(textoLower)) {
        rubro = "Inventario";
    } else if (/anuncio|publicidad|meta ads|google ads|campaña|marketing|redes sociales/i.test(textoLower)) {
        rubro = "Marketing";
    } else if (/limpieza|luz|agua|internet|alquiler|suscripción|software/i.test(textoLower)) {
        rubro = "Servicios";
    }

    // 5. Auditoría de Cumplimiento (Regla China)
    let estado = "APROBADO";
    let notas = null;

    const tieneRechazo = PALABRAS_RECHAZO.some(p => textoLower.includes(p));
    const tieneAlerta = PALABRAS_ALERTA.some(p => textoLower.includes(p));

    if (tieneRechazo) {
        estado = "RECHAZADO / ALERTA DE CUMPLIMIENTO";
        notas = "El texto contiene referencias explícitas a origen o sede en territorio chino, violando la política interna.";
    } else if (tieneAlerta) {
        estado = "ALERTA DE CUMPLIMIENTO - REQUIERE REVISIÓN MANUAL";
        notas = "Se detectaron términos ambiguos que sugieren origen asiático sin confirmación exacta. Requiere visto bueno de auditoría.";
    }

    // Estructura JSON final estricta
    return {
        "monto": isNaN(monto) ? null : monto,
        "moneda": moneda,
        "proveedor": proveedor,
        "fecha": fecha,
        "concepto": texto.length > 80 ? texto.substring(0, 80) + "..." : texto,
        "rubro": rubro,
        "estado": estado,
        "notas": notas
    };
}

function mostrarResultadoVisual(datos) {
    const tarjeta = document.getElementById('resultadoTarjeta');
    const statusBanner = document.getElementById('statusBanner');
    const statusIcon = document.getElementById('statusIcon');
    const estadoBadge = document.getElementById('estadoBadge');
    const notasVisual = document.getElementById('notasVisual');

    // Configurar Banner de Estado
    statusBanner.className = 'status-banner';
    estadoBadge.textContent = datos.estado;
    notasVisual.textContent = datos.notas || "El gasto cumple con todas las normativas de la empresa.";

    if (datos.estado === "APROBADO") {
        statusBanner.classList.add('banner-aprobado');
        statusIcon.className = 'fas fa-check-circle';
    } else if (datos.estado.includes("RECHAZADO")) {
        statusBanner.classList.add('banner-rechazado');
        statusIcon.className = 'fas fa-times-circle';
    } else {
        statusBanner.classList.add('banner-alerta');
        statusIcon.className = 'fas fa-exclamation-triangle';
    }

    // Llenar cuadrícula de datos
    document.getElementById('valMonto').textContent = datos.monto ? datos.monto.toLocaleString() : 'No identificado';
    document.getElementById('valMoneda').textContent = datos.moneda || 'No identificada';
    document.getElementById('valFecha').textContent = datos.fecha || 'No identificada';
    document.getElementById('valRubro').textContent = datos.rubro || 'Otro';
    document.getElementById('valProveedor').textContent = datos.proveedor || 'No identificado';
    document.getElementById('valConcepto').textContent = datos.concepto || 'Sin concepto';

    // Rellenar JSON Técnico
    document.getElementById('jsonOutput').textContent = JSON.stringify(datos, null, 2);
    
    // Mostrar tarjeta
    tarjeta.classList.remove('hidden');
}