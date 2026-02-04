/**
 * Interfaz para representar un tramo de tarifa del ISR
 */
export interface TaxBracket {
  lowerLimit: number;     // Límite inferior
  upperLimit: number;     // Límite superior
  fixedFee: number;       // Cuota fija
  percentage: number;     // Porcentaje a aplicar sobre excedente (in decimal, not percentage)
  month: number;          // Mes al que aplica (1-12)
}

/**
 * Interfaz para las tasas de RESICO (Régimen Simplificado de Confianza)
 * Art. 113-E LISR - Tasa sobre ingresos COBRADOS (sin deducciones)
 */
export interface ResicoTaxRate {
  lowerLimit: number;     // Límite inferior mensual
  upperLimit: number;     // Límite superior mensual
  rate: number;           // Tasa aplicable (en decimal, ej: 0.01 = 1%)
}

/**
 * Tipo de régimen fiscal para personas físicas
 */
export type RegimenFiscalPF = 'PFAE' | 'RESICO';

/**
 * Códigos de régimen fiscal del SAT
 */
export const REGIMEN_CODES = {
  PFAE: '612',   // Personas Físicas con Actividades Empresariales y Profesionales
  RESICO: '626', // Régimen Simplificado de Confianza
} as const;

/**
 * Servicio para obtener las tarifas de ISR por mes y año
 */
export class TaxBracketsService {
  
