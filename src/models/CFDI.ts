/**
 * Concepto/Item de un CFDI
 */
export interface CFDIConcepto {
  /** Clave del producto/servicio del SAT */
  claveProdServ: string;
  /** Número de identificación interno (opcional) */
  noIdentificacion?: string;
  /** Cantidad */
  cantidad: number;
  /** Clave de unidad del SAT */
  claveUnidad: string;
  /** Descripción de la unidad (Pieza, Servicio, etc.) */
  unidad?: string;
  /** Descripción del concepto */
  descripcion: string;
  /** Valor unitario */
  valorUnitario: number;
  /** Importe (cantidad * valorUnitario) */
  importe: number;
  /** Descuento aplicado */
  descuento?: number;
  /** Objeto de impuesto: 01=No objeto, 02=Sí objeto, 03=Sí objeto no obligado */
  objetoImp?: string;
  /** Impuestos del concepto */
  impuestos?: {
    traslados?: ConceptoImpuesto[];
    retenciones?: ConceptoImpuesto[];
  };
  /** Cuenta contable asignada (para pólizas) */
  cuentaContable?: string;
}

/**
 * Impuesto de un concepto
 */
export interface ConceptoImpuesto {
  /** Base del impuesto */
  base: number;
  /** Código del impuesto: 001=ISR, 002=IVA, 003=IEPS */
  impuesto: string;
  /** Tipo de factor: Tasa, Cuota, Exento */
  tipoFactor: string;
  /** Tasa o cuota (0.16 para 16% IVA, 0.08 para 8%, etc.) */
  tasaOCuota?: number;
  /** Importe del impuesto */
  importe?: number;
}

/**
 * CFDI Relacionado (para notas de crédito, sustituciones, etc.)
 */
export interface CfdiRelacionado {
  /** UUID del CFDI relacionado */
  uuid: string;
  /** Tipo de relación: 01=Nota crédito, 02=Nota débito, 03=Devolución, 04=Sustitución, etc. */
  tipoRelacion: string;
}

/**
 * Información de pago en complemento de pago
 */
export interface PagoComplemento {
  /** Fecha del pago */
  fechaPago: string;
  /** Forma de pago (01=Efectivo, 03=Transferencia, etc.) */
  formaPago: string;
  /** Moneda del pago */
  moneda: string;
  /** Tipo de cambio */
  tipoCambio?: number;
  /** Monto total del pago */
  monto: number;
  /** Número de operación/referencia bancaria */
  numOperacion?: string;
  /** RFC del banco emisor */
  rfcEmisorCtaOrd?: string;
  /** Cuenta ordenante */
  ctaOrdenante?: string;
  /** RFC del banco beneficiario */
  rfcEmisorCtaBen?: string;
  /** Cuenta beneficiaria */
  ctaBeneficiario?: string;
  /** Documentos que paga este pago */
  doctoRelacionados: DoctoRelacionadoPago[];
}

/**
 * Documento relacionado en un pago
 */
export interface DoctoRelacionadoPago {
  /** UUID del documento */
  idDocumento: string;
  /** Serie del documento */
  serie?: string;
  /** Folio del documento */
  folio?: string;
  /** Moneda del documento */
  monedaDR: string;
  /** Equivalencia de tipo de cambio */
  equivalenciaDR?: number;
  /** Número de parcialidad */
  numParcialidad?: number;
  /** Saldo anterior */
  impSaldoAnt?: number;
  /** Importe pagado */
  impPagado?: number;
  /** Saldo insoluto después del pago */
  impSaldoInsoluto?: number;
  /** Objeto de impuesto del documento */
  objetoImpDR?: string;
}

/**
 * Resumen de impuestos para cálculos contables
 */
export interface ResumenImpuestos {
  // IVA Trasladado desglosado por tasa
  iva16?: number;        // Base gravada al 16%
  iva8?: number;         // Base gravada al 8% (frontera)
  ivaTasa0?: number;     // Base gravada al 0%
  ivaExento?: number;    // Base exenta
  
  // Importes de IVA
  importeIva16?: number;
  importeIva8?: number;
  
