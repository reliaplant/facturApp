/**
 * Modelo que representa una factura CFDI
 */
export interface Invoice {

  id: string; // Identificador único en el sistema
  idCliente: string; // ID del cliente al que pertenece
  fechaCreacion: string; // Fecha de creación en el sistema
  fechaActualizacion: string; // Fecha de última actualización
  contenidoXml?: string; // Contenido XML de la factura
  recibida: boolean; // Indica si la factura ha sido recibida
  fecha: string; // Fecha de emisión YYYY-MM-DD
  tipoDeComprobante?: string; // Tipo de comprobante original del CFDI (para referencia)
  rfcReceptor: string; // RFC del receptor
  nombreReceptor: string; // Nombre o razón social del receptor
  domicilioFiscalReceptor?: string; // Código postal del receptor (DomicilioFiscalReceptor)
  regimenFiscalReceptor?: string; // Régimen fiscal del receptor (RegimenFiscalReceptor)
  usoCFDI: string; // Uso del CFDI (e.g., G03: Gastos en general)
  rfcEmisor: string; // RFC del emisor
  nombreEmisor: string; // Nombre o razón social del emisor
  lugarExpedicion?: string; // Código postal del emisor (LugarExpedicion)
  regimenFiscal: string; // Régimen fiscal del emisor (RegimenFiscal)
  serie?: string; // Serie de la factura
  folio?: string; // Folio de la factura
  uuid: string; // Identificador único fiscal (UUID/Folio fiscal)
  metodoPago: string; // Método de Pago (e.g., PUE, PPD)
  numCtaPago?: string; // Número de cuenta para pago
  formaPago: string; // Forma de Pago (e.g., 01: Efectivo, 03: Transferencia)
  moneda?: string; // Moneda (MXN por defecto)
  tipoCambio?: string; // Tipo de cambio (1.00 por defecto para MXN)
  subTotal: number; // Subtotal (sin impuestos)
  impuestosTrasladados?: number; // Total impuestos trasladados
  impuestoTrasladado?: number; // IVA (16%)
  iepsTrasladado?: number; // IEPS trasladado
  impuestoRetenido?: number; // Impuestos retenidos
  ivaRetenido?: number; // IVA retenido
  isrRetenido?: number; // ISR retenido
  descuento?: number; // Descuento
  total: number; // Total (con impuestos)
  estaCancelado: boolean; // Indica si la factura está cancelada
  fechaCancelación?: string;
  Gravado?: number; // Mes de deducción (mes en que se realizó el pago)
  Tasa0?: number; // Mes de deducción (mes en que se realizó el pago)
  Exento?: number; // Mes de deducción (mes en que se realizó el pago)
  mesDeduccion?: number; // Mes de deducción (mes en que se realizó el pago)
  esDeducible?: boolean; // Tambien aplica para es gravable en el caso de CFDIs emitidos
  tipoDeducibilidad?: string; // Tipo de deducibilidad (added as optional)
  gravadoISR?: number; // Add this field to replace montoDeducible
  locked?: boolean; // Indica si la factura está bloqueada para edición
  notasDeducibilidad?: string;
  
  // New fields to track payment status
  pagado?: boolean; // If the invoice has been paid (especially for PPD method)
  pagadoConComplementos?: string[]; // UUIDs of payment complements that paid this invoice
  
  docsRelacionadoComplementoPago: string[]; // UUIDs de documentos relacionados en complemento de pago
  ejercicioFiscal: number; // Año fiscal (derivado de la fecha)
  noCertificado?: string; // Número de certificado

  // Add a new field for the "Gravado IVA" column
  gravadoIVA?: number;
}

