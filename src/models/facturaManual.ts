export interface FacturaExtranjera {
  id: string;
  fecha: string; // Fecha de creación en el sistema
  emisor: string;
  categoria: string;
  pais: string;
  moneda: string;
  tipoCambio: number;
  monto: number;
  iva: number;
  totalMXN: number; // Total en pesos mexicanos
  locked?: boolean;
  ejercicioFiscal: number; // Año fiscal (derivado de la fecha)
  esDeducible?: boolean; // Si es deducible o no (default true)
}
