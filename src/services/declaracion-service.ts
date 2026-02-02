import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import app from '@/services/firebase';
import { Declaracion } from '../models/declaracion';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firestore and Storage
const db = getFirestore(app);
const storage = getStorage(app);

export const declaracionService = {
  /**
   * Get declarations for a specific client and year
   */
  async getDeclaraciones(clientId: string, anio?: number): Promise<Declaracion[]> {
    if (!clientId) {
      console.error('Client ID is required to get declarations');
      return [];
    }

    try {
      console.log(`Getting declarations for client ${clientId}, year ${anio || 'all'}`);
      const declaracionesRef = collection(db, 'clients', clientId, 'declaraciones');
      
      // Use a simpler query to avoid index requirements
      let q;
      if (anio) {
        q = query(declaracionesRef, where('anio', '==', anio));
      } else {
        q = query(declaracionesRef);
      }
      
      const querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.docs.length} declarations`);
      
      // Map and convert data
      const declarations = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          fechaPresentacion: data.fechaPresentacion ? data.fechaPresentacion.toDate() : null,
          fechaLimitePago: data.fechaLimitePago ? data.fechaLimitePago.toDate() : null,
        } as Declaracion;
      });
      
      // Sort in memory
      if (anio) {
        return declarations.sort((a, b) => parseInt(a.mes) - parseInt(b.mes));
      } else {
        return declarations.sort((a, b) => {
          if (b.anio !== a.anio) return b.anio - a.anio;
          return parseInt(a.mes) - parseInt(b.mes);
        });
      }
    } catch (error) {
      console.error('Error getting declarations:', error);
      throw error;
    }
  },

  /**
   * Get a single declaration by ID
   */
  async getDeclaracionById(clientId: string, declaracionId: string): Promise<Declaracion | null> {
    try {
      const declaracionRef = doc(db, 'clients', clientId, 'declaraciones', declaracionId);
      const declaracionDoc = await getDoc(declaracionRef);
      
      if (declaracionDoc.exists()) {
        const data = declaracionDoc.data();
        return {
          ...data,
          id: declaracionId,
          fechaPresentacion: data.fechaPresentacion ? data.fechaPresentacion.toDate() : null,
          fechaLimitePago: data.fechaLimitePago ? data.fechaLimitePago.toDate() : null,
        } as Declaracion;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting declaration with ID ${declaracionId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new declaration for a client
   * Automatically marks all previous declarations of the same month as 'sustituida'
   */
  async createDeclaracion(clientId: string, declaracion: Declaracion): Promise<string> {
    if (!clientId) {
      const error = new Error('Client ID is required to create a declaration');
      console.error(error);
      throw error;
    }

    try {
      console.log(`Creating declaration for client ${clientId}:`, declaracion);
      
      // First, mark all existing declarations for the same month/year as 'sustituida'
      const existingDeclaraciones = await this.getDeclaraciones(clientId, declaracion.anio);
      const declaracionesDelMes = existingDeclaraciones.filter(
        d => d.mes === declaracion.mes && d.estatus !== 'sustituida'
      );
      
      // Mark each existing declaration as 'sustituida'
      for (const existingDecl of declaracionesDelMes) {
        if (existingDecl.id) {
          const existingRef = doc(db, 'clients', clientId, 'declaraciones', existingDecl.id);
          await updateDoc(existingRef, { estatus: 'sustituida' });
          console.log(`Marked declaration ${existingDecl.id} as sustituida`);
        }
      }
      
      const id = declaracion.id || uuidv4();
      const declaracionRef = doc(db, 'clients', clientId, 'declaraciones', id);
      
      // Sanitize data for Firestore - remove undefined values
      const declaracionData = {
        ...declaracion,
        id,
        // Required fields with defaults
        mes: declaracion.mes,
        anio: declaracion.anio,
        tipoDeclaracion: declaracion.tipoDeclaracion || 'ordinaria',
        estatus: 'vigente', // Always set new declarations as 'vigente'
        clientePagoImpuestos: declaracion.clientePagoImpuestos || false,
        clientePagoServicio: declaracion.clientePagoServicio || false,
        montoISR: declaracion.montoISR || 0,
        montoIVA: declaracion.montoIVA || 0,
        
        // All fiscal data fields from fiscal-summary.tsx
        ingresosMes: declaracion.ingresosMes || 0,
        ingresosAcumulados: declaracion.ingresosAcumulados || 0,
        deduccionesMes: declaracion.deduccionesMes || 0,
        depreciacionMensual: declaracion.depreciacionMensual || 0,
        totalDeduccionesPeriodo: declaracion.totalDeduccionesPeriodo || 0,
        deduccionesAcumuladas: declaracion.deduccionesAcumuladas || 0,
        utilidadMes: declaracion.utilidadMes || 0,
        utilidadAcumulada: declaracion.utilidadAcumulada || 0,
        ivaCobrado: declaracion.ivaCobrado || 0,
        ivaPagado: declaracion.ivaPagado || 0,
        ivaRetenido: declaracion.ivaRetenido || 0,
        ivaPorPagar: declaracion.ivaPorPagar || 0,
        ivaAFavor: declaracion.ivaAFavor || 0,
        baseImpuesto: declaracion.baseImpuesto || 0,
        limiteInferior: declaracion.limiteInferior || 0,
        excedenteLimiteInferior: declaracion.excedenteLimiteInferior || 0,
        porcentajeExcedente: declaracion.porcentajeExcedente || 0,
        impuestoMarginal: declaracion.impuestoMarginal || 0,
        cuotaFija: declaracion.cuotaFija || 0,
        impuestosArt113: declaracion.impuestosArt113 || 0,
        pagosProvisionalesAnteriores: declaracion.pagosProvisionalesAnteriores || 0,
        retencionesPeriodo: declaracion.retencionesPeriodo || 0,
        retencionesAcumuladas: declaracion.retencionesAcumuladas || 0,
        isrACargo: declaracion.isrACargo || 0,
        impuestoPorPagar: declaracion.impuestoPorPagar || 0,
        
        // Handle dates
        fechaPresentacion: declaracion.fechaPresentacion 
          ? Timestamp.fromDate(new Date(declaracion.fechaPresentacion)) 
          : null,
        fechaLimitePago: declaracion.fechaLimitePago 
          ? Timestamp.fromDate(new Date(declaracion.fechaLimitePago)) 
          : null,
        
        // Handle optional string fields - replace undefined with null
        archivoLineaCaptura: declaracion.archivoLineaCaptura || null,
        urlArchivoLineaCaptura: declaracion.urlArchivoLineaCaptura || null,
      };
      
      await setDoc(declaracionRef, declaracionData);
      console.log(`Successfully created declaration with ID: ${id}`);
      return id;
    } catch (error) {
      console.error('Error creating declaration:', error);
      throw error;
    }
  },

  /**
   * Update an existing declaration
   */
  async updateDeclaracion(clientId: string, declaracion: Declaracion): Promise<void> {
    if (!declaracion.id) {
      throw new Error('Declaration ID is required for update');
    }
    
    try {
      const declaracionRef = doc(db, 'clients', clientId, 'declaraciones', declaracion.id);
      
      // Sanitize data for Firestore
      const declaracionData = {
        ...declaracion,
        // Required fields with defaults
        mes: declaracion.mes,
        anio: declaracion.anio,
        tipoDeclaracion: declaracion.tipoDeclaracion || 'ordinaria',
        clientePagoImpuestos: declaracion.clientePagoImpuestos || false,
        clientePagoServicio: declaracion.clientePagoServicio || false,
        montoISR: declaracion.montoISR || 0,
        montoIVA: declaracion.montoIVA || 0,
        
        // All fiscal data fields from fiscal-summary.tsx
        ingresosMes: declaracion.ingresosMes || 0,
        ingresosAcumulados: declaracion.ingresosAcumulados || 0,
        deduccionesMes: declaracion.deduccionesMes || 0,
        depreciacionMensual: declaracion.depreciacionMensual || 0,
        totalDeduccionesPeriodo: declaracion.totalDeduccionesPeriodo || 0,
        deduccionesAcumuladas: declaracion.deduccionesAcumuladas || 0,
        utilidadMes: declaracion.utilidadMes || 0,
        utilidadAcumulada: declaracion.utilidadAcumulada || 0,
        ivaCobrado: declaracion.ivaCobrado || 0,
        ivaPagado: declaracion.ivaPagado || 0,
        ivaRetenido: declaracion.ivaRetenido || 0,
        ivaPorPagar: declaracion.ivaPorPagar || 0,
        ivaAFavor: declaracion.ivaAFavor || 0,
        baseImpuesto: declaracion.baseImpuesto || 0,
        limiteInferior: declaracion.limiteInferior || 0,
        excedenteLimiteInferior: declaracion.excedenteLimiteInferior || 0,
        porcentajeExcedente: declaracion.porcentajeExcedente || 0,
        impuestoMarginal: declaracion.impuestoMarginal || 0,
        cuotaFija: declaracion.cuotaFija || 0,
        impuestosArt113: declaracion.impuestosArt113 || 0,
        pagosProvisionalesAnteriores: declaracion.pagosProvisionalesAnteriores || 0,
        retencionesPeriodo: declaracion.retencionesPeriodo || 0,
        retencionesAcumuladas: declaracion.retencionesAcumuladas || 0,
        isrACargo: declaracion.isrACargo || 0,
        impuestoPorPagar: declaracion.impuestoPorPagar || 0,
        
        // Handle dates
        fechaPresentacion: declaracion.fechaPresentacion 
          ? Timestamp.fromDate(new Date(declaracion.fechaPresentacion)) 
          : null,
        fechaLimitePago: declaracion.fechaLimitePago 
          ? Timestamp.fromDate(new Date(declaracion.fechaLimitePago)) 
          : null,
        
        // Handle optional string fields
        archivoLineaCaptura: declaracion.archivoLineaCaptura || null,
        urlArchivoLineaCaptura: declaracion.urlArchivoLineaCaptura || null,
      };
      
      delete declaracionData.id; // Remove id from the data to update
      
      await updateDoc(declaracionRef, declaracionData);
    } catch (error) {
      console.error('Error updating declaration:', error);
      throw error;
    }
  },

  /**
   * Delete a declaration
   */
  async deleteDeclaracion(clientId: string, declaracionId: string): Promise<void> {
    try {
      const declaracionRef = doc(db, 'clients', clientId, 'declaraciones', declaracionId);
      await deleteDoc(declaracionRef);
    } catch (error) {
      console.error('Error deleting declaration:', error);
      throw error;
    }
  },

  /**
   * Upload a declaration file
   */
  async uploadDeclaracionFile(clientId: string, declaracionId: string, file: File, fileType: 'declaracion' | 'lineaCaptura'): Promise<string> {
    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `${declaracionId}_${fileType}_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, `clients/${clientId}/declaraciones/${fileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      
      // Update the declaration with the file URL
      const declaracionRef = doc(db, 'clients', clientId, 'declaraciones', declaracionId);
      
      if (fileType === 'declaracion') {
        await updateDoc(declaracionRef, {
          archivoDeclaracion: fileName,
          urlArchivoDeclaracion: downloadUrl,
        });
      } else {
        await updateDoc(declaracionRef, {
          archivoLineaCaptura: fileName,
          urlArchivoLineaCaptura: downloadUrl,
        });
      }
      
      return downloadUrl;
    } catch (error) {
      console.error(`Error uploading ${fileType} file:`, error);
      throw error;
    }
  },

  /**
   * Delete a file (declaration or payment receipt)
   */
  async deleteDeclaracionFile(clientId: string, declaracionId: string, fileName: string, fileType: 'declaracion' | 'lineaCaptura'): Promise<void> {
    try {
      const storageRef = ref(storage, `clients/${clientId}/declaraciones/${fileName}`);
      await deleteObject(storageRef);
      
      // Update the declaration to remove file references
      const declaracionRef = doc(db, 'clients', clientId, 'declaraciones', declaracionId);
      
      if (fileType === 'declaracion') {
        await updateDoc(declaracionRef, {
          archivoDeclaracion: null,
          urlArchivoDeclaracion: null,
        });
      } else {
        await updateDoc(declaracionRef, {
          archivoLineaCaptura: null,
          urlArchivoLineaCaptura: null,
        });
      }
    } catch (error) {
      console.error(`Error deleting ${fileType} file:`, error);
      throw error;
    }
  },

  /**
   * Check if a declaration for a specific month and year exists
   */
  async declaracionExists(clientId: string, mes: string, anio: number): Promise<boolean> {
    try {
      const declaracionesRef = collection(db, 'clients', clientId, 'declaraciones');
      const q = query(
        declaracionesRef,
        where('mes', '==', mes),
        where('anio', '==', anio)
      );
      
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking if declaration exists:', error);
      throw error;
    }
  }
};
