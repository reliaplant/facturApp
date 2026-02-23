/**
 * Servicio para calcular resúmenes fiscales dinámicamente a partir de CFDIs
 * 
 * Este servicio reemplaza el patrón de mantener un documento "fiscalSummary" 
 * sincronizado. En su lugar, calcula todo on-demand desde los CFDIs.
 */

import { CFDI } from '@/models/CFDI';

// Interfaz para los totales mensuales de ingresos
export interface MonthlyIncomeTotals {
  isrGravado: number;      // Base gravada para ISR (ingresos)
  isrRetenido: number;     // ISR retenido por terceros
  ivaTrasladado: number;   // IVA cobrado (trasladado)
  ivaRetenido: number;     // IVA retenido por terceros
  totalIngresos: number;   // Total de ingresos del mes
  countCfdis: number;      // Número de CFDIs de ingreso
}

// Interfaz para los totales mensuales de egresos
export interface MonthlyExpenseTotals {
  isrDeducible: number;    // Base deducible para ISR (gastos)
  ivaAcreditable: number;  // IVA pagado (acreditable)
  totalGastos: number;     // Total de gastos del mes
  countCfdis: number;      // Número de CFDIs de egreso
}

// Interfaz combinada para resumen mensual completo
export interface MonthlyFiscalSummary {
  month: number;
  // Ingresos
  ingresos: MonthlyIncomeTotals;
  // Egresos
  egresos: MonthlyExpenseTotals;
  // Calculados
  utilidadBruta: number;           // Ingresos - Gastos
  ivaAPagar: number;               // IVA trasladado - IVA acreditable - IVA retenido
  ivaPendiente: number;            // IVA acreditable no utilizado (cuando es negativo)
}

// Interfaz para resumen anual
export interface AnnualFiscalSummary {
  year: number;
  clientId: string;
  months: Record<number, MonthlyFiscalSummary>;
  // Totales anuales
  totals: {
    ingresos: MonthlyIncomeTotals;
    egresos: MonthlyExpenseTotals;
    utilidadBruta: number;
    ivaAPagar: number;
  };
}

/**
 * Calcula los totales mensuales de ingresos a partir de CFDIs
 */
function calculateMonthlyIncomeTotals(cfdis: CFDI[]): Record<number, MonthlyIncomeTotals> {
  const monthlyTotals: Record<number, MonthlyIncomeTotals> = {};
  
  // Inicializar todos los meses
  for (let month = 1; month <= 12; month++) {
    monthlyTotals[month] = {
      isrGravado: 0,
      isrRetenido: 0,
      ivaTrasladado: 0,
      ivaRetenido: 0,
      totalIngresos: 0,
      countCfdis: 0
    };
  }
  
  // Filtrar solo CFDIs de ingreso (tipo I y E para notas de crédito)
  const incomeCfdis = cfdis.filter(cfdi => 
    (cfdi.tipoDeComprobante === 'I' || cfdi.tipoDeComprobante === 'E') && // Ingreso y Notas de Crédito
    !cfdi.estaCancelado &&
    cfdi.esDeducible &&
    cfdi.mesDeduccion && 
    cfdi.mesDeduccion >= 1 && 
    cfdi.mesDeduccion <= 12
  );
  
  // Calcular totales por mes
  incomeCfdis.forEach(cfdi => {
    const month = cfdi.mesDeduccion!;
    
    // Factor de conversión para moneda extranjera (solo para valores no modificados)
    const tipoCambio = (cfdi.moneda && cfdi.moneda !== 'MXN') ? (cfdi.tipoCambio || 1) : 1;
    
    // Multiplicador: -1 para notas de crédito (tipo E), 1 para el resto
    const multiplier = cfdi.tipoDeComprobante === 'E' ? -1 : 1;
    
    // Para ingresos: usar subTotal si no está modificado manualmente, de lo contrario usar gravadoISR
    // Si gravadoModificado = true, los valores ya están en MXN (no multiplicar)
    const isrGravado = cfdi.gravadoModificado 
      ? (cfdi.gravadoISR || 0) * multiplier // Ya en MXN
      : (cfdi.subTotal || 0) * tipoCambio * multiplier; // Convertir a MXN
    
    const ivaGravado = cfdi.gravadoModificado 
      ? (cfdi.gravadoIVA || 0) * multiplier // Ya en MXN
      : (cfdi.impuestoTrasladado || 0) * tipoCambio * multiplier; // Convertir a MXN
    
    monthlyTotals[month].isrGravado += isrGravado;
    monthlyTotals[month].isrRetenido += (cfdi.isrRetenido || 0) * tipoCambio * multiplier;
    monthlyTotals[month].ivaTrasladado += ivaGravado;
    monthlyTotals[month].ivaRetenido += (cfdi.ivaRetenido || 0) * tipoCambio * multiplier;
    monthlyTotals[month].totalIngresos += (cfdi.total || 0) * tipoCambio * multiplier;
    monthlyTotals[month].countCfdis += 1;
  });
  
  return monthlyTotals;
}

