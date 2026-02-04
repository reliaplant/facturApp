import { getFunctions, httpsCallable } from "firebase/functions";
import { 
    getFirestore,
    doc, 
    setDoc, 
    getDoc, 
    collection,
    query,
    where,
    getDocs,
    serverTimestamp,
    orderBy,
    limit,
    deleteDoc
} from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage"; // Add this import
import app from "@/services/firebase";
import { SatRequest } from "@/models/SatRequest";

const db = getFirestore(app);

// Interfaces for Cloud Function responses (only used internally in this service)
interface ValidarFielResponse {
  success: boolean;
  requestId?: string;
  status?: string;
  packageIds?: string[];
  message?: string;
}

interface VerificarSolicitudResponse {
  success: boolean;
  status: string;
  packageIds?: string[];
  inProgress?: boolean;
  error?: string;
  message?: string;
}

/**
 * Service class for handling SAT download requests
 */
export default class SatRequestService {
  /**
   * Verifica cuántas solicitudes activas hay para un RFC
   * El SAT solo permite 2 solicitudes simultáneas por tipo
   */
  static async getActiveRequestsCount(rfc: string, downloadType: "issued" | "received"): Promise<number> {
    const requests = await this.getRequests(rfc);
    // Contar solicitudes que no están completadas ni fallidas
    const activeRequests = requests.filter(r => 
      r.downloadType === downloadType && 
      !r.packagesProcessed && 
      r.status !== 'failed' &&
      r.status !== 'error'
    );
    return activeRequests.length;
  }

  /**
   * Create a new SAT download request by calling the validarFiel Cloud Function
   */
  static async createRequest(
    rfc: string, 
    from?: string, 
    to?: string,
    downloadType: "issued" | "received" = "issued"
  ): Promise<SatRequest> {
    try {
      console.log(`📤 Iniciando solicitud de descarga para RFC: ${rfc} (${from} - ${to}) - Tipo: ${downloadType}`);
      
      // VERIFICACIÓN DE LÍMITE: El SAT solo permite 2 solicitudes simultáneas por tipo
      const activeCount = await this.getActiveRequestsCount(rfc, downloadType);
      console.log(`📊 Solicitudes activas de tipo ${downloadType}: ${activeCount}`);
      
      if (activeCount >= 2) {
        console.warn(`⚠️ Ya hay ${activeCount} solicitudes activas de ${downloadType}. El SAT solo permite 2.`);
        throw new Error(`Ya tienes ${activeCount} solicitudes de ${downloadType === 'issued' ? 'emitidas' : 'recibidas'} pendientes. Espera a que se procesen antes de crear más.`);
      }
      
      // Call Cloud Function to validate FIEL
      const functions = getFunctions(app);
      const validarFiel = httpsCallable<
        { rfc: string; from?: string; to?: string; downloadType?: string },
        ValidarFielResponse
      >(functions, "validarFiel");

      const response = await validarFiel({ 
        rfc, 
        from, 
        to,
        downloadType // Pass the new parameter to the Cloud Function
      });
      
      console.log("📨 Respuesta de validarFiel:", response.data);
      const { data } = response;

      if (!data.success) {
        console.error("❌ Error en validarFiel:", data.message);
        throw new Error("Error al validar la FIEL: " + (data.message || "Error desconocido"));
      }

      // If no requestId, no request was generated
      if (!data.requestId) {
        console.error("❌ No se generó requestId en validarFiel");
        throw new Error("FIEL válida pero no se generó solicitud de descarga");
      }

      console.log(`✅ Solicitud generada con éxito. RequestId: ${data.requestId}`);
      
      // Create document in Firestore using SatRequest interface - ensure date fields are included
      const request: Omit<SatRequest, "id"> = {
        rfc,
        requestId: data.requestId!,
        status: data.status || "requested",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Explicitly include date range
        from: from || "",
        to: to || "",
        downloadType, // Save the download type in the request document
        completed: data.status === "finished"
      };

      // If packages are available, save them
      if (data.packageIds && data.packageIds.length > 0) {
        console.log(`📦 Paquetes disponibles: ${data.packageIds.join(", ")}`);
        request.packageIds = data.packageIds;
      }

      // Log the request data being saved to Firestore for debugging
      console.log("💾 Guardando solicitud en Firestore con fechas:", { from: request.from, to: request.to });
      
      // Save to Firestore
      const requestsRef = collection(db, `clients/${rfc}/satRequests`);
      const newRequestRef = doc(requestsRef);
      await setDoc(newRequestRef, request);
      console.log(`✅ Solicitud guardada con ID: ${newRequestRef.id}`);

      return {
        id: newRequestRef.id,
        ...request
      } as SatRequest;
    } catch (error: any) {
      console.error("❌ Error en createRequest:", error);
      throw new Error(error.message || "Error al crear la solicitud de descarga");
    }
  }

