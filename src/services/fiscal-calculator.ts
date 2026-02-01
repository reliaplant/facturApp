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
  
  // Filtrar solo CFDIs de ingreso
  const incomeCfdis = cfdis.filter(cfdi => 
    cfdi.tipoDeComprobante === 'I' && // Ingreso
    !cfdi.estaCancelado &&
    cfdi.esDeducible &&
    cfdi.mesDeduccion && 
    cfdi.mesDeduccion >= 1 && 
    cfdi.mesDeduccion <= 12
  );
  
  // Calcular totales por mes
  incomeCfdis.forEach(cfdi => {
    const month = cfdi.mesDeduccion!;
    
    monthlyTotals[month].isrGravado += cfdi.gravadoISR || 0;
    monthlyTotals[month].isrRetenido += cfdi.isrRetenido || 0;
    monthlyTotals[month].ivaTrasladado += cfdi.gravadoIVA || 0;
    monthlyTotals[month].ivaRetenido += cfdi.ivaRetenido || 0;
    monthlyTotals[month].totalIngresos += cfdi.total || 0;
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
    
    monthlyTotals[month].isrDeducible += cfdi.gravadoISR || 0;
    monthlyTotals[month].ivaAcreditable += cfdi.gravadoIVA || 0;
    monthlyTotals[month].totalGastos += cfdi.total || 0;
    monthlyTotals[month].countCfdis += 1;
  });
  
  return monthlyTotals;
}

/**
 * Calcula el resumen fiscal completo para un año
 */
export function calculateAnnualFiscalSummary(
  cfdis: CFDI[], 
  year: number, 
  clientId: string
): AnnualFiscalSummary {
  // Filtrar CFDIs por año fiscal
  const yearCfdis = cfdis.filter(cfdi => cfdi.ejercicioFiscal === year);
  
  // Separar ingresos y egresos
  const incomeCfdis = yearCfdis.filter(cfdi => cfdi.esIngreso === true);
  const expenseCfdis = yearCfdis.filter(cfdi => cfdi.esEgreso === true);
  
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