  /**
   * Devuelve todas las tarifas de ISR para los pagos provisionales mensuales del 2025 y 2026
   * Nota: Para 2026 se usan las mismas tarifas que 2025 ya que no hubo actualización por inflación
   */
  private static getTaxBracketsBase(): TaxBracket[] {
    return [
      // Enero (month 1)
      { lowerLimit: 0.01, upperLimit: 746.04, fixedFee: 0, percentage: 0.0192, month: 1 },
      { lowerLimit: 746.05, upperLimit: 6332.05, fixedFee: 14.32, percentage: 0.0640, month: 1 },
      { lowerLimit: 6332.06, upperLimit: 11128.01, fixedFee: 371.83, percentage: 0.1088, month: 1 },
      { lowerLimit: 11128.02, upperLimit: 12935.82, fixedFee: 893.63, percentage: 0.1600, month: 1 },
      { lowerLimit: 12935.83, upperLimit: 15487.71, fixedFee: 1182.88, percentage: 0.1792, month: 1 },
      { lowerLimit: 15487.72, upperLimit: 31236.49, fixedFee: 1640.18, percentage: 0.2136, month: 1 },
      { lowerLimit: 31236.50, upperLimit: 49233.00, fixedFee: 5004.12, percentage: 0.2352, month: 1 },
      { lowerLimit: 49233.01, upperLimit: 93993.90, fixedFee: 9236.89, percentage: 0.3000, month: 1 },
      { lowerLimit: 93993.91, upperLimit: 125325.20, fixedFee: 22665.17, percentage: 0.3200, month: 1 },
      { lowerLimit: 125325.21, upperLimit: 375975.61, fixedFee: 32691.18, percentage: 0.3400, month: 1 },
      { lowerLimit: 375975.62, upperLimit: 9999999.99, fixedFee: 117912.32, percentage: 0.3500, month: 1 },
      
      // Febrero (month 2)
      { lowerLimit: 0.01, upperLimit: 1492.08, fixedFee: 0, percentage: 0.0192, month: 2 },
      { lowerLimit: 1492.09, upperLimit: 12664.10, fixedFee: 28.64, percentage: 0.0640, month: 2 },
      { lowerLimit: 12664.11, upperLimit: 22256.02, fixedFee: 743.66, percentage: 0.1088, month: 2 },
      { lowerLimit: 22256.03, upperLimit: 25871.64, fixedFee: 1787.26, percentage: 0.1600, month: 2 },
      { lowerLimit: 25871.65, upperLimit: 30975.42, fixedFee: 2365.76, percentage: 0.1792, month: 2 },
      { lowerLimit: 30975.43, upperLimit: 62472.98, fixedFee: 3280.36, percentage: 0.2136, month: 2 },
      { lowerLimit: 62472.99, upperLimit: 98466.00, fixedFee: 10008.24, percentage: 0.2352, month: 2 },
      { lowerLimit: 98466.01, upperLimit: 187987.80, fixedFee: 18473.78, percentage: 0.3000, month: 2 },
      { lowerLimit: 187987.81, upperLimit: 250650.40, fixedFee: 45330.34, percentage: 0.3200, month: 2 },
      { lowerLimit: 250650.41, upperLimit: 751951.22, fixedFee: 65382.36, percentage: 0.3400, month: 2 },
      { lowerLimit: 751951.23, upperLimit: 9999999.99, fixedFee: 235824.64, percentage: 0.3500, month: 2 },
      
      // Marzo (month 3)
      { lowerLimit: 0.01, upperLimit: 2238.12, fixedFee: 0, percentage: 0.0192, month: 3 },
      { lowerLimit: 2238.13, upperLimit: 18996.15, fixedFee: 42.96, percentage: 0.0640, month: 3 },
      { lowerLimit: 18996.16, upperLimit: 33384.03, fixedFee: 1115.49, percentage: 0.1088, month: 3 },
      { lowerLimit: 33384.04, upperLimit: 38807.46, fixedFee: 2680.89, percentage: 0.1600, month: 3 },
      { lowerLimit: 38807.47, upperLimit: 46463.13, fixedFee: 3548.64, percentage: 0.1792, month: 3 },
      { lowerLimit: 46463.14, upperLimit: 93709.47, fixedFee: 4920.54, percentage: 0.2136, month: 3 },
      { lowerLimit: 93709.48, upperLimit: 147699.00, fixedFee: 15012.36, percentage: 0.2352, month: 3 },
      { lowerLimit: 147699.01, upperLimit: 281981.70, fixedFee: 27710.67, percentage: 0.3000, month: 3 },
      { lowerLimit: 281981.71, upperLimit: 375975.60, fixedFee: 67995.51, percentage: 0.3200, month: 3 },
      { lowerLimit: 375975.61, upperLimit: 1127926.83, fixedFee: 98073.54, percentage: 0.3400, month: 3 },
      { lowerLimit: 1127926.84, upperLimit: 9999999.99, fixedFee: 353736.96, percentage: 0.3500, month: 3 },
      
      // Continue with the remaining months (4-12)...
      // Abril (month 4)
      { lowerLimit: 0.01, upperLimit: 2984.16, fixedFee: 0, percentage: 0.0192, month: 4 },
      { lowerLimit: 2984.17, upperLimit: 25328.20, fixedFee: 57.28, percentage: 0.0640, month: 4 },
      { lowerLimit: 25328.21, upperLimit: 44512.04, fixedFee: 1487.32, percentage: 0.1088, month: 4 },
      { lowerLimit: 44512.05, upperLimit: 51743.28, fixedFee: 3574.52, percentage: 0.1600, month: 4 },
      { lowerLimit: 51743.29, upperLimit: 61950.84, fixedFee: 4731.52, percentage: 0.1792, month: 4 },
      { lowerLimit: 61950.85, upperLimit: 124945.96, fixedFee: 6560.72, percentage: 0.2136, month: 4 },
      { lowerLimit: 124945.97, upperLimit: 196932.00, fixedFee: 20016.48, percentage: 0.2352, month: 4 },
      { lowerLimit: 196932.01, upperLimit: 375975.60, fixedFee: 36947.56, percentage: 0.3000, month: 4 },
      { lowerLimit: 375975.61, upperLimit: 501300.80, fixedFee: 90660.68, percentage: 0.3200, month: 4 },
      { lowerLimit: 501300.81, upperLimit: 1503902.44, fixedFee: 130764.72, percentage: 0.3400, month: 4 },
      { lowerLimit: 1503902.45, upperLimit: 9999999.99, fixedFee: 471649.28, percentage: 0.3500, month: 4 },
      
      // Mayo (month 5)
      { lowerLimit: 0.01, upperLimit: 3730.20, fixedFee: 0, percentage: 0.0192, month: 5 },
      { lowerLimit: 3730.21, upperLimit: 31660.25, fixedFee: 71.60, percentage: 0.0640, month: 5 },
      { lowerLimit: 31660.26, upperLimit: 55640.05, fixedFee: 1859.15, percentage: 0.1088, month: 5 },
      { lowerLimit: 55640.06, upperLimit: 64679.10, fixedFee: 4468.15, percentage: 0.1600, month: 5 },
      { lowerLimit: 64679.11, upperLimit: 77438.55, fixedFee: 5914.40, percentage: 0.1792, month: 5 },
      { lowerLimit: 77438.56, upperLimit: 156182.45, fixedFee: 8200.90, percentage: 0.2136, month: 5 },
      { lowerLimit: 156182.46, upperLimit: 246165.00, fixedFee: 25020.60, percentage: 0.2352, month: 5 },
      { lowerLimit: 246165.01, upperLimit: 469969.50, fixedFee: 46184.45, percentage: 0.3000, month: 5 },
      { lowerLimit: 469969.51, upperLimit: 626626.00, fixedFee: 113325.85, percentage: 0.3200, month: 5 },
      { lowerLimit: 626626.01, upperLimit: 1879878.05, fixedFee: 163455.90, percentage: 0.3400, month: 5 },
      { lowerLimit: 1879878.06, upperLimit: 9999999.99, fixedFee: 589561.60, percentage: 0.3500, month: 5 },
      
      // Junio (month 6)
      { lowerLimit: 0.01, upperLimit: 4476.24, fixedFee: 0, percentage: 0.0192, month: 6 },
      { lowerLimit: 4476.25, upperLimit: 37992.30, fixedFee: 85.92, percentage: 0.0640, month: 6 },
      { lowerLimit: 37992.31, upperLimit: 66768.06, fixedFee: 2230.98, percentage: 0.1088, month: 6 },
      { lowerLimit: 66768.07, upperLimit: 77614.92, fixedFee: 5361.78, percentage: 0.1600, month: 6 },
      { lowerLimit: 77614.93, upperLimit: 92926.26, fixedFee: 7097.28, percentage: 0.1792, month: 6 },
      { lowerLimit: 92926.27, upperLimit: 187418.94, fixedFee: 9841.08, percentage: 0.2136, month: 6 },
      { lowerLimit: 187418.95, upperLimit: 295398.00, fixedFee: 30024.72, percentage: 0.2352, month: 6 },
      { lowerLimit: 295398.01, upperLimit: 563963.40, fixedFee: 55421.34, percentage: 0.3000, month: 6 },
      { lowerLimit: 563963.41, upperLimit: 751951.20, fixedFee: 135991.02, percentage: 0.3200, month: 6 },
      { lowerLimit: 751951.21, upperLimit: 2255853.66, fixedFee: 196147.08, percentage: 0.3400, month: 6 },
      { lowerLimit: 2255853.67, upperLimit: 9999999.99, fixedFee: 707473.92, percentage: 0.3500, month: 6 },
      
      // Julio (month 7)
      { lowerLimit: 0.01, upperLimit: 5222.28, fixedFee: 0, percentage: 0.0192, month: 7 },
      { lowerLimit: 5222.29, upperLimit: 44324.35, fixedFee: 100.24, percentage: 0.0640, month: 7 },
      { lowerLimit: 44324.36, upperLimit: 77896.07, fixedFee: 2602.81, percentage: 0.1088, month: 7 },
      { lowerLimit: 77896.08, upperLimit: 90550.74, fixedFee: 6255.41, percentage: 0.1600, month: 7 },
      { lowerLimit: 90550.75, upperLimit: 108413.97, fixedFee: 8280.16, percentage: 0.1792, month: 7 },
      { lowerLimit: 108413.98, upperLimit: 218655.43, fixedFee: 11481.26, percentage: 0.2136, month: 7 },
      { lowerLimit: 218655.44, upperLimit: 344631.00, fixedFee: 35028.84, percentage: 0.2352, month: 7 },
      { lowerLimit: 344631.01, upperLimit: 657957.30, fixedFee: 64658.23, percentage: 0.3000, month: 7 },
      { lowerLimit: 657957.31, upperLimit: 877276.40, fixedFee: 158656.19, percentage: 0.3200, month: 7 },
      { lowerLimit: 877276.41, upperLimit: 2631829.27, fixedFee: 228838.26, percentage: 0.3400, month: 7 },
      { lowerLimit: 2631829.28, upperLimit: 9999999.99, fixedFee: 825386.24, percentage: 0.3500, month: 7 },
      
      // Agosto (month 8)
      { lowerLimit: 0.01, upperLimit: 5968.32, fixedFee: 0, percentage: 0.0192, month: 8 },
      { lowerLimit: 5968.33, upperLimit: 50656.40, fixedFee: 114.56, percentage: 0.0640, month: 8 },
      { lowerLimit: 50656.41, upperLimit: 89024.08, fixedFee: 2974.64, percentage: 0.1088, month: 8 },
      { lowerLimit: 89024.09, upperLimit: 103486.56, fixedFee: 7149.04, percentage: 0.1600, month: 8 },
      { lowerLimit: 103486.57, upperLimit: 123901.68, fixedFee: 9463.04, percentage: 0.1792, month: 8 },
      { lowerLimit: 123901.69, upperLimit: 249891.92, fixedFee: 13121.44, percentage: 0.2136, month: 8 },
      { lowerLimit: 249891.93, upperLimit: 393864.00, fixedFee: 40032.96, percentage: 0.2352, month: 8 },
      { lowerLimit: 393864.01, upperLimit: 751951.20, fixedFee: 73895.12, percentage: 0.3000, month: 8 },
      { lowerLimit: 751951.21, upperLimit: 1002601.60, fixedFee: 181321.36, percentage: 0.3200, month: 8 },
      { lowerLimit: 1002601.61, upperLimit: 3007804.88, fixedFee: 261529.44, percentage: 0.3400, month: 8 },
      { lowerLimit: 3007804.89, upperLimit: 9999999.99, fixedFee: 943298.56, percentage: 0.3500, month: 8 },
      
      // Septiembre (month 9)
      { lowerLimit: 0.01, upperLimit: 6714.36, fixedFee: 0, percentage: 0.0192, month: 9 },
      { lowerLimit: 6714.37, upperLimit: 56988.45, fixedFee: 128.88, percentage: 0.0640, month: 9 },
      { lowerLimit: 56988.46, upperLimit: 100152.09, fixedFee: 3346.47, percentage: 0.1088, month: 9 },
      { lowerLimit: 100152.10, upperLimit: 116422.38, fixedFee: 8042.67, percentage: 0.1600, month: 9 },
      { lowerLimit: 116422.39, upperLimit: 139389.39, fixedFee: 10645.92, percentage: 0.1792, month: 9 },
      { lowerLimit: 139389.40, upperLimit: 281128.41, fixedFee: 14761.62, percentage: 0.2136, month: 9 },
      { lowerLimit: 281128.42, upperLimit: 443097.00, fixedFee: 45037.08, percentage: 0.2352, month: 9 },
      { lowerLimit: 443097.01, upperLimit: 845945.10, fixedFee: 83132.01, percentage: 0.3000, month: 9 },
      { lowerLimit: 845945.11, upperLimit: 1127926.80, fixedFee: 203986.53, percentage: 0.3200, month: 9 },
      { lowerLimit: 1127926.81, upperLimit: 3383780.49, fixedFee: 294220.62, percentage: 0.3400, month: 9 },
      { lowerLimit: 3383780.50, upperLimit: 9999999.99, fixedFee: 1061210.88, percentage: 0.3500, month: 9 },
      
      // Octubre (month 10)
      { lowerLimit: 0.01, upperLimit: 7460.40, fixedFee: 0, percentage: 0.0192, month: 10 },
      { lowerLimit: 7460.41, upperLimit: 63320.50, fixedFee: 143.20, percentage: 0.0640, month: 10 },
      { lowerLimit: 63320.51, upperLimit: 111280.10, fixedFee: 3718.30, percentage: 0.1088, month: 10 },
      { lowerLimit: 111280.11, upperLimit: 129358.20, fixedFee: 8936.30, percentage: 0.1600, month: 10 },
      { lowerLimit: 129358.21, upperLimit: 154877.10, fixedFee: 11828.80, percentage: 0.1792, month: 10 },
      { lowerLimit: 154877.11, upperLimit: 312364.90, fixedFee: 16401.80, percentage: 0.2136, month: 10 },
      { lowerLimit: 312364.91, upperLimit: 492330.00, fixedFee: 50041.20, percentage: 0.2352, month: 10 },
      { lowerLimit: 492330.01, upperLimit: 939939.00, fixedFee: 92368.90, percentage: 0.3000, month: 10 },
      { lowerLimit: 939939.01, upperLimit: 1253252.00, fixedFee: 226651.70, percentage: 0.3200, month: 10 },
      { lowerLimit: 1253252.01, upperLimit: 3759756.10, fixedFee: 326911.80, percentage: 0.3400, month: 10 },
      { lowerLimit: 3759756.11, upperLimit: 9999999.99, fixedFee: 1179123.20, percentage: 0.3500, month: 10 },
      
      // Noviembre (month 11)
      { lowerLimit: 0.01, upperLimit: 8206.44, fixedFee: 0, percentage: 0.0192, month: 11 },
      { lowerLimit: 8206.45, upperLimit: 69652.55, fixedFee: 157.52, percentage: 0.0640, month: 11 },
      { lowerLimit: 69652.56, upperLimit: 122408.11, fixedFee: 4090.13, percentage: 0.1088, month: 11 },
      { lowerLimit: 122408.12, upperLimit: 142294.02, fixedFee: 9829.93, percentage: 0.1600, month: 11 },
      { lowerLimit: 142294.03, upperLimit: 170364.81, fixedFee: 13011.68, percentage: 0.1792, month: 11 },
      { lowerLimit: 170364.82, upperLimit: 343601.39, fixedFee: 18041.98, percentage: 0.2136, month: 11 },
      { lowerLimit: 343601.40, upperLimit: 541563.00, fixedFee: 55045.32, percentage: 0.2352, month: 11 },
      { lowerLimit: 541563.01, upperLimit: 1033932.90, fixedFee: 101605.79, percentage: 0.3000, month: 11 },
      { lowerLimit: 1033932.91, upperLimit: 1378577.20, fixedFee: 249316.87, percentage: 0.3200, month: 11 },
      { lowerLimit: 1378577.21, upperLimit: 4135731.71, fixedFee: 359602.98, percentage: 0.3400, month: 11 },
      { lowerLimit: 4135731.72, upperLimit: 9999999.99, fixedFee: 1297035.52, percentage: 0.3500, month: 11 },
      
      // Diciembre (month 12)
      { lowerLimit: 0.01, upperLimit: 8952.49, fixedFee: 0, percentage: 0.0192, month: 12 },
      { lowerLimit: 8952.50, upperLimit: 75984.55, fixedFee: 171.88, percentage: 0.0640, month: 12 },
      { lowerLimit: 75984.56, upperLimit: 133536.07, fixedFee: 4461.94, percentage: 0.1088, month: 12 },
      { lowerLimit: 133536.08, upperLimit: 155229.80, fixedFee: 10723.55, percentage: 0.1600, month: 12 },
      { lowerLimit: 155229.81, upperLimit: 185852.57, fixedFee: 14194.54, percentage: 0.1792, month: 12 },
      { lowerLimit: 185852.58, upperLimit: 374837.88, fixedFee: 19682.13, percentage: 0.2136, month: 12 },
      { lowerLimit: 374837.89, upperLimit: 590795.99, fixedFee: 60049.40, percentage: 0.2352, month: 12 },
      { lowerLimit: 590796.00, upperLimit: 1127926.84, fixedFee: 110842.74, percentage: 0.3000, month: 12 },
      { lowerLimit: 1127926.85, upperLimit: 1503902.46, fixedFee: 271981.99, percentage: 0.3200, month: 12 },
      { lowerLimit: 1503902.47, upperLimit: 4511707.37, fixedFee: 392294.17, percentage: 0.3400, month: 12 },
      { lowerLimit: 4511707.38, upperLimit: 9999999.99, fixedFee: 1414947.85, percentage: 0.3500, month: 12 },
    ];
  }

