/**
 * Modelo que representa un registro mensual de depreciación de activo fijo
 */
export interface MonthlyDepreciation {
  id: string;               // Identificador único en el sistema
  assetId: string;          // ID del activo fijo
  clientId: string;         // ID del cliente al que pertenece
  
  // Período fiscal
  year: number;             // Año fiscal
  month: number;            // Mes fiscal (1-12)
  
  // Importes
  deprecationAmount: number; // Monto de depreciación para este período
  accumulatedBefore: number; // Depreciación acumulada antes de este período
  accumulatedAfter: number;  // Depreciación acumulada después de este período
  assetValueBefore: number;  // Valor del activo antes de este período
  assetValueAfter: number;   // Valor del activo después de este período
  
  // Información fiscal
  taxDeductible: boolean;   // Indica si esta depreciación es deducible fiscalmente
  taxFiscalYear?: number;   // Año fiscal para efectos fiscales (puede diferir)
  
  // Metadata
  generatedAt: string;      // Fecha de generación del registro
  calculationMethod: string; // Método utilizado para calcular esta depreciación
}

/**
 * Datos necesarios para crear un nuevo registro de depreciación mensual
 */
export interface CreateMonthlyDepreciationData {
  assetId: string;
  clientId: string;
  year: number;
  month: number;
  deprecationAmount: number;
  accumulatedBefore: number;
  accumulatedAfter: number;
  assetValueBefore: number;
  assetValueAfter: number;
  taxDeductible: boolean;
  taxFiscalYear?: number;
  calculationMethod: string;
}

/**
 * Estructura para mostrar un resumen de depreciaciones por período
 */
export interface DepreciationSummary {
  clientId: string;
  year: number;
  month: number;
  totalDepreciation: number;  // Suma total de deprecaciones en el período
  assetCount: number;         // Cantidad de activos depreciados
  byCategory: {               // Depreciación por categoría de activo
    [category: string]: number;
  };
}

/**
 * Calcula el total de depreciaciones para un cliente en un período específico
 * 
 * @param depreciations Lista de depreciaciones mensuales
 * @returns Suma total de depreciaciones
 */
export function calculateTotalDepreciation(depreciations: MonthlyDepreciation[]): number {
  return depreciations.reduce((sum, dep) => sum + dep.deprecationAmount, 0);
}

/**
 * Calcula un resumen de depreciaciones por categoría para un período
 * 
 * @param depreciations Lista de depreciaciones mensuales
 * @param assets Lista de activos fijos correspondientes
 * @returns Objeto con el resumen por categoría
 */
export function calculateDepreciationByCategory(
  depreciations: MonthlyDepreciation[], 
  assets: { id: string, type: string }[]
): { [category: string]: number } {
  // Crear mapa de activos por ID para búsqueda rápida
  const assetMap = new Map(assets.map(asset => [asset.id, asset]));
  
  // Inicializar objeto para contabilizar por categoría
  const categoryTotals: { [category: string]: number } = {};
  
  // Sumar depreciaciones por categoría
  for (const dep of depreciations) {
    const asset = assetMap.get(dep.assetId);
    if (!asset) continue;
    
    if (!categoryTotals[asset.type]) {
      categoryTotals[asset.type] = 0;
    }
    
    categoryTotals[asset.type] += dep.deprecationAmount;
  }
  
  return categoryTotals;
}