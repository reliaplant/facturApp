/**
 * Modelo para Saldos a Favor (IVA o ISR)
 * Permite registrar saldos que el cliente puede acreditar en declaraciones futuras
 */

export type TipoSaldoFavor = 'IVA' | 'ISR';

export interface SaldoFavor {
  id: string;
  clientId: string;
  tipo: TipoSaldoFavor;
  monto: number;
  montoOriginal: number; // Monto original antes de aplicar
  montoAplicado: number; // Cuánto se ha aplicado ya
  ejercicio: number; // Año fiscal (deprecated, usar ejercicioOrigen)
  mesOrigen: number; // Mes donde se generó el saldo (1-12)
  ejercicioOrigen: number; // Año donde se generó el saldo
  mesAplicacion: number; // A partir de qué mes puede aplicarse (1-12)
  ejercicioAplicacion: number; // Año a partir del cual aplica
  descripcion?: string;
  activo: boolean; // Si aún tiene saldo disponible
  createdAt: string;
  updatedAt: string;
}

export interface SaldoFavorInput {
  tipo: TipoSaldoFavor;
  monto: number;
  ejercicio: number;
  mesOrigen: number;
  ejercicioOrigen: number;
  mesAplicacion: number;
  ejercicioAplicacion: number;
  descripcion?: string;
}
