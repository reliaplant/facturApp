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

  // Economic activities
  actividadesEconomicas: Array<{
    regimen: string;
    fechaInicio: string;
    fechaFin?: string;
  }>;

  // Obligations
  obligaciones: Array<{
    descripcion: string;
    vencimiento: string;
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
  lastCSFUrl?: string;  // Add this field
  lastCSFDate?: string; // Añadimos la fecha de la última carga
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
}
