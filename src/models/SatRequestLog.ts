import { Timestamp } from "firebase/firestore";

export type SatLogType = 
  | "request_created"
  | "request_creation_error"
  | "verification_started"
  | "verification_success"
  | "verification_error"
  | "verification_rejected"
  | "download_started"
  | "download_success"
  | "download_error"
  | "processing_started"
  | "processing_success"
  | "processing_error"
  | "processing_partial"
  | "auto_sync_started"
  | "auto_sync_completed"
  | "auto_sync_skipped"
  | "fiel_validation_error"
  | "info";

export type SatLogLevel = "info" | "success" | "warning" | "error";

export interface SatRequestLog {
  id?: string;
  clientId: string;
  clientName?: string;
  requestId?: string;
  type: SatLogType;
  level: SatLogLevel;
  message: string;
  details?: Record<string, unknown>;
  createdAt: Timestamp;
  createdBy?: string; // "system" for automated, userId for manual
}

export const logTypeLabels: Record<SatLogType, string> = {
  request_created: "Solicitud creada",
  request_creation_error: "Error al crear solicitud",
  verification_started: "Verificación iniciada",
  verification_success: "Verificación exitosa",
  verification_error: "Error de verificación",
  verification_rejected: "Solicitud rechazada",
  download_started: "Descarga iniciada",
  download_success: "Descarga exitosa",
  download_error: "Error de descarga",
  processing_started: "Procesamiento iniciado",
  processing_success: "Procesamiento exitoso",
  processing_error: "Error de procesamiento",
  processing_partial: "Procesamiento parcial",
  auto_sync_started: "Sincronización automática iniciada",
  auto_sync_completed: "Sincronización automática completada",
  auto_sync_skipped: "Sincronización automática omitida",
  fiel_validation_error: "Error de validación FIEL",
  info: "Información",
};

export const logLevelColors: Record<SatLogLevel, string> = {
  info: "text-blue-600 bg-blue-50",
  success: "text-green-600 bg-green-50",
  warning: "text-yellow-600 bg-yellow-50",
  error: "text-red-600 bg-red-50",
};