  /**
   * Devuelve todas las tarifas de ISR para el año 2025
   */
  static getTaxBrackets2025(): TaxBracket[] {
    return this.getTaxBracketsBase();
  }

  /**
   * Obtiene los brackets de tarifa para un año y mes específico
   * @param year El año fiscal (2025, 2026, etc.)
   * @param month El número de mes (1-12)
   * @returns Array de brackets para ese mes
   */
  static getTaxBracketsByYearAndMonth(year: number, month: number): TaxBracket[] {
    if (month < 1 || month > 12) {
      throw new Error("El mes debe estar entre 1 y 12");
    }
    
    // Obtener brackets según el año
    let brackets: TaxBracket[];
    if (year === 2026) {
      brackets = this.getTaxBrackets2026();
    } else {
      // Default a 2025 para años anteriores o no definidos
      brackets = this.getTaxBrackets2025();
    }
    
    return brackets.filter(bracket => bracket.month === month);
  }
  
  /**
   * Obtiene los brackets de tarifa para un mes específico (mantener compatibilidad)
   * @param month El número de mes (1-12)
   * @returns Array de brackets para ese mes
   * @deprecated Usar getTaxBracketsByYearAndMonth en su lugar
   */
  static getTaxBracketsByMonth(month: number): TaxBracket[] {
    return this.getTaxBracketsByYearAndMonth(2025, month);
  }
  
