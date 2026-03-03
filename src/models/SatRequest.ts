// Tipo para la solicitud de descarga
export interface SatRequest {
  id: string;
  rfc: string;
  requestId: string;
  status: string;
  createdAt: any; // Timestamp de Firestore
  updatedAt: any; // Timestamp de Firestore
  packageIds?: string[];
  error?: string;
  from?: string;
  to?: string;
  completed?: boolean;
  downloadType?: "issued" | "received"; // Tipo de facturas: emitidas o recibidas
  
  // Tracking de verificación
  verifyError?: string;
  verifyAttemptedAt?: string;
  lastAutoVerify?: string;
  
  // Tracking de descarga
  packagesDownloaded?: boolean;
  downloadedAt?: string;
  downloadError?: string;
  downloadAttemptedAt?: string;
  
  // Tracking de procesamiento
  packagesProcessed?: boolean;
  processedWithErrors?: boolean; // True si se procesó pero hubo errores parciales
  processedAt?: string;
  processedCount?: number;
  existingCount?: number;
  totalErrors?: number; // Cantidad de errores durante el procesamiento

  // Trazabilidad detallada (auto-import)
  importedUuids?: string[];   // UUIDs de CFDIs nuevos importados
  existingUuids?: string[];   // UUIDs de CFDIs que ya existían
  importLog?: ImportPackageLog[];    // Log por paquete
  importErrors?: ImportError[]; // Array acumulativo de errores (nunca se sobreescribe)
}

/** Log de procesamiento por paquete */
export interface ImportPackageLog {
  packageId: string;
  stage: string;        // download | extract | parse_and_save | done | *_error
  startedAt?: string;
  finishedAt?: string;
  xmlCount?: number;
  saved?: number;
  existing?: number;
  parseErrors?: number;
  error?: string;
}

/** Error individual durante importación */
export interface ImportError {
  type: "sat" | "processing"; // sat = error del SAT, processing = error nuestro
  stage: string;              // download | extract | parse | save | autoImport_fatal
  packageId?: string;
  fileName?: string;
  message: string;
  timestamp: string;
}
