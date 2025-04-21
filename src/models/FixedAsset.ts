/**
 * Modelo que representa un activo fijo
 */
export interface FixedAsset {
  id: string;               // Identificador único en el sistema
  clientId: string;         // ID del cliente al que pertenece
  
  // Información básica del activo
  name: string;             // Nombre o descripción del activo
  type: string;             // Tipo de activo (mobiliario, equipo de cómputo, vehículos, etc.)
  purchaseDate: string;     // Fecha de adquisición (YYYY-MM-DD)
  cost: number;             // Costo de adquisición (valor original)
  
  // Información para la depreciación
  depreciationMethod: 'straightLine' | 'doubleDecline' | 'sumOfYears' | 'units'; // Método de depreciación
  usefulLifeMonths: number; // Vida útil en meses
  residualValue: number;    // Valor residual al final de la vida útil
  
  // Estado actual del activo
  status: 'active' | 'fullyDepreciated' | 'disposed' | 'sold'; // Estado actual del activo
  currentValue: number;     // Valor actual (después de depreciación acumulada)
  accumulatedDepreciation: number; // Depreciación acumulada hasta la fecha
  disposalDate?: string;    // Fecha de baja o venta
  disposalValue?: number;   // Valor de venta o recuperación (si corresponde)
  
  // Datos fiscales
  fiscalCategory: string;   // Categoría fiscal según la ley (para determinar % máximo de deducción)
  deductionRate?: number;   // Porcentaje de deducción fiscal anual (según ley)
  invoiceNumber?: string;   // Número de factura de compra
  
  // Documentación
  hasInvoiceFile: boolean;  // Indica si tiene factura digitalizada
  invoiceFileUrl?: string;  // URL a la factura digitalizada
  notes?: string;           // Notas adicionales
  
  // Metadata del sistema
  createdAt: string;        // Fecha de creación en el sistema
  updatedAt: string;        // Fecha de última actualización
  createdBy?: string;       // Usuario que creó el registro
  updatedBy?: string;       // Usuario que actualizó por última vez

  // Propiedades adicionales
  serialNumber?: string;    // Número de serie del activo
  location?: string;        // Ubicación física del activo
  costCenter?: string;      // Centro de costo asociado al activo
}

/**
 * Datos necesarios para crear un nuevo activo fijo
 */
export interface CreateFixedAssetData {
  clientId: string;
  name: string;
  type: string;
  purchaseDate: string;
  cost: number;
  depreciationMethod: FixedAsset['depreciationMethod'];
  usefulLifeMonths: number;
  residualValue: number;
  fiscalCategory: string;
  deductionRate?: number;
  invoiceNumber?: string;
  notes?: string;

  // Propiedades adicionales
  serialNumber?: string;    // Número de serie del activo
  location?: string;        // Ubicación física del activo
  costCenter?: string;      // Centro de costo asociado al activo
}

/**
 * Datos para actualizar un activo fijo existente
 */
export interface UpdateFixedAssetData {
  name?: string;
  type?: string;
  purchaseDate?: string;
  cost?: number;
  depreciationMethod?: FixedAsset['depreciationMethod'];
  usefulLifeMonths?: number;
  residualValue?: number;
  status?: FixedAsset['status'];
  currentValue?: number;
  accumulatedDepreciation?: number;
  disposalDate?: string;
  disposalValue?: number;
  fiscalCategory?: string;
  deductionRate?: number;
  invoiceNumber?: string;
  notes?: string;
}

// Importar las funciones de depreciation.ts para el cálculo centralizado
import { calculateMonthlyDepreciation, calculateAccumulatedDepreciation } from '@/utils/depreciation';

/**
 * Calculates the monthly depreciation amount using the straight-line method
 * 
 * @param cost The original cost of the asset
 * @param residualValue The expected salvage value at the end of useful life
 * @param usefulLifeMonths The total life of the asset in months
 * @returns The monthly depreciation amount, rounded to 2 decimal places
 */
