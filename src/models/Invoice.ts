/**
 * Modelo que representa una factura CFDI
 */
export interface Invoice {
  id: string;               // Identificador único en el sistema
  uuid: string;             // Identificador único fiscal (UUID/Folio fiscal)
  series?: string;          // Serie de la factura
  folio?: string;           // Folio de la factura
  
  // Información básica
  date: string;             // Fecha de emisión YYYY-MM-DD
  certificateNumber?: string; // Número de certificado
  paymentMethod: string;    // Método de Pago (e.g., PUE, PPD)
  paymentForm: string;      // Forma de Pago (e.g., 01: Efectivo, 03: Transferencia)
  cfdiType: 'I' | 'E' | 'P' | 'N' | 'T'; // Para el cliente: I: Ingreso, E: Egreso, P: Pago, N: Nómina, T: Traslado
  originalType?: string;    // Tipo de comprobante original del CFDI (para referencia)
  cfdiUsage: string;        // Uso del CFDI (e.g., G03: Gastos en general)
  
  // Información fiscal
  fiscalYear: number;       // Año fiscal (derivado de la fecha)
  fiscalRegime: string;     // Régimen fiscal del emisor (RegimenFiscal)
  regimenFiscalReceptor?: string; // Régimen fiscal del receptor (RegimenFiscalReceptor)
  
  // Ubicaciones
  lugarExpedicion?: string; // Código postal del emisor (LugarExpedicion)
  domicilioFiscalReceptor?: string; // Código postal del receptor (DomicilioFiscalReceptor)
  
  // Para mantener compatibilidad con código existente
  issuerZipCode?: string;   // Alias para lugarExpedicion
  receiverZipCode?: string; // Alias para domicilioFiscalReceptor
  receiverFiscalRegime?: string; // Alias para regimenFiscalReceptor
  
  // Moneda y cambio
  currency?: string;        // Moneda (MXN por defecto)
  exchangeRate?: string;    // Tipo de cambio (1.00 por defecto para MXN)
  
  // Importes
  subtotal: number;         // Subtotal (sin impuestos)
  discount?: number;        // Descuento
  total: number;            // Total (con impuestos)
  
  // Impuestos
  tax?: number;             // IVA (16%)
  taxRate?: number;         // Tasa de IVA (e.g., 0.16)
  retainedTax?: number;     // Impuestos retenidos
  retainedVat?: number;     // IVA retenido
  retainedIsr?: number;     // ISR retenido
  iepsTax?: number;         // IEPS trasladado
  transferredTaxes?: number; // Total impuestos trasladados
  retainedTaxes?: number;   // Total impuestos retenidos
  localTaxes?: number;      // Impuestos locales
  
  // Formas de pago adicionales
  paymentAccountNumber?: string; // Número de cuenta para pago
  paymentAccountForm?: string;   // Forma de cuenta para pago
  
  // Participantes
  issuerRfc: string;        // RFC del emisor
  issuerName: string;       // Nombre o razón social del emisor
  receiverRfc: string;      // RFC del receptor
  receiverName: string;     // Nombre o razón social del receptor
  
  // Información adicional
  concepts: InvoiceConcept[]; // Conceptos de la factura
  expenseType?: string;     // Tipo de gasto (para egresos)
  cancellationDate?: string; // Fecha de cancelación si aplica
  isCancelled: boolean;     // Indica si la factura está cancelada
  observations?: string;    // Observaciones adicionales
  
  // Metadata del sistema
  clientId: string;         // ID del cliente al que pertenece
  createdAt: string;        // Fecha de creación en el sistema
  updatedAt: string;        // Fecha de última actualización
  xmlContent?: string;      // Contenido XML de la factura (podría almacenarse en otro lugar)
}

/**
 * Modelo para los conceptos de una factura
 */
export interface InvoiceConcept {
  id: string;               // Identificador único del concepto
  description: string;      // Descripción del concepto
  quantity: number;         // Cantidad
  unitValue: number;        // Valor unitario
  amount: number;           // Importe (cantidad * valor unitario)
  unitMeasure: string;      // Unidad de medida
  productCode?: string;     // Clave de producto o servicio SAT
  taxes?: ConceptTax[];     // Impuestos del concepto
}

/**
 * Modelo para los impuestos por concepto
 */
export interface ConceptTax {
  type: 'transfer' | 'withholding'; // Tipo: Traslado o Retención
  taxType: 'IVA' | 'ISR' | 'IEPS';  // Tipo de impuesto
  base: number;             // Base gravable
  rate: number;             // Tasa o cuota
  amount: number;           // Importe del impuesto
}

/**
 * Calcula el total de ingresos para un año fiscal específico
 */
export function calculateTotalIncomesByYear(invoices: Invoice[], year: number): number {
  return invoices
    .filter(invoice => 
      invoice.cfdiType === 'I' && 
      !invoice.isCancelled && 
      new Date(invoice.date).getFullYear() === year
    )
    .reduce((sum, invoice) => sum + invoice.total, 0);
}

/**
 * Calcula el total de egresos para un año fiscal específico
 */
export function calculateTotalExpensesByYear(invoices: Invoice[], year: number): number {
  return invoices
    .filter(invoice => 
      invoice.cfdiType === 'E' && 
      !invoice.isCancelled && 
      new Date(invoice.date).getFullYear() === year
    )
    .reduce((sum, invoice) => sum + invoice.total, 0);
}

/**
 * Calcula la utilidad fiscal para un año específico
 */
export function calculateTaxableIncome(invoices: Invoice[], year: number): number {
  const incomes = calculateTotalIncomesByYear(invoices, year);
  const expenses = calculateTotalExpensesByYear(invoices, year);
  return incomes - expenses;
}
