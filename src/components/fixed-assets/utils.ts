import { MonthlyDepreciation } from "@/models/MonthlyDepreciation";
import { FixedAsset } from "@/models/FixedAsset";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Formats a date string to a localized display format
 */
export function formatDate(dateString: string): string {
  try {
    if (!dateString) return "-";
    const date = parseISO(dateString);
    return format(date, "dd MMM yyyy", { locale: es });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString || "-";
  }
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount);
}

// Catálogo de categorías fiscales con sus tasas de depreciación anual por defecto
export const FISCAL_CATEGORIES = [
  { id: 'terrenos', name: 'Terrenos', defaultRate: 0, description: 'No se deprecian (vida útil indefinida)' },
  { id: 'edificios', name: 'Edificios y construcciones', defaultRate: 5, description: 'Locales comerciales, bodegas, fábricas, oficinas, etc.' },
  { id: 'maquinaria', name: 'Maquinaria y equipo de producción', defaultRate: 10, description: 'Maquinaria para procesos productivos o servicios' },
  { id: 'mobiliario', name: 'Mobiliario y equipo de oficina', defaultRate: 10, description: 'Muebles, escritorios, sillas, archiveros, etc.' },
  { id: 'computo', name: 'Equipo de cómputo y accesorios', defaultRate: 30, description: 'Computadoras, servidores, impresoras, etc.' },
  { id: 'transporte', name: 'Equipo de transporte', defaultRate: 25, description: 'Vehículos, camiones, motocicletas, etc.' },
  { id: 'accesorios_vehiculos', name: 'Accesorios de vehículos', defaultRate: 25, description: 'Accesorios para vehículos como remolques, equipamiento especializado, etc.' },
  { id: 'herramientas', name: 'Herramientas', defaultRate: 15, description: 'Herramientas manuales o especiales para la actividad' },
  { id: 'comunicacion', name: 'Equipo de comunicación y telefonía', defaultRate: 15, description: 'Equipos de telefonía, conmutadores, radios, etc.' },
  { id: 'instalaciones', name: 'Mejoras en bienes arrendados', defaultRate: 15, description: 'Inversiones en mejoras a inmuebles rentados' },
  { id: 'software', name: 'Software y licencias', defaultRate: 30, description: 'Programas y licencias informáticas' },
  { id: 'otro', name: 'Otro', defaultRate: 10, description: 'Otra categoría no especificada' }
];

// Función para convertir tasa anual a vida útil en meses
export const annualRateToMonths = (annualRate: number): number => {
  if (annualRate <= 0) return 0; // Para terrenos u otros activos sin depreciación
  return Math.round((100 / annualRate) * 12); // Años a meses
};

// Funciones de cálculo de depreciación
export const calculateStraightLineDepreciation = (
  cost: number,
  residualValue: number, 
  usefulLifeMonths: number
): number => {
  return (cost - residualValue) / usefulLifeMonths;
};

export const calculateDoubleDeclineDepreciation = (
  cost: number,
  residualValue: number,
  usefulLifeMonths: number,
  currentMonth: number,
  currentValue: number
): number => {
  // Tasa de depreciación anual doble
  const annualRate = 2 / (usefulLifeMonths / 12);
  // Tasa mensual
  const monthlyRate = annualRate / 12;
  // Depreciación para este mes
  return Math.min(currentValue - residualValue, currentValue * monthlyRate);
};

export const calculateSumOfYearsDepreciation = (
  cost: number,
  residualValue: number,
  usefulLifeMonths: number,
  currentMonth: number
): number => {
  const usefulLifeYears = usefulLifeMonths / 12;
  const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
  
  // Determinar en qué año estamos
  const currentYear = Math.ceil(currentMonth / 12);
  const yearsRemaining = usefulLifeYears - currentYear + 1;
  
  // Calcular la depreciación anual
  const annualDepreciation = ((cost - residualValue) * yearsRemaining) / sumOfYears;
  
  // Convertir a depreciación mensual
  return annualDepreciation / 12;
};

// Función auxiliar para calcular el total de depreciación
export const calculateTotalDepreciation = (depreciations: MonthlyDepreciation[]): number => {
  return depreciations.reduce((sum, dep) => sum + dep.deprecationAmount, 0);
};

// Función para calcular la depreciación anual según el método
export const calculateAnnualDepreciation = (
  asset: FixedAsset,
  year: number
): number => {
  // Fecha de adquisición del activo
  const purchaseDate = new Date(asset.purchaseDate);
  const purchaseYear = purchaseDate.getFullYear();
  
  // Si el año solicitado es anterior a la adquisición, no hay depreciación
  if (year < purchaseYear) return 0;
  
  // Calcular la antigüedad del activo en el año solicitado
  const yearsSinceAcquisition = year - purchaseYear;
  const usefulLifeYears = asset.usefulLifeMonths / 12;
  
  // Si el año solicitado es posterior a la vida útil, no hay depreciación
  if (yearsSinceAcquisition >= usefulLifeYears) return 0;
  
  // Calcular la depreciación anual según el método
  switch (asset.depreciationMethod) {
    case 'straightLine':
      return (asset.cost - asset.residualValue) / usefulLifeYears;
    
    
    default:
      return (asset.cost - asset.residualValue) / usefulLifeYears;
  }
};

// Función para calcular la vida útil restante en meses
export const calculateRemainingLife = (asset: FixedAsset, currentDate = new Date()): number => {
  const purchaseDate = new Date(asset.purchaseDate);
  const monthsSinceAcquisition = 
    (currentDate.getFullYear() - purchaseDate.getFullYear()) * 12 + 
    (currentDate.getMonth() - purchaseDate.getMonth());
  
  return Math.max(0, asset.usefulLifeMonths - monthsSinceAcquisition);
};

// Función para determinar si un activo está totalmente depreciado
export const isFullyDepreciated = (asset: FixedAsset, currentDate = new Date()): boolean => {
  // Un activo está totalmente depreciado cuando su valor actual es igual al valor residual
  return calculateRemainingLife(asset, currentDate) <= 0;
};

// Función para determinar el estado correcto de un activo
export const determineAssetStatus = (asset: FixedAsset, currentDate = new Date()): FixedAsset['status'] => {
  if (asset.status === 'sold' || asset.status === 'disposed') {
    return asset.status; // Mantener estos estados si ya están establecidos
  }
  
  if (isFullyDepreciated(asset, currentDate)) {
    return 'fullyDepreciated';
  }
  
  return 'active';
};