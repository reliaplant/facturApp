/**
 * Modelo simplificado que representa un activo fijo
 */
export interface FixedAsset {
  id: string;               // Identificador único
  clientId: string;         // ID del cliente
  
  // Información básica
  name: string;             // Nombre del activo
  type: string;             // Tipo de activo (mobiliario, computación, vehículos, etc.)
  purchaseDate: string;     // Fecha de compra
  cost: number;             // Valor de compra
  deductibleValue?: number; // Valor deducible para impuestos (si es distinto al costo)
  
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
}

/**
 * Datos para actualizar un activo fijo existente
 */
export type UpdateFixedAssetData = Partial<CreateFixedAssetData> & {
  status?: FixedAsset['status'];
  currentValue?: number;
  accumulatedDepreciation?: number;
  disposalDate?: string;
  disposalValue?: number;
};

/**
 * Determina si un activo está completamente depreciado
 */
export function isFullyDepreciated(asset: FixedAsset): boolean {
  return asset.currentValue <= asset.residualValue;
}