export function calculateStraightLineDepreciation(
  cost: number, 
  residualValue: number, 
  usefulLifeMonths: number
): number {
  const depreciableAmount = cost - residualValue;
  return Number((depreciableAmount / usefulLifeMonths).toFixed(2));
}

/**
 * Calcula el valor de depreciación para un período específico usando el método de doble declining
 * 
 * @param cost Costo de adquisición
 * @param residualValue Valor residual
 * @param usefulLifeMonths Vida útil en meses
 * @param currentMonth Mes actual en la vida del activo (1-based)
 * @param currentValue Valor actual del activo antes de la depreciación de este período
 * @returns Monto de depreciación para el período
 */
export function calculateDoubleDeclineDepreciation(
  cost: number,
  residualValue: number,
  usefulLifeMonths: number,
  currentMonth: number,
  currentValue: number
): number {
  if (usefulLifeMonths <= 0 || currentMonth > usefulLifeMonths) return 0;
  
  // Tasa de depreciación lineal anual
  const straightLineRateAnnual = 1 / (usefulLifeMonths / 12);
  
  // Tasa de doble declinación anual
  const doubleDeclineRateAnnual = straightLineRateAnnual * 2;
  
  // Tasa de doble declinación mensual
  const doubleDeclineRateMonthly = doubleDeclineRateAnnual / 12;
  
  // Calculamos la depreciación para el mes actual
  let depreciation = currentValue * doubleDeclineRateMonthly;
  
  // Verificamos que el valor no sea menor que el valor residual
  if (currentValue - depreciation < residualValue) {
    depreciation = currentValue - residualValue;
  }
  
  return Math.max(0, depreciation);
}

/**
 * Calcula el valor de depreciación según el método de suma de años dígitos (SYD)
 * 
 * @param cost Costo de adquisición
 * @param residualValue Valor residual
 * @param usefulLifeMonths Vida útil en meses
 * @param currentMonth Mes actual en la vida del activo (1-based)
 * @returns Monto de depreciación para el período
 */
export function calculateSumOfYearsDepreciation(
  cost: number,
  residualValue: number,
  usefulLifeMonths: number,
  currentMonth: number
): number {
  if (usefulLifeMonths <= 0 || currentMonth > usefulLifeMonths) return 0;
  
  const usefulLifeYears = Math.ceil(usefulLifeMonths / 12);
  const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
  
  const currentYear = Math.ceil(currentMonth / 12);
  const remainingYears = usefulLifeYears - currentYear + 1;
  
  // Fracción para el año actual
  const yearFraction = remainingYears / sumOfYears;
  
  // Depreciación anual según SYD
  const annualDepreciation = (cost - residualValue) * yearFraction;
  
  // Depreciación mensual (dividida por 12)
  return annualDepreciation / 12;
}

/**
 * Determina si un activo está completamente depreciado
 */
export function isFullyDepreciated(asset: FixedAsset): boolean {
  return asset.currentValue <= asset.residualValue;
}

/**
 * Calcula la fecha esperada de finalización de la depreciación
 */
export function calculateEndOfLifeDate(purchaseDate: string, usefulLifeMonths: number): string {
  const date = new Date(purchaseDate);
  date.setMonth(date.getMonth() + usefulLifeMonths);
  return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
}

/**
 * Calcula la depreciación acumulada y el valor actual de un activo hasta la fecha especificada
 * 
 * @param asset El activo a calcular
 * @param cutoffDate Fecha de corte para el cálculo (opcional, por defecto la fecha actual)
 * @returns Un objeto con la depreciación acumulada y el valor actual
 */
export function calculateCurrentDepreciation(
  asset: FixedAsset,
  cutoffDate: Date = new Date()
): { accumulatedDepreciation: number, currentValue: number } {
  return calculateAccumulatedDepreciation(asset, cutoffDate);
}