  /**
   * Calcula el ISR para un monto, año y mes específicos
   * @param amount Monto gravable acumulado
   * @param year Año fiscal
   * @param month Mes (1-12)
   * @returns El ISR calculado
   */
  static calculateISRByYear(amount: number, year: number, month: number): number {
    const brackets = this.getTaxBracketsByYearAndMonth(year, month);
    
    // Encontrar el bracket que corresponde al monto
    const bracket = brackets.find(b => amount >= b.lowerLimit && amount <= b.upperLimit);
    
    if (!bracket) {
      throw new Error(`No se encontró un bracket válido para el monto ${amount} en el mes ${month} del año ${year}`);
    }
    
    // Cálculo del ISR: cuota fija + (monto - límite inferior) * porcentaje
    const isr = bracket.fixedFee + (amount - bracket.lowerLimit) * bracket.percentage;
    
    return parseFloat(isr.toFixed(2));
  }

  /**
   * Calcula el ISR para un monto y mes específicos (mantener compatibilidad)
   * @param amount Monto gravable acumulado
   * @param month Mes (1-12)
   * @returns El ISR calculado
   * @deprecated Usar calculateISRByYear en su lugar
   */
  static calculateISR(amount: number, month: number): number {
    return this.calculateISRByYear(amount, 2025, month);
  }

