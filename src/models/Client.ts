export interface Client {
  id: string;
  rfc: string;
  curp: string;
  nombres: string;
  primerApellido: string;
  segundoApellido?: string;
  nombreComercial?: string;
  // Add name field for simpler access
  name?: string;
  email?: string;
  telefono?: string;
  tipoPersona?: 'fisica' | 'moral'; // Tipo de persona: física o moral
  
  // For client categorization in dashboard
  tier?: string;
  
  // Fiscal information
  fechaInicioOperaciones: string;
  estatusEnElPadron: string;
  fechaUltimoCambioEstado: string;
  ultimaActualizacionDatos: string;
  
  // Address information
  address: {
    codigoPostal?: string;
    tipoVialidad?: string;
    nombreVialidad?: string;
    numeroExterior?: string;
    numeroInterior?: string;
    nombreColonia: string;
    nombreLocalidad: string;
    municipio: string;
    nombreEntidadFederativa: string;
    entreCalles?: string;
  };

  // Economic activities (from CSF "Actividades Económicas")
  actividadesEconomicas: Array<{
    orden: number;
    actividad: string;
    porcentaje: number;
    fechaInicio: string;
    fechaFin?: string;
  }>;

  // Fiscal regimes (from CSF "Regímenes")
  regimenesFiscales: Array<{
    regimen: string;
    fechaInicio: string;
    fechaFin?: string;
    esPredeterminado?: boolean;
  }>;

  // Obligations (from CSF "Obligaciones")
  obligaciones: Array<{
    descripcion: string;
    descripcionVencimiento: string;
    fechaInicio: string;
    fechaFin?: string;
  }>;

  // Status information
  estatusPago: string;
  estatusCliente: string;
  estatusDeclaracion: string;
  estatusDeclaracionPagoCliente: string;
  fechaUltimaDeclaracion?: string;
  razonCancelacion?: string;

  // Pending tasks
  listaPendientes?: Array<{
    descripcion: string;
    fecha: string;
  }>;

  // Service information
  plan?: string;
  
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  
  // CSF (Constancia de Situación Fiscal)
  lastCSFUrl?: string;  // URL del PDF
  lastCSFDate?: string; // Fecha de la última carga
  idCIF?: string;       // ID de la CSF para validación (ej: 19030152512)
  lastOPFUrl?: string;  // Añadir para Opinión de Fiel Cumplimiento
  lastOPFDate?: string; // Añadir fecha de última opinión

  // FIEL Documents
  cerUrl?: string;
  cerDate?: string;
  acuseCerUrl?: string;
  acuseCerDate?: string;
  keyCerUrl?: string;
  keyCerDate?: string;
  renCerUrl?: string;
  renCerDate?: string;
  claveFielUrl?: string;
  claveFielDate?: string;
  cartaManifiestoUrl?: string;
  cartaManifiestoDate?: string;
  contratoUrl?: string;
  contratoDate?: string;
  
  // Indica si la FIEL está completa y válida (cer, key y clave subidos)
  tieneFielValida?: boolean;

  // SAT Sync Status - Para descarga masiva inteligente
  satSyncStatus?: {
    // Última fecha sincronizada para facturas emitidas
    lastSyncDateIssued?: string; // Formato: YYYY-MM-DD
    lastSyncAtIssued?: string;   // Timestamp de la última sincronización
    // Última fecha sincronizada para facturas recibidas
    lastSyncDateReceived?: string; // Formato: YYYY-MM-DD
    lastSyncAtReceived?: string;   // Timestamp de la última sincronización
    // Fecha de inicio de operaciones (para saber desde cuándo descargar la primera vez)
    syncStartDate?: string; // Formato: YYYY-MM-DD
    // Estado general
    issyncing?: boolean;
    lastError?: string;
  };

  // Automatic SAT sync - Habilita sincronización automática con el SAT
  autoSync?: boolean;
}
