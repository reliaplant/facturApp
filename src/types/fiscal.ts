/**
 * ============================================================================
 * TIPOS DE CLIENTE Y DATOS FISCALES
 * ============================================================================
 * 
 * Modelos para la gestión de clientes y sus datos fiscales en la aplicación.
 */

/**
 * Régimen fiscal según catálogo del SAT
 */
export type RegimenFiscal = 
  | '601' // General de Ley Personas Morales
  | '603' // Personas Morales con Fines no Lucrativos
  | '605' // Sueldos y Salarios e Ingresos Asimilados a Salarios
  | '606' // Arrendamiento
  | '607' // Régimen de Enajenación o Adquisición de Bienes
  | '608' // Demás ingresos
  | '610' // Residentes en el Extranjero sin Establecimiento Permanente en México
  | '611' // Ingresos por Dividendos
  | '612' // Personas Físicas con Actividades Empresariales y Profesionales
  | '614' // Ingresos por intereses
  | '615' // Régimen de los ingresos por obtención de premios
  | '616' // Sin obligaciones fiscales
  | '620' // Sociedades Cooperativas de Producción
  | '621' // Incorporación Fiscal
  | '622' // Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras
  | '623' // Opcional para Grupos de Sociedades
  | '624' // Coordinados
  | '625' // RESICO (Régimen Simplificado de Confianza)
  | '626' // RESICO - Personas Morales
  | string; // Para otros regímenes

/**
 * ============================================================================
 * CLIENTE
 * ============================================================================
 */

/**
 * Tipo de persona para fines fiscales
 */
export type TipoPersona = 'fisica' | 'moral';

/**
 * Información básica del cliente
 */
export interface Cliente {
  /** ID único en la base de datos */
  id: string;
  
  /** RFC del cliente (identificador fiscal) */
  rfc: string;
  
  /** Nombre o razón social */
  nombre: string;
  
  /** Tipo de persona */
  tipoPersona: TipoPersona;
  
  /** Régimen(es) fiscal(es) en los que está inscrito */
  regimenesFiscales: RegimenFiscal[];
  
  /** Código postal del domicilio fiscal */
  codigoPostal: string;
  
  /** Correo electrónico */
  email?: string;
  
  /** Teléfono */
  telefono?: string;
  
  /** Si el cliente está activo */
  activo: boolean;
  
  /** ID del usuario propietario */
  usuarioId: string;
  
  /** Fecha de creación */
  fechaCreacion: string;
  
  /** Fecha de última actualización */
  fechaActualizacion: string;
  
  /** Notas adicionales */
  notas?: string;
}

/**
 * Datos para crear un nuevo cliente
 */
export type CrearCliente = Omit<Cliente, 'id' | 'fechaCreacion' | 'fechaActualizacion'>;

/**
 * Datos para actualizar un cliente
 */
export type ActualizarCliente = Partial<Omit<Cliente, 'id' | 'fechaCreacion'>>;

/**
 * ============================================================================
 * PROVEEDOR
 * ============================================================================
 */

/**
 * Información de un proveedor (emisor de facturas recibidas)
 */
export interface Proveedor {
  /** RFC del proveedor (usado como ID) */
  rfc: string;
  
  /** Nombre o razón social */
  nombre: string;
  
  /** Si el proveedor es deducible por defecto */
  esDeducible: boolean;
  
  /** Categoría por defecto para facturas de este proveedor */
  categoriaDefecto?: string;
  
  /** Número de facturas de este proveedor */
  numeroFacturas: number;
  
  /** Fecha de última actualización */
  fechaActualizacion: string;
  
  /** Notas sobre el proveedor */
  notas?: string;
  
  /** Si está en lista negra del SAT (69B) */
  enLista69B?: boolean;
  
  /** Fecha de última verificación en lista 69B */
  fechaVerificacion69B?: string;
}

/**
 * ============================================================================
 * RESUMEN FISCAL ANUAL
 * ============================================================================
 */

/**
 * Datos fiscales mensuales
 */
export interface DatosFiscalesMes {
  /** Ingresos gravados del mes */
  ingresosGravados: number;
  
  /** ISR retenido de ingresos */
  isrRetenidoIngresos: number;
  
  /** IVA trasladado (cobrado) */
  ivaTrasladado: number;
  
  /** IVA retenido de ingresos */
  ivaRetenidoIngresos: number;
  
  /** Deducciones autorizadas del mes */
  deducciones: number;
  
  /** IVA de deducciones (acreditable) */
  ivaDeducible: number;
  
  /** Gastos exentos del mes */
  gastosExentos: number;
  
  /** Deducciones de facturas manuales (extranjero) */
  deduccionesManual: number;
  
  /** Depreciación de activos fijos del mes */
  depreciacion: number;
}

/**
 * Resumen fiscal de un año completo
 */
