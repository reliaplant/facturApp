import { getFirestore, doc, updateDoc } from "firebase/firestore";
import app from "@/services/firebase";

const db = getFirestore(app);

/**
 * Servicio mínimo de sincronización SAT.
 * La creación de solicitudes se hace 100% desde la Cloud Function (autoCreateDailyRequests).
 * Este servicio solo se usa para actualizar la última fecha sincronizada tras procesar paquetes.
 */
export class SatSyncService {
  /**
   * Actualiza la última fecha sincronizada después de procesar exitosamente los paquetes.
   * Debe llamarse DESPUÉS de que los CFDIs se hayan guardado en la base de datos.
   */
  static async updateLastSyncDate(
    rfc: string,
    downloadType: "issued" | "received",
    syncedUpToDate: string
  ): Promise<void> {
    const clientRef = doc(db, "clients", rfc);
    const now = new Date().toISOString();

    if (downloadType === "issued") {
      await updateDoc(clientRef, {
        "satSyncStatus.lastSyncDateIssued": syncedUpToDate,
        "satSyncStatus.lastSyncAtIssued": now,
      });
    } else {
      await updateDoc(clientRef, {
        "satSyncStatus.lastSyncDateReceived": syncedUpToDate,
        "satSyncStatus.lastSyncAtReceived": now,
      });
    }

    console.log(`✅ Actualizada última fecha de sync ${downloadType} para ${rfc}: ${syncedUpToDate}`);
  }
}

export default SatSyncService;