/**
 * Calcula los totales mensuales de egresos a partir de CFDIs
 */
function calculateMonthlyExpenseTotals(cfdis: CFDI[]): Record<number, MonthlyExpenseTotals> {
  const monthlyTotals: Record<number, MonthlyExpenseTotals> = {};
  
  // Inicializar todos los meses
  for (let month = 1; month <= 12; month++) {
    monthlyTotals[month] = {
      isrDeducible: 0,
      ivaAcreditable: 0,
      totalGastos: 0,
      countCfdis: 0
    };
  }
  
  // Filtrar solo CFDIs de egreso (gastos)
  const expenseCfdis = cfdis.filter(cfdi => 
    cfdi.esEgreso === true // Factura recibida = Gasto
  ).filter(cfdi =>
    !cfdi.estaCancelado &&
    cfdi.esDeducible &&
    cfdi.mesDeduccion && 
    cfdi.mesDeduccion >= 1 && 
    cfdi.mesDeduccion <= 12
  );
  
  // Calcular totales por mes
  expenseCfdis.forEach(cfdi => {
    const month = cfdi.mesDeduccion!;
    
    // Factor de conversión para moneda extranjera (solo para valores no modificados)
    const tipoCambio = (cfdi.moneda && cfdi.moneda !== 'MXN') ? (cfdi.tipoCambio || 1) : 1;
    
    // Multiplicador: -1 para notas de crédito (tipo E), 1 para el resto
    // Una nota de crédito recibida reduce nuestros gastos deducibles
    const multiplier = cfdi.tipoDeComprobante === 'E' ? -1 : 1;
    
    // Si gravadoModificado = true, los valores ya están en MXN (no multiplicar)
    const isrDeducible = cfdi.gravadoModificado 
      ? (cfdi.gravadoISR || 0) * multiplier // Ya en MXN
      : (cfdi.gravadoISR || 0) * tipoCambio * multiplier; // Convertir a MXN
    
    const ivaAcreditable = cfdi.gravadoModificado 
      ? (cfdi.gravadoIVA || 0) * multiplier // Ya en MXN
      : (cfdi.gravadoIVA || 0) * tipoCambio * multiplier; // Convertir a MXN
    
    monthlyTotals[month].isrDeducible += isrDeducible;
    monthlyTotals[month].ivaAcreditable += ivaAcreditable;
    monthlyTotals[month].totalGastos += (cfdi.total || 0) * tipoCambio * multiplier;
    monthlyTotals[month].countCfdis += 1;
  });
  
  return monthlyTotals;
}

/**
 * Calcula el resumen fiscal completo para un año
 * Ahora considera anioDeduccion para facturas PPD que cruzan años fiscales
 */
