/**
 * Modelo simplificado que representa un activo fijo
 */
export interface FixedAsset {
  id: string;               // Identificador único
  clientId: string;         // ID del cliente
  
  // Información básica
  name: string;             // Nombre del activo
  type: string;             // Tipo de activo (mobiliario, computación, vehículos, etc.)
  description?: string;     // Descripción adicional del activo
  purchaseDate: string;     // Fecha de compra
  cost: number;             // Valor de compra
  deductibleValue?: number; // Valor deducible para impuestos (si es distinto al costo)
  monthlyDepreciation?: number; // Depreciación mensual (calculada)
  
  // Deprecación
  usefulLifeMonths: number; // Vida útil en meses
  residualValue: number;    // Valor residual al final
  accumulatedDepreciation: number; // Depreciación acumulada
  currentValue: number;     // Valor actual
  depreciationMethod: 'straightLine'; // Por ahora solo soportamos línea recta
  
  // Estado
  status: 'active' | 'fullyDepreciated' | 'disposed' | 'sold';
  disposalDate?: string;    // Fecha de baja o venta
  disposalValue?: number;   // Valor de venta o recuperación
  
  // Documentación
  invoiceNumber?: string;   // Número de factura
  hasInvoiceFile: boolean;  // Si tiene factura digitalizada
  notes?: string;           // Notas adicionales
  
  // Metadatos
  createdAt: string;
  updatedAt: string;
  depreciationStartDate?: string; // Fecha de inicio de la depreciación
}

/**
 * Interfaz para representar un registro de depreciación mensual
 */
export interface MonthlyDepreciation {
  id: string;                // ID único del registro
  assetId: string;           // ID del activo fijo
  clientId: string;          // ID del cliente
  year: number;              // Año del registro
  month: number;             // Mes del registro (1-12)
  deprecationAmount: number; // Monto de la depreciación en este período
  accumulatedBefore: number; // Depreciación acumulada antes de este período
  accumulatedAfter: number;  // Depreciación acumulada después de este período
  assetValueBefore: number;  // Valor del activo antes de la depreciación
  assetValueAfter: number;   // Valor del activo después de la depreciación
  taxDeductible: boolean;    // Si es deducible de impuestos
  calculationMethod: string; // Método de cálculo utilizado
  generatedAt: string;       // Fecha de generación del registro
}

/**
 * Interfaz para registros de depreciación simulados (no persistidos)
 */
export interface DepreciationHistoryItem {
  year: number;
  month: number;
  deprecationAmount: number;
  accumulatedBefore: number;
  accumulatedAfter: number;
  assetValueBefore: number;
  assetValueAfter: number;
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
  deductibleValue?: number;
  usefulLifeMonths: number;
  depreciationMethod: 'straightLine';
  residualValue: number;
  invoiceNumber?: string;
  notes?: string;
  depreciationStartDate?: string; // Fecha de inicio de la depreciación
}

/**
 * Datos para actualizar un activo fijo existente
 */
export type UpdateFixedAssetData = Partial<CreateFixedAssetData> & {
  status?: FixedAsset['status'];
  currentValue?: number;
  accumulatedDepreciation?: number;
  monthlyDepreciation?: number;
  disposalDate?: string;
  disposalValue?: number;
};

/**
 * Determina si un activo está completamente depreciado
 */
export function isFullyDepreciated(asset: FixedAsset): boolean {
  return asset.currentValue <= asset.residualValue;
}