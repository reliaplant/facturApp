import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parsea una fecha string evitando el desfase de zona horaria.
 * Cuando la fecha es solo "YYYY-MM-DD" sin hora, JavaScript la interpreta como UTC medianoche,
 * lo cual puede mostrar el día anterior en zonas horarias como México (-6).
 * Esta función agrega "T12:00:00" para evitar ese problema.
 */
export function parseLocalDate(dateString: string | undefined | null): Date {
  if (!dateString) return new Date();
  
  // Si ya tiene hora (contiene 'T' y más de 10 caracteres), parsear normalmente
  if (dateString.includes('T') && dateString.length > 10) {
    return new Date(dateString);
  }
  
  // Si es solo fecha (YYYY-MM-DD), agregar mediodía para evitar desfase
  return new Date(`${dateString}T12:00:00`);
}

export function formatCurrency(amount: number | undefined | null): string {
  // Handle undefined or null values by defaulting to 0
  const safeAmount = amount ?? 0;
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(safeAmount);
}
