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
  
  // New fields for tracking download and processing status
  packagesDownloaded?: boolean;
  downloadedAt?: string;
  packagesProcessed?: boolean;
  processedAt?: string;
  processedCount?: number;
  existingCount?: number;
}
