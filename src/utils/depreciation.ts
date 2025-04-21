import { FixedAsset } from "@/models/FixedAsset";

/**
 * Calcula la depreciación mensual para un activo fijo
 * 
 * @param asset Activo fijo para calcular depreciación
 * @returns Monto de depreciación mensual con redondeo a 2 decimales
 */
export function calculateMonthlyDepreciation(asset: FixedAsset): number {
    if (!asset) return 0;

    // Si tiene tasa de deducción anual definida, usarla
    if (asset.deductionRate) {
        const annualDepreciation = asset.cost * (asset.deductionRate / 100);
        // Convertir a depreciación mensual y redondear correctamente
        return Number((annualDepreciation / 12).toFixed(2));
    }

    // De lo contrario, usar cálculo estándar basado en la vida útil
    const depreciableAmount = asset.cost - asset.residualValue;
    return Number((depreciableAmount / asset.usefulLifeMonths).toFixed(2));
}

/**
 * Genera un historial completo de depreciación para un activo
 * 
 * @param asset Activo fijo para generar su historial de depreciación
 * @param limitMonths Opcional: Limitar la cantidad de meses (por defecto todos)
 * @returns Array de objetos con detalles de depreciación por mes
 */
export function generateDepreciationHistory(asset: FixedAsset, limitMonths?: number) {
    if (!asset) return [];

    const purchaseDate = new Date(asset.purchaseDate);
    const purchaseYear = purchaseDate.getFullYear();
    const purchaseMonth = purchaseDate.getMonth() + 1; // 1-based month

    // Usar la función centralizada para el cálculo
    const monthlyDepreciationAmount = calculateMonthlyDepreciation(asset);

    const history = [];
    let accumulatedDepreciation = 0;
    let currentValue = asset.cost;

    // Determinar cuántos meses calcular (todos o un límite)
    const monthsToCalculate = limitMonths
        ? Math.min(limitMonths, asset.usefulLifeMonths)
        : asset.usefulLifeMonths;

    for (let i = 0; i < monthsToCalculate; i++) {
        // Calcular año y mes actual
        const currentMonth = ((purchaseMonth - 1 + i) % 12) + 1; // 1-12
        const currentYear = purchaseYear + Math.floor((purchaseMonth - 1 + i) / 12);

        // Valor antes de la depreciación
        const assetValueBefore = currentValue;

        // Aplicar depreciación
        accumulatedDepreciation += monthlyDepreciationAmount;
        currentValue = asset.cost - accumulatedDepreciation;

        // No depreciar por debajo del valor residual
        if (currentValue < asset.residualValue) {
            const adjustment = currentValue - asset.residualValue;
            currentValue = asset.residualValue;
            accumulatedDepreciation -= adjustment;
        }

        history.push({
            month: currentMonth,
            year: currentYear,
            deprecationAmount: monthlyDepreciationAmount,
            accumulatedBefore: accumulatedDepreciation - monthlyDepreciationAmount,
            accumulatedAfter: accumulatedDepreciation,
            assetValueBefore,
            assetValueAfter: currentValue
        });

        // Si ya alcanzamos el valor residual, no seguir calculando
        if (currentValue <= asset.residualValue) {
            break;
        }
    }

    return history;
}

/**
 * Calcula la depreciación total acumulada hasta una fecha específica
 * 
 * @param asset Activo fijo
 * @param cutoffDate Fecha límite (default: fecha actual)
 * @returns Objeto con depreciación acumulada y valor actual
 */
export function calculateAccumulatedDepreciation(
    asset: FixedAsset,
    cutoffDate: Date = new Date()
): { accumulatedDepreciation: number, currentValue: number } {
    if (!asset || asset.status !== 'active') {
        return {
            accumulatedDepreciation: asset?.accumulatedDepreciation || 0,
            currentValue: asset?.currentValue || 0
        };
    }

    const purchaseDate = new Date(asset.purchaseDate);

    // Si la fecha de corte es anterior a la compra, no hay depreciación
    if (cutoffDate < purchaseDate) {
        return {
            accumulatedDepreciation: 0,
            currentValue: asset.cost
        };
    }

    // Calcular meses completos transcurridos
    const monthsDiff =
        (cutoffDate.getFullYear() - purchaseDate.getFullYear()) * 12 +
        (cutoffDate.getMonth() - purchaseDate.getMonth());

    // Limitar a los meses de vida útil
    const effectiveMonths = Math.min(monthsDiff, asset.usefulLifeMonths);

    if (effectiveMonths <= 0) {
        return {
            accumulatedDepreciation: 0,
            currentValue: asset.cost
        };
    }

    // Calcular depreciación usando la función centralizada
    const monthlyDepreciation = calculateMonthlyDepreciation(asset);
    const accumulatedDepreciation = monthlyDepreciation * effectiveMonths;
    console.log("Depreciación acumulada:", accumulatedDepreciation);
    console.log("Depreciación mes:", monthlyDepreciation);
    console.log("Meses efectivos:", effectiveMonths);


    // Asegurar que no exceda el límite (costo - valor residual)
    const maxDepreciation = asset.cost - asset.residualValue;
    const finalDepreciation = Math.min(accumulatedDepreciation, maxDepreciation);

    // Calcular el valor actual
    const currentValue = Math.max(asset.cost - finalDepreciation, asset.residualValue);

    return {
        accumulatedDepreciation: finalDepreciation,
        currentValue
    };
}