  /**
   * Verify request status by calling the verificarSolicitud Cloud Function
   */
  static async verifyRequest(
    rfc: string, 
    requestId: string,
    requestDocId: string
  ): Promise<SatRequest> {
    try {
      console.log(`🔍 Verificando solicitud ${requestId} (doc: ${requestDocId}) para RFC: ${rfc}`);
      
      // Call Cloud Function to verify
      const functions = getFunctions(app);
      const verificarSolicitud = httpsCallable<
        { rfc: string; requestId: string },
        VerificarSolicitudResponse
      >(functions, "verificarSolicitud");

      const response = await verificarSolicitud({ rfc, requestId });
      console.log("📨 Respuesta de verificarSolicitud:", response.data);
      const { data } = response;

      if (!data.success) {
        console.error("❌ Error en verificarSolicitud:", data.error);
        throw new Error("Error al verificar la solicitud: " + (data.error || "Error desconocido"));
      }

      // Update in Firestore with improved status detection
      console.log(`📝 Actualizando solicitud en Firestore. Estado: ${data.status}`);
      const requestRef = doc(db, `clients/${rfc}/satRequests/${requestDocId}`);
      
      // Determine if the request is complete based on multiple conditions
      const isCompleted = 
        data.status === "Finished" || 
        data.status === "finished" || 
        data.status === "3" || 
        (data.status === "Finished" && !data.inProgress);
      
      const updateData: Partial<SatRequest> = {
        status: data.status,
        updatedAt: serverTimestamp(),
        completed: isCompleted
      };

      // If packages are available, save them
      if (data.packageIds && data.packageIds.length > 0) {
        console.log(`📦 Paquetes disponibles: ${data.packageIds.join(", ")}`);
        updateData.packageIds = data.packageIds;
      }

      // If error, save it
      if (data.error) {
        console.warn(`⚠️ Error en la solicitud: ${data.error}`);
        updateData.error = data.error;
      }

      await setDoc(requestRef, updateData, { merge: true });
      console.log("✅ Solicitud actualizada en Firestore");

      // Get updated document
      const updatedDoc = await getDoc(requestRef);
      
      if (!updatedDoc.exists()) {
        console.error("❌ No se encontró el documento después de actualizar");
        throw new Error("No se pudo encontrar la solicitud después de actualizarla");
      }
      
      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      } as SatRequest;
    } catch (error: any) {
      console.error("❌ Error en verifyRequest:", error);
      throw new Error(error.message || "Error al verificar la solicitud");
    }
  }

  /**
   * Get all SAT requests for a client
   */
  static async getRequests(rfc: string): Promise<SatRequest[]> {
    try {
      console.log(`🔍 Obteniendo todas las solicitudes para RFC: ${rfc}`);
      const requestsRef = collection(db, `clients/${rfc}/satRequests`);
      const q = query(requestsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SatRequest[];
      
      console.log(`✅ Se encontraron ${requests.length} solicitudes`);
      return requests;
    } catch (error) {
      console.error("❌ Error obteniendo solicitudes:", error);
      return [];
    }
  }

  /**
   * Get pending SAT requests for a client
   */
  static async getPendingRequests(rfc: string): Promise<SatRequest[]> {
    try {
      const requestsRef = collection(db, `clients/${rfc}/satRequests`);
      const q = query(
        requestsRef, 
        where("completed", "==", false),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SatRequest[];
    } catch (error) {
      console.error("Error getting pending requests:", error);
      return [];
    }
  }

  /**
   * Get latest completed SAT requests for a client
   */
  static async getLatestCompletedRequests(
    rfc: string, 
    count: number = 5
  ): Promise<SatRequest[]> {
    try {
      const requestsRef = collection(db, `clients/${rfc}/satRequests`);
      const q = query(
        requestsRef, 
        where("completed", "==", true),
        orderBy("updatedAt", "desc"),
        limit(count)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SatRequest[];
    } catch (error) {
      console.error("Error getting completed requests:", error);
      return [];
    }
  }

  /**
   * Get a specific SAT request by id
   */
  static async getRequest(
    rfc: string, 
    requestDocId: string
  ): Promise<SatRequest | null> {
    try {
      const requestRef = doc(db, `clients/${rfc}/satRequests/${requestDocId}`);
      const docSnap = await getDoc(requestRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as SatRequest;
    } catch (error) {
      console.error("Error getting request:", error);
      return null;
    }
  }

  /**
   * Download packages for a completed request
   */
  static async downloadPackages(
    rfc: string,
    packageIds: string[]
  ): Promise<{
    success: boolean;
    savedPaths: string[];
    message?: string;
  }> {
    try {
      console.log(`📥 Descargando paquetes para RFC: ${rfc}`);
      
      // Call Cloud Function to download packages
      const functions = getFunctions(app);
      const descargarPaquetes = httpsCallable<
        { rfc: string; packageIds: string[] },
        { success: boolean; savedPaths: string[] }
      >(functions, "descargarPaquetes");

      const response = await descargarPaquetes({ rfc, packageIds });
      console.log("📨 Respuesta de descargarPaquetes:", response.data);
      
      return response.data;
    } catch (error: any) {
      console.error("❌ Error en downloadPackages:", error);
      return {
        success: false,
        savedPaths: [],
        message: error.message || "Error al descargar los paquetes"
      };
    }
  }

  /**
   * Process a downloaded package
   */
  static async processPackage(
    rfc: string,
    packageId: string
  ): Promise<{
    success: boolean;
    savedPaths: string[];
    message?: string;
  }> {
    try {
      console.log(`📂 Iniciando procesamiento de paquete ${packageId} para RFC: ${rfc}`);
      
      // Call Cloud Function to process package
      const functions = getFunctions(app);
      const procesarPaquete = httpsCallable<
        { rfc: string; packageId: string },
        { success: boolean; savedPaths: string[] }
      >(functions, "procesarPaquete");

      console.log(`📤 Enviando solicitud a procesarPaquete para ${packageId}`);
      
      try {
        const response = await procesarPaquete({ rfc, packageId });
        console.log(`📨 Respuesta recibida para ${packageId}:`, response.data);
        
        // Handle the common case where no files are extracted
        if (response.data.success && (!response.data.savedPaths || response.data.savedPaths.length === 0)) {
          console.warn(`⚠️ El paquete ${packageId} no contenía facturas o no se pudieron extraer`);
          return {
            success: true,
            savedPaths: [],
            message: "El paquete se procesó pero no se encontraron facturas en él"
          };
        }
        
        // Success case with files
        if (response.data.success) {
          console.log(`✅ Procesamiento exitoso del paquete ${packageId}: ${response.data.savedPaths.length} XMLs`);
        }
        
        return response.data;
      } catch (error: any) {
        // This specifically catches Firebase function errors
        console.error(`❌ Error de Firebase Function al procesar paquete ${packageId}:`, error);
        
        // Extract detailed error message from Firebase error
        let errorMessage = "Error al procesar el paquete";
        if (error.message) {
          errorMessage = error.message;
        }
        
        // Firebase functions errors have additional details
        if (error.details) {
          errorMessage = typeof error.details === 'string' 
            ? error.details 
            : JSON.stringify(error.details);
        }
        
        return {
          success: false,
          savedPaths: [],
          message: errorMessage
        };
      }
    } catch (error: any) {
      // This catches any other errors that might occur outside the function call
      console.error(`❌ Error general al procesar paquete ${packageId}:`, error);
      
      return {
        success: false,
        savedPaths: [],
        message: error.message || "Error al procesar el paquete"
      };
    }
  }

  /**
   * Get a list of all downloadable packages for a client
   */
  static async getPackages(
    rfc: string
  ): Promise<string[]> {
    try {
      console.log(`📂 Listando paquetes disponibles para RFC: ${rfc}`);
      
      // Use Firebase Storage to list files in the packages directory
      // This code example assumes you have access to Firebase Storage
      // You would need to implement this based on your storage structure
      
      // For now, return an empty array
      return [];
      
    } catch (error: any) {
      console.error(`❌ Error al listar paquetes para ${rfc}:`, error);
      return [];
    }
  }

  /**
   * Update the status of a request in Firestore
   */
  static async updateRequestStatus(
    rfc: string,
    requestId: string,
    updateData: Partial<SatRequest>
  ): Promise<void> {
    try {
      console.log(`📝 Actualizando estado de la solicitud ${requestId} para RFC: ${rfc}`);
      
      const requestRef = doc(db, `clients/${rfc}/satRequests/${requestId}`);
      
      // Add server timestamp for updatedAt
      const dataToUpdate = {
        ...updateData,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(requestRef, dataToUpdate, { merge: true });
      console.log("✅ Estado de solicitud actualizado en Firestore");
    } catch (error: any) {
      console.error("❌ Error al actualizar estado de solicitud:", error);
      throw new Error(error.message || "Error al actualizar el estado de la solicitud");
    }
  }

  /**
   * Download a package ZIP file as base64 using Cloud Function (avoids CORS)
   */
  static async downloadPackageAsBase64(rfc: string, packageId: string): Promise<Blob> {
    try {
      const functions = getFunctions(app);
      const downloadPackage = httpsCallable<
        { rfc: string; packageId: string },
        { success: boolean; data?: string; size?: number; message?: string }
      >(functions, "getPackageSignedUrl");
      
      const result = await downloadPackage({ rfc, packageId });
      
      if (!result.data.success || !result.data.data) {
        throw new Error(result.data.message || "No se pudo descargar el paquete");
      }
      
      // Convert base64 to Blob
      const binaryString = atob(result.data.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log(`✅ Paquete ${packageId} descargado: ${(result.data.size || 0) / 1024} KB`);
      return new Blob([bytes], { type: "application/zip" });
    } catch (error: any) {
      console.error(`❌ Error descargando paquete ${packageId}:`, error);
      throw new Error(`No se pudo descargar el paquete: ${error.message}`);
    }
  }

  /**
   * Get a signed URL for a package ZIP file using Cloud Function (avoids CORS)
   * @deprecated Use downloadPackageAsBase64 instead
   */
  static async getPackageSignedUrl(rfc: string, packageId: string): Promise<string> {
    try {
      const functions = getFunctions(app);
      const getSignedUrl = httpsCallable<
        { rfc: string; packageId: string },
        { success: boolean; url?: string; message?: string }
      >(functions, "getPackageSignedUrl");
      
      const result = await getSignedUrl({ rfc, packageId });
      
      if (!result.data.success || !result.data.url) {
        throw new Error(result.data.message || "No se pudo obtener URL de descarga");
      }
      
      console.log(`✅ Signed URL generada para paquete ${packageId}`);
      return result.data.url;
    } catch (error: any) {
      console.error(`❌ Error obteniendo signed URL para paquete ${packageId}:`, error);
      throw new Error(`No se pudo obtener URL de descarga: ${error.message}`);
    }
  }

  /**
   * Get download URL for a package ZIP file (legacy - may have CORS issues)
   */
  static async getPackageDownloadUrl(rfc: string, packageId: string): Promise<string> {
    try {
      const storage = getStorage(app);
      const zipPath = `clients/${rfc}/packages/${packageId}.zip`;
      const fileRef = ref(storage, zipPath);
      
      const url = await getDownloadURL(fileRef);
      console.log(`✅ URL generada para paquete ${packageId}`);
      return url;
    } catch (error: any) {
      console.error(`❌ Error generando URL para paquete ${packageId}:`, error);
      throw new Error(`No se pudo generar URL de descarga: ${error.message}`);
    }
  }

  /**
   * Get download URLs for multiple package ZIP files
   */
  static async getPackagesDownloadUrls(rfc: string, packageIds: string[]): Promise<{ [packageId: string]: string }> {
    try {
      const storage = getStorage(app);
      const results: { [packageId: string]: string } = {};
      
      for (const packageId of packageIds) {
        try {
          const zipPath = `clients/${rfc}/packages/${packageId}.zip`;
          const fileRef = ref(storage, zipPath);
          const url = await getDownloadURL(fileRef);
          results[packageId] = url;
        } catch (error) {
          console.error(`❌ Error generando URL para paquete ${packageId}:`, error);
        }
      }
      
      return results;
    } catch (error: any) {
      console.error(`❌ Error general generando URLs:`, error);
      return {};
    }
  }

  /**
   * Delete a SAT request (super admin only)
   */
  static async deleteRequest(rfc: string, requestDocId: string): Promise<void> {
    try {
      console.log(`🗑️ Eliminando solicitud ${requestDocId} para RFC ${rfc}`);
      const requestRef = doc(db, `clients/${rfc}/satRequests`, requestDocId);
      await deleteDoc(requestRef);
      console.log(`✅ Solicitud eliminada: ${requestDocId}`);
    } catch (error: any) {
      console.error(`❌ Error al eliminar solicitud:`, error);
      throw new Error(error.message || "Error al eliminar la solicitud");
    }
  }
}