  /**
   * Tarifas ISR 2026 - Anexo 8 RMF 2026 (DOF 28/12/2025)
   * Factor de actualización: 1.1321 (inflación acumulada 13.21%)
   * En Actividad Empresarial, los límites y cuotas aumentan proporcionalmente cada mes.
   */
  public static getTaxBrackets2026(): TaxBracket[] {
    const baseBrackets = [
      { lowerLimit: 0.01, upperLimit: 844.59, fixedFee: 0, percentage: 0.0192 },
      { lowerLimit: 844.60, upperLimit: 7168.51, fixedFee: 16.22, percentage: 0.0640 },
      { lowerLimit: 7168.52, upperLimit: 12598.02, fixedFee: 420.95, percentage: 0.1088 },
      { lowerLimit: 12598.03, upperLimit: 14644.64, fixedFee: 1011.68, percentage: 0.1600 },
      { lowerLimit: 14644.65, upperLimit: 17533.64, fixedFee: 1339.14, percentage: 0.1792 },
      { lowerLimit: 17533.65, upperLimit: 35362.83, fixedFee: 1856.84, percentage: 0.2136 },
      { lowerLimit: 35362.84, upperLimit: 55736.68, fixedFee: 5665.16, percentage: 0.2352 },
      { lowerLimit: 55736.69, upperLimit: 106410.50, fixedFee: 10457.09, percentage: 0.3000 },
      { lowerLimit: 106410.51, upperLimit: 141880.66, fixedFee: 25659.23, percentage: 0.3200 },
      { lowerLimit: 141880.67, upperLimit: 425641.99, fixedFee: 37009.69, percentage: 0.3400 },
      { lowerLimit: 425642.00, upperLimit: 999999999.99, fixedFee: 133488.54, percentage: 0.3500 },
    ];

    const allMonths: TaxBracket[] = [];

    // Generamos los 12 meses multiplicando la base por el índice del mes
    for (let m = 1; m <= 12; m++) {
      baseBrackets.forEach(base => {
        allMonths.push({
          lowerLimit: Number((base.lowerLimit * m).toFixed(2)),
          upperLimit: m === 12 && base.upperLimit > 9999999 ? base.upperLimit : Number((base.upperLimit * m).toFixed(2)),
          fixedFee: Number((base.fixedFee * m).toFixed(2)),
          percentage: base.percentage,
          month: m
        });
      });
    }

    return allMonths;
  }

