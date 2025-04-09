/**
 * Modelo que representa una declaración fiscal
 */
export interface TaxDeclaration {
  id: string;                 // Identificador único en el sistema
  clientId: string;           // ID del cliente al que pertenece
  
  // Información básica
  year: number;               // Año fiscal
  month: number;              // Mes (1-12), para declaraciones mensuales, trimestral o anual (0 para anual)
  period: 'monthly' | 'bimonthly' | 'quarterly' | 'annual'; // Periodo de la declaración
  type: 'iva' | 'isr' | 'ieps' | 'provisional' | 'annual'; // Tipo de declaración
  dueDate: string;            // Fecha límite de presentación YYYY-MM-DD
  
  // Estado de la declaración
  status: 'pending' | 'filed' | 'paid' | 'late' | 'exempt'; // Estado de la declaración
  filingDate?: string;        // Fecha de presentación YYYY-MM-DD
  paymentDate?: string;       // Fecha de pago YYYY-MM-DD
  
  // Importes
  incomeAmount: number;       // Ingresos del periodo
  expenseAmount: number;      // Gastos del periodo
  ivaCollected: number;       // IVA trasladado
  ivaWithheld: number;        // IVA retenido
  ivaPaid: number;            // IVA pagado (gastos)
  ivaBalance: number;         // Saldo de IVA (a favor o a pagar)
  isrWithheld: number;        // ISR retenido
  isrPaid: number;            // ISR pagado
  
  // Saldos y pagos
  balanceToPay: number;       // Saldo a pagar
  favorBalance?: number;      // Saldo a favor
  paymentAmount?: number;     // Monto pagado
  
  // Documentación
  hasReceiptFile: boolean;    // Indica si tiene archivo de acuse
  receiptFileUrl?: string;    // URL al archivo de acuse
  hasPaymentProof: boolean;   // Indica si tiene comprobante de pago
  paymentProofUrl?: string;   // URL al comprobante de pago
  
  // Notas y observaciones
  notes?: string;             // Notas adicionales
  
  // Metadata del sistema
  createdAt: string;          // Fecha de creación en el sistema
  updatedAt: string;          // Fecha de última actualización
  createdBy?: string;         // Usuario que creó el registro
  updatedBy?: string;         // Usuario que actualizó por última vez
}

/**
 * Genera la fecha límite para una declaración fiscal
 */
export function calculateDueDate(year: number, month: number, type: TaxDeclaration['type']): string {
  // Para declaraciones anuales de personas físicas
  if (type === 'annual' && month === 0) {
    return `${year + 1}-04-30`; // 30 de abril del siguiente año para personas físicas
  }
  
  // Para declaraciones mensuales (la mayoría son el día 17 del mes siguiente)
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;
  
  return `${nextMonthYear}-${nextMonth.toString().padStart(2, '0')}-17`;
}

/**
 * Calcula el saldo de IVA (a favor o a pagar)
 */
export function calculateIvaBalance(ivaCollected: number, ivaPaid: number, ivaWithheld: number): number {
  // IVA trasladado - IVA acreditable - IVA retenido
  // Si es positivo, es a pagar; si es negativo, es a favor
  return ivaCollected - ivaPaid - ivaWithheld;
}

/**
 * Calcula si una declaración está retrasada
 */
export function isDeclarationLate(dueDate: string, filingDate?: string, status?: string): boolean {
  if (status === 'exempt' || status === 'filed' || status === 'paid') {
    return false;
  }
  
  const today = new Date();
  const dueDateObj = new Date(dueDate);
  
  // Si tiene fecha de presentación, usar esa para comparar
  if (filingDate) {
    const filingDateObj = new Date(filingDate);
    return filingDateObj > dueDateObj;
  }
  
  // Si no tiene fecha de presentación y ya pasó la fecha límite
  return today > dueDateObj;
}

/**
 * Obtiene el nombre del mes en español
 */
export function getMonthName(month: number): string {
  const monthNames = [
    'Anual', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  return monthNames[month];
}

/**
 * Obtiene el nombre del periodo para mostrar
 */
export function getPeriodName(period: TaxDeclaration['period'], month: number): string {
  if (period === 'annual') {
    return 'Anual';
  }
  
  if (period === 'monthly') {
    return getMonthName(month);
  }
  
  if (period === 'bimonthly') {
    const startMonth = month - 1 + (month % 2 === 0 ? -1 : 0);
    return `${getMonthName(startMonth)}-${getMonthName(startMonth + 1)}`;
  }
  
  if (period === 'quarterly') {
    const startMonth = month - ((month - 1) % 3);
    return `${getMonthName(startMonth)}-${getMonthName(startMonth + 2)}`;
  }
  
  return '';
}