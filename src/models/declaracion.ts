export interface Declaracion {
  id?: string;
  mes: string;
  anio: number;
  tipoDeclaracion?: string; // 'ordinaria' or 'complementaria'
  clientePagoImpuestos: boolean;
  clientePagoServicio: boolean;
  fechaPresentacion: Date | null;
  fechaLimitePago: Date | null;
  montoISR: number;
  montoIVA: number;
  archivoLineaCaptura?: string;
  urlArchivoLineaCaptura?: string;
}