  // IEPS desglosado
  iepsImporte?: number;
  iepsTasa?: number;
  
  // Retenciones
  ivaRetenido?: number;
  isrRetenido?: number;
  
  // Para validación
  totalImpuestosTrasladados?: number;
  totalImpuestosRetenidos?: number;
}

/**
 * Modelo que representa un Comprobante Fiscal Digital por Internet (CFDI)
 */
export interface CFDI {
  // ============================================
  // IDENTIFICADORES
  // ============================================
  id: string;
  idCliente: string;
  uuid: string; // Folio fiscal (Primary Key)
  noCertificado?: string;
  serie?: string;
  folio?: string;
  version?: string; // Versión del CFDI (3.3, 4.0)
  
  // ============================================
  // FECHAS
  // ============================================
  fecha: string; // Fecha de emisión YYYY-MM-DD
  fechaCreacion: string; // Fecha de carga al sistema
  fechaActualizacion: string; // Fecha de última modificación
  ejercicioFiscal: number; // Año fiscal
  mesFiscal?: number; // Mes fiscal (1-12) derivado de fecha o pago
  
  // ============================================
  // TIPO Y DIRECCIÓN
  // ============================================
  tipoDeComprobante?: string; // I=Ingreso, E=Egreso, P=Pago, N=Nómina, T=Traslado
  esIngreso: boolean; // true=Factura emitida (ingreso), false=Factura recibida (gasto)
  esEgreso: boolean;  // true=Factura recibida (gasto), false=Factura emitida (ingreso)
  /** @deprecated Usar esIngreso/esEgreso en su lugar */
  recibida?: boolean; // Mantener por compatibilidad: true=Gasto, false=Ingreso
  exportacion?: string; // 01=No aplica, 02=Definitiva, 03=Temporal
  
  // ============================================
  // EMISOR
  // ============================================
  rfcEmisor: string;
  nombreEmisor: string;
  regimenFiscal: string; // Régimen fiscal del emisor
  lugarExpedicion?: string; // CP del emisor
  
  // ============================================
  // RECEPTOR
  // ============================================
  rfcReceptor: string;
  nombreReceptor: string;
  regimenFiscalReceptor?: string;
  domicilioFiscalReceptor?: string; // CP del receptor
  usoCFDI: string; // G01, G02, G03, etc.
  
  // ============================================
  // MÉTODO Y FORMA DE PAGO
  // ============================================
  metodoPago: string; // PUE o PPD
  formaPago: string; // 01=Efectivo, 03=Transferencia, etc.
  numCtaPago?: string;
  condicionesDePago?: string;
  
  // ============================================
  // MONEDA Y TIPO DE CAMBIO
  // ============================================
  moneda?: string; // MXN, USD, etc.
  tipoCambio?: number; // 1.00 para MXN (cambiado a number)
  /** Total convertido a MXN (para facturas en moneda extranjera) */
  totalMXN?: number;
  
  // ============================================
  // MONTOS PRINCIPALES
  // ============================================
  subTotal: number;
  descuento?: number;
  total: number;
  
  // ============================================
  // IMPUESTOS TRASLADADOS (TOTALES)
  // ============================================
  impuestosTrasladados?: number; // Total impuestos trasladados
  impuestoTrasladado?: number; // IVA total trasladado
  iepsTrasladado?: number; // IEPS total trasladado
  
  // ============================================
  // BASES GRAVADAS POR TASA DE IVA
  // ============================================
  /** Base gravada a IVA 16% */
  baseIva16?: number;
  /** Base gravada a IVA 8% (zona fronteriza) */
  baseIva8?: number;
  /** Base gravada a IVA 0% */
  ivaTasa0?: number;
  /** Base exenta de IVA */
  exento?: number;
  
  // ============================================
  // IMPUESTOS RETENIDOS
  // ============================================
  impuestoRetenido?: number; // Total retenido
  ivaRetenido?: number;
  isrRetenido?: number;
  
  // ============================================
  // RESUMEN DE IMPUESTOS (PARA CÁLCULOS)
  // ============================================
  /** Resumen detallado de impuestos para cálculos contables */
  resumenImpuestos?: ResumenImpuestos;
  
