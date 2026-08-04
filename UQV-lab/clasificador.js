// Rubros válidos
const RUBROS = {
  "Accesorios": ["cable", "mouse", "teclado", "monitor"],
  "Software": ["licencia", "software", "programa", "suscripción"],
  "Servicios": ["consultoría", "asesoría", "servicio"],
  "Mantenimiento": ["mantenimiento", "reparación", "soporte"],
  "Otros": []
};

// Regla de exclusión
const PROHIBIDO = ["china", "fabricado en china", "importado de china"];

function clasificarGasto(descripcion) {
  const descLower = descripcion.toLowerCase();

  // Validar regla de exclusión
  if (PROHIBIDO.some(p => descLower.includes(p))) {
    return {
      descripcion,
      rubro: "No permitido",
      monto_estimado: null,
      proveedor: null
    };
  }

  // Clasificación por rubro
  for (const [rubro, palabras] of Object.entries(RUBROS)) {
    if (palabras.some(p => descLower.includes(p))) {
      return {
        descripcion,
        rubro,
        monto_estimado: null,
        proveedor: null
      };
    }
  }

  // Si no coincide con nada
  return {
    descripcion,
    rubro: "Otros",
    monto_estimado: null,
    proveedor: null
  };
}

// Ejemplos ficticios
const gastos = [
  "Compra de cables HDMI para oficina",
  "Pago de licencia anual de software contable",
  "Servicio de mantenimiento de impresoras",
  "Importación de teclados fabricados en China"
];

// Procesar todos los gastos
const resultado = gastos.map(g => clasificarGasto(g));

// Mostrar salida en JSON
console.log(JSON.stringify(resultado, null, 2));
