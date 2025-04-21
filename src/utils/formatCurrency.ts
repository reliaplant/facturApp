/**
 * Formatea un número como moneda en formato Peso Mexicano
 * 
 * @param amount El número a formatear como moneda
 * @returns String formateado como moneda
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: 'MXN' 
  }).format(amount);
}