export function calculateAnnualFiscalSummary(
  cfdis: CFDI[], 
  year: number, 
  clientId: string
): AnnualFiscalSummary {
  // Para ingresos: usar ejercicioFiscal (los ingresos se reconocen cuando se emite la factura)
  const incomeCfdis = cfdis.filter(cfdi => 
    cfdi.esIngreso === true && 
    cfdi.ejercicioFiscal === year
  );
  
  // Para egresos: usar anioDeduccion si existe, sino ejercicioFiscal
  // Esto permite que facturas de un año se deduzcan en otro (ej: PPD pagada en año siguiente)
  const expenseCfdis = cfdis.filter(cfdi => 
    cfdi.esEgreso === true &&
    (cfdi.anioDeduccion ? cfdi.anioDeduccion === year : cfdi.ejercicioFiscal === year)
  );
  
  // Calcular totales mensuales
  const incomesByMonth = calculateMonthlyIncomeTotals(incomeCfdis);
  const expensesByMonth = calculateMonthlyExpenseTotals(expenseCfdis);
  
  // Construir resumen mensual completo
  const months: Record<number, MonthlyFiscalSummary> = {};
  
  for (let month = 1; month <= 12; month++) {
    const ingresos = incomesByMonth[month];
    const egresos = expensesByMonth[month];
    
    const utilidadBruta = ingresos.isrGravado - egresos.isrDeducible;
    const ivaAPagar = ingresos.ivaTrasladado - egresos.ivaAcreditable - ingresos.ivaRetenido;
    
    months[month] = {
      month,
      ingresos,
      egresos,
      utilidadBruta,
      ivaAPagar,
      ivaPendiente: ivaAPagar < 0 ? Math.abs(ivaAPagar) : 0
    };
  }
  
  // Calcular totales anuales
  const totalIngresos: MonthlyIncomeTotals = {
    isrGravado: 0,
    isrRetenido: 0,
    ivaTrasladado: 0,
    ivaRetenido: 0,
    totalIngresos: 0,
    countCfdis: 0
  };
  
  const totalEgresos: MonthlyExpenseTotals = {
    isrDeducible: 0,
    ivaAcreditable: 0,
    totalGastos: 0,
    countCfdis: 0
  };
  
  Object.values(months).forEach(month => {
    totalIngresos.isrGravado += month.ingresos.isrGravado;
    totalIngresos.isrRetenido += month.ingresos.isrRetenido;
    totalIngresos.ivaTrasladado += month.ingresos.ivaTrasladado;
    totalIngresos.ivaRetenido += month.ingresos.ivaRetenido;
    totalIngresos.totalIngresos += month.ingresos.totalIngresos;
    totalIngresos.countCfdis += month.ingresos.countCfdis;
    
    totalEgresos.isrDeducible += month.egresos.isrDeducible;
    totalEgresos.ivaAcreditable += month.egresos.ivaAcreditable;
    totalEgresos.totalGastos += month.egresos.totalGastos;
    totalEgresos.countCfdis += month.egresos.countCfdis;
  });
  
  return {
    year,
    clientId,
    months,
    totals: {
      ingresos: totalIngresos,
      egresos: totalEgresos,
      utilidadBruta: totalIngresos.isrGravado - totalEgresos.isrDeducible,
      ivaAPagar: totalIngresos.ivaTrasladado - totalEgresos.ivaAcreditable - totalIngresos.ivaRetenido
    }
  };
}

/**
 * Calcula totales acumulados hasta un mes específico (para ISR provisional)
 */
export function calculateAccumulatedTotals(
  summary: AnnualFiscalSummary,
  upToMonth: number
): {
  ingresosAcumulados: number;
  deduccionesAcumuladas: number;
  utilidadAcumulada: number;
  isrRetenidoAcumulado: number;
} {
  let ingresosAcumulados = 0;
  let deduccionesAcumuladas = 0;
  let isrRetenidoAcumulado = 0;
  
  for (let month = 1; month <= upToMonth; month++) {
    const monthData = summary.months[month];
    if (monthData) {
      ingresosAcumulados += monthData.ingresos.isrGravado;
      deduccionesAcumuladas += monthData.egresos.isrDeducible;
      isrRetenidoAcumulado += monthData.ingresos.isrRetenido;
    }
  }
  
  return {
    ingresosAcumulados,
    deduccionesAcumuladas,
    utilidadAcumulada: ingresosAcumulados - deduccionesAcumuladas,
    isrRetenidoAcumulado
  };
}

/**
 * Hook-friendly function para calcular resumen fiscal
 * Recibe los CFDIs ya cargados y devuelve el resumen
 */
export const fiscalCalculator = {
  calculateAnnualSummary: calculateAnnualFiscalSummary,
  calculateAccumulatedTotals,
  
  /**
   * Calcula solo los totales de un mes específico
   */
  calculateMonthSummary(cfdis: CFDI[], year: number, month: number): MonthlyFiscalSummary | null {
    const summary = calculateAnnualFiscalSummary(cfdis, year, '');
    return summary.months[month] || null;
  },
  
  /**
   * Obtiene estadísticas rápidas sin calcular todo el resumen
   */
  getQuickStats(cfdis: CFDI[], year: number): {
    totalIngresos: number;
    totalGastos: number;
    totalCfdis: number;
    cfdisIngreso: number;
    cfdisEgreso: number;
  } {
    const yearCfdis = cfdis.filter(cfdi => 
      cfdi.ejercicioFiscal === year && !cfdi.estaCancelado
    );
    
    const ingresos = yearCfdis.filter(c => c.esIngreso === true);
    const egresos = yearCfdis.filter(c => c.esIngreso === false);
    
    return {
      totalIngresos: ingresos.reduce((sum, c) => sum + (c.total || 0), 0),
      totalGastos: egresos.reduce((sum, c) => sum + (c.total || 0), 0),
      totalCfdis: yearCfdis.length,
      cfdisIngreso: ingresos.length,
      cfdisEgreso: egresos.length
    };
  }
};