  /**
   * Calcula el ISR Provisional para un mes específico de 2026
   */
  static calculateISR2026(amount: number, month: number): number {
    const brackets = this.getTaxBrackets2026().filter(b => b.month === month);
    
    const bracket = brackets.find(b => amount >= b.lowerLimit && amount <= b.upperLimit);
    
    if (!bracket) return 0;
    
    const isr = bracket.fixedFee + (amount - bracket.lowerLimit) * bracket.percentage;
    return parseFloat(isr.toFixed(2));
  }

  // ==========================================
  // RESICO - Régimen Simplificado de Confianza
  // ==========================================

  /**
   * Tasas mensuales de ISR para RESICO (Art. 113-E LISR)
   * Aplica sobre INGRESOS COBRADOS (no sobre utilidad)
   * Límite anual: 3.5 millones de pesos
   * 
   * IMPORTANTE: En RESICO no hay deducciones, el ISR se calcula
   * directamente sobre los ingresos cobrados del mes.
   */
  private static getResicoTaxRates(): ResicoTaxRate[] {
    return [
      { lowerLimit: 0.01, upperLimit: 25000.00, rate: 0.0100 },       // 1.00%
      { lowerLimit: 25000.01, upperLimit: 50000.00, rate: 0.0110 },   // 1.10%
      { lowerLimit: 50000.01, upperLimit: 83333.33, rate: 0.0150 },   // 1.50%
      { lowerLimit: 83333.34, upperLimit: 208333.33, rate: 0.0200 },  // 2.00%
      { lowerLimit: 208333.34, upperLimit: 3500000.00, rate: 0.0250 }, // 2.50%
    ];
  }