  // ============================================
  // CONCEPTOS/ITEMS (DESGLOSE)
  // ============================================
  conceptos?: CFDIConcepto[];
  /** Concepto resumido (primer item o descripción general) */
  concepto?: string;
  
  // ============================================
  // CFDIS RELACIONADOS
  // ============================================
  /** CFDIs relacionados (notas de crédito, sustituciones, etc.) */
  cfdiRelacionados?: CfdiRelacionado[];
  
  // ============================================
  // DATOS FISCALES (EDITABLES POR CONTADOR)
  // ============================================
  esDeducible?: boolean; // Si es deducible/gravable
  mesDeduccion?: number; // Mes de deducción (1-12, 13=anual)
  gravadoISR?: number; // Monto gravado ISR (base para deducción)
  gravadoIVA?: number; // Monto gravado IVA (base para acreditamiento)
  gravadoModificado?: boolean; // Si fue editado manualmente
  anual?: boolean; // Si es deducción anual
  notasDeducibilidad?: string;
  categoria?: string;
  locked?: boolean; // Bloqueada para edición
  
  // ============================================
  // ESTADO DE PAGO (PARA PPD)
  // ============================================
  pagado?: boolean;
  pagadoConComplementos?: string[]; // UUIDs de complementos que pagan esta factura
  fechaPagoComplemento?: number;
  /** Porcentaje pagado (0-100) para PPD con parcialidades */
  porcentajePagado?: number;
  /** Saldo pendiente de pago */
  saldoPendiente?: number;
  
  // ============================================
  // COMPLEMENTO DE PAGO (CUANDO ES TIPO P)
  // ============================================
  /** UUIDs de documentos que paga este complemento */
  docsRelacionadoComplementoPago: string[];
  /** Detalle de los pagos en el complemento */
  pagos?: PagoComplemento[];
  
  // ============================================
  // ESTADO DE CANCELACIÓN
  // ============================================
  estaCancelado: boolean;
  fechaCancelación?: string;
  motivoCancelacion?: string;
  folioSustitucion?: string; // UUID de la factura que sustituye a esta
  
  // ============================================
  // CONTABILIDAD
  // ============================================
  /** ID de la póliza contable asociada */
  polizaId?: string;
  /** Cuenta contable principal */
  cuentaContable?: string;
  /** Si ya fue contabilizada */
  contabilizada?: boolean;
  /** Fecha de contabilización */
  fechaContabilizacion?: string;
  
  // ============================================
  // VALIDACIONES SAT
  // ============================================
  /** Estado ante el SAT (Vigente, Cancelado, No encontrado) */
  estadoSAT?: 'Vigente' | 'Cancelado' | 'No encontrado' | 'No verificado';
  /** Fecha de última verificación ante el SAT */
  fechaVerificacionSAT?: string;
  /** Si el emisor está en lista negra (69B) */
  emisorEnListaNegra?: boolean;
  
  // ============================================
  // XML ORIGINAL
  // ============================================
  contenidoXml?: string;
}

/**
 * Tipos de relación entre CFDIs según el SAT
 */
export const TiposRelacionCFDI = {
  '01': 'Nota de crédito de los documentos relacionados',
  '02': 'Nota de débito de los documentos relacionados',
  '03': 'Devolución de mercancía sobre facturas o traslados previos',
  '04': 'Sustitución de los CFDI previos',
  '05': 'Traslados de mercancías facturados previamente',
  '06': 'Factura generada por los traslados previos',
  '07': 'CFDI por aplicación de anticipo',
  '08': 'Factura generada por pagos en parcialidades',
  '09': 'Factura generada por pagos diferidos',
} as const;

/**
 * Tipos de comprobante CFDI
 */
export const TiposComprobante = {
  'I': 'Ingreso',
  'E': 'Egreso',
  'P': 'Pago',
  'N': 'Nómina',
  'T': 'Traslado',
} as const;

/**
 * Catálogo de uso de CFDI
 */
