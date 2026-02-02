export interface Declaracion {
  id?: string;
  mes: string;
  anio: number;
  tipoDeclaracion?: 'ordinaria' | 'complementaria';
  estatus?: 'vigente' | 'sustituida' | 'cancelada';
  
  // Payment status
  clientePagoImpuestos: boolean;
  clientePagoServicio: boolean;
  
  // Dates
  fechaPresentacion: Date | null;
  fechaLimitePago: Date | null;
  
  // Files
  archivoDeclaracion?: string | null;
  urlArchivoDeclaracion?: string | null;
  archivoLineaCaptura?: string | null;
  urlArchivoLineaCaptura?: string | null;
  
  // Amounts
  montoISR: number;
  montoIVA: number;
  
  // Fiscal data from fiscal-summary.tsx
  ingresosMes?: number;
  ingresosAcumulados?: number;
  deduccionesMes?: number;
  depreciacionMensual?: number;
  totalDeduccionesPeriodo?: number;
  deduccionesAcumuladas?: number;
  utilidadMes?: number;
  utilidadAcumulada?: number;
  ivaCobrado?: number;
  ivaPagado?: number;
  ivaRetenido?: number;
  ivaPorPagar?: number;
  ivaAFavor?: number;
  baseImpuesto?: number;
  limiteInferior?: number;
  excedenteLimiteInferior?: number;
  porcentajeExcedente?: number;
  impuestoMarginal?: number;
  cuotaFija?: number;
  impuestosArt113?: number;
  pagosProvisionalesAnteriores?: number;
  retencionesPeriodo?: number;
  retencionesAcumuladas?: number;
  isrACargo?: number;
  impuestoPorPagar?: number;
}
