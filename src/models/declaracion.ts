export interface Declaracion {
  id?: string;
  mes: string;
  anio: number;
  tipoDeclaracion?: string; // 'ordinaria' or 'complementaria'
  estatus: string; // 'cancelada', 'vigente'
  clientePagoImpuestos: boolean;
  clientePagoServicio: boolean;
  fechaPresentacion: Date | null;
  fechaLimitePago: Date | null;
  montoISR: number;
  montoIVA: number;
  
  // Línea de captura file
  archivoLineaCaptura?: string;
  urlArchivoLineaCaptura?: string;
  
  // Declaration file
  archivoDeclaracion?: string;
  urlArchivoDeclaracion?: string;

  // Ingresos
  ingresosMes: number;
  ingresosAcumulados: number;

  // Deducciones
  deduccionesMes: number;
  depreciacionMensual: number;
  totalDeduccionesPeriodo: number;
  deduccionesAcumuladas: number;

  // Utilidad
  utilidadMes: number;
  utilidadAcumulada: number;

  // IVA
  ivaCobrado: number;
  ivaPagado: number;
  ivaRetenido: number;
  ivaPorPagar: number;
  ivaAFavor: number;

  // ISR
  baseImpuesto: number;
  limiteInferior: number;
  excedenteLimiteInferior: number;
  porcentajeExcedente: number;
  impuestoMarginal: number;
  cuotaFija: number;
  impuestosArt113: number;
  pagosProvisionalesAnteriores: number;
  retencionesPeriodo: number;
  retencionesAcumuladas: number;
  isrACargo: number;
  impuestoPorPagar: number;
}