export const UsosCFDI = {
  'G01': 'Adquisición de mercancías',
  'G02': 'Devoluciones, descuentos o bonificaciones',
  'G03': 'Gastos en general',
  'I01': 'Construcciones',
  'I02': 'Mobiliario y equipo de oficina',
  'I03': 'Equipo de transporte',
  'I04': 'Equipo de cómputo y accesorios',
  'I05': 'Dados, troqueles, moldes, matrices y herramental',
  'I06': 'Comunicaciones telefónicas',
  'I07': 'Comunicaciones satelitales',
  'I08': 'Otra maquinaria y equipo',
  'D01': 'Honorarios médicos, dentales y hospitalarios',
  'D02': 'Gastos médicos por incapacidad o discapacidad',
  'D03': 'Gastos funerales',
  'D04': 'Donativos',
  'D05': 'Intereses reales por créditos hipotecarios',
  'D06': 'Aportaciones voluntarias al SAR',
  'D07': 'Primas por seguros de gastos médicos',
  'D08': 'Gastos de transportación escolar obligatoria',
  'D09': 'Depósitos en cuentas de ahorro, primas de pensiones',
  'D10': 'Pagos por servicios educativos (colegiaturas)',
  'S01': 'Sin efectos fiscales',
  'CP01': 'Pagos',
  'CN01': 'Nómina',
} as const;

/**
 * Formas de pago
 */
export const FormasPago = {
  '01': 'Efectivo',
  '02': 'Cheque nominativo',
  '03': 'Transferencia electrónica de fondos',
  '04': 'Tarjeta de crédito',
  '05': 'Monedero electrónico',
  '06': 'Dinero electrónico',
  '08': 'Vales de despensa',
  '12': 'Dación en pago',
  '13': 'Pago por subrogación',
  '14': 'Pago por consignación',
  '15': 'Condonación',
  '17': 'Compensación',
  '23': 'Novación',
  '24': 'Confusión',
  '25': 'Remisión de deuda',
  '26': 'Prescripción o caducidad',
  '27': 'A satisfacción del acreedor',
  '28': 'Tarjeta de débito',
  '29': 'Tarjeta de servicios',
  '30': 'Aplicación de anticipos',
  '31': 'Intermediario pagos',
  '99': 'Por definir',
} as const;

/**
 * Regímenes fiscales
 */
export const RegimenesFiscales = {
  '601': 'General de Ley Personas Morales',
  '603': 'Personas Morales con Fines no Lucrativos',
  '605': 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606': 'Arrendamiento',
  '607': 'Régimen de Enajenación o Adquisición de Bienes',
  '608': 'Demás ingresos',
  '610': 'Residentes en el Extranjero sin Establecimiento Permanente en México',
  '611': 'Ingresos por Dividendos (socios y accionistas)',
  '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
  '614': 'Ingresos por intereses',
  '615': 'Régimen de los ingresos por obtención de premios',
  '616': 'Sin obligaciones fiscales',
  '620': 'Sociedades Cooperativas de Producción',
  '621': 'Incorporación Fiscal',
  '622': 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623': 'Opcional para Grupos de Sociedades',
  '624': 'Coordinados',
  '625': 'Régimen Simplificado de Confianza',
  '626': 'Régimen Simplificado de Confianza - Personas Morales',
} as const;

/**
 * Objeto de impuesto (CFDI 4.0)
 */
export const ObjetosImpuesto = {
  '01': 'No objeto de impuesto',
  '02': 'Sí objeto de impuesto',
  '03': 'Sí objeto de impuesto y no obligado al desglose',
  '04': 'Sí objeto de impuesto y no causa impuesto',
} as const;

/**
 * Métodos de pago
 */
export const MetodosPago = {
  'PUE': 'Pago en una sola exhibición',
  'PPD': 'Pago en parcialidades o diferido',
} as const;

/**
 * Tipos de impuesto SAT
 */
export const TiposImpuesto = {
  '001': 'ISR',
  '002': 'IVA', 
  '003': 'IEPS',
} as const;

/**
 * Exportación
 */
export const TiposExportacion = {
  '01': 'No aplica',
  '02': 'Definitiva',
  '03': 'Temporal',
  '04': 'Definitiva con clave distinta a A1',
} as const;
