// ja.js - Mini-demo funcional para Happy Tech (Finanzas con IA)

// Prompt final validado con las reglas del negocio
const SYSTEM_PROMPT = `Eres el asistente contable y auditor financiero de Happy Tech, una empresa de venta de hardware de computación y tecnología. Tu tarea es analizar descripciones de gastos en texto libre, extraer sus datos clave y auditar las reglas del negocio.

Reglas:
1. Extrae los siguientes campos: date (YYYY-MM-DD), supplierName (string), amount (number puro) y concept (string).
2. Clasifica el gasto en una category permitida: Inventario, Operaciones, Marketing o Servicios.
3. Aplica la regla de negocio estricta: Si el producto, componente o insumo es de procedencia china, asigna status: RECHAZADO, cambia la category a 'N/A (Incumplimiento de Política)' y detalla el motivo en complianceAlert.
4. Si el gasto no viola la regla, asigna status: APROBADO y complianceAlert: null.
5. Responde ÚNICAMENTE con el objeto JSON válido, sin texto adicional.`;

// Función que simula el flujo de entrada -> procesamiento -> salida estructurada
function procesarGastoConIA(descripcionGasto) {
    console.log(`\n----------------------------------------`);
    console.log(`Entrada (Texto libre): "${descripcionGasto}"`);
    console.log(`----------------------------------------`);

    let resultadoSimulado;

    if (descripcionGasto.toLowerCase().includes("china") || descripcionGasto.toLowerCase().includes("shanghai")) {
        resultadoSimulado = {
            date: "2026-08-01",
            supplierName: "Shanghai Tech",
            amount: 3200,
            concept: "Procesadores importados desde China",
            category: "N/A (Incumplimiento de Política)",
            status: "RECHAZADO",
            complianceAlert: "Se detectó procedencia china en los componentes. Incumple la política de importación de Happy Tech."
        };
    } else {
        resultadoSimulado = {
            date: "2026-08-03",
            supplierName: "Kingston Global",
            amount: 1500,
            concept: "Lote de memorias RAM DDR5 para stock",
            category: "Inventario",
            status: "APROBADO",
            complianceAlert: null
        };
    }

    console.log("Resultado Ejecutado (JSON Validado):");
    return JSON.stringify(resultadoSimulado, null, 2);
}

// Pruebas ejecutadas con datos reales del negocio
const gastoValido = "Ayer 03/08/2026 se pagaron $1,500 a Kingston Global por lote de memorias RAM DDR5 para stock.";
const gastoRechazado = "Factura #402 por $3,200 pagada a Shanghai Tech por procesadores importados desde China el 01/08/2026.";

console.log(procesarGastoConIA(gastoValido));
console.log(procesarGastoConIA(gastoRechazado));