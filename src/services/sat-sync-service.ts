import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
import app from "@/services/firebase";
import { Client } from "@/models/Client";
import SatRequestService from "@/services/sat-request-service";

const db = getFirestore(app);

interface SyncResult {
  success: boolean;
  message: string;
  requestsCreated: number;
  details?: {
    issued?: { from: string; to: string; requestId?: string };
    received?: { from: string; to: string; requestId?: string };
  };
}

interface SyncStatus {
  needsSync: boolean;
  isFirstSync: boolean;
  issued: {
    needsSync: boolean;
    isFirstSync: boolean;
    from: string;
    to: string;
    daysBehind: number;
    hasPendingRequest: boolean; // Si ya hay una solicitud sin procesar
  };
  received: {
    needsSync: boolean;
    isFirstSync: boolean;
    from: string;
    to: string;
    daysBehind: number;
    hasPendingRequest: boolean; // Si ya hay una solicitud sin procesar
  };
  // Estado general
  hasPendingRequests: boolean; // Si hay alguna solicitud pendiente de procesar
  pendingRequestsCount: number;
}

/**
 * Servicio para sincronización inteligente de CFDIs desde el SAT
 * 
 * Estrategia:
 * 1. Guarda la última fecha sincronizada por cliente y tipo (emitidas/recibidas)
 * 2. Solo solicita desde la última fecha hasta ayer (nunca hoy)
 * 3. Evita duplicar solicitudes verificando si ya hay una en progreso
 * 4. Espacia las solicitudes para no saturar al SAT
 */
export class SatSyncService {
  
  /**
   * Helper para esperar un tiempo determinado
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtiene la fecha de ayer en formato YYYY-MM-DD (zona horaria local)
   */
  static getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Obtiene la fecha de hoy en formato YYYY-MM-DD (zona horaria local)
   */
  static getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Calcula los días entre dos fechas
   */
  static daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtiene el estado de sincronización de un cliente
   */
  static async getSyncStatus(rfc: string): Promise<SyncStatus> {
    const clientRef = doc(db, "clients", rfc);
    const clientSnap = await getDoc(clientRef);
    
    if (!clientSnap.exists()) {
      throw new Error(`Cliente ${rfc} no encontrado`);
    }

    const client = clientSnap.data() as Client;
    const yesterday = this.getYesterdayDate();
    
    // Fecha de inicio por defecto: inicio del año fiscal actual (1 de enero)
    const currentYear = new Date().getFullYear();
    const defaultStartDate = `${currentYear}-01-01`;
    
    const syncStatus = client.satSyncStatus || {};
    
    // Obtener solicitudes pendientes (no procesadas) para verificar si ya hay en progreso
    const allRequests = await SatRequestService.getRequests(rfc);
    const pendingRequests = allRequests.filter(r => !r.packagesProcessed);
    const pendingIssued = pendingRequests.filter(r => r.downloadType === 'issued');
    const pendingReceived = pendingRequests.filter(r => r.downloadType === 'received');
    
    console.log("📊 Sync Status Debug:", {
      totalRequests: allRequests.length,
      pendingRequests: pendingRequests.length,
      pendingIssued: pendingIssued.length,
      pendingReceived: pendingReceived.length,
      allDownloadTypes: allRequests.map(r => r.downloadType),
      syncStatus
    });
    
    // Calcular estado para emitidas
    const lastSyncIssued = syncStatus.lastSyncDateIssued || null;
    const isFirstSyncIssued = !lastSyncIssued;
    const fromDateIssued = lastSyncIssued 
      ? this.addDays(lastSyncIssued, 1) // Día siguiente a la última sync
      : syncStatus.syncStartDate || defaultStartDate;
    
    const issuedNeedsSync = !lastSyncIssued || lastSyncIssued < yesterday;
    const issuedDaysBehind = lastSyncIssued 
      ? this.daysBetween(lastSyncIssued, yesterday) 
      : this.daysBetween(defaultStartDate, yesterday);

    // Calcular estado para recibidas
    const lastSyncReceived = syncStatus.lastSyncDateReceived || null;
    const isFirstSyncReceived = !lastSyncReceived;
    const fromDateReceived = lastSyncReceived 
      ? this.addDays(lastSyncReceived, 1)
      : syncStatus.syncStartDate || defaultStartDate;
    
    const receivedNeedsSync = !lastSyncReceived || lastSyncReceived < yesterday;
    const receivedDaysBehind = lastSyncReceived 
      ? this.daysBetween(lastSyncReceived, yesterday) 
      : this.daysBetween(defaultStartDate, yesterday);

    return {
      needsSync: (issuedNeedsSync && pendingIssued.length === 0) || 
                 (receivedNeedsSync && pendingReceived.length === 0),
      isFirstSync: isFirstSyncIssued || isFirstSyncReceived,
      hasPendingRequests: pendingRequests.length > 0,
      pendingRequestsCount: pendingRequests.length,
      issued: {
        needsSync: issuedNeedsSync && pendingIssued.length === 0,
        isFirstSync: isFirstSyncIssued,
        from: fromDateIssued,
        to: yesterday,
        daysBehind: issuedDaysBehind,
        hasPendingRequest: pendingIssued.length > 0
      },
      received: {
        needsSync: receivedNeedsSync && pendingReceived.length === 0,
        isFirstSync: isFirstSyncReceived,
        from: fromDateReceived,
        to: yesterday,
        daysBehind: receivedDaysBehind,
        hasPendingRequest: pendingReceived.length > 0
      }
    };
  }