  /**
   * Calcula el ISR para RESICO
   * @param ingresosMensuales Ingresos COBRADOS del mes (no facturados)
   * @returns ISR a pagar y detalles del cálculo
   */
  static calculateISRResico(ingresosMensuales: number): {
    ingresos: number;
    tasa: number;
    isrCausado: number;
  } {
    if (ingresosMensuales <= 0) {
      return { ingresos: 0, tasa: 0, isrCausado: 0 };
    }

    const rates = this.getResicoTaxRates();
    const rate = rates.find(r => 
      ingresosMensuales >= r.lowerLimit && ingresosMensuales <= r.upperLimit
    );

    // Si excede el límite máximo, usar la tasa más alta (2.50%)
    const tasaAplicable = rate?.rate || 0.025;
    const isrCausado = ingresosMensuales * tasaAplicable;

    return {
      ingresos: ingresosMensuales,
      tasa: tasaAplicable * 100, // Devolver como porcentaje
      isrCausado: parseFloat(isrCausado.toFixed(2))
    };
  }

  /**
   * Obtiene la tasa de RESICO aplicable según el monto de ingresos
   */
  static getResicoRate(ingresosMensuales: number): number {
    const rates = this.getResicoTaxRates();
    const rate = rates.find(r => 
      ingresosMensuales >= r.lowerLimit && ingresosMensuales <= r.upperLimit
    );
    return rate?.rate || 0.025;
  }

  /**
   * Devuelve todas las tasas de RESICO (para mostrar tabla en UI)
   */
  static getAllResicoRates(): ResicoTaxRate[] {
    return this.getResicoTaxRates();
  }

  /**
   * Verifica si un RFC/cliente puede estar en RESICO
   * Límite: 3.5 millones de ingresos anuales
   */
  static canBeResico(ingresosAnuales: number): boolean {
    return ingresosAnuales <= 3500000;
  }

  /**
   * Detecta el tipo de régimen basado en el código del SAT
   */
  static getRegimenType(codigoRegimen: string): RegimenFiscalPF | null {
    if (codigoRegimen === REGIMEN_CODES.PFAE) return 'PFAE';
    if (codigoRegimen === REGIMEN_CODES.RESICO) return 'RESICO';
    return null;
  }
}
