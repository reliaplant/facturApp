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
}