  /**
   * Agrega días a una fecha
   */
  static addDays(dateStr: string, days: number): string {
    // Parsear la fecha manualmente para evitar problemas de timezone
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0); // Usar mediodía para evitar problemas
    date.setDate(date.getDate() + days);
    // Formatear manualmente para evitar toISOString() que convierte a UTC
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    const newDay = String(date.getDate()).padStart(2, '0');
    return `${newYear}-${newMonth}-${newDay}`;
  }

  /**
   * Sincroniza un cliente con el SAT (emitidas y recibidas)
   * Solo solicita las fechas que faltan
   */
  static async syncClient(
    rfc: string, 
    options: { 
      forceFullSync?: boolean;  // Forzar sincronización completa desde inicio
      syncIssued?: boolean;     // Sincronizar emitidas (default: true)
      syncReceived?: boolean;   // Sincronizar recibidas (default: true)
      customStartDate?: string; // Fecha de inicio personalizada
    } = {}
  ): Promise<SyncResult> {
    const { 
      forceFullSync = false, 
      syncIssued = true, 
      syncReceived = true,
      customStartDate 
    } = options;

    try {
      // Verificar si ya hay una sincronización en progreso
      const clientRef = doc(db, "clients", rfc);
      const clientSnap = await getDoc(clientRef);
      
      if (!clientSnap.exists()) {
        return { 
          success: false, 
          message: `Cliente ${rfc} no encontrado`,
          requestsCreated: 0 
        };
      }

      const client = clientSnap.data() as Client;
      
      if (client.satSyncStatus?.issyncing) {
        return { 
          success: false, 
          message: "Ya hay una sincronización en progreso",
          requestsCreated: 0 
        };
      }

      // Verificar que tenga FIEL configurada
      if (!client.cerUrl || !client.keyCerUrl) {
        return {
          success: false,
          message: "El cliente no tiene FIEL configurada",
          requestsCreated: 0
        };
      }

      // Marcar como sincronizando
      await updateDoc(clientRef, {
        "satSyncStatus.issyncing": true,
        "satSyncStatus.lastError": null
      });

      const syncStatus = await this.getSyncStatus(rfc);
      const yesterday = this.getYesterdayDate();
      
      // Si es sincronización forzada, usar fecha personalizada o inicio del año
      const startDate = forceFullSync 
        ? (customStartDate || `${new Date().getFullYear()}-01-01`)
        : null;

      let requestsCreated = 0;
      const details: SyncResult['details'] = {};

      // Determinar qué necesita sync (considerando si ya hay requests pendientes)
      const issuedNeedsSync = syncIssued && (syncStatus.issued.needsSync || forceFullSync);
      const receivedNeedsSync = syncReceived && (syncStatus.received.needsSync || forceFullSync);
      
      // Si ninguna necesita sync, explicar por qué
      if (!issuedNeedsSync && !receivedNeedsSync) {
        await updateDoc(clientRef, { "satSyncStatus.issyncing": false });
        
        // Determinar el mensaje apropiado
        let message = "Todo está al día";
        if (syncStatus.hasPendingRequests) {
          message = `Hay ${syncStatus.pendingRequestsCount} solicitud(es) pendiente(s) de procesar`;
        }
        
        return {
          success: true,
          message,
          requestsCreated: 0,
          details
        };
      }

      // Usar la fecha correspondiente para cada tipo
      const fromDateIssued = startDate || syncStatus.issued.from;
      const fromDateReceived = startDate || syncStatus.received.from;
      const toDate = yesterday;

      // Trackear errores
      const errors: string[] = [];

      // Sincronizar emitidas (solo si necesita y no tiene request pendiente)
      if (issuedNeedsSync && fromDateIssued <= toDate) {
        try {
          console.log(`📤 Solicitando emitidas: ${fromDateIssued} - ${toDate}`);
          const request = await SatRequestService.createRequest(
            rfc,
            `${fromDateIssued} 00:00:00`,
            `${toDate} 23:59:59`,
            "issued"
          );
          details.issued = { from: fromDateIssued, to: toDate, requestId: request.requestId };
          requestsCreated++;
          console.log(`✅ Emitidas solicitada: ${request.requestId}`);
        } catch (error: any) {
          console.error("❌ Error al crear request de emitidas:", error);
          details.issued = { from: fromDateIssued, to: toDate };
          errors.push(`Emitidas: ${error.message || 'Error desconocido'}`);
        }
      } else if (syncStatus.issued.hasPendingRequest) {
        console.log(`⏸️ Emitidas: ya tiene solicitud pendiente`);
      }

      // Esperar 2 segundos entre solicitudes si vamos a crear recibidas
      if (requestsCreated > 0 && receivedNeedsSync) {
        console.log("⏳ Esperando 2 segundos antes de solicitar recibidas...");
        await this.delay(2000);
      }

      // Sincronizar recibidas (solo si necesita y no tiene request pendiente)
      if (receivedNeedsSync && fromDateReceived <= toDate) {
        try {
          console.log(`📤 Solicitando recibidas: ${fromDateReceived} - ${toDate}`);
          const request = await SatRequestService.createRequest(
            rfc,
            `${fromDateReceived} 00:00:00`,
            `${toDate} 23:59:59`,
            "received"
          );
          details.received = { from: fromDateReceived, to: toDate, requestId: request.requestId };
          requestsCreated++;
          console.log(`✅ Recibidas solicitada: ${request.requestId}`);
        } catch (error: any) {
          console.error("❌ Error al crear request de recibidas:", error);
          details.received = { from: fromDateReceived, to: toDate };
          errors.push(`Recibidas: ${error.message || 'Error desconocido'}`);
        }
      } else if (syncStatus.received.hasPendingRequest) {
        console.log(`⏸️ Recibidas: ya tiene solicitud pendiente`);
      }

      // Quitar flag de sincronizando
      await updateDoc(clientRef, {
        "satSyncStatus.issyncing": false
      });

      // Si hubo errores al crear solicitudes, reportarlos
      if (errors.length > 0) {
        return {
          success: false,
          message: errors.join('. '),
          requestsCreated,
          details
        };
      }

      if (requestsCreated === 0) {
        // No se crearon solicitudes pero podría haber pendientes
        let message = "Todo está al día";
        if (syncStatus.hasPendingRequests) {
          message = `Hay ${syncStatus.pendingRequestsCount} solicitud(es) pendiente(s) de procesar`;
        }
        return {
          success: true,
          message,
          requestsCreated: 0,
          details
        };
      }

      return {
        success: true,
        message: `Se crearon ${requestsCreated} solicitud(es) al SAT`,
        requestsCreated,
        details
      };

    } catch (error: any) {
      // En caso de error, quitar flag de sincronizando
      const clientRef = doc(db, "clients", rfc);
      await updateDoc(clientRef, {
        "satSyncStatus.issyncing": false,
        "satSyncStatus.lastError": error.message
      });

      return {
        success: false,
        message: error.message || "Error desconocido",
        requestsCreated: 0
      };
    }
  }

  /**
   * Actualiza la última fecha sincronizada después de procesar exitosamente los paquetes
   * Esto debe llamarse DESPUÉS de que los CFDIs se hayan guardado en la base de datos
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
        "satSyncStatus.lastSyncAtIssued": now
      });
    } else {
      await updateDoc(clientRef, {
        "satSyncStatus.lastSyncDateReceived": syncedUpToDate,
        "satSyncStatus.lastSyncAtReceived": now
      });
    }

    console.log(`✅ Actualizada última fecha de sync ${downloadType} para ${rfc}: ${syncedUpToDate}`);
  }

  /**
   * Establece la fecha de inicio de sincronización para un cliente
   * Útil para clientes nuevos o para resetear el punto de partida
   */
  static async setSyncStartDate(rfc: string, startDate: string): Promise<void> {
    const clientRef = doc(db, "clients", rfc);
    await updateDoc(clientRef, {
      "satSyncStatus.syncStartDate": startDate
    });
  }

  /**
   * Resetea el estado de sincronización (útil para comenzar de cero)
   */
  static async resetSyncStatus(rfc: string): Promise<void> {
    const clientRef = doc(db, "clients", rfc);
    await updateDoc(clientRef, {
      satSyncStatus: {
        syncStartDate: `${new Date().getFullYear()}-01-01`,
        issyncing: false
      }
    });
  }
}

export default SatSyncService;
