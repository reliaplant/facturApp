// Modelo para pagos de usuarios/clientes

export interface Payment {
  id?: string;
  
  // Usuario al que pertenece el pago
  userId: string;
  userName?: string;
  userEmail?: string;
  
  // Información del pago
  monto: number;        // Monto sin IVA
  iva: number;          // Monto del IVA
  total: number;        // Monto total (monto + iva)
  
  // Fecha
  fechaPago: string;    // Fecha del pago (ISO string)
  mes: number;          // Mes (1-12)
  año: number;          // Año
  
  // Metadata
  concepto?: string;    // Descripción opcional
  metodoPago?: string;  // Transferencia, Efectivo, Tarjeta, etc.
  referencia?: string;  // Número de referencia o comprobante
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;   // ID del usuario que registró el pago
}

// Helper para calcular IVA
export const IVA_RATE = 0.16;

export function calcularIVA(montoSinIva: number): number {
  return Math.round(montoSinIva * IVA_RATE * 100) / 100;
}

export function calcularTotal(montoSinIva: number, iva: number): number {
  return Math.round((montoSinIva + iva) * 100) / 100;
}

// Métodos de pago comunes
export const METODOS_PAGO = [
  'Transferencia',
  'Efectivo',
  'Tarjeta de Crédito',
  'Tarjeta de Débito',
  'Cheque',
  'Otro'
];