export interface ResumenFiscalAnual {
  /** ID del cliente */
  clienteId: string;
  
  /** Año fiscal */
  anio: number;
  
  /** Datos por mes (clave: '1'-'12') */
  meses: Record<string, DatosFiscalesMes>;
  
  /** Fecha de última actualización */
  fechaActualizacion: string;
}

/**
 * Valores por defecto para datos fiscales mensuales
 */
export const DATOS_FISCALES_MES_DEFAULT: DatosFiscalesMes = {
  ingresosGravados: 0,
  isrRetenidoIngresos: 0,
  ivaTrasladado: 0,
  ivaRetenidoIngresos: 0,
  deducciones: 0,
  ivaDeducible: 0,
  gastosExentos: 0,
  deduccionesManual: 0,
  depreciacion: 0,
};

/**
 * ============================================================================
 * CÁLCULOS DE IMPUESTOS
 * ============================================================================
 */

/**
 * Resultado del cálculo de ISR provisional mensual
 */
export interface CalculoISRProvisional {
  /** Mes del cálculo (1-12) */
  mes: number;
  
  /** Ingresos acumulados del periodo */
  ingresosAcumulados: number;
  
  /** Deducciones acumuladas del periodo */
  deduccionesAcumuladas: number;
  
  /** Base gravable (ingresos - deducciones) */
  baseGravable: number;
  
  /** Límite inferior de la tarifa */
  limiteInferior: number;
  
  /** Excedente sobre límite inferior */
  excedente: number;
  
  /** Porcentaje aplicable */
  porcentaje: number;
  
  /** Impuesto marginal */
  impuestoMarginal: number;
  
  /** Cuota fija */
  cuotaFija: number;
  
  /** ISR causado del periodo */
  isrCausado: number;
  
  /** Pagos provisionales anteriores */
  pagosAnteriores: number;
  
  /** Retenciones acumuladas */
  retencionesAcumuladas: number;
  
  /** ISR a pagar (o a favor si es negativo) */
  isrAPagar: number;
}

/**
 * Resultado del cálculo de IVA mensual
 */
export interface CalculoIVA {
  /** Mes del cálculo (1-12) */
  mes: number;
  
  /** IVA trasladado (cobrado) */
  ivaTrasladado: number;
  
  /** IVA acreditable (pagado en compras) */
  ivaAcreditable: number;
  
  /** IVA retenido */
  ivaRetenido: number;
  
  /** IVA a cargo (positivo) o a favor (negativo) */
  ivaNeto: number;
  
  /** Saldo a favor de meses anteriores aplicado */
  saldoFavorAplicado: number;
  
  /** IVA a pagar */
  ivaAPagar: number;
  
  /** Nuevo saldo a favor (si aplica) */
  nuevoSaldoFavor: number;
}

/**
 * ============================================================================
 * DECLARACIONES
 * ============================================================================
 */

/**
 * Estado de una declaración
 */
export type EstadoDeclaracion = 
  | 'borrador'
  | 'calculada'
  | 'presentada'
  | 'pagada'
  | 'complementaria';

/**
 * Tipo de declaración
 */
export type TipoDeclaracion = 
  | 'provisional'
  | 'definitiva'
  | 'anual'
  | 'complementaria';

/**
 * Declaración mensual
 */
export interface Declaracion {
  /** ID único */
  id: string;
  
  /** ID del cliente */
  clienteId: string;
  
  /** Año fiscal */
  anio: number;
  
  /** Mes (1-12, o 13 para anual) */
  mes: number;
  
  /** Tipo de declaración */
  tipo: TipoDeclaracion;
  
  /** Estado actual */
  estado: EstadoDeclaracion;
  
  /** Cálculo de ISR */
  isr: CalculoISRProvisional;
  
  /** Cálculo de IVA */
  iva: CalculoIVA;
  
  /** Fecha límite de presentación */
  fechaLimite: string;
  
  /** Fecha de presentación (si aplica) */
  fechaPresentacion?: string;
  
  /** Número de operación SAT */
  numeroOperacion?: string;
  
  /** Línea de captura para pago */
  lineaCaptura?: string;
  
  /** Fecha de pago (si aplica) */
  fechaPago?: string;
  
  /** Notas */
  notas?: string;
  
  /** Fecha de creación */
  fechaCreacion: string;
  
  /** Fecha de actualización */
  fechaActualizacion: string;
}

/**
 * ============================================================================
 * ACTIVOS FIJOS
 * ============================================================================
 */

/**
 * Tipo de activo fijo según LISR
 */
export type TipoActivoFijo = 
  | 'construcciones'
  | 'mobiliario'
  | 'equipo_computo'
  | 'equipo_transporte'
  | 'maquinaria'
  | 'otro';

/**
 * Tasas de depreciación por tipo de activo (LISR Art. 34)
 */
