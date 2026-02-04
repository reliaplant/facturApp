import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  limit,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import { SatRequestLog, SatLogType, SatLogLevel } from "@/models/SatRequestLog";

const COLLECTION_NAME = "satRequestLogs";

export interface CreateLogParams {
  clientId: string;
  clientName?: string;
  requestId?: string;
  type: SatLogType;
  level: SatLogLevel;
  message: string;
  details?: Record<string, unknown>;
  createdBy?: string;
}

export async function createSatLog(params: CreateLogParams): Promise<string> {
  const logData: Omit<SatRequestLog, "id"> = {
    clientId: params.clientId,
    clientName: params.clientName,
    requestId: params.requestId,
    type: params.type,
    level: params.level,
    message: params.message,
    details: params.details,
    createdAt: Timestamp.now(),
    createdBy: params.createdBy || "system",
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), logData);
  return docRef.id;
}

export async function getLogsByClient(
  clientId: string,
  maxResults: number = 100
): Promise<SatRequestLog[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("clientId", "==", clientId),
    orderBy("createdAt", "desc"),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SatRequestLog[];
}

export async function getLogsByRequest(
  requestId: string
): Promise<SatRequestLog[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("requestId", "==", requestId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SatRequestLog[];
}

export async function getRecentLogs(
  maxResults: number = 50
): Promise<SatRequestLog[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy("createdAt", "desc"),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SatRequestLog[];
}

export async function getLogsByLevel(
  level: SatLogLevel,
  maxResults: number = 50
): Promise<SatRequestLog[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("level", "==", level),
    orderBy("createdAt", "desc"),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SatRequestLog[];
}

export async function getLogsByDateRange(
  startDate: Date,
  endDate: Date,
  clientId?: string
): Promise<SatRequestLog[]> {
  let q;
  
  if (clientId) {
    q = query(
      collection(db, COLLECTION_NAME),
      where("clientId", "==", clientId),
      where("createdAt", ">=", Timestamp.fromDate(startDate)),
      where("createdAt", "<=", Timestamp.fromDate(endDate)),
      orderBy("createdAt", "desc")
    );
  } else {
    q = query(
      collection(db, COLLECTION_NAME),
      where("createdAt", ">=", Timestamp.fromDate(startDate)),
      where("createdAt", "<=", Timestamp.fromDate(endDate)),
      orderBy("createdAt", "desc")
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SatRequestLog[];
}

export async function deleteLog(logId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, logId));
}

export async function deleteOldLogs(daysOld: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const q = query(
    collection(db, COLLECTION_NAME),
    where("createdAt", "<", Timestamp.fromDate(cutoffDate))
  );

  const snapshot = await getDocs(q);
  let deletedCount = 0;

  for (const docSnapshot of snapshot.docs) {
    await deleteDoc(docSnapshot.ref);
    deletedCount++;
  }

  return deletedCount;
}

// Helper functions for common log scenarios
export const SatLogger = {
  requestCreated: (
    clientId: string,
    clientName: string,
    requestId: string,
    details?: Record<string, unknown>
  ) =>
    createSatLog({
      clientId,
      clientName,
      requestId,
      type: "request_created",
      level: "success",
      message: `Solicitud SAT creada exitosamente`,
      details,
    }),

  requestCreationError: (
    clientId: string,
    clientName: string,
    error: string,
    details?: Record<string, unknown>
  ) =>
    createSatLog({
      clientId,
      clientName,
      type: "request_creation_error",
      level: "error",
      message: `Error al crear solicitud: ${error}`,
      details,
    }),

  verificationSuccess: (
    clientId: string,
    clientName: string,
    requestId: string,
    packagesCount: number
  ) =>
    createSatLog({
      clientId,
      clientName,
      requestId,
      type: "verification_success",
      level: "success",
      message: `Verificación exitosa - ${packagesCount} paquete(s) disponible(s)`,
      details: { packagesCount },
    }),

  verificationError: (
    clientId: string,
    clientName: string,
    requestId: string,
    error: string
  ) =>
    createSatLog({
      clientId,
      clientName,
      requestId,
      type: "verification_error",
      level: "error",
      message: `Error de verificación: ${error}`,
      details: { error },
    }),

  verificationRejected: (
    clientId: string,
    clientName: string,
    requestId: string,
    reason: string
  ) =>
    createSatLog({
      clientId,
      clientName,
      requestId,
      type: "verification_rejected",
      level: "warning",
      message: `Solicitud rechazada: ${reason}`,
      details: { reason },
    }),

  downloadSuccess: (
    clientId: string,
    clientName: string,
    requestId: string,
    packagesDownloaded: number
  ) =>
    createSatLog({
      clientId,
      clientName,
      requestId,
      type: "download_success",
      level: "success",
      message: `Descarga exitosa - ${packagesDownloaded} paquete(s)`,
      details: { packagesDownloaded },
    }),

  downloadError: (
    clientId: string,
    clientName: string,
    requestId: string,
    error: string
  ) =>
    createSatLog({
      clientId,
      clientName,
      requestId,
      type: "download_error",
      level: "error",
      message: `Error de descarga: ${error}`,
      details: { error },
    }),

  processingSuccess: (
    clientId: string,
    clientName: string,
    requestId: string,
    cfdiCount: number
  ) =>
    createSatLog({
      clientId,
      clientName,
      requestId,
      type: "processing_success",
      level: "success",
      message: `Procesamiento exitoso - ${cfdiCount} CFDI(s) importados`,
      details: { cfdiCount },
    }),

  processingError: (
    clientId: string,
    clientName: string,
    requestId: string,
    error: string
  ) =>
    createSatLog({
      clientId,
      clientName,
      requestId,
      type: "processing_error",
      level: "error",
      message: `Error de procesamiento: ${error}`,
      details: { error },
    }),

  processingPartial: (
    clientId: string,
    clientName: string,
    requestId: string,
    successCount: number,
    errorCount: number
  ) =>
    createSatLog({
      clientId,
      clientName,
      requestId,
      type: "processing_partial",
      level: "warning",
      message: `Procesamiento parcial - ${successCount} exitosos, ${errorCount} errores`,
      details: { successCount, errorCount },
    }),

  autoSyncStarted: (clientId: string, clientName: string) =>
    createSatLog({
      clientId,
      clientName,
      type: "auto_sync_started",
      level: "info",
      message: `Sincronización automática iniciada`,
    }),

  autoSyncCompleted: (
    clientId: string,
    clientName: string,
    requestsCreated: number
  ) =>
    createSatLog({
      clientId,
      clientName,
      type: "auto_sync_completed",
      level: "success",
      message: `Sincronización automática completada - ${requestsCreated} solicitud(es) creada(s)`,
      details: { requestsCreated },
    }),

  autoSyncSkipped: (clientId: string, clientName: string, reason: string) =>
    createSatLog({
      clientId,
      clientName,
      type: "auto_sync_skipped",
      level: "info",
      message: `Sincronización automática omitida: ${reason}`,
      details: { reason },
    }),

  fielValidationError: (
    clientId: string,
    clientName: string,
    error: string
  ) =>
    createSatLog({
      clientId,
      clientName,
      type: "fiel_validation_error",
      level: "error",
      message: `Error de validación FIEL: ${error}`,
      details: { error },
    }),
};