export const TASAS_DEPRECIACION: Record<TipoActivoFijo, number> = {
  'construcciones': 0.05,      // 5% anual
  'mobiliario': 0.10,          // 10% anual
  'equipo_computo': 0.30,      // 30% anual
  'equipo_transporte': 0.25,   // 25% anual
  'maquinaria': 0.10,          // 10% anual
  'otro': 0.10,                // 10% anual por defecto
};

/**
 * Activo fijo para depreciación
 */
export interface ActivoFijo {
  /** ID único */
  id: string;
  
  /** ID del cliente */
  clienteId: string;
  
  /** Descripción del activo */
  descripcion: string;
  
  /** Tipo de activo */
  tipo: TipoActivoFijo;
  
  /** Fecha de adquisición */
  fechaAdquisicion: string;
  
  /** Monto Original de la Inversión (MOI) */
  moi: number;
  
  /** Tasa de depreciación anual */
  tasaDepreciacion: number;
  
  /** Depreciación mensual calculada */
  depreciacionMensual: number;
  
  /** Depreciación acumulada */
  depreciacionAcumulada: number;
  
  /** Valor en libros actual */
  valorLibros: number;
  
  /** Mes de inicio de depreciación */
  mesInicioDepreciacion: number;
  
  /** Año de inicio de depreciación */
  anioInicioDepreciacion: number;
  
  /** Si está completamente depreciado */
  depreciado: boolean;
  
  /** Fecha de baja (si aplica) */
  fechaBaja?: string;
  
  /** UUID de la factura de compra (si aplica) */
  uuidFactura?: string;
  
  /** Notas */
  notas?: string;
  
  /** Fecha de creación */
  fechaCreacion: string;
  
  /** Fecha de actualización */
  fechaActualizacion: string;
}

/**
 * ============================================================================
 * CATEGORÍAS
 * ============================================================================
 */

/**
 * Categoría para clasificar gastos/ingresos
 */
export interface Categoria {
  /** ID único */
  id: string;
  
  /** Nombre de la categoría */
  nombre: string;
  
  /** Descripción */
  descripcion?: string;
  
  /** Color para UI (hex) */
  color?: string;
  
  /** Ícono para UI */
  icono?: string;
  
  /** Si es categoría de gasto o ingreso */
  tipo: 'gasto' | 'ingreso' | 'ambos';
  
  /** Si es categoría del sistema (no editable) */
  esSistema: boolean;
  
  /** Orden de visualización */
  orden: number;
}

/**
 * Categorías predeterminadas del sistema
 */
export const CATEGORIAS_SISTEMA: Omit<Categoria, 'id'>[] = [
  { nombre: 'Servicios profesionales', tipo: 'gasto', esSistema: true, orden: 1 },
  { nombre: 'Insumos y materiales', tipo: 'gasto', esSistema: true, orden: 2 },
  { nombre: 'Renta de local', tipo: 'gasto', esSistema: true, orden: 3 },
  { nombre: 'Servicios (luz, agua, etc.)', tipo: 'gasto', esSistema: true, orden: 4 },
  { nombre: 'Comunicaciones', tipo: 'gasto', esSistema: true, orden: 5 },
  { nombre: 'Transporte', tipo: 'gasto', esSistema: true, orden: 6 },
  { nombre: 'Combustible', tipo: 'gasto', esSistema: true, orden: 7 },
  { nombre: 'Alimentos y viáticos', tipo: 'gasto', esSistema: true, orden: 8 },
  { nombre: 'Equipo de cómputo', tipo: 'gasto', esSistema: true, orden: 9 },
  { nombre: 'Mobiliario', tipo: 'gasto', esSistema: true, orden: 10 },
  { nombre: 'Software y licencias', tipo: 'gasto', esSistema: true, orden: 11 },
  { nombre: 'Publicidad', tipo: 'gasto', esSistema: true, orden: 12 },
  { nombre: 'Seguros', tipo: 'gasto', esSistema: true, orden: 13 },
  { nombre: 'Mantenimiento', tipo: 'gasto', esSistema: true, orden: 14 },
  { nombre: 'Honorarios', tipo: 'ingreso', esSistema: true, orden: 1 },
  { nombre: 'Servicios', tipo: 'ingreso', esSistema: true, orden: 2 },
  { nombre: 'Venta de productos', tipo: 'ingreso', esSistema: true, orden: 3 },
  { nombre: 'Comisiones', tipo: 'ingreso', esSistema: true, orden: 4 },
  { nombre: 'Arrendamiento', tipo: 'ingreso', esSistema: true, orden: 5 },
  { nombre: 'Otros ingresos', tipo: 'ingreso', esSistema: true, orden: 99 },
  { nombre: 'Otros gastos', tipo: 'gasto', esSistema: true, orden: 99 },
];
